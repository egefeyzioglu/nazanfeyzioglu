import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import { env } from "src/env";
import { cartLineKey, type CartItemRef } from "src/lib/cart";
import {
  CURRENCY,
  MAX_CART_LINES,
  MAX_PRINT_QUANTITY,
  ORDER_ITEM_TYPES,
  requiresShipping,
  shippingCentsFor,
} from "src/lib/orders";
import { formatPrintSpec } from "src/lib/prints";
import { db } from "src/server/db";
import {
  getSoldOriginalIds,
  getSoldPrintQuantities,
  remainingCopies,
} from "src/server/orders";
import { getStripe, stripeConfigured } from "src/server/stripe";

/**
 * Creates a Stripe Checkout Session for the cart's items and returns its URL
 * for the client to redirect to. Prices always come from the database — the
 * client only ever names items and quantities. Each line item carries its
 * item type/id in product metadata, which the webhook reads back to record
 * the order.
 *
 * The admin CMS stays on tRPC; this public mutation is a plain route handler.
 */

const itemSchema = z.object({
  itemType: z.enum(ORDER_ITEM_TYPES),
  id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(MAX_CART_LINES),
  /** Same-site path to return to when checkout is cancelled. */
  cancelPath: z
    .string()
    .regex(/^\/(?!\/)/, "must be a same-site path")
    .default("/cart"),
});

