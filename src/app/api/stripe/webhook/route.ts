import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { env } from "src/env";
import { CONTENT_DEFAULTS } from "src/lib/content-keys";
import { type OrderItemType } from "src/lib/orders";
import {
  captureServerEvent,
  captureServerException,
} from "src/lib/posthog-server";
import { db } from "src/server/db";
import { orders, prints, works } from "src/server/db/schema";
import {
  emailConfigured,
  type OrderEmailData,
  type OrderEmailKind,
  sendOrderEmails,
} from "src/server/email";
import { getContent } from "src/server/queries";
import { getStripe, stripeConfigured } from "src/server/stripe";

/**
 * Stripe webhook: records paid checkouts as orders and marks fully refunded
 * orders. The Clerk middleware matcher does not cover this path, so requests
 * reach the handler unauthenticated — the Stripe signature is the auth.
 */
export async function POST(req: Request) {
  if (!stripeConfigured() || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Signature verification needs the raw body, exactly as sent.
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        // A session can complete before a delayed payment method settles;
        // async_payment_succeeded covers that case later. Only record once paid.
        if (event.data.object.payment_status === "paid") {
          const emailsSettled = await recordPaidCheckout(event.data.object.id);
          if (!emailsSettled) {
            // The order is safely recorded (idempotently), but an order email
            // could not be handed to Resend. Answer non-2xx so Stripe redelivers
            // the event with backoff; the retry sends only what is still owed.
            return NextResponse.json(
              { error: "Order recorded; email delivery pending retry" },
              { status: 500 },
            );
          }
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        // Fires for partial refunds too — only flip the order once the full
        // amount has been returned.
        if (
          charge.amount_refunded >= charge.amount &&
          typeof charge.payment_intent === "string"
        ) {
          const refunded = await db
            .update(orders)
            .set({ paymentStatus: "refunded" })
            .where(eq(orders.stripePaymentIntentId, charge.payment_intent))
            .returning({ id: orders.id, itemType: orders.itemType });
          const refundedOrder = refunded[0];
          if (refundedOrder) {
            captureServerEvent(`order:${refundedOrder.id}`, "order_refunded", {
              item_type: refundedOrder.itemType,
              amount: charge.amount,
              currency: charge.currency,
              $insert_id: event.id,
            });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    captureServerException(err, `stripe_webhook:${event.id}`);
    throw err;
  }

  return NextResponse.json({ received: true });
}

/**
 * Fetches the full session (the event payload omits line items) and upserts
 * the order. Idempotent via the unique session id — Stripe retries
 * deliveries, and completed/async_payment_succeeded can both fire.
 *
 * Resolves false when an order email is still owed after this delivery so the
 * caller can ask Stripe to retry; true otherwise (including when email is not
 * configured, which is not a retryable condition).
 */
async function recordPaidCheckout(sessionId: string): Promise<boolean> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });

  const itemType = session.metadata?.itemType;
  const itemId = Number(session.metadata?.itemId);
  if (
    (itemType !== "print" &&
      itemType !== "digital" &&
      itemType !== "original") ||
    !Number.isInteger(itemId)
  ) {
    // Not a session this integration created (or malformed metadata); ack it
    // rather than have Stripe retry forever.
    console.warn(
      `Ignoring checkout session without item metadata: ${sessionId}`,
    );
    return true;
  }

  const lineItem = session.line_items?.data[0];
  const quantity = lineItem?.quantity ?? 1;
  const item = await loadItem(itemType, itemId);

  const values = {
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    itemType,
    printId: itemType === "print" ? item?.id : null,
    workId: itemType !== "print" ? item?.id : null,
    itemTitle: item?.title ?? lineItem?.description ?? "Unknown item",
    quantity,
    unitAmount:
      lineItem?.price?.unit_amount ??
      Math.round((session.amount_subtotal ?? 0) / quantity),
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? "cad",
    customerEmail: session.customer_details?.email ?? null,
    customerName: session.customer_details?.name ?? null,
    shippingAddress: session.collected_information?.shipping_details ?? null,
  } satisfies typeof orders.$inferInsert;

  // Resolved once the order row is committed, so the emails below can never
  // announce an order that was rolled back.
  const recorded = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(orders)
      .values(values)
      .onConflictDoNothing({ target: orders.stripeCheckoutSessionId })
      .returning({ id: orders.id });
    const orderId = inserted[0]?.id;
    if (orderId === undefined) return null; // already recorded
    let oversold = false;

    // The availability check at session creation can be raced by a concurrent
    // buyer; detect it here and flag the order for a manual refund.
    if (itemType !== "digital" && item?.editionSize != null) {
      // Serialize concurrent webhook transactions for the same physical item: under
      // READ COMMITTED, two simultaneous deliveries would each miss the
      // other's uncommitted insert and both pass the editionSize check. The
      // transaction-scoped advisory lock makes the later committer see the
      // earlier one's row and flag itself oversold. Namespaced with the table
      // name because the database may host multiple projects.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`nazanfeyzioglu_${itemType}`}), ${item.id})`,
      );
      const [row] = await tx
        .select({
          sold: sql<number>`coalesce(sum(${orders.quantity}), 0)::int`,
        })
        .from(orders)
        .where(
          and(
            itemType === "print"
              ? eq(orders.printId, item.id)
              : eq(orders.workId, item.id),
            eq(orders.itemType, itemType),
            ne(orders.paymentStatus, "refunded"),
          ),
        );
      if ((row?.sold ?? 0) > item.editionSize) {
        oversold = true;
        await tx
          .update(orders)
          .set({ fulfillmentStatus: "oversold" })
          .where(eq(orders.id, orderId));
      }
    }
    return { orderId, oversold };
  });

  const distinctId =
    session.metadata?.posthogDistinctId ?? `checkout:${session.id}`;
  captureServerEvent(distinctId, "checkout_completed", {
    item_type: itemType,
    item_id: itemId,
    quantity,
    amount: session.amount_total ?? 0,
    currency: session.currency ?? "cad",
    $insert_id: session.id,
    ...(session.metadata?.posthogSessionId && {
      $session_id: session.metadata.posthogSessionId,
    }),
  });

  const pending: PendingEmails | null = recorded
    ? {
        order: {
          orderId: recorded.orderId,
          stripeCheckoutSessionId: values.stripeCheckoutSessionId,
          itemType,
          itemTitle: values.itemTitle,
          quantity,
          unitAmount: values.unitAmount,
          amountTotal: values.amountTotal,
          customerEmail: values.customerEmail,
          customerName: values.customerName,
          shippingAddress: values.shippingAddress,
          oversold: recorded.oversold,
        },
        owed: { confirmation: true, notification: true },
      }
    : await owedEmails(session.id);
  if (!pending) return true;

  // Delivery failures are logged inside sendOrderEmails rather than thrown.
  // Each message that Resend accepts is marked settled on its own, so a
  // retry (Stripe redelivers while we answer non-2xx, and after a crash
  // between the commit and this point) sends only what is still owed.
  const content = await getContent().catch(() => CONTENT_DEFAULTS);
  const settled = await sendOrderEmails(pending.order, content, pending.owed);
  const now = new Date();
  const update = {
    ...(pending.owed.confirmation &&
      settled.confirmation && { confirmationEmailSentAt: now }),
    ...(pending.owed.notification &&
      settled.notification && { notificationEmailSentAt: now }),
  };
  if (Object.keys(update).length > 0) {
    await db
      .update(orders)
      .set(update)
      .where(eq(orders.id, pending.order.orderId));
  }
  return !emailConfigured() || (settled.confirmation && settled.notification);
}

