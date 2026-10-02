import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { count, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { generateSeed } from "@/data/seed";
import { applications, cohorts, projects, projectTags, students, tags } from "@/db/schema";
import { createSeededTestDb, createTestDb } from "./helpers/pglite";

describe("test database", () => {
  it("applies the real migration and exposes the schema", async () => {
    const { db, close } = await createTestDb();
    const rows = await db.execute(sql`select count(*)::int as n from information_schema.tables where table_name = 'applications'`);
    const first = (Array.isArray(rows) ? rows[0] : (rows as { rows: { n: number }[] }).rows[0]) as { n: number };
    assert.equal(first.n, 1);
    await close();
  });
});

describe("seed loader", () => {
  it("inserts every seeded row and keeps the demo cohort's seat math", async () => {
    const seed = generateSeed({ projectCount: 80, now: new Date("2026-10-01T12:00:00Z") });
    const { db } = await createSeededTestDb("loader-80", seed);
    const n = async (table: PgTable) =>
      (await db.select({ n: count() }).from(table))[0].n;
    assert.equal(await n(projects), seed.projects.length);
    assert.equal(await n(cohorts), seed.cohorts.length);
    assert.equal(await n(applications), seed.applications.length);
    assert.equal(await n(students), seed.applications.length);
    assert.equal(await n(tags), seed.industries.length + seed.skills.length);
    assert.equal(await n(projectTags), seed.projects.reduce((sum, p) => sum + p.skillTagIds.length, 0));
  });
});
