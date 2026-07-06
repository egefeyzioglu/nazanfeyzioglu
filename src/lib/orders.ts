/**
 * Order domain constants and helpers shared by the schema, the server, and
 * client components. Kept dependency-free (like src/lib/exhibitions.ts) so
 * drizzle-kit and the seed script can import it without tsconfig aliases.
 */

export const ORDER_ITEM_TYPES = ["print", "digital"] as const;
export type OrderItemType = (typeof ORDER_ITEM_TYPES)[number];

export const PAYMENT_STATUSES = ["paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * `oversold` is set by the webhook when a paid checkout exceeds a print's
 * edition size (two buyers can race past the availability check) — the order
 * needs a manual refund in the Stripe Dashboard.
 */
export const FULFILLMENT_STATUSES = [
  "pending",
  "fulfilled",
  "oversold",
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

/**
 * Shape of the shipping details snapshot stored on an order (Stripe's
 * shipping_details object: recipient name + address).
 */
export type ShippingDetails = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
};

/** Everything on the site is priced in Canadian dollars. */
export const CURRENCY = "cad";

/**
 * Integer cents → plain dollars string for an admin form input, e.g.
 * 190000 → "1900". null/undefined (no price set) becomes "".
 */
export function centsToDollarsString(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "" : (cents / 100).toString();
}

/**
 * Admin form input value (dollars) → integer cents, e.g. "1900" → 190000.
 * A blank input means no price, stored as null.
 */
export function dollarsStringToCents(value: string): number | null {
  return value.trim() === "" ? null : Math.round(parseFloat(value) * 100);
}

/** Formats integer cents in the site's display style, e.g. 190000 → "1,900 CAD". */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  const formatted = new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
  return `${formatted} CAD`;
}
