import "server-only";

import type Stripe from "stripe";

import {
  CHECKOUT_ITEMS_METADATA_KEY,
  decodeCheckoutItems,
} from "src/lib/checkout-metadata";
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

/**
 * Thrown when a session this integration created has a line whose item can
 * no longer be identified. The webhook lets it propagate so Stripe retries
 * rather than acknowledging a payment that was never recorded.
 */
export class UnidentifiedLineItemError extends Error {
  constructor(sessionId: string, index: number) {
    super(
      `Cannot identify line item ${index} of checkout session ${sessionId}`,
    );
    this.name = "UnidentifiedLineItemError";
  }
}

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
 * Identifies what each line item bought. Sources, in order:
 *
 * 1. The line's product metadata, written by the checkout route.
 * 2. The session's `items` metadata — the same identifiers by line index,
 *    which survive the ad hoc Product being deleted in the Dashboard.
 * 3. Legacy single-item sessions created before the cart existed, which
 *    carried `itemType`/`itemId` in session metadata.
 *
 * Returns null for sessions this integration did not create (no cart or
 * legacy metadata), and throws when a cart session has a line that none of
 * the sources can identify.
 */
export function purchasedLines(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[],
): PurchasedLine[] | null {
  const metadata = session.metadata ?? {};
  const sessionItems = decodeCheckoutItems(
    metadata[CHECKOUT_ITEMS_METADATA_KEY],
  );
  const legacyType = metadata.itemType;
  const legacyId = Number(metadata.itemId);
  const legacy =
    isOrderItemType(legacyType) && Number.isInteger(legacyId)
      ? { itemType: legacyType, id: legacyId }
      : null;
  if (metadata.cart !== "1" && !legacy) return null;

  return lineItems.map((line, index) => {
    const product = line.price?.product;
    const productMeta =
      typeof product === "object" && !product.deleted ? product.metadata : null;
    let itemType: unknown = productMeta?.itemType;
    let itemId = Number(productMeta?.itemId);
    if (!isOrderItemType(itemType) || !Number.isInteger(itemId)) {
      const fallback =
        sessionItems?.[index] ??
        (legacy && lineItems.length === 1 ? legacy : null);
      if (!fallback) throw new UnidentifiedLineItemError(session.id, index);
      itemType = fallback.itemType;
      itemId = fallback.id;
    }
    if (!isOrderItemType(itemType)) {
      throw new UnidentifiedLineItemError(session.id, index);
    }
    const quantity = line.quantity ?? 1;
    return {
      itemType,
      itemId,
      quantity,
      unitAmount:
        line.price?.unit_amount ?? Math.round(line.amount_subtotal / quantity),
      amountTotal: line.amount_total,
      description: line.description ?? null,
    };
  });
}
