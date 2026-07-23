# Nazan Feyzioğlu — portfolio site

Artist portfolio for Nazan Feyzioğlu, built on the [T3 Stack](https://create.t3.gg/) (Next.js App Router, Drizzle + Postgres, tRPC, Tailwind v4), with a CMS admin panel backed by Clerk auth and UploadThing image hosting, and Stripe Checkout for prints and digital editions.

## Getting started

```bash
pnpm install
cp .env.example .env      # then fill in the values below
docker run -d --name nazanfeyzioglu-postgres \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=nazanfeyzioglu -p 5432:5432 \
  -v nazanfeyzioglu-pgdata:/var/lib/postgresql/data postgres:16
pnpm db:migrate           # create the Postgres tables
pnpm db:seed              # load the launch content (add --force to wipe & reseed)
pnpm dev
```

On later boots the database is just `docker start nazanfeyzioglu-postgres`.

## Database (Vercel)

The CMS lives in Postgres. In production, provision it through the Vercel
dashboard so everything stays native to Vercel:

1. In your Vercel project, open **Storage → Create Database → Neon (Postgres)**
   and connect it to the project. The integration injects `DATABASE_URL`
   (use the **pooled** connection string) into all environments.
2. Run the schema migration and seed against it once:
   `DATABASE_URL="<neon pooled url>" pnpm db:migrate && DATABASE_URL="<neon pooled url>" pnpm db:seed`
3. Deploy. The app connects through `pg` with a shared pool, so it works with
   Neon's PgBouncer endpoint on serverless functions.

## CMS / admin panel

All site content — series, works, prints, exhibitions, and page text — lives in the database and is edited at `/admin`. Public pages render dynamically, so edits show up immediately.

Page text is edited in place at `/admin/pages`: each tab renders the real page layout and the copy regions are directly editable (WYSIWYG), while the page structure itself stays fixed. Artwork, prints, and exhibition entries are managed in their own sections.

### Enabling admin access

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com) and put its keys in `.env` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Until both are set, the public site works normally and `/admin` shows a setup notice.
2. Sign in once at `/sign-in`, then in the Clerk dashboard open **Users → your user → Metadata** and set **Public metadata** to `{ "role": "admin" }`. Only users with that role can open `/admin`, call the admin tRPC procedures, or upload images.
3. `UPLOADTHING_TOKEN` (from [uploadthing.com](https://uploadthing.com)) enables image uploads from the admin panel; the image field also accepts a path to a file already in `public/`.

For local development before Clerk is set up, `ADMIN_DEV_BYPASS=1` opens `/admin` without auth. It is only honoured in development and only while the Clerk keys are unset — it can never bypass a configured Clerk app or a production build.

## Purchases (Stripe)

Prints and digital editions are sold through hosted [Stripe Checkout](https://docs.stripe.com/payments/checkout); originals stay inquiry-based (buyers get in touch, payment is handled with Stripe Invoicing from the Dashboard). Until `STRIPE_SECRET_KEY` is set, buy buttons fall back to contact links.

1. Put the secret key from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) in `.env` as `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint (**Developers → Webhooks**) for `<site>/api/stripe/webhook` subscribed to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`, and set its signing secret as `STRIPE_WEBHOOK_SECRET`. Orders are recorded by this webhook — without it, payments still succeed but never appear in `/admin/orders`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Optionally set `STRIPE_SHIPPING_RATE_ID` to a Dashboard-defined shipping rate (`shr_…`) to charge shipping on print checkouts.
4. In production, set `SITE_URL` to the canonical origin (e.g. `https://example.com`) so checkout redirect URLs use the custom domain; without it the deployment URL (`VERCEL_URL`) is used, and local dev falls back to the request's own origin.

Prices are set per print (and per digital edition on a work) in the admin panel; items without a price show no buy button. A print's optional **edition size** caps how many copies can be sold — if two buyers race past the check, the later order is flagged **oversold** in `/admin/orders` for a manual refund. Fulfillment (shipping a print, emailing a digital file) is tracked in `/admin/orders`; money — receipts, refunds, payouts — is managed in the Stripe Dashboard.

### Layout

- `src/server/db/schema.ts` — `series`, `work`, `print`, `exhibition`, `site_content`, and `order` tables
- `src/server/api/` — tRPC routers (admin-gated CRUD + reordering, orders)
- `src/server/queries.ts` — read-side queries used by the public pages
- `src/server/stripe.ts` / `src/server/orders.ts` — Stripe client and edition-availability helpers
- `src/app/api/checkout/` and `src/app/api/stripe/webhook/` — checkout-session creation and the order-recording webhook
- `src/lib/content-keys.ts` — the editable page-text fields and their defaults
- `src/app/_components/pages/` — page bodies shared by the public pages and the in-place editor
- `src/app/admin/` — the admin panel UI (`/admin/pages` is the in-place page editor)
- `src/server/uploadthing.ts` — admin-gated UploadThing file router

## Useful scripts

- `pnpm db:studio` — browse the database in Drizzle Studio
- `pnpm db:generate && pnpm db:migrate` — create/apply migrations after schema changes
- `pnpm check` — lint + typecheck
