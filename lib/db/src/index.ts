import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

/**
 * DEMO_MODE is true when:
 *  - The DEMO_MODE env var is explicitly set to "true", OR
 *  - DATABASE_URL is absent (Electron packaging without a configured DB)
 *
 * In demo mode, `pool` and `db` are typed correctly but set to null at runtime.
 * Every function in db-ops.ts checks IS_DEMO_MODE before calling `db`, so null
 * is never actually dereferenced.
 */
export const IS_DEMO_MODE =
  process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL;

if (!IS_DEMO_MODE && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// When IS_DEMO_MODE is true, pool/db are null at runtime but typed non-null
// so that db-ops.ts doesn't need to add null checks everywhere — it uses
// IS_DEMO_MODE as the guard instead.
export const pool = IS_DEMO_MODE
  ? (null as unknown as InstanceType<typeof Pool>)
  : new Pool({ connectionString: process.env.DATABASE_URL! });

export const db = IS_DEMO_MODE
  ? (null as unknown as ReturnType<typeof drizzle<typeof schema>>)
  : drizzle(pool, { schema });

if (IS_DEMO_MODE) {
  console.warn("[DB] Running in Demo Mode — no database connection.");
}

export * from "./schema";
