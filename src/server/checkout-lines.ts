import "server-only";

import type Stripe from "stripe";

import { ORDER_ITEM_TYPES, type OrderItemType } from "src/lib/orders";
import { getStripe } from "src/server/stripe";

/** A purchased line, as identified from the session's line-item metadata. */
export type PurchasedLine = {
  itemType: OrderItemType;
  itemId: number;
  quantity: number;
  unitAmount: number;
  amountTotal: number;
  /** Stripe's product name — the fallback title when the item was deleted. */
  description: string | null;
};

function isOrderItemType(value: unknown): value is OrderItemType {
  return (ORDER_ITEM_TYPES as readonly unknown[]).includes(value);
}

/**
 * Every line item of a checkout session, with products expanded. Uses the
 * paginated endpoint rather than `expand: ["line_items"]` on the session,
 * which is capped at Stripe's default page of 10 — fewer than a full cart.
 */
export function listSessionLineItems(
  sessionId: string,
): Promise<Stripe.LineItem[]> {
  return getStripe()
    .checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ["data.price.product"],
    })
    .autoPagingToArray({ limit: 1000 });
}

/**
 * Reads item type/id off each line item's product metadata (written by the
 * checkout route). Sessions created before the cart existed carried a single
 * item in the session metadata instead; those are still honoured so a
 * checkout that straddles a deploy is recorded.
 */
export function purchasedLines(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[],
): PurchasedLine[] {
  const legacyType = session.metadata?.itemType;
  const legacyId = Number(session.metadata?.itemId);

  return lineItems.flatMap((line, index) => {
    const product = line.price?.product;
    const metadata =
      typeof product === "object" && !product.deleted ? product.metadata : null;
    let itemType: unknown = metadata?.itemType;
    let itemId = Number(metadata?.itemId);
    if (!isOrderItemType(itemType) && index === 0 && lineItems.length === 1) {
      itemType = legacyType;
      itemId = legacyId;
    }
    if (!isOrderItemType(itemType) || !Number.isInteger(itemId)) return [];
    const quantity = line.quantity ?? 1;
    return [
      {
        itemType,
        itemId,
        quantity,
        unitAmount:
          line.price?.unit_amount ??
          Math.round(line.amount_subtotal / quantity),
        amountTotal: line.amount_total,
        description: line.description ?? null,
      },
    ];
  });
}
