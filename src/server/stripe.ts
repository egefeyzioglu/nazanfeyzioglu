import "server-only";

import Stripe from "stripe";

import { env } from "src/env";

/**
 * Whether Stripe checkout is available. Until STRIPE_SECRET_KEY is set the
 * public site works normally and buy buttons fall back to contact links —
 * the same optional-until-configured pattern as Clerk and UploadThing.
 */
export function stripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

let client: Stripe | undefined;

/**
 * Lazily constructed Stripe client (constructing at module scope would throw
 * at import time when the key is unset). Uses the API version pinned by the
 * installed stripe-node release.
 */
export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}
