import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export type Database = ReturnType<typeof createDb>;

let cached: Database | undefined;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return url;
}

/**
 * Create a Drizzle client backed by `postgres` (postgres.js).
 * Uses `prepare: false` so transaction-mode poolers (e.g. Supavisor :6543) work.
 */
export function createDb(connectionString = requireDatabaseUrl()) {
  const client = postgres(connectionString, {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    prepare: false,
  });
  return drizzle(client, { schema });
}

/** Process-wide singleton for long-running Node servers. */
export function getDb(): Database {
  if (!cached) {
    cached = createDb();
  }
  return cached;
}

export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
