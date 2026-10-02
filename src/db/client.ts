/**
 * Database access. Only src/data/postgres.ts and scripts should import this.
 *
 * `Db` is the common Drizzle type for the production driver (postgres-js) and the in-process
 * PGlite used by tests, so PostgresRepository runs unchanged against both.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

declare global {
  // Survives dev-server hot reloads so each edit does not open a new connection.
  var __projectHubDb: Db | undefined;
}

export function createDb(url: string): Db {
  // prepare: false is required behind Supabase's transaction pooler (port 6543), which does not
  // support prepared statements. max: 1 because each serverless instance handles one request at a
  // time and the pooler does the real pooling.
  return drizzle(postgres(url, { prepare: false, max: 1 }), { schema });
}

export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return (globalThis.__projectHubDb ??= createDb(url));
}
