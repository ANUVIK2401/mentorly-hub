/**
 * npm run db:seed [-- --reset --yes-really]
 *
 * Loads the synthetic catalog into the database named by DATABASE_URL (SEED_COUNT projects, default 240).
 * Refuses to run on a non-empty database. --reset WIPES every table (including real applications) and
 * always needs --yes-really, because running this from a laptop against a production URL looks the same
 * as running it locally (NODE_ENV is unset). Re-run with --reset --yes-really whenever the demo's
 * cohort dates have aged out.
 */
import { sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { loadSeed } from "../src/db/load-seed";
import { generateSeed } from "../src/data/seed";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const reset = process.argv.includes("--reset");
if (reset && !process.argv.includes("--yes-really")) {
  const host = new URL(url).host;
  console.error(`--reset deletes ALL data in ${host}. Re-run with --reset --yes-really if that is what you want.`);
  process.exit(1);
}

const db = createDb(url);
const requested = Number.parseInt(process.env.SEED_COUNT ?? "", 10);
const projectCount = Number.isFinite(requested) && requested > 0 ? requested : 240;

async function main() {
  if (reset) {
    await db.execute(
      sql`truncate table enrollments, applications, students, cohorts, project_tags, projects, instructors, tags, organizations restart identity cascade`,
    );
  }
  const existing = await db.execute(sql`select count(*)::int as n from projects`);
  const n = (Array.isArray(existing) ? existing[0] : (existing as { rows: { n: number }[] }).rows[0]) as { n: number };
  if (n.n > 0) {
    console.error(`Database already has ${n.n} projects. Re-run with --reset to replace them.`);
    process.exit(1);
  }
  const seed = generateSeed({ projectCount, now: new Date() });
  await loadSeed(db, seed);
  console.log(`Seeded ${seed.projects.length} projects, ${seed.cohorts.length} cohorts, ${seed.applications.length} applications.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
