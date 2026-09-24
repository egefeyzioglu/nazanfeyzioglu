import posthog from "posthog-js";

import { INGEST_PATH, posthogHosts } from "src/lib/posthog-proxy";

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const hosts = posthogHosts(posthogHost);

if (!posthogToken || !hosts) {
  const message = !posthogToken
    ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is not set, so PostHog analytics are disabled"
    : !posthogHost
      ? "NEXT_PUBLIC_POSTHOG_HOST is not set, so PostHog analytics are disabled"
      : "NEXT_PUBLIC_POSTHOG_HOST is not an http(s) URL, so PostHog analytics are disabled";
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      `${message}. Add it to .env.local (see .env.example) to enable analytics.`,
    );
  }
  // NEXT_PUBLIC_* values are inlined at build time, so on Vercel the variable
  // must be set for the environment being built (preview and production).
  console.warn(`[posthog] ${message}`);
} else {
  posthog.init(posthogToken, {
    // Events and the SDK's own assets are fetched from this origin and
    // reverse-proxied to PostHog by the rewrites in next.config.js, so ad
    // blockers that match *.posthog.com do not drop them. The server-side
    // client (src/lib/posthog-server.ts) talks to PostHog directly.
    api_host: INGEST_PATH,
    // The toolbar and other links back to the PostHog app must not go
    // through the proxy.
    ui_host: hosts.ui,
    defaults: "2026-05-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
