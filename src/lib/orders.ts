/**
 * Order domain constants and helpers shared by the schema, the server, and
 * client components. Kept dependency-free (like src/lib/exhibitions.ts) so
 * drizzle-kit and the seed script can import it without tsconfig aliases.
 */

export const ORDER_ITEM_TYPES = ["print", "digital", "original"] as const;
export type OrderItemType = (typeof ORDER_ITEM_TYPES)[number];

export const PAYMENT_STATUSES = ["paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * `oversold` is set by the webhook when a paid checkout exceeds physical
 * inventory (a print edition or one original) (two buyers can race past the availability check) — the order
 * needs a manual refund in the Stripe Dashboard.
 */
export const FULFILLMENT_STATUSES = [
  "pending",
  "fulfilled",
  "oversold",
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

/**
 * What the admin should see and do about an order's fulfillment. A fully
 * refunded order that was never fulfilled (or was flagged oversold) needs no
 * further action, so it is shown as `no_action` instead of `pending` and its
 * fulfillment controls are hidden. A refunded order that was already shipped
 * stays `fulfilled` — the goods went out, the refund is a separate matter.
 */
export type EffectiveFulfillment = FulfillmentStatus | "no_action";

export function effectiveFulfillment(order: {
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
}): EffectiveFulfillment {
  if (order.paymentStatus !== "refunded") return order.fulfillmentStatus;
  return order.fulfillmentStatus === "fulfilled" ? "fulfilled" : "no_action";
}

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

/** Flat shipping charge per print checkout, regardless of quantity. */
export const PRINT_SHIPPING_CENTS = 3000;

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
 *
 * Accepts only the strict `dollars[.cc]` format; anything malformed also maps
 * to null (no price). The admin forms' `type="number" step="0.01"` inputs are
 * the user-facing validation layer — this is defense in depth against non-form
 * callers. Integer math avoids float rounding (e.g. "10.075" * 100 is
 * 1007.4999…, not 1007.5).
 */
export function dollarsStringToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!match) return null;
  const [, dollars, cents = ""] = match;
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
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
