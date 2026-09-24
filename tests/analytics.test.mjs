import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

/**
 * Load a TypeScript module with its imports replaced by the given stubs. The
 * module runs in this context so its objects share our prototypes and
 * deepEqual works on them.
 */
function load(path, dependencies = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const wrapper = vm.runInThisContext(
    `(function (exports, require) {${outputText}
})`,
    { filename: path },
  );
  wrapper(exports, (id) =>
    Object.hasOwn(dependencies, id) ? dependencies[id] : require(id),
  );
  return exports;
}

const analytics = load("src/lib/posthog-analytics.ts");

const config = {
  apiHost: "https://us.posthog.com/",
  projectId: "12345",
  apiKey: "phx_secret",
};

/** A fetch stub that answers each HogQL query by the text it contains. */
function fakeFetch(answers, calls = []) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, init, query: body.query.query });
    const answer = answers(body.query.query);
    if (answer instanceof Response) return answer;
    return new Response(JSON.stringify({ results: answer }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

test("derives the PostHog app host from the ingestion host", () => {
  const { posthogApiHostFromIngestHost } = analytics;
  assert.equal(
    posthogApiHostFromIngestHost("https://us.i.posthog.com"),
    "https://us.posthog.com",
  );
  assert.equal(
    posthogApiHostFromIngestHost("https://eu.i.posthog.com/"),
    "https://eu.posthog.com",
  );
  // The browser-side ingestion path introduced by the reverse proxy and any
  // self-hosted or malformed value do not yield an app host.
  assert.equal(posthogApiHostFromIngestHost("/ingest"), undefined);
  assert.equal(
    posthogApiHostFromIngestHost("https://posthog.example.com"),
    undefined,
  );
  assert.equal(posthogApiHostFromIngestHost("us.i.posthog.com"), undefined);
  assert.equal(posthogApiHostFromIngestHost(undefined), undefined);
  assert.equal(posthogApiHostFromIngestHost(""), undefined);
});

test("queries exclude the admin panel and admin accounts", () => {
  const { OVERVIEW_QUERIES, FUNNEL_STEPS } = analytics;
  for (const key of ["totals", "daily", "topPages"]) {
    const q = OVERVIEW_QUERIES[key];
    assert.match(q, /event = '\$pageview'/);
    assert.match(q, /NOT LIKE '\/admin%'/);
    assert.match(q, /person\.properties\.role != 'admin'/);
    assert.match(q, /INTERVAL 30 DAY/);
  }
  for (const step of FUNNEL_STEPS) {
    assert.ok(OVERVIEW_QUERIES.funnel.includes(`'${step.event}'`));
  }
  assert.doesNotMatch(OVERVIEW_QUERIES.funnel, /\$pageview/);
});

test("runHogQL posts to the project query endpoint with a bearer key", async () => {
  const calls = [];
  const rows = await analytics.runHogQL(
    config,
    "SELECT 1",
    fakeFetch(() => [[1]], calls),
  );
  assert.deepEqual(rows, [[1]]);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://us.posthog.com/api/projects/12345/query/",
  );
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.Authorization, "Bearer phx_secret");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    query: { kind: "HogQLQuery", query: "SELECT 1" },
  });
});

test("runHogQL reports failures without leaking the key", async () => {
  const { runHogQL, PostHogQueryError } = analytics;
  await assert.rejects(
    runHogQL(config, "q", async () => new Response("nope", { status: 401 })),
    (err) => {
      assert.ok(err instanceof PostHogQueryError);
      assert.equal(err.status, 401);
      assert.doesNotMatch(err.message, /phx_secret/);
      return true;
    },
  );
  await assert.rejects(
    runHogQL(config, "q", async () => {
      throw new Error("ECONNRESET");
    }),
    { name: "PostHogQueryError", message: /ECONNRESET/ },
  );
  await assert.rejects(
    runHogQL(config, "q", async () => new Response("<html>", { status: 200 })),
    { name: "PostHogQueryError", message: /non-JSON/ },
  );
  await assert.rejects(
    runHogQL(
      config,
      "q",
      async () => new Response(JSON.stringify({ results: "x" })),
    ),
    { name: "PostHogQueryError", message: /unexpected shape/ },
  );
});

