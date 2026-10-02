/**
 * npm run db:seed [-- --reset [--yes-really]]
 *
 * Loads the synthetic catalog into the database named by DATABASE_URL (SEED_COUNT projects, default 240).
 * Refuses to run on a non-empty database. --reset wipes the seeded tables first, and in production it
 * also needs --yes-really. Re-run it with --reset whenever the demo's cohort dates have aged out.
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
if (reset && process.env.NODE_ENV === "production" && !process.argv.includes("--yes-really")) {
  console.error("Refusing --reset with NODE_ENV=production without --yes-really");
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
