import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

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
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
 * Runs `fn` in a transaction holding a per-order advisory lock, so the admin
 * actions on an order's fulfillment (fulfil, revert, resend) are serialized.
 * The delivery step holds it across the Resend call: that is the point — a
 * "Mark pending" arriving mid-send waits for the send to finish rather than
 * racing it, so a stale notice can never go out. Same namespacing as the
 * webhook's oversell lock (the database may host multiple projects).
 */
function withOrderLock<T>(id: number, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${"nazanfeyzioglu_order_fulfillment"}), ${id})`,
    );
    return fn(tx);
  });
}

/**
 * Marks an order fulfilled, records the courier details and emails the buyer
 * a shipping confirmation. The status change (with a fresh attempt id) is
 * committed before the email is attempted, so a delivery failure leaves the
 * order fulfilled with `shippedEmailSentAt` unset — see resendShippingEmail.
 * Resolves null when no such order exists.
 */
export async function fulfillOrder(input: {
  id: number;
  trackingCarrier: TrackingCarrier | null;
  trackingNumber: string | null;
}): Promise<FulfillmentResult | null> {
  const trimmed = input.trackingNumber?.trim() ?? "";
  const trackingNumber = trimmed === "" ? null : trimmed;
  // Only a paid, pending → fulfilled transition sends the email: a
  // double-submit (or a stale tab) finds the order already fulfilled and does
  // nothing, an oversold order keeps its refund-required state, and a
  // refunded order is never shipped. Re-fulfilling after "Mark pending" (say,
  // with a corrected tracking number) is a fresh shipment notice, so the
  // previous send is forgotten here.
  const transitioned = await withOrderLock(input.id, async (tx) => {
    const [order] = await tx
      .update(orders)
      .set({
        fulfillmentStatus: "fulfilled",
        trackingCarrier: input.trackingCarrier,
        trackingNumber,
        shippingEmailAttemptId: crypto.randomUUID(),
        shippedEmailSentAt: null,
      })
      .where(
        and(
          eq(orders.id, input.id),
          eq(orders.fulfillmentStatus, "pending"),
          eq(orders.paymentStatus, "paid"),
        ),
      )
      .returning();
    if (order) return { order, transitioned: true };
    const existing = await tx.query.orders.findFirst({
      where: eq(orders.id, input.id),
    });
    return existing ? { order: existing, transitioned: false } : null;
  });
  if (!transitioned) return null;
  if (!transitioned.transitioned) {
    return { order: transitioned.order, shippingEmail: "not_applicable" };
  }
  // The transition is committed: whatever happens to the delivery below, a
  // retry finds the same attempt id and so the same idempotency key.
  return deliverShippingEmail(input.id);
}

/**
 * Reverts a fulfilled order to pending (its courier details are kept so they
 * are prefilled on re-fulfilment). Only `fulfilled` may go back to `pending`:
 * an oversold order must stay flagged for its refund, and a refunded order
 * that never shipped must not become fulfillable. Resolves the updated row,
 * or null when the order does not exist or is not fulfilled.
 */
export function revertFulfillment(id: number): Promise<OrderRow | null> {
  return withOrderLock(id, async (tx) => {
    const [order] = await tx
      .update(orders)
      .set({ fulfillmentStatus: "pending" })
      .where(and(eq(orders.id, id), eq(orders.fulfillmentStatus, "fulfilled")))
      .returning();
    return order ?? null;
  });
}

/**
 * Sends the shipping confirmation for an order that is already fulfilled but
 * whose email never went out — the first attempt failed or email was not
 * configured at the time. Resolves null when no such order exists.
 */
export function resendShippingEmail(
  id: number,
): Promise<FulfillmentResult | null> {
  return deliverShippingEmail(id);
}

/**
 * Delivers the shipping confirmation an order is owed, if any. Runs under the
 * order's lock and reads the row there, so it acts on the current state and
 * not on a snapshot that a concurrent revert could have invalidated.
 *
 * The attempt id is always committed before Resend is called (a legacy order
 * without one gets it in a transaction of its own, then this runs again), so
 * a rollback after Resend accepted the message can lose at most the sent
 * timestamp — and the retry, reusing the same idempotency key, is a no-op.
 */
async function deliverShippingEmail(
  id: number,
): Promise<FulfillmentResult | null> {
  const result = await withOrderLock(id, async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    if (!order) return null;
    if (
      order.fulfillmentStatus !== "fulfilled" ||
      order.itemType === "digital"
    ) {
      return { order, shippingEmail: "not_applicable" as const };
    }
    if (!order.customerEmail) {
      return { order, shippingEmail: "no_customer_email" as const };
    }
    if (!emailConfigured()) {
      return { order, shippingEmail: "not_configured" as const };
    }
    if (order.shippedEmailSentAt) {
      return { order, shippingEmail: "already_sent" as const };
    }
    if (!order.shippingEmailAttemptId) {
      // Fulfilled before attempt ids existed. Conditional on the id still
      // being unset so, even without the lock, concurrent retries would end
      // up sharing one id (and one Resend idempotency key).
      await tx
        .update(orders)
        .set({ shippingEmailAttemptId: crypto.randomUUID() })
        .where(and(eq(orders.id, id), isNull(orders.shippingEmailAttemptId)));
      return "assigned" as const;
    }
    return sendShippingForOrder(tx, order, order.shippingEmailAttemptId);
  });
  return result === "assigned" ? deliverShippingEmail(id) : result;
}

/** Sends the confirmation for `order`; the caller holds the order's lock. */
async function sendShippingForOrder(
  tx: Tx,
  order: OrderRow,
  attemptId: string,
): Promise<FulfillmentResult> {
  const data: ShippingEmailData = {
    orderId: order.id,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    itemType: order.itemType,
    itemTitle: order.itemTitle,
    customerEmail: order.customerEmail ?? "",
    customerName: order.customerName,
    shippingAddress: order.shippingAddress,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    attemptId,
  };
  const accepted = await sendShippingEmail(data, await getContent());
  if (!accepted) return { order, shippingEmail: "failed" };

  // Record the send against the attempt it belongs to. The lock rules out a
  // revert-and-refulfil while Resend was being called, but the predicate
  // keeps this completion from ever marking a different attempt as sent.
  const [updated] = await tx
    .update(orders)
    .set({ shippedEmailSentAt: new Date() })
    .where(
      and(
        eq(orders.id, order.id),
        eq(orders.fulfillmentStatus, "fulfilled"),
        eq(orders.shippingEmailAttemptId, attemptId),
      ),
    )
    .returning();
  if (updated) return { order: updated, shippingEmail: "sent" };
  const current = await tx.query.orders.findFirst({
    where: eq(orders.id, order.id),
  });
  return { order: current ?? order, shippingEmail: "not_applicable" };
}
