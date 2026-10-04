/**
 * npm run db:refresh-dates
 *
 * Moves the seeded demo's cohort and application dates to today, so "Applications open" cohorts are
 * open again. Deletes nothing: rows created through the app and every status change are kept.
 * Safe to run before any demo. See src/db/refresh-dates.ts.
 */
import { sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { refreshDemoDates } from "../src/db/refresh-dates";
import { databaseUrl } from "../src/db/url";
import { generateSeed } from "../src/data/seed";

async function main() {
  const url = databaseUrl();
  if (!url) {
    console.error("DATABASE_URL (or POSTGRES_URL) is not set. Run `vercel env pull .env.local` or export it.");
    process.exit(1);
  }
  const db = createDb(url);
  // Seeded projects are prj-1..prj-N, N <= 1152; app-made ones are prj-<8 hex>, which never match.
  const res = await db.execute(sql`select count(*)::int as n from projects where id ~ '^prj-[0-9]{1,4}$'`);
  const n = ((Array.isArray(res) ? res[0] : (res as { rows: { n: number }[] }).rows[0]) as { n: number }).n;
  if (n === 0) {
    console.error("No seeded projects found. Run `npm run db:seed` first.");
    process.exit(1);
  }
  const updated = await refreshDemoDates(db, generateSeed({ projectCount: n, now: new Date() }));
  console.log(`Moved dates to today for ${updated.cohorts} cohorts and ${updated.applications} applications (${n} seeded projects).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
