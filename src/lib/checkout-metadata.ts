/**
 * Compact encoding of a checkout's items for Stripe session metadata, kept
 * alongside the per-line product metadata as a second copy that survives an
 * ad hoc Product being deleted in the Dashboard before the webhook runs.
 * Stripe caps a metadata value at 500 characters; the longest possible cart
 * (20 lines of "original:2147483647:10") fits with room to spare.
 */

import { ORDER_ITEM_TYPES, type OrderItemType } from "./orders";

export type CheckoutItem = {
  itemType: OrderItemType;
  id: number;
  quantity: number;
};

/** Metadata key on the Checkout Session holding the encoded items. */
export const CHECKOUT_ITEMS_METADATA_KEY = "items";

export function encodeCheckoutItems(items: CheckoutItem[]): string {
  return items.map((i) => `${i.itemType}:${i.id}:${i.quantity}`).join(",");
}

function isOrderItemType(value: string | undefined): value is OrderItemType {
  return (ORDER_ITEM_TYPES as readonly string[]).includes(value ?? "");
}

/**
 * Decodes the metadata value, in line-item order. Returns null when the
 * value is missing or malformed, so callers can tell "no metadata" from
 * "empty" and fall back or fail accordingly.
 */
export function decodeCheckoutItems(
  value: string | null | undefined,
): CheckoutItem[] | null {
  if (!value) return null;
  const items: CheckoutItem[] = [];
  for (const part of value.split(",")) {
    const [itemType, id, quantity] = part.split(":");
    if (!isOrderItemType(itemType)) return null;
    const parsedId = Number(id);
    const parsedQuantity = Number(quantity);
    if (
      !Number.isInteger(parsedId) ||
      parsedId <= 0 ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      return null;
    }
    items.push({ itemType, id: parsedId, quantity: parsedQuantity });
  }
  return items;
}
