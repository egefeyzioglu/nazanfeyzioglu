import assert from "node:assert/strict";
import test from "node:test";

import {
  INGEST_PATH,
  posthogHosts,
  posthogRewrites,
} from "../src/lib/posthog-proxy.js";

test("derives the assets and app hosts for a PostHog Cloud region", () => {
  assert.deepEqual(posthogHosts("https://us.i.posthog.com"), {
    ingest: "https://us.i.posthog.com",
    assets: "https://us-assets.i.posthog.com",
    ui: "https://us.posthog.com",
  });
  assert.deepEqual(posthogHosts("https://eu.i.posthog.com/"), {
    ingest: "https://eu.i.posthog.com",
    assets: "https://eu-assets.i.posthog.com",
    ui: "https://eu.posthog.com",
  });
});

test("uses a single origin for self-hosted or legacy hosts", () => {
  assert.deepEqual(posthogHosts("https://app.posthog.com"), {
    ingest: "https://app.posthog.com",
    assets: "https://app.posthog.com",
    ui: "https://app.posthog.com",
  });
  assert.deepEqual(posthogHosts("http://localhost:8000/"), {
    ingest: "http://localhost:8000",
    assets: "http://localhost:8000",
    ui: "http://localhost:8000",
  });
});

test("rejects missing or malformed hosts", () => {
  assert.equal(posthogHosts(undefined), null);
  assert.equal(posthogHosts(""), null);
  assert.equal(posthogHosts("us.i.posthog.com"), null);
  assert.equal(posthogHosts("ftp://us.i.posthog.com"), null);
});

test("rewrites send assets and remote config to the assets host before the catch-all", () => {
  assert.deepEqual(posthogRewrites("https://us.i.posthog.com"), [
    {
      source: `${INGEST_PATH}/static/:path*`,
      destination: "https://us-assets.i.posthog.com/static/:path*",
    },
    {
      source: `${INGEST_PATH}/array/:path*`,
      destination: "https://us-assets.i.posthog.com/array/:path*",
    },
    {
      source: `${INGEST_PATH}/:path*`,
      destination: "https://us.i.posthog.com/:path*",
    },
  ]);
});

test("emits no rewrites when PostHog is not configured", () => {
  assert.deepEqual(posthogRewrites(undefined), []);
  assert.deepEqual(posthogRewrites("not a url"), []);
});
