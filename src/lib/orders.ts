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

/** A stored fulfillment status, or `no_action` for refunded orders that never shipped. */
export type EffectiveFulfillment = FulfillmentStatus | "no_action";

export const TRACKING_CARRIERS = [
  {
    id: "canada_post",
    label: "Canada Post",
    trackingUrl: (n) =>
      `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${encodeURIComponent(n)}`,
  },
  {
    id: "ups",
    label: "UPS",
    trackingUrl: (n) =>
      `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`,
  },
  {
    id: "fedex",
    label: "FedEx",
    trackingUrl: (n) =>
      `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`,
  },
  {
    id: "purolator",
    label: "Purolator",
    trackingUrl: (n) =>
      `https://www.purolator.com/en/shipping/tracker?pin=${encodeURIComponent(n)}`,
  },
  {
    id: "dhl",
    label: "DHL Express",
    trackingUrl: (n) =>
      `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(n)}`,
  },
  {
    id: "usps",
    label: "USPS",
    trackingUrl: (n) =>
      `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`,
  },
  { id: "other", label: "Other courier", trackingUrl: null },
] as const satisfies readonly {
  id: string;
  label: string;
  trackingUrl: ((n: string) => string) | null;
}[];
export type TrackingCarrier = (typeof TRACKING_CARRIERS)[number]["id"];
export const TRACKING_CARRIER_IDS = TRACKING_CARRIERS.map((c) => c.id) as [
  TrackingCarrier,
  ...TrackingCarrier[],
];

export function carrierLabel(id: TrackingCarrier): string {
  return TRACKING_CARRIERS.find((carrier) => carrier.id === id)?.label ?? id;
}

/** Courier tracking page for the shipment, or null when unknown carrier / no number. */
export function trackingUrl(
  carrier: TrackingCarrier | null,
  trackingNumber: string | null,
): string | null {
  const number = trackingNumber?.trim();
  if (!carrier || !number) return null;
  const match = TRACKING_CARRIERS.find((option) => option.id === carrier);
  return match?.trackingUrl?.(number) ?? null;
}

/**
 * What the admin should see and do about an order's fulfillment. A fully
 * refunded order that was never fulfilled (or was flagged oversold) needs no
 * further action, so it is shown as `no_action` instead of `pending` and its
 * fulfillment controls are hidden. A refunded order that was already shipped
 * stays `fulfilled` — the goods went out, the refund is a separate matter.
 */
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

/**
 * Default flat shipping charge per print checkout, regardless of quantity.
 * The live rate is edited in Admin → Pages → Prints and stored under
 * PRINT_SHIPPING_KEY as a dollars string; see printShippingCents().
 */
export const PRINT_SHIPPING_CENTS = 3000;

/** `site_content` key holding the print shipping rate in dollars. */
export const PRINT_SHIPPING_KEY = "prints.shipping.price";

/**
 * Resolves the print shipping rate from site content, in cents. Falls back to
 * PRINT_SHIPPING_CENTS when the stored value is missing or malformed so a bad
 * row can never disable checkout.
 */
export function printShippingCents(content: Record<string, string>): number {
  const cents = dollarsStringToCents(content[PRINT_SHIPPING_KEY] ?? "");
  // A pathologically long digit string parses to Infinity or an unsafe
  // integer; treat it like a malformed value rather than sending it to Stripe.
  return cents !== null && Number.isSafeInteger(cents)
    ? cents
    : PRINT_SHIPPING_CENTS;
}

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
