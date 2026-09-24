import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    /**
     * Clerk secret key. Optional so the public site builds and runs before the
     * Clerk application is configured — the /admin panel requires it.
     */
    CLERK_SECRET_KEY: z.string().optional(),
    /**
     * UploadThing token used by the /api/uploadthing route for admin image
     * uploads. Optional so the site boots before UploadThing is configured;
     * without it, admin uploads fail but the manual /public path field still
     * works.
     */
    UPLOADTHING_TOKEN: z.string().optional(),
    /**
     * Set to "1" to open /admin without auth — only honoured in development
     * and only while the Clerk keys above are unset.
     */
    ADMIN_DEV_BYPASS: z.string().optional(),
    /**
     * Stripe secret key. Optional so the site builds and runs before Stripe
     * is configured — without it, buy buttons fall back to contact links.
     */
    STRIPE_SECRET_KEY: z.string().optional(),
    /**
     * Signing secret for the /api/stripe/webhook endpoint (whsec_…), from the
     * webhook configuration in the Stripe Dashboard. Required for orders to
     * be recorded.
     */
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    /**
     * Canonical site origin (e.g. "https://nazanfeyzioglu.com") used for
     * Stripe redirect URLs. Set it in production for correct custom-domain
     * redirects; when unset, the Vercel deployment URL is used, and local
     * dev falls back to the request's own origin.
     */
    SITE_URL: z.string().url().optional(),
    /**
     * Sentry DSN. Optional so monitoring can be enabled after deploy; when
     * unset, webhook failures are only written to the server console.
     */
    SENTRY_DSN: z.string().url().optional(),
    /**
     * Shared secret that unlocks GET /api/sentry-test in production (sent as
     * the x-sentry-test-token header). Outside production the route only
     * requires SENTRY_DSN.
     */
    SENTRY_TEST_TOKEN: z.string().min(16).optional(),
    /**
     * Vercel deployment environment, injected automatically on Vercel.
     */
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    /**
     * Deployment host (e.g. "my-app-abc123.vercel.app") that Vercel injects
     * on both production and preview deployments.
     */
    VERCEL_URL: z.string().optional(),
    /**
     * Resend API key (re_…) for order emails: a confirmation to the buyer,
     * shipping confirmations, and a new-order notification to the seller.
     * Optional so the site works
     * before Resend is configured — orders are still recorded, just not
     * emailed.
     */
    RESEND_API_KEY: z.string().optional(),
    /**
     * Sender for order emails, on a domain verified in Resend, e.g.
     * "Nazan Feyzioğlu <orders@example.com>". Required alongside
     * RESEND_API_KEY for any email to be sent.
     */
    ORDER_EMAIL_FROM: z.string().optional(),
    /**
     * Where new-order notifications go. Falls back to the Contact page email
     * edited in the admin panel.
     */
    ORDER_NOTIFICATION_EMAIL: z.string().email().optional(),
    /**
     * PostHog personal API key (phx_…) with the query:read scope, used by
     * the admin Overview page to read views and the checkout funnel. Optional:
     * without it (and POSTHOG_PROJECT_ID) the Overview shows a setup notice.
     * Never exposed to the browser.
     */
    POSTHOG_PERSONAL_API_KEY: z.string().optional(),
    /** Numeric PostHog project id (Settings → Project → Project ID). */
    POSTHOG_PROJECT_ID: z.string().regex(/^\d+$/).optional(),
    /**
     * PostHog app host for the query API (e.g. "https://us.posthog.com").
     * Derived from NEXT_PUBLIC_POSTHOG_HOST for PostHog Cloud; only needed
     * for self-hosted instances.
     */
    POSTHOG_API_HOST: z.string().url().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    /** Clerk publishable key. Optional until the Clerk application is configured. */
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    ADMIN_DEV_BYPASS: process.env.ADMIN_DEV_BYPASS,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    SITE_URL: process.env.SITE_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_TEST_TOKEN: process.env.SENTRY_TEST_TOKEN,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    ORDER_EMAIL_FROM: process.env.ORDER_EMAIL_FROM,
    ORDER_NOTIFICATION_EMAIL: process.env.ORDER_NOTIFICATION_EMAIL,
    POSTHOG_PERSONAL_API_KEY: process.env.POSTHOG_PERSONAL_API_KEY,
    POSTHOG_PROJECT_ID: process.env.POSTHOG_PROJECT_ID,
    POSTHOG_API_HOST: process.env.POSTHOG_API_HOST,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
