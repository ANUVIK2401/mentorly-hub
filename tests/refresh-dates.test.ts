import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { generateSeed } from "@/data/seed";
import { applications, cohorts, students } from "@/db/schema";
import { refreshDemoDates } from "@/db/refresh-dates";
import { createSeededTestDb } from "./helpers/pglite";

const PROJECTS = 40;
const seededAt = generateSeed({ projectCount: PROJECTS, now: new Date("2026-10-01T12:00:00Z") });
const later = generateSeed({ projectCount: PROJECTS, now: new Date("2026-11-20T12:00:00Z") });

describe("refreshDemoDates", () => {
  it("relies on a seed whose ids and statuses do not depend on the date", () => {
    assert.deepEqual(later.cohorts.map((c) => c.id), seededAt.cohorts.map((c) => c.id));
    assert.deepEqual(
      later.applications.map((a) => [a.id, a.cohortId, a.status]),
      seededAt.applications.map((a) => [a.id, a.cohortId, a.status]),
    );
    assert.notEqual(later.cohorts[0].startDate, seededAt.cohorts[0].startDate);
  });

  it("moves seeded dates to the new day and leaves everything else alone", async () => {
    const { db, close } = await createSeededTestDb("refresh-40", seededAt);
    const project = seededAt.projects[0];

    // Rows the demo seed did not create: an admin-made cohort and a real application.
    await db.insert(cohorts).values({
      id: "coh-admin-made",
      projectId: project.id,
      startDate: "2026-12-01",
      endDate: "2027-01-26",
      applicationDeadline: "2026-11-24",
      minStudents: 5,
      maxStudents: 10,
    });
    const realAt = new Date("2026-10-02T09:30:00Z");
    const [real] = await db
      .insert(applications)
      .values({
        cohortId: "coh-admin-made",
        studentId: (await db.select({ id: students.id }).from(students).limit(1))[0].id,
        studentName: "Real Person",
        studentEmail: "real@example.org",
        studentSchool: "School",
        studentProgram: "Program",
        studentGraduationYear: 2027,
        statement: "x".repeat(60),
        submittedAt: realAt,
      })
      .returning({ id: applications.id });

    const result = await refreshDemoDates(db, later);
    assert.equal(result.cohorts, later.cohorts.length);
    assert.equal(result.applications, later.applications.length);

    const byId = new Map((await db.select().from(cohorts)).map((c) => [c.id, c]));
    for (const c of later.cohorts) {
      const row = byId.get(c.id)!;
      assert.deepEqual([row.startDate, row.endDate, row.applicationDeadline], [c.startDate, c.endDate, c.applicationDeadline]);
    }
    assert.equal(byId.get("coh-admin-made")!.startDate, "2026-12-01");

    const [seededApp] = await db.select().from(applications).where(eq(applications.id, later.applications[0].id));
    assert.equal(seededApp.submittedAt.toISOString(), later.applications[0].submittedAt);
    const [realApp] = await db.select().from(applications).where(eq(applications.id, real.id));
    assert.equal(realApp.submittedAt.toISOString(), realAt.toISOString());
    await close();
  });
});
