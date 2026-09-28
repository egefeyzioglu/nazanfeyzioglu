import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { INGEST_PATH, posthogHosts } from "../src/lib/posthog-proxy.js";

/** Loads the real startup module with isolated analytics clients and environment. */
function load(path, env, dependencies) {
  const exports = {};
  const warnings = [];
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  vm.runInNewContext(outputText, {
    exports,
    process: { env },
    Error,
    console: { warn: (message) => warnings.push(message), error: () => {} },
    require: (id) => {
      assert.ok(
        Object.hasOwn(dependencies, id),
        `Unexpected dependency: ${id}`,
      );
      return dependencies[id];
    },
  });
  return { exports, warnings };
}

for (const env of [
  { NODE_ENV: "development" },
  { NODE_ENV: "development", NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "test-token" },
  {
    NODE_ENV: "development",
    NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  },
]) {
  test(`missing analytics configuration does not block local startup (${Object.keys(env).join(", ")})`, () => {
    const unexpected = () =>
      assert.fail("Analytics must stay disabled without configuration");
    const browser = load("src/instrumentation-client.ts", env, {
      "posthog-js": { default: { init: unexpected } },
      "src/lib/posthog-proxy": { INGEST_PATH, posthogHosts },
    });
    assert.equal(browser.warnings.length, 1);
    const server = load("src/lib/posthog-server.ts", env, {
      "server-only": {},
      "next/server": { after: unexpected },
      "posthog-node": { PostHog: unexpected },
    });
    server.exports.captureServerEvent("review", "test");
    server.exports.captureServerException(new Error("test"), "review");
    assert.equal(server.warnings.length, 1);
  });
}

test("configured analytics still initializes and sends server events", () => {
  const env = {
    NODE_ENV: "development",
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "test-token",
    NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  };
  const calls = [];
  const browser = load("src/instrumentation-client.ts", env, {
    "posthog-js": {
      default: { init: (token, options) => calls.push({ token, options }) },
    },
    "src/lib/posthog-proxy": { INGEST_PATH, posthogHosts },
  });
  assert.equal(browser.warnings.length, 0);
  assert.equal(calls[0].token, "test-token");
  assert.equal(calls[0].options.api_host, INGEST_PATH);
  const events = [];
  const scheduled = [];
  const server = load("src/lib/posthog-server.ts", env, {
    "server-only": {},
    "next/server": { after: (callback) => scheduled.push(callback) },
    "posthog-node": {
      PostHog: class {
        capture(event) {
          events.push(event);
        }
      },
    },
  });
  server.exports.captureServerEvent("review", "test");
  assert.equal(server.warnings.length, 0);
  assert.equal(events[0].event, "test");
  assert.equal(scheduled.length, 1);
});
