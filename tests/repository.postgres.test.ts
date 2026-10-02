import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPostgresRepository } from "@/data/postgres";
import { generateSeed } from "@/data/seed";
import { createDb } from "@/db/client";
import { loadSeed } from "@/db/load-seed";
import { CONTRACT_NOW as NOW, runRepositoryContract } from "./contract/repository.contract";
import { createSeededTestDb } from "./helpers/pglite";

runRepositoryContract("postgres (PGlite)", async (count = 120) => {
  const seed = generateSeed({ projectCount: count, now: NOW });
  const { db } = await createSeededTestDb(`seed-${count}`, seed);
  return { seed, repo: createPostgresRepository(db, () => NOW) };
});

// PGlite is a single connection, so it cannot interleave two transactions. This one needs a real
// server: TEST_DATABASE_URL=postgres://... npm test   (the database is wiped and reseeded)
const REAL_URL = process.env.TEST_DATABASE_URL;
describe("postgres: concurrent accepts", { skip: !REAL_URL && "set TEST_DATABASE_URL to run" }, () => {
  it("never over-accepts a one-seat cohort", async () => {
    const db = createDb(REAL_URL!);
    const { sql } = await import("drizzle-orm");
    await db.execute(
      sql`truncate table enrollments, applications, students, cohorts, project_tags, projects, instructors, tags, organizations cascade`,
    );
    const seed = generateSeed({ projectCount: 60, now: NOW });
    await loadSeed(db, seed);
    const repo = createPostgresRepository(db, () => NOW);
    const pending = await repo.listApplications({ cohortId: "coh-prj-1-1", status: "submitted", page: 1, pageSize: 50 });
    const results = await Promise.all(pending.items.map((a) => repo.updateApplicationStatus(a.id, "accepted", "race")));
    assert.equal(results.filter((r) => r.ok && r.status === "accepted").length, 1);
  });
});
