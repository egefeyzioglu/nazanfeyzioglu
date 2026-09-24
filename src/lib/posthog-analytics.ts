/**
 * Read-side PostHog access for the admin overview: HogQL queries for site
 * views and the checkout funnel, plus the parsing of their results.
 *
 * Kept free of Next.js and environment imports so the query text and the
 * result parsing can be unit-tested with a stubbed fetch. The router
 * (src/server/api/routers/analytics.ts) supplies configuration and caching.
 *
 * The queries hit PostHog's app host (us.posthog.com), which is distinct
 * from the ingestion host the SDKs send events to (us.i.posthog.com) and is
 * never routed through the site's ingestion reverse proxy.
 */

/** Days of history every overview number covers. */
export const OVERVIEW_WINDOW_DAYS = 30;

/** Most-viewed pages shown on the overview. */
export const TOP_PAGES_LIMIT = 8;

/**
 * Checkout funnel, in order. The first step is captured in the browser
 * (BuyButton), the rest on the server (checkout route and Stripe webhook),
 * all against the same PostHog person where the browser SDK was allowed to
 * run — so later steps can legitimately exceed earlier ones when a visitor
 * blocked the script.
 */
export const FUNNEL_STEPS = [
  { event: "checkout_started", label: "Checkout started" },
  { event: "checkout_session_created", label: "Stripe session created" },
  { event: "checkout_completed", label: "Payment completed" },
  { event: "order_refunded", label: "Refunded" },
] as const;

export type FunnelEvent = (typeof FUNNEL_STEPS)[number]["event"];

export type DailyViews = {
  /** Calendar day in the PostHog project's timezone, as YYYY-MM-DD. */
  day: string;
  views: number;
  visitors: number;
};

export type TopPage = { path: string; views: number };

export type FunnelStep = {
  event: FunnelEvent;
  label: string;
  /** Distinct PostHog persons that reached the step. */
  people: number;
  /** Raw event count; differs from `people` when someone repeats a step. */
  events: number;
};

export type AnalyticsOverview = {
  windowDays: number;
  views: number;
  visitors: number;
  daily: DailyViews[];
  topPages: TopPage[];
  funnel: FunnelStep[];
  /** When the underlying queries ran, as an ISO timestamp. */
  fetchedAt: string;
};

export type PostHogAnalyticsConfig = {
  /** PostHog app host, e.g. https://us.posthog.com (no trailing slash). */
  apiHost: string;
  /** Numeric project id from PostHog → Settings → Project. */
  projectId: string;
  /** Personal API key (phx_…) with the query:read scope. */
  apiKey: string;
};

/**
 * Derives the PostHog app host (where the query API lives) from the ingestion
 * host the SDKs use: us.i.posthog.com → us.posthog.com, and likewise for eu.
 * Returns undefined for anything that is not an http(s) URL or does not
 * follow that pattern — self-hosted instances set POSTHOG_API_HOST instead.
 */
export function posthogApiHostFromIngestHost(
  ingestHost: string | undefined,
): string | undefined {
  if (!ingestHost) return undefined;
  let url: URL;
  try {
    url = new URL(ingestHost);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  const match = /^(us|eu)\.i\.posthog\.com$/.exec(url.hostname);
  if (!match) return undefined;
  return `${url.protocol}//${match[1]}.posthog.com`;
}

const WINDOW = `timestamp >= now() - INTERVAL ${OVERVIEW_WINDOW_DAYS} DAY AND timestamp <= now()`;

/**
 * Public-site pageviews only: the admin panel and anyone identified with the
 * admin role (see PostHogIdentify) are excluded so the artist's own visits do
 * not count as traffic.
 */
const PUBLIC_PAGEVIEWS = `event = '$pageview' AND ${WINDOW} AND properties.$pathname NOT LIKE '/admin%' AND (person.properties.role IS NULL OR person.properties.role != 'admin')`;

/** The HogQL queries behind the overview. */
export const OVERVIEW_QUERIES = {
  totals: `SELECT count() AS views, uniq(person_id) AS visitors FROM events WHERE ${PUBLIC_PAGEVIEWS}`,
  daily: `SELECT toDate(timestamp) AS day, count() AS views, uniq(person_id) AS visitors FROM events WHERE ${PUBLIC_PAGEVIEWS} GROUP BY day ORDER BY day`,
  topPages: `SELECT properties.$pathname AS path, count() AS views FROM events WHERE ${PUBLIC_PAGEVIEWS} AND properties.$pathname IS NOT NULL GROUP BY path ORDER BY views DESC, path LIMIT ${TOP_PAGES_LIMIT}`,
  funnel: `SELECT event, uniq(person_id) AS people, count() AS events FROM events WHERE event IN (${FUNNEL_STEPS.map((s) => `'${s.event}'`).join(", ")}) AND ${WINDOW} GROUP BY event`,
} as const;

export type OverviewQueryKey = keyof typeof OVERVIEW_QUERIES;

/** Thrown for any failed or malformed PostHog response; never carries the key. */
export class PostHogQueryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PostHogQueryError";
  }
}

