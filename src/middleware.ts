import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

// Until the Clerk keys are configured the middleware is a no-op, so the public
// site (and the admin setup notice) keep working without a Clerk application.
const clerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

export default clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (isAdminRoute(req)) {
        // Requires a signed-in user; the admin role itself is checked by the
        // admin layout, every admin tRPC procedure, and the upload router.
        await auth.protect();
      }
    })
  : () => NextResponse.next();

export const config = {
  // Clerk only fronts the admin panel, sign-in, and the API routes — public
  // pages never touch Clerk, so they work without keys.
  matcher: [
    "/admin(.*)",
    "/sign-in(.*)",
    "/api/trpc(.*)",
    "/api/uploadthing(.*)",
  ],
};