type PendingEmails = {
  order: OrderEmailData;
  owed: Record<OrderEmailKind, boolean>;
};

/**
 * An already-recorded order with at least one email still owed (delivery
 * failed earlier, or the process died between committing the row and
 * sending), rebuilt from the stored snapshot; null when nothing is owed.
 */
async function owedEmails(
  stripeCheckoutSessionId: string,
): Promise<PendingEmails | null> {
  const [row] = await db
    .select({
      orderId: orders.id,
      stripeCheckoutSessionId: orders.stripeCheckoutSessionId,
      itemType: orders.itemType,
      itemTitle: orders.itemTitle,
      quantity: orders.quantity,
      unitAmount: orders.unitAmount,
      amountTotal: orders.amountTotal,
      customerEmail: orders.customerEmail,
      customerName: orders.customerName,
      shippingAddress: orders.shippingAddress,
      fulfillmentStatus: orders.fulfillmentStatus,
      confirmationEmailSentAt: orders.confirmationEmailSentAt,
      notificationEmailSentAt: orders.notificationEmailSentAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.stripeCheckoutSessionId, stripeCheckoutSessionId),
        or(
          isNull(orders.confirmationEmailSentAt),
          isNull(orders.notificationEmailSentAt),
        ),
      ),
    );
  if (!row) return null;
  const {
    fulfillmentStatus,
    confirmationEmailSentAt,
    notificationEmailSentAt,
    ...order
  } = row;
  return {
    order: { ...order, oversold: fulfillmentStatus === "oversold" },
    owed: {
      confirmation: confirmationEmailSentAt == null,
      notification: notificationEmailSentAt == null,
    },
  };
}

async function loadItem(itemType: OrderItemType, id: number) {
  if (itemType === "print") {
    const rows = await db
      .select({
        id: prints.id,
        title: prints.title,
        editionSize: prints.editionSize,
      })
      .from(prints)
      .where(eq(prints.id, id));
    return rows[0] ?? null;
  }
  const rows = await db
    .select({ id: works.id, title: works.title })
    .from(works)
    .where(eq(works.id, id));
  return rows[0]
    ? { ...rows[0], editionSize: itemType === "original" ? 1 : null }
    : null;
}
