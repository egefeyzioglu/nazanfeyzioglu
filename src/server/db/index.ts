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

export const pool =
  globalForDb.pool ?? new Pool({ connectionString: env.DATABASE_URL });
if (env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
