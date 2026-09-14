/**
 * Cart domain logic shared by the cart provider, the cart page and the
 * checkout request. Pure functions over a plain array so it is unit-testable
 * and the same rules apply everywhere.
 *
 * The cart lives in the browser (localStorage) — there are no customer
 * accounts. Each line snapshots the display fields it needs (title, price,
 * image) so the cart page renders without a round trip; the snapshot is never
 * trusted at checkout, which re-reads prices and availability from the
 * database.
 */

import { z } from "zod";

import {
  MAX_CART_LINES,
  ORDER_ITEM_TYPES,
  maxQuantityForType,
  shippingCentsFor,
  type OrderItemType,
} from "./orders";

/** localStorage key holding the serialised cart. */
export const CART_STORAGE_KEY = "nazanfeyzioglu.cart.v1";

/** Identifies a purchasable item; the same pair the checkout route accepts. */
export type CartItemRef = { itemType: OrderItemType; id: number };

const cartLineSchema = z.object({
  itemType: z.enum(ORDER_ITEM_TYPES),
  id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  title: z.string().min(1),
  /** Secondary line under the title, e.g. the print spec or medium. */
  detail: z.string(),
  image: z.string().min(1),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  unitPriceCents: z.number().int().positive(),
  /** Same-site path back to where the item was added. */
  href: z.string().regex(/^\/(?!\/)/),
});

export type CartLine = z.infer<typeof cartLineSchema>;

const storedCartSchema = z.object({ lines: z.array(cartLineSchema) });

/** Stable key for a line, used for React keys and lookups. */
export function cartLineKey(ref: CartItemRef): string {
  return `${ref.itemType}:${ref.id}`;
}

function sameItem(a: CartItemRef, b: CartItemRef): boolean {
  return a.itemType === b.itemType && a.id === b.id;
}

/** Clamps a requested quantity to the per-type cap; never below one. */
export function clampQuantity(
  itemType: OrderItemType,
  quantity: number,
): number {
  const max = maxQuantityForType(itemType);
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(max, Math.max(1, Math.trunc(quantity)));
}

/**
 * Adds a line, merging into an existing line for the same item. Quantities
 * are clamped to the per-type cap, so adding an original twice still yields
 * one. Returns the same array instance when nothing changed (full cart).
 */
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find((l) => sameItem(l, line));
  if (existing) {
    const quantity = clampQuantity(
      line.itemType,
      existing.quantity + line.quantity,
    );
    return lines.map((l) => (l === existing ? { ...line, quantity } : l));
  }
  if (lines.length >= MAX_CART_LINES) return lines;
  return [
    ...lines,
    { ...line, quantity: clampQuantity(line.itemType, line.quantity) },
  ];
}

export function removeLine(lines: CartLine[], ref: CartItemRef): CartLine[] {
  return lines.filter((l) => !sameItem(l, ref));
}

/** Sets a line's quantity; zero or less removes the line. */
export function setLineQuantity(
  lines: CartLine[],
  ref: CartItemRef,
  quantity: number,
): CartLine[] {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return removeLine(lines, ref);
  }
  return lines.map((l) =>
    sameItem(l, ref)
      ? { ...l, quantity: clampQuantity(l.itemType, quantity) }
      : l,
  );
}

/** A line reported by Stripe as purchased, used to reconcile the cart afterwards. */
export type PurchasedLine = CartItemRef & { quantity: number };

/**
 * Removes what a completed checkout bought — only those items, only those
 * quantities — so anything added in another tab, or after the checkout
 * started, survives. Returns the same array instance when nothing matched.
 */
export function removePurchasedLines(
  lines: CartLine[],
  purchased: PurchasedLine[],
): CartLine[] {
  let changed = false;
  const next = lines.flatMap((line) => {
    const bought = purchased
      .filter((p) => sameItem(p, line))
      .reduce((sum, p) => sum + p.quantity, 0);
    if (bought === 0) return [line];
    changed = true;
    const quantity = line.quantity - bought;
    return quantity > 0 ? [{ ...line, quantity }] : [];
  });
  return changed ? next : lines;
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartSubtotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
}

export function cartShippingCents(lines: CartLine[]): number {
  return shippingCentsFor(lines.map((l) => l.itemType));
}

/**
 * Parses a serialised cart from storage. Anything malformed (older versions,
 * hand-edited values) yields an empty cart rather than a crash; lines are
 * re-clamped and de-duplicated so a stale cap never survives a reload.
 */
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const parsed = storedCartSchema.safeParse(json);
  if (!parsed.success) return [];
  return parsed.data.lines.reduce<CartLine[]>(
    (acc, line) => addLine(acc, line),
    [],
  );
}

export function serializeCart(lines: CartLine[]): string {
  return JSON.stringify({ lines });
}