type RequestedItem = z.infer<typeof itemSchema>;

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Checkout is not configured" },
      { status: 503 },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (new Set(body.items.map(cartLineKey)).size !== body.items.length) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const origin = siteOrigin(req);
  if (origin === null) {
    console.error(
      "SITE_URL must be set for Stripe checkout in production (no VERCEL_URL either)",
    );
    return NextResponse.json(
      { error: "Checkout is not configured" },
      { status: 503 },
    );
  }

  const resolved = await resolveLineItems(body.items, origin);
  if ("problems" in resolved) {
    return NextResponse.json(
      {
        error: resolved.problems.map((p) => p.message).join(" "),
        unavailable: resolved.problems.flatMap((p) =>
          p.kind === "unavailable" ? [p.ref] : [],
        ),
        adjustments: resolved.problems.flatMap((p) =>
          p.kind === "quantity" ? [{ ...p.ref, quantity: p.maxQuantity }] : [],
        ),
      },
      { status: 409 },
    );
  }

  const itemTypes = body.items.map((i) => i.itemType);
  const shippingParams: Partial<Stripe.Checkout.SessionCreateParams> =
    requiresShipping(itemTypes)
      ? {
          shipping_address_collection: { allowed_countries: ["CA"] },
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: {
                  amount: shippingCentsFor(itemTypes),
                  currency: CURRENCY,
                },
                display_name:
                  shippingCentsFor(itemTypes) === 0
                    ? "Free shipping within Canada"
                    : "Flat rate shipping within Canada",
              },
            },
          ],
        }
      : {};

  let session;
  try {
    session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: resolved.lineItems,
      metadata: { cart: "1", lines: String(resolved.lineItems.length) },
      customer_creation: "if_required",
      ...shippingParams,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${body.cancelPath}`,
    });
  } catch (err) {
    console.error("Stripe checkout session creation failed", err);
    return NextResponse.json(
      { error: "Could not start checkout — please try again" },
      { status: 502 },
    );
  }

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 502 },
    );
  }
  return NextResponse.json({ url: session.url });
}

type LineItem = Stripe.Checkout.SessionCreateParams.LineItem;

/**
 * Why a requested line cannot be checked out as-is. `unavailable` lines are
 * dropped from the cart by the client; `quantity` lines are reduced to
 * `maxQuantity` so the shopper can retry.
 */
type Problem =
  | { kind: "unavailable"; ref: CartItemRef; message: string }
  | {
      kind: "quantity";
      ref: CartItemRef;
      maxQuantity: number;
      message: string;
    };

/**
 * Loads every requested item in two batched queries and validates each
 * against price, availability and quantity caps. Returns Stripe line items
 * in request order, or the full list of problems so the shopper can fix the
 * cart in one go.
 */
async function resolveLineItems(
  items: RequestedItem[],
  origin: string,
): Promise<{ lineItems: LineItem[] } | { problems: Problem[] }> {
  const printIds = items.filter((i) => i.itemType === "print").map((i) => i.id);
  const workIds = items.filter((i) => i.itemType !== "print").map((i) => i.id);

  const [printRows, workRows] = await Promise.all([
    printIds.length
      ? db.query.prints.findMany({
          where: (p, { inArray }) => inArray(p.id, printIds),
        })
      : [],
    workIds.length
      ? db.query.works.findMany({
          where: (w, { inArray }) => inArray(w.id, workIds),
        })
      : [],
  ]);
  const [soldPrints, soldOriginals] = await Promise.all([
    getSoldPrintQuantities(printRows.map((p) => p.id)),
    getSoldOriginalIds(
      items.filter((i) => i.itemType === "original").map((i) => i.id),
    ),
  ]);
  const printsById = new Map(printRows.map((p) => [p.id, p]));
  const worksById = new Map(workRows.map((w) => [w.id, w]));

  const lineItems: LineItem[] = [];
  const problems: Problem[] = [];

  for (const item of items) {
    const ref: CartItemRef = { itemType: item.itemType, id: item.id };
    const unavailable = (message: string) =>
      problems.push({ kind: "unavailable", ref, message });

    if (item.itemType === "print") {
      const print = printsById.get(item.id);
      if (!print) {
        unavailable("A print in your cart is no longer available.");
        continue;
      }
      if (print.priceCents === null) {
        unavailable(`${print.title} is not available for purchase yet.`);
        continue;
      }
      const remaining = remainingCopies(
        print.editionSize,
        soldPrints.get(print.id) ?? 0,
      );
      if (remaining !== null && remaining <= 0) {
        unavailable(`${print.title} is sold out.`);
        continue;
      }
      const maxQuantity = Math.min(MAX_PRINT_QUANTITY, remaining ?? Infinity);
      if (item.quantity > maxQuantity) {
        problems.push({
          kind: "quantity",
          ref,
          maxQuantity,
          message: `Only ${maxQuantity} ${maxQuantity === 1 ? "copy" : "copies"} of ${print.title} ${maxQuantity === 1 ? "is" : "are"} available; your cart has been updated.`,
        });
        continue;
      }
      lineItems.push(
        lineItem(ref, item.quantity, print.priceCents, {
          name: print.title,
          description: `${formatPrintSpec(print)} · ${print.edition}`,
          images: [absoluteImageUrl(print.image, origin)],
        }),
      );
      continue;
    }

    const work = worksById.get(item.id);
    if (!work) {
      unavailable("A work in your cart is no longer available.");
      continue;
    }
    if (item.quantity > 1) {
      problems.push({
        kind: "quantity",
        ref,
        maxQuantity: 1,
        message: `Only one copy of ${work.title} can be purchased; your cart has been updated.`,
      });
      continue;
    }
    if (item.itemType === "original") {
      if (
        work.digital ||
        work.originalUnavailable ||
        work.originalPriceCents === null
      ) {
        unavailable(`The original of ${work.title} is not available.`);
        continue;
      }
      if (soldOriginals.has(work.id)) {
        unavailable(`The original of ${work.title} has been sold.`);
        continue;
      }
      lineItems.push(
        lineItem(ref, 1, work.originalPriceCents, {
          name: `${work.title} — original`,
          description: work.medium,
          images: [absoluteImageUrl(work.image, origin)],
        }),
      );
      continue;
    }
    if (!work.digital || work.digitalPriceCents === null) {
      unavailable(`${work.title} is not available as a digital edition.`);
      continue;
    }
    lineItems.push(
      lineItem(ref, 1, work.digitalPriceCents, {
        name: `${work.title} — digital edition`,
        images: [absoluteImageUrl(work.image, origin)],
      }),
    );
  }

  return problems.length > 0 ? { problems } : { lineItems };
}

/** Quantity is fixed here — the cart page is where it is adjusted. */
function lineItem(
  ref: CartItemRef,
  quantity: number,
  unitAmount: number,
  product: Omit<
    Stripe.Checkout.SessionCreateParams.LineItem.PriceData.ProductData,
    "metadata"
  >,
): LineItem {
  return {
    quantity,
    price_data: {
      currency: CURRENCY,
      unit_amount: unitAmount,
      product_data: {
        ...product,
        metadata: { itemType: ref.itemType, itemId: String(ref.id) },
      },
    },
  };
}

/**
 * Origin for Stripe redirect URLs (which must be absolute), in trust order:
 * the configured SITE_URL (the canonical origin), then the Vercel-injected
 * deployment host (platform-set, so not attacker-controlled), then — in
 * development only — the request's own origin. Request headers like
 * x-forwarded-host are deliberately never consulted: they are
 * attacker-influenced. Returns null when no trusted origin exists (production
 * without SITE_URL or VERCEL_URL).
 */
function siteOrigin(req: Request): string | null {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, "");
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  if (env.NODE_ENV === "production") return null;
  return new URL(req.url).origin;
}

/** Stripe requires absolute image URLs; CMS images may be site-relative. */
function absoluteImageUrl(image: string, origin: string): string {
  return image.startsWith("http") ? image : `${origin}${image}`;
}
