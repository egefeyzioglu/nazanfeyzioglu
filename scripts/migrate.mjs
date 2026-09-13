import { pathToFileURL } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Stable, database-local namespace shared by every deployment and local runner.
export const migrationLock = [0x4e415a41, 1];

/** Select the direct Neon endpoint so session locks survive across transactions. */
export function directConnectionString(env = process.env) {
  const value = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  if (!value)
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required");
  const url = new URL(value);
  if (url.hostname.endsWith(".neon.tech")) {
    url.hostname = url.hostname.replace(/-pooler\./, ".");
  }
  return url.toString();
}

/** Serialize journal reads and migrations on the same dedicated Postgres session. */
export async function migrateDatabase({
  connectionString = directConnectionString(),
  migrationsFolder = "./drizzle",
} = {}) {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 30_000,
  });
  try {
    await client.connect();
    await client.query("SET lock_timeout = '5min'");
    await client.query("SELECT pg_advisory_lock($1, $2)", migrationLock);
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    // Closing this direct session releases its advisory lock on success or error,
    // even if the transaction failed. No locked connection returns to a pool.
    await client.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  migrateDatabase().then(
    () => console.log("Migrations applied successfully."),
    (error) => {
      console.error("Migration failed:", error.message);
      process.exitCode = 1;
    },
  );
}
