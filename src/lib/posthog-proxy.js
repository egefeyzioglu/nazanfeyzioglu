/**
 * Reverse-proxy settings for browser-side PostHog traffic.
 *
 * Ad and tracking blockers match requests to *.posthog.com, so the browser SDK
 * instead talks to INGEST_PATH on this site's own origin and Next.js rewrites
 * (see next.config.js) forward those requests to PostHog. This file is plain
 * JavaScript because next.config.js imports it before any TypeScript is
 * compiled; the same values feed src/instrumentation-client.ts so the client
 * and the rewrites can never disagree about the path.
 */

/** Path prefix on this origin that the rewrites forward to PostHog. */
export const INGEST_PATH = "/ingest";

/**
 * Parses NEXT_PUBLIC_POSTHOG_HOST (an ingestion host such as
 * "https://us.i.posthog.com") and derives the related PostHog hosts.
 *
 * @param {string | undefined} host
 * @returns {{ ingest: string; assets: string; ui: string } | null}
 *   `null` when the value is missing or not an http(s) URL — analytics are
 *   then disabled, and the rewrites are omitted so /ingest simply 404s.
 */
export function posthogHosts(host) {
  if (!host) return null;
  let url;
  try {
    url = new URL(host);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const ingest = url.origin;
  // PostHog Cloud hosts follow one pattern per region: ingestion at
  // <region>.i.posthog.com, static assets (the SDK bundle, surveys, session
  // replay) at <region>-assets.i.posthog.com, and the web app at
  // <region>.posthog.com. Anything else (self-hosted, or the legacy
  // app.posthog.com host) serves all three from the same origin.
  const cloud = /^([a-z0-9-]+)\.i\.posthog\.com$/.exec(url.hostname);
  if (!cloud) return { ingest, assets: ingest, ui: ingest };
  const region = cloud[1];
  return {
    ingest,
    assets: `${url.protocol}//${region}-assets.i.posthog.com`,
    ui: `${url.protocol}//${region}.posthog.com`,
  };
}

/**
 * Next.js rewrites that forward INGEST_PATH to PostHog. Static assets have
 * their own upstream, so that rule must come first.
 *
 * @param {string | undefined} host NEXT_PUBLIC_POSTHOG_HOST
 * @returns {{ source: string; destination: string }[]}
 */
export function posthogRewrites(host) {
  const hosts = posthogHosts(host);
  if (!hosts) return [];
  return [
    {
      source: `${INGEST_PATH}/static/:path*`,
      destination: `${hosts.assets}/static/:path*`,
    },
    {
      source: `${INGEST_PATH}/:path*`,
      destination: `${hosts.ingest}/:path*`,
    },
  ];
}