type Fetch = typeof fetch;

/**
 * Runs one HogQL query through PostHog's query endpoint and returns its rows.
 * Column order follows the SELECT list.
 */
export async function runHogQL(
  config: PostHogAnalyticsConfig,
  query: string,
  fetchImpl: Fetch = fetch,
  signal?: AbortSignal,
): Promise<unknown[][]> {
  const url = `${config.apiHost.replace(/\/+$/, "")}/api/projects/${encodeURIComponent(config.projectId)}/query/`;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      signal,
    });
  } catch (err) {
    throw new PostHogQueryError(
      `PostHog request failed: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }
  if (!response.ok) {
    throw new PostHogQueryError(
      `PostHog responded with HTTP ${response.status}`,
      response.status,
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PostHogQueryError("PostHog returned a non-JSON body");
  }
  const results: unknown =
    body && typeof body === "object" && "results" in body
      ? body.results
      : undefined;
  if (!Array.isArray(results)) {
    throw new PostHogQueryError("PostHog returned an unexpected shape");
  }
  const rows: unknown[][] = [];
  for (const row of results as unknown[]) {
    if (!Array.isArray(row)) {
      throw new PostHogQueryError("PostHog returned an unexpected shape");
    }
    rows.push(row as unknown[]);
  }
  return rows;
}

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/** `2026-09-24T00:00:00-04:00` or `2026-09-24` → `2026-09-24`. */
function dayString(value: unknown): string {
  return str(value).slice(0, 10);
}

export function parseTotals(rows: unknown[][]): {
  views: number;
  visitors: number;
} {
  const [row] = rows;
  return { views: num(row?.[0]), visitors: num(row?.[1]) };
}

export function parseDaily(rows: unknown[][]): DailyViews[] {
  return rows.map(([day, views, visitors]) => ({
    day: dayString(day),
    views: num(views),
    visitors: num(visitors),
  }));
}

export function parseTopPages(rows: unknown[][]): TopPage[] {
  return rows.map(([path, views]) => ({ path: str(path), views: num(views) }));
}

/** Every funnel step is returned, in order, with zeros for events not seen. */
export function parseFunnel(rows: unknown[][]): FunnelStep[] {
  const byEvent = new Map<string, { people: number; events: number }>();
  for (const [event, people, events] of rows) {
    byEvent.set(str(event), { people: num(people), events: num(events) });
  }
  return FUNNEL_STEPS.map((step) => ({
    event: step.event,
    label: step.label,
    people: byEvent.get(step.event)?.people ?? 0,
    events: byEvent.get(step.event)?.events ?? 0,
  }));
}

/**
 * Fills in the days with no pageviews so the daily series always spans the
 * full window ending today (UTC calendar, which matches the day strings
 * PostHog returns closely enough for a 30-day bar strip).
 */
export function fillMissingDays(
  daily: DailyViews[],
  now: Date,
  days = OVERVIEW_WINDOW_DAYS,
): DailyViews[] {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const out: DailyViews[] = [];
  const end = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    out.push(byDay.get(day) ?? { day, views: 0, visitors: 0 });
  }
  return out;
}

/** Runs the overview queries concurrently and assembles the result. */
export async function fetchAnalyticsOverview(
  config: PostHogAnalyticsConfig,
  options: { fetch?: Fetch; now?: () => Date; signal?: AbortSignal } = {},
): Promise<AnalyticsOverview> {
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const run = (key: OverviewQueryKey) =>
    runHogQL(config, OVERVIEW_QUERIES[key], fetchImpl, options.signal);
  const [totalRows, dailyRows, topPageRows, funnelRows] = await Promise.all([
    run("totals"),
    run("daily"),
    run("topPages"),
    run("funnel"),
  ]);
  const totals = parseTotals(totalRows);
  return {
    windowDays: OVERVIEW_WINDOW_DAYS,
    views: totals.views,
    visitors: totals.visitors,
    daily: fillMissingDays(parseDaily(dailyRows), now()),
    topPages: parseTopPages(topPageRows),
    funnel: parseFunnel(funnelRows),
    fetchedAt: now().toISOString(),
  };
}
