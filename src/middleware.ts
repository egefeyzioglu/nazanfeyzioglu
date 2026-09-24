import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from "next/server";

import { INGEST_PATH } from "src/lib/posthog-proxy";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isIngestRoute = createRouteMatcher([`${INGEST_PATH}(.*)`]);

/**
 * Browser requests to /ingest are same-origin, so they carry this site's
 * cookies (including the Clerk session) and Next.js would forward them to
 * PostHog along with the rewrite in next.config.js. PostHog identifies the
 * caller by the project token in the payload and needs none of them.
 */
function stripCredentials(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.delete("cookie");
  headers.delete("authorization");
  return NextResponse.next({ request: { headers } });
}

// Until the Clerk keys are configured the middleware is a no-op, so the public
// site (and the admin setup notice) keep working without a Clerk application.
const clerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

const clerk: NextMiddleware = clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (isAdminRoute(req)) {
        // Requires a signed-in user; the admin role itself is checked by the
        // admin layout, every admin tRPC procedure, and the upload router.
        await auth.protect();
      }
    })
  : () => NextResponse.next();

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (isIngestRoute(req)) return stripCredentials(req);
  return clerk(req, event);
}

export const config = {
  // Clerk only fronts the admin panel, sign-in, and the API routes — public
  // pages never touch Clerk, so they work without keys. /ingest is matched
  // only to strip credentials before the PostHog proxy.
  matcher: [
    "/admin(.*)",
    "/sign-in(.*)",
    "/api/trpc(.*)",
    "/api/uploadthing(.*)",
    "/ingest(.*)",
  ],
};
