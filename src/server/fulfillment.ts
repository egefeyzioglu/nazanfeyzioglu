import "server-only";

import { and, eq } from "drizzle-orm";

import { type TrackingCarrier } from "src/lib/orders";
import {
  emailConfigured,
  sendShippingEmail,
  type ShippingEmailData,
} from "src/server/email";
import { db } from "src/server/db";
import { orders } from "src/server/db/schema";
import { getContent } from "src/server/queries";

type OrderRow = typeof orders.$inferSelect;

/**
 * What happened to the customer's shipping confirmation when an order was
 * fulfilled. `not_applicable` covers digital editions (delivered by the seller
 * directly, nothing ships) and orders that were not pending, so a repeated
 * click never emails the buyer twice; `already_sent` is the same guard for
 * the retry path.
 */
export type ShippingEmailOutcome =
  | "sent"
  | "already_sent"
  | "failed"
  | "not_configured"
  | "no_customer_email"
  | "not_applicable";

export type FulfillmentResult = {
  order: OrderRow;
  shippingEmail: ShippingEmailOutcome;
};

/**
 * Marks an order fulfilled, records the courier details and emails the buyer
 * a shipping confirmation. The status change is committed before the email is
 * attempted, so a delivery failure leaves the order fulfilled with
 * `shippedEmailSentAt` unset — see resendShippingEmail. Resolves null when no
 * such order exists.
 */
export async function fulfillOrder(input: {
  id: number;
  trackingCarrier: TrackingCarrier | null;
  trackingNumber: string | null;
}): Promise<FulfillmentResult | null> {
  const trimmed = input.trackingNumber?.trim() ?? "";
  const trackingNumber = trimmed === "" ? null : trimmed;
  // Only a pending → fulfilled transition sends the email: a double-submit
  // (or a stale tab) finds the order already fulfilled and does nothing, and
  // an oversold order keeps its refund-required state. Re-fulfilling after
  // "Mark pending" (say, with a corrected tracking number) is a fresh
  // shipment notice, so the previous send is forgotten here.
  const [order] = await db
    .update(orders)
    .set({
      fulfillmentStatus: "fulfilled",
      trackingCarrier: input.trackingCarrier,
      trackingNumber,
      shippingEmailAttemptId: crypto.randomUUID(),
      shippedEmailSentAt: null,
    })
    .where(
      and(eq(orders.id, input.id), eq(orders.fulfillmentStatus, "pending")),
    )
    .returning();
  if (order) return sendShippingForOrder(order);

  const existing = await db.query.orders.findFirst({
    where: eq(orders.id, input.id),
  });
  return existing ? { order: existing, shippingEmail: "not_applicable" } : null;
}

/**
 * Sends the shipping confirmation for an order that is already fulfilled but
 * whose email never went out — the first attempt failed or email was not
 * configured at the time. Resolves null when no such order exists.
 */
export async function resendShippingEmail(
  id: number,
): Promise<FulfillmentResult | null> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
  });
  if (!order) return null;
  if (order.fulfillmentStatus !== "fulfilled") {
    return { order, shippingEmail: "not_applicable" };
  }
  return sendShippingForOrder(order);
}

async function sendShippingForOrder(
  order: OrderRow,
): Promise<FulfillmentResult> {
  if (order.itemType === "digital") {
    return { order, shippingEmail: "not_applicable" };
  }
  if (!order.customerEmail) {
    return { order, shippingEmail: "no_customer_email" };
  }
  if (!emailConfigured()) {
    return { order, shippingEmail: "not_configured" };
  }
  if (order.shippedEmailSentAt) {
    return { order, shippingEmail: "already_sent" };
  }
  // Orders fulfilled before attempt ids existed get one on first send.
  const attemptId =
    order.shippingEmailAttemptId ?? (await assignAttemptId(order.id));
  const data: ShippingEmailData = {
    orderId: order.id,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    itemType: order.itemType,
    itemTitle: order.itemTitle,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    shippingAddress: order.shippingAddress,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    attemptId,
  };
  // No claim is taken before the send: the attempt id makes the Resend call
  // idempotent, so a retry after an uncertain failure (or two admins clicking
  // at once) cannot deliver the notice twice, and the sent timestamp is only
  // recorded once Resend has actually accepted the message.
  const accepted = await sendShippingEmail(data, await getContent());
  if (!accepted) {
    return {
      order: { ...order, shippingEmailAttemptId: attemptId },
      shippingEmail: "failed",
    };
  }
  const shippedEmailSentAt = new Date();
  const [updated] = await db
    .update(orders)
    .set({ shippedEmailSentAt })
    .where(eq(orders.id, order.id))
    .returning();
  return {
    order: updated ?? {
      ...order,
      shippingEmailAttemptId: attemptId,
      shippedEmailSentAt,
    },
    shippingEmail: "sent",
  };
}

async function assignAttemptId(orderId: number): Promise<string> {
  const attemptId = crypto.randomUUID();
  await db
    .update(orders)
    .set({ shippingEmailAttemptId: attemptId })
    .where(eq(orders.id, orderId));
  return attemptId;
}
