import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import { env } from "src/env";
import { CURRENCY } from "src/lib/orders";
import { db } from "src/server/db";
import { getSoldPrintQuantities, remainingCopies } from "src/server/orders";
import { getStripe, stripeConfigured } from "src/server/stripe";

/**
 * Creates a Stripe Checkout Session for a print or a digital edition and
 * returns its URL for the client to redirect to. Prices always come from the
 * database — the client only ever names an item.
 *
 * Originals are deliberately not sold here (inquiry + Stripe Invoicing), and
 * the admin CMS stays on tRPC; this public mutation is a plain route handler.
 */

/** Per-checkout cap for open (unlimited) print editions. */
const MAX_PRINT_QUANTITY = 10;

const bodySchema = z.object({
  itemType: z.enum(["print", "digital"]),
  id: z.number().int().positive(),
  /** Same-site path to return to when checkout is cancelled. */
  cancelPath: z
    .string()
    .regex(/^\/(?!\/)/, "must be a same-site path")
    .default("/"),
});

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
  const item =
    body.itemType === "print"
      ? await printLineItem(body.id, origin)
      : await digitalLineItem(body.id, origin);
  if ("error" in item) {
    return NextResponse.json({ error: item.error }, { status: item.status });
  }

  let session;
  try {
    session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [item.lineItem],
      metadata: { itemType: body.itemType, itemId: String(body.id) },
      customer_creation: "if_required",
      ...item.extraParams,
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

type ItemResult =
  | {
      lineItem: Stripe.Checkout.SessionCreateParams.LineItem;
      extraParams: Partial<Stripe.Checkout.SessionCreateParams>;
    }
  | { error: string; status: number };

async function printLineItem(id: number, origin: string): Promise<ItemResult> {
  const print = await db.query.prints.findFirst({
    where: (p, { eq }) => eq(p.id, id),
  });
  if (!print) return { error: "Print not found", status: 404 };
  if (print.priceCents === null) {
    return {
      error: "This print is not available for purchase yet",
      status: 409,
    };
  }

  const sold = await getSoldPrintQuantities([print.id]);
  const remaining = remainingCopies(print.editionSize, sold.get(print.id) ?? 0);
  if (remaining !== null && remaining <= 0) {
    return { error: "This edition is sold out", status: 409 };
  }
  const maxQuantity = Math.min(MAX_PRINT_QUANTITY, remaining ?? Infinity);

  return {
    lineItem: {
      quantity: 1,
      // Quantity is adjusted on Stripe's page; the webhook reads the final
      // quantity from the session's line items, not from our metadata.
      ...(maxQuantity > 1 && {
        adjustable_quantity: {
          enabled: true,
          minimum: 1,
          maximum: maxQuantity,
        },
      }),
      price_data: {
        currency: CURRENCY,
        unit_amount: print.priceCents,
        product_data: {
          name: print.title,
          description: `${print.spec} · ${print.edition}`,
          images: [absoluteImageUrl(print.image, origin)],
        },
      },
    },
    extraParams: {
      shipping_address_collection: { allowed_countries: ["CA", "US"] },
      ...(env.STRIPE_SHIPPING_RATE_ID && {
        shipping_options: [{ shipping_rate: env.STRIPE_SHIPPING_RATE_ID }],
      }),
    },
  };
}

async function digitalLineItem(
  id: number,
  origin: string,
): Promise<ItemResult> {
  const work = await db.query.works.findFirst({
    where: (w, { eq }) => eq(w.id, id),
  });
  if (!work) return { error: "Work not found", status: 404 };
  if (!work.digital || work.digitalPriceCents === null) {
    return {
      error: "This work is not available as a digital edition",
      status: 409,
    };
  }

  return {
    lineItem: {
      quantity: 1,
      price_data: {
        currency: CURRENCY,
        unit_amount: work.digitalPriceCents,
        product_data: {
          name: `${work.title} — digital edition`,
          images: [absoluteImageUrl(work.image, origin)],
        },
      },
    },
    extraParams: {},
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