test("parsers tolerate numeric strings, timestamps and missing steps", () => {
  const { parseTotals, parseDaily, parseTopPages, parseFunnel } = analytics;
  assert.deepEqual(parseTotals([["12", 5]]), { views: 12, visitors: 5 });
  assert.deepEqual(parseTotals([]), { views: 0, visitors: 0 });
  assert.deepEqual(parseDaily([["2026-09-24T00:00:00-04:00", 3, "2"]]), [
    { day: "2026-09-24", views: 3, visitors: 2 },
  ]);
  assert.deepEqual(parseTopPages([["/prints", 9]]), [
    { path: "/prints", views: 9 },
  ]);
  const funnel = parseFunnel([
    ["checkout_completed", 2, 2],
    ["checkout_started", 5, 7],
    ["unrelated_event", 99, 99],
  ]);
  assert.deepEqual(
    funnel.map((s) => [s.event, s.people, s.events]),
    [
      ["checkout_started", 5, 7],
      ["checkout_session_created", 0, 0],
      ["checkout_completed", 2, 2],
      ["order_refunded", 0, 0],
    ],
  );
});

test("fillMissingDays spans the full window ending today", () => {
  const { fillMissingDays } = analytics;
  const now = new Date("2026-09-24T15:00:00Z");
  const days = fillMissingDays(
    [{ day: "2026-09-20", views: 4, visitors: 1 }],
    now,
    5,
  );
  assert.deepEqual(
    days.map((d) => `${d.day}:${d.views}`),
    [
      "2026-09-20:4",
      "2026-09-21:0",
      "2026-09-22:0",
      "2026-09-23:0",
      "2026-09-24:0",
    ],
  );
});

test("fetchAnalyticsOverview runs every query and assembles the overview", async () => {
  const calls = [];
  const fetch = fakeFetch((query) => {
    if (query.startsWith("SELECT count() AS views, uniq(person_id)")) {
      return [[40, 17]];
    }
    if (query.startsWith("SELECT toDate(timestamp)")) {
      return [
        ["2026-09-23", 30, 12],
        ["2026-09-24", 10, 6],
      ];
    }
    if (query.startsWith("SELECT properties.$pathname")) {
      return [
        ["/", 25],
        ["/prints", 15],
      ];
    }
    if (query.startsWith("SELECT event, uniq(person_id)")) {
      return [
        ["checkout_started", 3, 3],
        ["checkout_session_created", 3, 4],
        ["checkout_completed", 1, 1],
      ];
    }
    throw new Error(`Unexpected query: ${query}`);
  }, calls);

  const overview = await analytics.fetchAnalyticsOverview(config, {
    fetch,
    now: () => new Date("2026-09-24T12:00:00Z"),
  });

  assert.equal(calls.length, 4);
  assert.equal(overview.windowDays, 30);
  assert.equal(overview.views, 40);
  assert.equal(overview.visitors, 17);
  assert.equal(overview.daily.length, 30);
  assert.deepEqual(overview.daily.at(-1), {
    day: "2026-09-24",
    views: 10,
    visitors: 6,
  });
  assert.deepEqual(overview.daily.at(-2), {
    day: "2026-09-23",
    views: 30,
    visitors: 12,
  });
  assert.equal(overview.daily[0].views, 0);
  assert.deepEqual(overview.topPages, [
    { path: "/", views: 25 },
    { path: "/prints", views: 15 },
  ]);
  assert.deepEqual(
    overview.funnel.map((s) => s.people),
    [3, 3, 1, 0],
  );
  assert.equal(overview.fetchedAt, "2026-09-24T12:00:00.000Z");
});

test("fetchAnalyticsOverview fails when any query fails", async () => {
  const fetch = fakeFetch((query) =>
    query.startsWith("SELECT event")
      ? new Response("slow down", { status: 429 })
      : [[]],
  );
  await assert.rejects(analytics.fetchAnalyticsOverview(config, { fetch }), {
    name: "PostHogQueryError",
    status: 429,
  });
});

