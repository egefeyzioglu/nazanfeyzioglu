import { auth, clerkClient } from "@clerk/nextjs/server";

import { env } from "src/env";

/**
 * Whether the Clerk application is configured. Until both keys are set, the
 * public site works normally and the admin panel shows a setup notice.
 */
export function clerkConfigured(): boolean {
  return Boolean(env.CLERK_SECRET_KEY && env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

type AdminStatus = { userId: string | null; isAdmin: boolean };

/**
 * Resolves the current user and whether they hold the `admin` role, granted by
 * setting `{ "role": "admin" }` in the user's Public metadata in the Clerk
 * dashboard.
 *
 * Checks the session claims first (present when the session token is
 * customised to include `{"metadata": "{{user.public_metadata}}"}`), and falls
 * back to fetching the user from the Backend API so the role works without any
 * session-token customisation.
 */
export async function getAdminStatus(): Promise<AdminStatus> {
  if (!clerkConfigured()) return { userId: null, isAdmin: false };

  const { userId, sessionClaims } = await auth();
  if (!userId) return { userId: null, isAdmin: false };

  const claims = sessionClaims as
    | { metadata?: { role?: string }; publicMetadata?: { role?: string } }
    | null
    | undefined;
  if (
    claims?.metadata?.role === "admin" ||
    claims?.publicMetadata?.role === "admin"
  ) {
    return { userId, isAdmin: true };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = (user.publicMetadata as { role?: string } | null)?.role;
  return { userId, isAdmin: role === "admin" };
}
