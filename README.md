# Nazan Feyzioğlu — portfolio site

Artist portfolio for Nazan Feyzioğlu, built on the [T3 Stack](https://create.t3.gg/) (Next.js App Router, Drizzle + SQLite, tRPC, Tailwind v4), with a CMS admin panel backed by Clerk auth and UploadThing image hosting.

## Getting started

```bash
pnpm install
cp .env.example .env      # then fill in the values below
pnpm db:migrate           # create the SQLite tables
pnpm db:seed              # load the launch content (add --force to wipe & reseed)
pnpm dev
```

## CMS / admin panel

All site content — series, works, prints, exhibitions, and page copy — lives in the database and is edited at `/admin`. Public pages render dynamically, so edits show up immediately.

### Enabling admin access

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com) and put its keys in `.env` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Until both are set, the public site works normally and `/admin` shows a setup notice.
2. Sign in once at `/sign-in`, then in the Clerk dashboard open **Users → your user → Metadata** and set **Public metadata** to `{ "role": "admin" }`. Only users with that role can open `/admin`, call the admin tRPC procedures, or upload images.
3. `UPLOADTHING_TOKEN` (from [uploadthing.com](https://uploadthing.com)) enables image uploads from the admin panel; the image field also accepts a path to a file already in `public/`.

### Layout

- `src/server/db/schema.ts` — `series`, `work`, `print`, `exhibition`, and `site_content` tables
- `src/server/api/` — tRPC routers (admin-gated CRUD + reordering)
- `src/server/queries.ts` — read-side queries used by the public pages
- `src/lib/content-keys.ts` — the editable page-copy fields and their defaults
- `src/app/admin/` — the admin panel UI
- `src/server/uploadthing.ts` — admin-gated UploadThing file router

## Useful scripts

- `pnpm db:studio` — browse the database in Drizzle Studio
- `pnpm db:generate && pnpm db:migrate` — create/apply migrations after schema changes
- `pnpm check` — lint + typecheck
