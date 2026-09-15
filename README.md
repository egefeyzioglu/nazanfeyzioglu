# Nazan Feyzioğlu — portfolio site

Artist portfolio for Nazan Feyzioğlu, built on the [T3 Stack](https://create.t3.gg/) (Next.js App Router, Drizzle + Postgres, tRPC, Tailwind v4), with a CMS admin panel backed by Clerk auth and UploadThing image hosting, and Stripe Checkout for prints, originals and digital editions.

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

All site content — series, works, prints, exhibitions, page text, and the shop policies — lives in the database and is edited at `/admin`. Public pages render dynamically, so edits show up immediately.

Page text is edited in place at `/admin/pages`: each tab renders the real page layout and the copy regions are directly editable (WYSIWYG), while the page structure itself stays fixed. Artwork, prints, and exhibition entries are managed in their own sections.

The shop policies (shipping, final-sale returns, damaged or incorrect orders) live at `/policies`, linked from the sidebar navigation, the print purchase dialog, and each original's price line so buyers can read them before checkout. The copy is edited under **Admin → Pages → Policies**; defaults come from `src/lib/content-keys.ts`, so no migration or reseed is needed to add the page to an existing database.

### Enabling admin access

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com) and put its keys in `.env` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Until both are set, the public site works normally and `/admin` shows a setup notice.
2. Sign in once at `/sign-in`, then in the Clerk dashboard open **Users → your user → Metadata** and set **Public metadata** to `{ "role": "admin" }`. Only users with that role can open `/admin`, call the admin tRPC procedures, or upload images.
3. `UPLOADTHING_TOKEN` (from [uploadthing.com](https://uploadthing.com)) enables image uploads from the admin panel; the image field also accepts a path to a file already in `public/`.

For local development before Clerk is set up, `ADMIN_DEV_BYPASS=1` opens `/admin` without auth. It is only honoured in development and only while the Clerk keys are unset — it can never bypass a configured Clerk app or a production build.

## Purchases (Stripe)

Prints, originals and digital editions are sold through hosted [Stripe Checkout](https://docs.stripe.com/payments/checkout). Until `STRIPE_SECRET_KEY` is set, buy buttons fall back to contact links.

1. Put the secret key from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) in `.env` as `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint (**Developers → Webhooks**) for `<site>/api/stripe/webhook` subscribed to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`, and set its signing secret as `STRIPE_WEBHOOK_SECRET`. Orders are recorded by this webhook — without it, payments still succeed but never appear in `/admin/orders`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. In production, set `SITE_URL` to the canonical origin (e.g. `https://example.com`) so checkout redirect URLs use the custom domain; without it the deployment URL (`VERCEL_URL`) is used, and local dev falls back to the request's own origin.

Print shipping is a flat **30 CAD per checkout within Canada**, regardless of quantity. The application supplies the rate directly to Stripe; no Dashboard shipping rate or environment variable is needed. Any legacy `STRIPE_SHIPPING_RATE_ID` setting is ignored and can be removed. Digital editions have no shipping charge. **Originals ship free within Canada** and collect a shipping address at checkout.

Prices are set per print (and per digital edition on a work) in the admin panel; items without a price show no buy button. A print's optional **edition size** caps how many copies can be sold — if two buyers race past the check, the later order is flagged **oversold** in `/admin/orders` for a manual refund. Fulfillment (shipping a print, emailing a digital file) is tracked in `/admin/orders`; money — receipts, refunds, payouts — is managed in the Stripe Dashboard.

### Order emails (Resend)

When the webhook records a paid order it sends two emails through [Resend](https://resend.com): an **order confirmation** to the buyer (item, total, shipping address, and the print preparation copy from **Admin → Pages → Prints**) and a **new-order notification** to the seller (customer details, ship-to address, a link to `/admin/orders`, and an **OVERSOLD** flag when a refund is needed). Until Resend is configured, orders are still recorded but nothing is emailed.

1. Verify your sending domain in Resend (**Domains → Add domain**) and create an API key; put it in `.env` as `RESEND_API_KEY`.
2. Set `ORDER_EMAIL_FROM` to a sender on that domain, e.g. `Nazan Feyzioğlu <orders@example.com>`. Both values are required for any email to go out.
3. Optionally set `ORDER_NOTIFICATION_EMAIL` for the seller notification; otherwise it goes to the Contact page email edited in the admin panel. Replies to the buyer's confirmation also go to this address. If neither is set, the notification stays owed (and the webhook keeps asking Stripe to retry) until one is, so a blank Contact email never silently drops an order notification.

Emails are sent after the order transaction commits, so a Stripe retry never duplicates an order. Each message is tracked on the order (`confirmationEmailSentAt`, `notificationEmailSentAt`) and marked settled once Resend accepts it. If a message cannot be handed to Resend, the webhook still keeps the order but answers with a non-2xx status so Stripe redelivers the event with backoff; the retry rebuilds the emails from the stored order snapshot and sends only what is still owed. The same path covers a crash between the commit and the send. Each message also carries a Resend idempotency key derived from the checkout session as a second guard against duplicates. When Resend is not configured, both messages are settled as never sent and the webhook acks normally; replaying the event after Resend is configured does not email that order.

When a paid order turns out to be **oversold**, the buyer's email says the item sold out moments before payment completed and that a full refund is coming, rather than confirming the order; the seller's notification carries the refund instruction.

Run `pnpm db:migrate` before deploying: migration `0005_order-emails` adds the nullable `confirmationEmailSentAt` and `notificationEmailSentAt` columns to orders.

### Original sales

Run `pnpm db:migrate` before deploying the original checkout changes. Migration `0003_original-orders` adds a numeric original price, a manual availability flag, and the original order type. Existing display prices are preserved; no artwork is automatically made purchasable. This migration follows `0002_print-dimensions` from PR #11 and also supports previews where the earlier `0002_original-orders` migration was already applied.

In **Admin ? Originals**, set a checkout price in CAD to enable **Buy original** on its series page. Blank prices remain inquiry-only. Use **Unavailable / sold elsewhere** to withhold a piece. Artwork details and creation stay in Series. Digital-only works do not appear in Originals.

Each original checkout is for exactly one piece. Paid original orders appear in **Orders**, with filters for originals, prints and digital editions, customer details, shipping address, and fulfillment controls. A paid original is shown as sold and cannot start another checkout. As with limited prints, already-open concurrent checkouts can both pay: the webhook serializes stock checks and flags excess purchases **oversold** for refund review in Stripe. This is oversale detection, not a checkout reservation.

Full refunds restore original availability unless it is manually marked unavailable. A fully refunded order that was never fulfilled (or was flagged oversold) shows **no action required** in Orders instead of pending, and its fulfillment controls are hidden; a refunded order that had already been fulfilled stays fulfilled. Digital purchases of the same work never consume original stock. No additional Stripe webhook subscriptions are required. Existing manual invoices are not imported.

Run `pnpm install --frozen-lockfile`, then `pnpm test` for the commerce regression suite. GitHub Actions runs the same suite on pushes and pull requests with Node 22 and the pnpm version pinned in `package.json`.

Tests exercise the real checkout, webhook, and inventory helpers with in-memory database, email, and analytics boundaries. Signature tests use the Stripe SDK's local verification with signed fixtures; no live Stripe API calls, credentials, or database are required. Coverage includes paid and duplicate deliveries, full and partial refunds, print quantities and remaining copies, sold-out checkout, and sequential overselling. The database fake does not validate PostgreSQL SQL execution, constraints, or concurrent advisory locking; those need a separate database integration suite. Use Stripe test mode for end-to-end validation after migration.

### Layout

Print sizes are stored as physical image width and height in inches, separately
from the image file's pixel dimensions and displayed as height × width. The
catalogue, product details, and checkout description are generated from those
values. Overall paper dimensions add two inches per axis for the one-inch
border on all sides.

Run `pnpm db:migrate` before deploying the structured print-size change.
Migration `0002_print-dimensions.sql` imports recognized legacy inch sizes once,
leaving unknown formats blank and preserving the original `spec` text. Review
blank sizes in Admin → Prints; the previous specification is shown for reference.
Enter both dimensions or leave both blank when the size is not yet confirmed.
Migration `0004_print-border-copy.sql` rewrites the border copy from 2 inches to
1 inch only where the stored value still matches the old default, so custom
edits are preserved.

- `src/server/db/schema.ts` — `series`, `work`, `print`, `exhibition`, `site_content`, and `order` tables
- `src/server/api/` — tRPC routers (admin-gated CRUD + reordering, orders)
- `src/server/queries.ts` — read-side queries used by the public pages
- `src/server/stripe.ts` / `src/server/orders.ts` — Stripe client and edition-availability helpers
- `src/server/email.ts` — Resend client and the order confirmation / seller notification emails
- `src/app/api/checkout/` and `src/app/api/stripe/webhook/` — checkout-session creation and the order-recording webhook
- `src/lib/content-keys.ts` — the editable page-text fields and their defaults
- `src/app/_components/pages/` — page bodies shared by the public pages and the in-place editor
- `src/app/admin/` — the admin panel UI (`/admin/pages` is the in-place page editor)
- `src/server/uploadthing.ts` — admin-gated UploadThing file router

## Monitoring (Sentry)

Sentry is optional until configured. In Vercel, install the Sentry integration
for the project so it injects the DSN and build-time source-map variables, or
set `SENTRY_DSN` manually from the Sentry project settings. Events are tagged
with `VERCEL_ENV` (`production`, `preview` or `development`) when Vercel
provides it.

The `/api/stripe/webhook` route reports every non-2xx or thrown path with
`area=stripe-webhook`. Reports include the Stripe event id, event type,
checkout session id, payment intent id, item type and item id when those are
available. Payloads, secrets, signatures, headers and customer details are not
logged or sent to Sentry. Sentry is the alerting channel for the webhook;
PostHog separately receives only the error type and code of handler exceptions
alongside the analytics events.

Recommended Sentry alerts:

- Issue alert for `area:stripe-webhook environment:production` when there is
  more than 1 event in 1 hour, routed to email or Slack.
- A separate new issue alert for `area:stripe-webhook environment:production`,
  also routed to email or Slack.

To check that events reach Sentry, call the smoke-test route. It reports a
synthetic failure through the same code path as the webhook, waits for the
SDK to flush, and returns a `testId` to search for in Sentry:

```bash
curl -s https://<preview-host>/api/sentry-test | jq          # 200, event tagged stripe_event_type:sentry.test
curl -s -o /dev/null -w '%{http_code}\n' 'https://<preview-host>/api/sentry-test?mode=throw'   # 500, unhandled route error
```

The route answers 404 unless `SENTRY_DSN` is set for that Vercel environment
(the body says so; Preview and Production variables are configured
separately). On production it also
requires `SENTRY_TEST_TOKEN` in the environment and the same value in an
`x-sentry-test-token` request header. Both test events count towards the
alert rules above, so run them on a preview deployment unless you want to
confirm the production alert routing.

To trigger test failures in a non-production environment with the Stripe CLI:

```bash
stripe trigger checkout.session.completed --override checkout_session:metadata.itemType=print --override checkout_session:metadata.itemId=abc      # metadata warning, 200
stripe trigger checkout.session.completed --override checkout_session:metadata.itemType=print --override checkout_session:metadata.itemId=99999999999   # integer out of range -> handler error, 500
```

To test the signature path, temporarily set an incorrect
`STRIPE_WEBHOOK_SECRET` in a non-production environment and send a Stripe CLI
event.

Failed delivery runbook:

1. Open Stripe Dashboard → Developers → Webhooks → endpoint → event deliveries
   to inspect delivery status and the response body.
2. Resend from the event page, or run
   `stripe events resend evt_… --webhook-endpoint we_… --live`.
3. Replays are idempotent through the unique checkout session id.
4. If Stripe disabled the endpoint after prolonged failures, re-enable it
   manually.
5. Verify the resulting order state in `/admin/orders`.

## Useful scripts

- `pnpm db:studio` — browse the database in Drizzle Studio
- `pnpm db:generate && pnpm db:migrate` — create/apply migrations after schema changes
- `pnpm check` — lint + typecheck
