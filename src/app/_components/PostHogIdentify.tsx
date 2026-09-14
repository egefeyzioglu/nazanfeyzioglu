"use client";

import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useEffect } from "react";

/**
 * Ties PostHog's person to the signed-in Clerk user and clears it on sign-out.
 * The identified state is read from PostHog itself rather than a ref, so a
 * session that expired or a browser that was closed without signing out is
 * reset on the next visit instead of attributing anonymous events to the
 * previous user.
 */
export default function PostHogIdentify() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const currentUserId = posthog.get_property("$user_id") as
      | string
      | undefined;

    if (isSignedIn && user) {
      if (currentUserId !== user.id) {
        // Switching directly between accounts: start a fresh person and
        // session rather than merging the new account into the old one.
        if (currentUserId) posthog.reset();
        posthog.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName ?? undefined,
          role: user.publicMetadata.role,
        });
      }
      return;
    }

    if (currentUserId) {
      posthog.reset();
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}
