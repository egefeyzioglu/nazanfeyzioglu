import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { env } from "src/env";
import { type OrderItemType } from "src/lib/orders";
import { db } from "src/server/db";
import { orders, prints, works } from "src/server/db/schema";
import {
  deploymentEnvironment,
  reportWebhookFailure,
  type WebhookFailureContext,
} from "src/server/observability";
import { getStripe, stripeConfigured } from "src/server/stripe";

/**
 * Stripe webhook: records paid checkouts as orders and marks fully refunded
 * orders. The Clerk middleware matcher does not cover this path, so requests
 * reach the handler unauthenticated — the Stripe signature is the auth.
 */
export async function POST(req: Request) {
  const ctx: WebhookFailureContext = {
    stage: "config",
    environment: deploymentEnvironment(),
  };

  if (!stripeConfigured() || !env.STRIPE_WEBHOOK_SECRET) {
    reportWebhookFailure(new Error("Stripe webhook is not configured"), ctx);
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    reportWebhookFailure(
      new Error("Missing Stripe signature"),
      { ...ctx, stage: "signature" },
      "warning",
    );
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
  } catch (err) {
    reportWebhookFailure(err, { ...ctx, stage: "signature" }, "warning");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  ctx.stage = "handler";
  ctx.livemode = event.livemode;
  ctx.eventId = event.id;
  ctx.eventType = event.type;
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    ctx.checkoutSessionId = event.data.object.id;
  }
  if (
    event.type === "charge.refunded" &&
    typeof event.data.object.payment_intent === "string"
  ) {
    ctx.paymentIntentId = event.data.object.payment_intent;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        // A session can complete before a delayed payment method settles;
        // async_payment_succeeded covers that case later. Only record once paid.
        if (event.data.object.payment_status === "paid") {
          await recordPaidCheckout(event.data.object.id, ctx);
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
          ctx.stage = "persist";
          const refunded = await db
            .update(orders)
            .set({ paymentStatus: "refunded" })
            .where(eq(orders.stripePaymentIntentId, charge.payment_intent))
            .returning({ id: orders.id });
          if (refunded.length === 0) {
            reportWebhookFailure(
              new Error("Refund for unknown order"),
              ctx,
              "warning",
            );
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    reportWebhookFailure(err, ctx);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * Fetches the full session (the event payload omits line items) and upserts
 * the order. Idempotent via the unique session id — Stripe retries
 * deliveries, and completed/async_payment_succeeded can both fire.
 */
async function recordPaidCheckout(
  sessionId: string,
  ctx: WebhookFailureContext,
) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });
  ctx.paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  const itemType = session.metadata?.itemType;
  const itemId = Number(session.metadata?.itemId);
  const validItemType =
    itemType === "print" || itemType === "digital" || itemType === "original";
  const validItemId = Number.isInteger(itemId);
  // Only validated values go into telemetry: metadata on a session this
  // integration did not create is untrusted.
  if (validItemType) ctx.itemType = itemType;
  if (validItemId) ctx.itemId = itemId;
  if (!validItemType || !validItemId) {
    // Not a session this integration created (or malformed metadata); ack it
    // rather than have Stripe retry forever.
    reportWebhookFailure(
      new Error("Checkout session has no item metadata"),
      ctx,
      "warning",
    );
    return;
  }

  const lineItem = session.line_items?.data[0];
  const quantity = lineItem?.quantity ?? 1;
  ctx.stage = "lookup";
  const item = await loadItem(itemType, itemId);
  if (!item) {
    reportWebhookFailure(
      new Error("Ordered item no longer exists"),
      ctx,
      "warning",
    );
  }

  ctx.stage = "persist";
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(orders)
      .values({
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
        shippingAddress:
          session.collected_information?.shipping_details ?? null,
      })
      .onConflictDoNothing({ target: orders.stripeCheckoutSessionId })
      .returning({ id: orders.id });
    const orderId = inserted[0]?.id;
    if (orderId === undefined) return; // already recorded

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
        await tx
          .update(orders)
          .set({ fulfillmentStatus: "oversold" })
          .where(eq(orders.id, orderId));
      }
    }
  });
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
