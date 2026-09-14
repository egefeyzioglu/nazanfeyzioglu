import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { env } from "src/env";
import { type OrderItemType } from "src/lib/orders";
import {
  captureServerEvent,
  captureServerException,
} from "src/lib/posthog-server";
import {
  listSessionLineItems,
  purchasedLines,
  type PurchasedLine,
} from "src/server/checkout-lines";
import { db } from "src/server/db";
import { orderItems, orders, prints, works } from "src/server/db/schema";
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
          await recordPaidCheckout(event.data.object.id);
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
            .returning({ id: orders.id });
          const refundedOrder = refunded[0];
          if (refundedOrder) {
            captureServerEvent(`order:${refundedOrder.id}`, "order_refunded", {
              item_types: await orderItemTypes(refundedOrder.id),
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
 * Fetches the session and all of its line items (the event payload omits
 * them) and upserts the order with one row per line. Idempotent via the
 * unique session id — Stripe retries deliveries, and
 * completed/async_payment_succeeded can both fire.
 */
async function recordPaidCheckout(sessionId: string) {
  const [session, lineItems] = await Promise.all([
    getStripe().checkout.sessions.retrieve(sessionId),
    listSessionLineItems(sessionId),
  ]);

  // Throws UnidentifiedLineItemError for a cart session with an unreadable
  // line; the resulting 500 makes Stripe retry instead of losing the order.
  const lines = purchasedLines(session, lineItems);
  if (lines === null || lines.length === 0) {
    // Not a session this integration created; ack it rather than have Stripe
    // retry forever.
    console.warn(
      `Ignoring checkout session without item metadata: ${sessionId}`,
    );
    return;
  }

  const catalogue = await loadItems(lines);

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(orders)
      .values({
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
        amountSubtotal:
          session.amount_subtotal ??
          lines.reduce((sum, l) => sum + l.amountTotal, 0),
        amountShipping: session.shipping_cost?.amount_total ?? 0,
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

    await tx.insert(orderItems).values(
      lines.map((line) => {
        const item = catalogue.get(itemKey(line));
        return {
          orderId,
          itemType: line.itemType,
          printId: line.itemType === "print" ? (item?.id ?? null) : null,
          workId: line.itemType !== "print" ? (item?.id ?? null) : null,
          itemTitle: item?.title ?? line.description ?? "Unknown item",
          quantity: line.quantity,
          unitAmount: line.unitAmount,
          amountTotal: line.amountTotal,
        };
      }),
    );

    // The availability check at session creation can be raced by a concurrent
    // buyer; detect it here and flag the order for a manual refund. Locks are
    // taken in a fixed order so two multi-item orders cannot deadlock.
    const limited = lines
      .map((line) => ({ line, item: catalogue.get(itemKey(line)) }))
      .filter(
        (
          entry,
        ): entry is {
          line: PurchasedLine;
          item: { id: number; title: string; editionSize: number };
        } =>
          entry.line.itemType !== "digital" && entry.item?.editionSize != null,
      )
      .sort(
        (a, b) =>
          a.line.itemType.localeCompare(b.line.itemType) ||
          a.item.id - b.item.id,
      );

    let oversold = false;
    for (const { line, item } of limited) {
      // Serialize concurrent webhook transactions for the same physical item:
      // under READ COMMITTED, two simultaneous deliveries would each miss the
      // other's uncommitted insert and both pass the editionSize check. The
      // transaction-scoped advisory lock makes the later committer see the
      // earlier one's rows and flag itself oversold. Namespaced with the table
      // name because the database may host multiple projects.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`nazanfeyzioglu_${line.itemType}`}), ${item.id})`,
      );
      const [row] = await tx
        .select({
          sold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            line.itemType === "print"
              ? eq(orderItems.printId, item.id)
              : eq(orderItems.workId, item.id),
            eq(orderItems.itemType, line.itemType),
            ne(orders.paymentStatus, "refunded"),
          ),
        );
      if ((row?.sold ?? 0) > item.editionSize) oversold = true;
    }
    if (oversold) {
      await tx
        .update(orders)
        .set({ fulfillmentStatus: "oversold" })
        .where(eq(orders.id, orderId));
    }
  });

  const distinctId =
    session.metadata?.posthogDistinctId ?? `checkout:${session.id}`;
  captureServerEvent(distinctId, "checkout_completed", {
    items: lines.map((l) => ({
      item_type: l.itemType,
      item_id: l.itemId,
      quantity: l.quantity,
    })),
    item_types: [...new Set(lines.map((l) => l.itemType))],
    line_count: lines.length,
    unit_count: lines.reduce((sum, l) => sum + l.quantity, 0),
    amount: session.amount_total ?? 0,
    currency: session.currency ?? "cad",
    $insert_id: session.id,
    ...(session.metadata?.posthogSessionId && {
      $session_id: session.metadata.posthogSessionId,
    }),
  });
}

/** Distinct item types on an order, for analytics properties. */
async function orderItemTypes(orderId: number): Promise<OrderItemType[]> {
  const rows = await db
    .select({ itemType: orderItems.itemType })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  return [...new Set(rows.map((r) => r.itemType))];
}

function itemKey(line: { itemType: OrderItemType; itemId: number }): string {
  return `${line.itemType}:${line.itemId}`;
}

type CatalogueItem = { id: number; title: string; editionSize: number | null };

/**
 * Current catalogue rows for the purchased lines, keyed by item type and id.
 * Items deleted from the CMS since checkout are simply absent. Originals are
 * an edition of one; digital editions are unlimited.
 */
async function loadItems(
  lines: PurchasedLine[],
): Promise<Map<string, CatalogueItem>> {
  const printIds = lines
    .filter((l) => l.itemType === "print")
    .map((l) => l.itemId);
  const workIds = lines
    .filter((l) => l.itemType !== "print")
    .map((l) => l.itemId);
  const [printRows, workRows] = await Promise.all([
    printIds.length
      ? db
          .select({
            id: prints.id,
            title: prints.title,
            editionSize: prints.editionSize,
          })
          .from(prints)
          .where(inArray(prints.id, printIds))
      : [],
    workIds.length
      ? db
          .select({ id: works.id, title: works.title })
          .from(works)
          .where(inArray(works.id, workIds))
      : [],
  ]);

  const catalogue = new Map<string, CatalogueItem>();
  for (const line of lines) {
    if (line.itemType === "print") {
      const print = printRows.find((p) => p.id === line.itemId);
      if (print) catalogue.set(itemKey(line), print);
    } else {
      const work = workRows.find((w) => w.id === line.itemId);
      if (work) {
        catalogue.set(itemKey(line), {
          ...work,
          editionSize: line.itemType === "original" ? 1 : null,
        });
      }
    }
  }
  return catalogue;
}
