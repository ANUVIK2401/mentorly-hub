import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Repository } from "@/data/repository";
import { DEMO_COHORT_ID, type SeedData } from "@/data/seed";
import type { StatusChangeResult } from "@/data/types";

/** Fixed clock shared by every repository under test, so cohort status is reproducible. */
export const CONTRACT_NOW = new Date("2026-10-01T12:00:00Z");

export interface RepoUnderTest {
  seed: SeedData;
  repo: Repository;
}
/** Builds a fresh, isolated repository over a seed of `projectCount` projects (default 120). */
export type RepoFactory = (projectCount?: number) => Promise<RepoUnderTest>;

const student = {
  name: "Test Student",
  email: "test.student@example.edu",
  school: "Lakeview University",
  program: "B.S. Computer Science",
  graduationYear: 2027,
};

/**
 * Behavior every Repository implementation must satisfy. Run it once per implementation
 * (memory in tests/repository.test.ts, Postgres in tests/repository.postgres.test.ts).
 */
export function runRepositoryContract(name: string, make: RepoFactory): void {
  describe(`${name}: catalog queries`, () => {
    it("paginates and reports totals", async () => {
      const { repo } = await make(100);
      const p1 = await repo.listProjects({ page: 1, pageSize: 12 });
      assert.equal(p1.total, 100);
      assert.equal(p1.items.length, 12);
      assert.equal(p1.pageCount, 9);
      const last = await repo.listProjects({ page: 99, pageSize: 12 });
      assert.equal(last.page, 9);
    });

    it("filters by industry and skill tag", async () => {
      const { repo } = await make(160);
      const fin = await repo.listProjects({ industry: "finance", page: 1, pageSize: 200 });
      assert.ok(fin.total > 0);
      assert.ok(fin.items.every((p) => p.industry.id === "finance"));
      const tagged = await repo.listProjects({ tag: "excel", page: 1, pageSize: 200 });
      assert.ok(tagged.items.every((p) => p.skills.some((s) => s.id === "excel")));
    });

    it("openOnly returns only projects with an open cohort", async () => {
      const { repo } = await make(160);
      const open = await repo.listProjects({ openOnly: true, page: 1, pageSize: 500 });
      assert.ok(open.total > 0 && open.total < 160);
      assert.ok(open.items.every((p) => p.applicationsOpen));
    });

    it("searches across title, instructor and tags with all terms required", async () => {
      const { repo, seed } = await make(100);
      const target = seed.projects[3];
      const word = target.title.split(" ")[1];
      const r = await repo.listProjects({ q: word, page: 1, pageSize: 500 });
      assert.ok(r.items.some((p) => p.slug === target.slug));
      const none = await repo.listProjects({ q: "zzzz-no-such-thing", page: 1, pageSize: 10 });
      assert.equal(none.total, 0);
    });

    it("lists open projects first", async () => {
      const { repo } = await make(160);
      const r = await repo.listProjects({ page: 1, pageSize: 20 });
      assert.equal(r.items[0].featuredCohort?.status, "open");
    });

    it("never leaks private fields in public DTOs", async () => {
      const { repo, seed } = await make(40);
      const detail = await repo.getProject(seed.projects[0].slug);
      const json = JSON.stringify(detail);
      assert.ok(!json.includes("zoom.example.com"), "zoomLink leaked");
      assert.ok(!json.includes("@example.edu"), "student email leaked");
    });
  });

  describe(`${name}: applications`, () => {
    function openCohortId(repo: Repository) {
      return repo.listCohortRows().then((rows) => rows.find((r) => r.status === "open" && r.seatsTaken === 0)!.cohortId);
    }

    it("creates an application as 'submitted' and blocks a duplicate email (case-insensitive)", async () => {
      const { repo } = await make();
      const cohortId = await openCohortId(repo);
      const first = await repo.createApplication({ cohortId, student, statement: "x".repeat(60) });
      assert.ok(first.ok && first.application.status === "submitted");
      const dup = await repo.createApplication({
        cohortId,
        student: { ...student, email: "TEST.STUDENT@example.edu" },
        statement: "y".repeat(60),
      });
      assert.ok(!dup.ok && dup.code === "duplicate");
    });

    it("allows the same student to apply to a different cohort", async () => {
      const { repo } = await make();
      const rows = (await repo.listCohortRows()).filter((r) => r.status === "open");
      const a = await repo.createApplication({ cohortId: rows[0].cohortId, student, statement: "x".repeat(60) });
      const b = await repo.createApplication({ cohortId: rows[1].cohortId, student, statement: "x".repeat(60) });
      assert.ok(a.ok && b.ok);
    });

    it("rejects applications to full, closed and completed cohorts", async () => {
      const { repo } = await make(240);
      const rows = await repo.listCohortRows();
      for (const status of ["full", "closed", "completed"] as const) {
        const row = rows.find((r) => r.status === status)!;
        const res = await repo.createApplication({ cohortId: row.cohortId, student, statement: "x".repeat(60) });
        assert.ok(!res.ok && res.code === "not_open", `${status} cohort accepted an application`);
      }
    });

    it("rejects unknown cohorts", async () => {
      const { repo } = await make(20);
      const res = await repo.createApplication({ cohortId: "nope", student, statement: "x".repeat(60) });
      assert.ok(!res.ok && res.code === "cohort_not_found");
    });

    it("enforces capacity: accepting into a full cohort becomes a waitlist entry", async () => {
      const { repo } = await make();
      const cohortId = await openCohortId(repo);
      const row = (await repo.listCohortRows()).find((r) => r.cohortId === cohortId)!;
      const ids: string[] = [];
      for (let i = 0; i < row.maxStudents + 2; i++) {
        const res = await repo.createApplication({
          cohortId,
          student: { ...student, email: `s${i}@example.edu` },
          statement: "x".repeat(60),
        });
        assert.ok(res.ok);
        if (res.ok) ids.push(res.application.id);
      }
      const results: StatusChangeResult[] = [];
      for (const id of ids) results.push(await repo.updateApplicationStatus(id, "accepted", "tester"));
      const accepted = results.filter((r) => r.ok && r.status === "accepted").length;
      const waitlisted = results.filter((r) => r.ok && r.status === "waitlisted" && r.waitlistedBecauseFull).length;
      assert.equal(accepted, row.maxStudents);
      assert.equal(waitlisted, 2);

      const after = (await repo.listCohortRows()).find((r) => r.cohortId === cohortId)!;
      assert.equal(after.seatsTaken, row.maxStudents);
      assert.equal(after.status, "full");

      // Freeing a seat reopens the cohort.
      const acceptedId = ids.find((_, i) => results[i].ok && (results[i] as { status: string }).status === "accepted")!;
      await repo.updateApplicationStatus(acceptedId, "withdrawn", "tester");
      const reopened = (await repo.listCohortRows()).find((r) => r.cohortId === cohortId)!;
      assert.equal(reopened.seatsTaken, row.maxStudents - 1);
      assert.equal(reopened.status, "open");
    });

    it("treats a malformed or unknown application id as not found, not an error", async () => {
    const { repo } = await make();
    assert.equal(await repo.getApplicationStatus("abc"), null);
    assert.equal(await repo.getApplicationStatus("00000000-0000-4000-8000-000000000000"), null);
  });

  it("student status view exposes no email", async () => {
      const { repo } = await make();
      const cohortId = await openCohortId(repo);
      const res = await repo.createApplication({ cohortId, student, statement: "x".repeat(60) });
      assert.ok(res.ok);
      if (res.ok) {
        const view = await repo.getApplicationStatus(res.application.id);
        assert.ok(view);
        assert.ok(!JSON.stringify(view).includes("@"));
      }
    });
  });

  describe(`${name}: demo scenario`, () => {
    it("first project has an open cohort with one seat left and pending applicants", async () => {
      const { repo, seed } = await make(60);
      const row = (await repo.listCohortRows()).find((r) => r.cohortId === DEMO_COHORT_ID)!;
      assert.equal(seed.cohorts[0].id, DEMO_COHORT_ID);
      assert.equal(row.status, "open");
      assert.equal(row.maxStudents - row.seatsTaken, 1);
      const pending = await repo.listApplications({ cohortId: DEMO_COHORT_ID, status: "submitted", page: 1, pageSize: 50 });
      assert.ok(pending.total >= 3);

      // accepting every pending applicant fills the one seat and waitlists the rest
      const results: StatusChangeResult[] = [];
      for (const a of pending.items) results.push(await repo.updateApplicationStatus(a.id, "accepted", "tester"));
      assert.equal(results.filter((r) => r.ok && r.status === "accepted").length, 1);
      assert.equal(results.filter((r) => r.ok && r.status === "waitlisted").length, pending.total - 1);
    });

    it("tops the catalog so it is the first thing a viewer sees", async () => {
      const { repo, seed } = await make(240);
      const first = (await repo.listProjects({ page: 1, pageSize: 5 })).items[0];
      assert.equal(first.slug, seed.projects[0].slug);
    });
  });


    describe(`${name}: cohort mix`, () => {
    it("gives a mix of open, full, closed and completed cohorts", async () => {
        const { repo } = await make(240);
        const rows = await repo.listCohortRows();
        const statuses = new Set(rows.map((r) => r.status));
        for (const s of ["open", "full", "closed", "completed"]) assert.ok(statuses.has(s as never), `missing ${s}`);
      });
    });
}
