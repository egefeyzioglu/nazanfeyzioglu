import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "src/env";
import * as schema from "./schema";

/**
 * Cache the connection pool in development. This avoids creating a new pool on
 * every HMR update. In production on Vercel, use the pooled (PgBouncer)
 * connection string from the Neon integration so serverless invocations share
 * server-side connections.
 */
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

function createPool() {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    // Modest per-instance limits: serverless runs many instances in
    // parallel, so keep each one's slice of Neon/PgBouncer slots small.
    max: 4,
    idleTimeoutMillis: 20_000,
  });
  // Idle pooled clients emit 'error' when the server closes a connection
  // (Neon does this routinely); without a listener that would be an
  // unhandled 'error' event and crash the process.
  pool.on("error", (err) => {
    console.error("Unexpected error on idle Postgres client", err);
  });
  return pool;
}

export const pool = globalForDb.pool ?? createPool();
if (env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
