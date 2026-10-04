/**
 * Runs before `next build` on Vercel (package.json "vercel-build"). Applies pending /drizzle
 * migrations to the production database, so new code never goes live against an old schema.
 * A failed migration fails the build, and the previous deployment keeps serving.
 *
 * Production only: preview builds have no database. Uses the non-pooling URL, because migrations
 * should not go through the transaction pooler. Plain .mjs on runtime dependencies only.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

if (process.env.VERCEL_ENV !== "production") {
  console.log(`[migrate] skipped: VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}`);
  process.exit(0);
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.log("[migrate] skipped: no database configured (the app runs in memory)");
  process.exit(0);
}

const client = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("[migrate] database schema is up to date");
} catch (error) {
  console.error("[migrate] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