test("readAnalyticsConfig lists what is missing and derives the host", () => {
  const { readAnalyticsConfig } = load("src/server/api/routers/analytics.ts", {
    "src/lib/posthog-analytics": analytics,
    "src/env": { env: {} },
    "src/server/api/trpc": {
      adminProcedure: { query: (fn) => fn },
      createTRPCRouter: (routes) => routes,
    },
    "next/cache": { unstable_cache: (fn) => fn },
    "@trpc/server": { TRPCError: Error },
  });

  assert.deepEqual(readAnalyticsConfig({}), {
    missing: [
      "POSTHOG_PERSONAL_API_KEY",
      "POSTHOG_PROJECT_ID",
      "POSTHOG_API_HOST",
    ],
  });
  assert.deepEqual(
    readAnalyticsConfig({
      POSTHOG_PERSONAL_API_KEY: "phx_1",
      POSTHOG_PROJECT_ID: "7",
      NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
    }),
    {
      config: {
        apiHost: "https://eu.posthog.com",
        projectId: "7",
        apiKey: "phx_1",
      },
    },
  );
  // An explicit API host wins over the derived one (self-hosted PostHog).
  assert.deepEqual(
    readAnalyticsConfig({
      POSTHOG_PERSONAL_API_KEY: "phx_1",
      POSTHOG_PROJECT_ID: "7",
      POSTHOG_API_HOST: "https://posthog.example.com",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
    }).config.apiHost,
    "https://posthog.example.com",
  );
  // A key alone is not enough to try a request.
  assert.deepEqual(
    readAnalyticsConfig({
      POSTHOG_PERSONAL_API_KEY: "phx_1",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
    }),
    { missing: ["POSTHOG_PROJECT_ID"] },
  );
});

test("overview procedure reports missing config and maps PostHog failures", async () => {
  const envValues = {};
  const responses = [];
  const { analyticsRouter } = load("src/server/api/routers/analytics.ts", {
    "src/lib/posthog-analytics": {
      ...analytics,
      fetchAnalyticsOverview: async () => {
        const next = responses.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    },
    "src/env": { env: envValues },
    "src/server/api/trpc": {
      adminProcedure: { query: (fn) => fn },
      createTRPCRouter: (routes) => routes,
    },
    "next/cache": { unstable_cache: (fn) => fn },
    "@trpc/server": {
      TRPCError: class TRPCError extends Error {
        constructor({ code, message, cause }) {
          super(message, { cause });
          this.code = code;
        }
      },
    },
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await analyticsRouter.overview(), {
      configured: false,
      missing: [
        "POSTHOG_PERSONAL_API_KEY",
        "POSTHOG_PROJECT_ID",
        "POSTHOG_API_HOST",
      ],
    });

    envValues.POSTHOG_PERSONAL_API_KEY = "phx_1";
    envValues.POSTHOG_PROJECT_ID = "7";
    envValues.POSTHOG_API_HOST = "https://us.posthog.com";

    responses.push({ views: 1 });
    assert.deepEqual(await analyticsRouter.overview(), {
      configured: true,
      overview: { views: 1 },
    });

    responses.push(new analytics.PostHogQueryError("HTTP 401", 401));
    await assert.rejects(analyticsRouter.overview(), {
      code: "PRECONDITION_FAILED",
      message: /personal API key/,
    });

    responses.push(new analytics.PostHogQueryError("HTTP 429", 429));
    await assert.rejects(analyticsRouter.overview(), {
      code: "BAD_GATEWAY",
      message: /rate-limiting/,
    });

    responses.push(new Error("boom phx_1"));
    await assert.rejects(analyticsRouter.overview(), (err) => {
      assert.equal(err.code, "BAD_GATEWAY");
      assert.doesNotMatch(err.message, /phx_1/);
      return true;
    });
  } finally {
    console.error = originalError;
  }
});
