import { TRPCError } from "@trpc/server";
import { unstable_cache } from "next/cache";

import {
  fetchAnalyticsOverview,
  posthogApiHostFromIngestHost,
  PostHogQueryError,
  type AnalyticsOverview,
  type PostHogAnalyticsConfig,
} from "src/lib/posthog-analytics";
import { env } from "src/env";
import { adminProcedure, createTRPCRouter } from "src/server/api/trpc";

/**
 * How long a fetched overview is served before PostHog is asked again.
 * PostHog's query endpoint is rate-limited per project, and an admin
 * reloading the page should not burn through that allowance.
 */
const OVERVIEW_TTL_SECONDS = 5 * 60;

type OverviewResult =
  | { configured: false; missing: string[] }
  | { configured: true; overview: AnalyticsOverview };

/** Resolves the read-side PostHog config, or lists what is missing. */
export function readAnalyticsConfig(source: {
  POSTHOG_PERSONAL_API_KEY?: string;
  POSTHOG_PROJECT_ID?: string;
  POSTHOG_API_HOST?: string;
  NEXT_PUBLIC_POSTHOG_HOST?: string;
}): { config: PostHogAnalyticsConfig } | { missing: string[] } {
  const missing: string[] = [];
  if (!source.POSTHOG_PERSONAL_API_KEY)
    missing.push("POSTHOG_PERSONAL_API_KEY");
  if (!source.POSTHOG_PROJECT_ID) missing.push("POSTHOG_PROJECT_ID");
  const apiHost =
    source.POSTHOG_API_HOST ??
    posthogApiHostFromIngestHost(source.NEXT_PUBLIC_POSTHOG_HOST);
  if (!apiHost) missing.push("POSTHOG_API_HOST");
  if (missing.length > 0 || !apiHost) return { missing };
  return {
    config: {
      apiHost,
      projectId: source.POSTHOG_PROJECT_ID!,
      apiKey: source.POSTHOG_PERSONAL_API_KEY!,
    },
  };
}

function envSource() {
  return {
    POSTHOG_PERSONAL_API_KEY: env.POSTHOG_PERSONAL_API_KEY,
    POSTHOG_PROJECT_ID: env.POSTHOG_PROJECT_ID,
    POSTHOG_API_HOST: env.POSTHOG_API_HOST,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  };
}

/**
 * The config is read inside the cached function rather than passed in so the
 * API key never becomes part of a cache key. There is one PostHog project per
 * deployment, so a fixed key is enough.
 */
const cachedOverview = unstable_cache(
  async () => {
    const resolved = readAnalyticsConfig(envSource());
    if ("missing" in resolved) {
      throw new PostHogQueryError("PostHog analytics is not configured");
    }
    return fetchAnalyticsOverview(resolved.config, {
      signal: AbortSignal.timeout(15_000),
    });
  },
  ["posthog-analytics-overview"],
  { revalidate: OVERVIEW_TTL_SECONDS },
);

export const analyticsRouter = createTRPCRouter({
  /**
   * Site views and the checkout funnel for the last 30 days, read from
   * PostHog and cached for a few minutes. Reports a missing configuration
   * instead of failing so the admin page can show setup instructions.
   */
  overview: adminProcedure.query(async (): Promise<OverviewResult> => {
    const resolved = readAnalyticsConfig(envSource());
    if ("missing" in resolved) {
      return { configured: false, missing: resolved.missing };
    }
    try {
      const overview = await cachedOverview();
      return { configured: true, overview };
    } catch (err) {
      // The key never appears in these messages (see PostHogQueryError).
      console.error("[posthog] overview query failed", err);
      const status = err instanceof PostHogQueryError ? err.status : undefined;
      throw new TRPCError({
        code:
          status === 401 || status === 403
            ? "PRECONDITION_FAILED"
            : "BAD_GATEWAY",
        message:
          status === 401 || status === 403
            ? "PostHog rejected the personal API key — check POSTHOG_PERSONAL_API_KEY has the query:read scope and POSTHOG_PROJECT_ID is right."
            : status === 429
              ? "PostHog is rate-limiting queries right now — try again in a few minutes."
              : "Could not load analytics from PostHog.",
        cause: err,
      });
    }
  }),
});
