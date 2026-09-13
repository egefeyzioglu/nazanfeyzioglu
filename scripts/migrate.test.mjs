import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import test from "node:test";
import pg from "pg";
import {
  directConnectionString,
  migrateDatabase,
  migrationLock,
} from "./migrate.mjs";

test("Neon migrations use a direct endpoint and preserve credentials and SSL", () => {
  const pooled =
    "postgresql://user:p%40ss@ep-example-pooler.us-east-2.aws.neon.tech/db?sslmode=require";
  assert.equal(
    directConnectionString({ DATABASE_URL: pooled }),
    pooled.replace("-pooler", ""),
  );
  const direct = "postgresql://user:pass@localhost:5432/db";
  assert.equal(
    directConnectionString({
      DATABASE_URL: pooled,
      DATABASE_URL_UNPOOLED: direct,
    }),
    direct,
  );
  assert.throws(() => directConnectionString({}), /is required/);
});

test(
  "concurrent runners wait, apply once, and release locks after failure",
  {
    skip: !process.env.MIGRATION_TEST_DATABASE_URL,
    timeout: 30_000,
  },
  async () => {
    // Explicit opt-in, separate from DATABASE_URL: never use production credentials.
    const url = new URL(process.env.MIGRATION_TEST_DATABASE_URL);
    assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
    const admin = new pg.Client({ connectionString: url.toString() });
    const database = `migration_lock_test_${process.pid}`;
    const folder = await mkdtemp(join(tmpdir(), "migration-lock-"));
    let observer;
    const runners = [];
    try {
      await admin.connect();
      await admin.query(`CREATE DATABASE "${database}"`);
      url.pathname = `/${database}`;
      const connectionString = url.toString();
      observer = new pg.Client({ connectionString });
      await observer.connect();
      await mkdir(join(folder, "meta"));
      const fixture = async (sql) => {
        await writeFile(
          join(folder, "meta/_journal.json"),
          JSON.stringify({
            version: "7",
            dialect: "postgresql",
            entries: [
              {
                idx: 0,
                version: "7",
                when: 1,
                tag: "0000_test",
                breakpoints: true,
              },
            ],
          }),
        );
        await writeFile(join(folder, "0000_test.sql"), sql);
      };
      await fixture(
        "SELECT pg_advisory_xact_lock(9876); CREATE TABLE applied_once (id integer);",
      );
      await observer.query("SELECT pg_advisory_lock(9876)");
      const start = () => {
        const result = migrateDatabase({
          connectionString,
          migrationsFolder: folder,
        }).then(
          () => null,
          (error) => error,
        );
        runners.push(result);
        return result;
      };
      const waitForLock = async (granted) => {
        const deadline = Date.now() + 5_000;
        while (Date.now() < deadline) {
          const result = await observer.query(
            `SELECT 1 FROM pg_locks WHERE locktype = 'advisory'
           AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
           AND classid = $1 AND objid = $2 AND granted = $3`,
            [...migrationLock, granted],
          );
          if (result.rowCount) return;
          await setTimeout(25);
        }
        assert.fail(`Runner did not reach advisory lock granted=${granted}`);
      };
      const first = start();
      await waitForLock(true);
      const second = start();
      await waitForLock(false);
      await observer.query("SELECT pg_advisory_unlock(9876)");
      assert.deepEqual(await Promise.all([first, second]), [null, null]);
      assert.equal(
        (
          await observer.query(
            "SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations",
          )
        ).rows[0].count,
        1,
      );

      await observer.query(
        "DROP SCHEMA drizzle CASCADE; DROP TABLE applied_once",
      );
      await fixture("SELECT * FROM deliberately_missing_table;");
      assert.ok((await start()) instanceof Error);
      await fixture("CREATE TABLE applied_once (id integer);");
      assert.equal(
        await start(),
        null,
        "a failed migration must release its lock",
      );
    } finally {
      if (observer) {
        await observer.query("SELECT pg_advisory_unlock_all()").catch(() => {});
        await observer.end();
      }
      await Promise.allSettled(runners);
      await admin
        .query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
        .catch(() => {});
      await admin.end();
      await rm(folder, { recursive: true, force: true });
    }
  },
);
