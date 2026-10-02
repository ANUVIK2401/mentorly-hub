import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Repository } from "@/data/repository";
import { DEMO_COHORT_ID, type SeedData } from "@/data/seed";
import type { CohortInput, InstructorInput, ProjectInput, StatusChangeResult } from "@/data/types";

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

  describe(`${name}: admin editing`, () => {
    const baseProject = (instructorId: string, over: Partial<ProjectInput> = {}): ProjectInput => ({
      title: "Audit a Fictional Coffee Roaster's Unit Economics",
      slug: "audit-fictional-coffee-roaster",
      summary: "Break a fictional roaster's margins into unit economics and recommend one change.",
      description: "You will model a fictional business from first principles and defend a recommendation.",
      learningGoals: ["Build a unit economics model", "Defend a recommendation"],
      deliverable: "A five-page memo",
      instructorId,
      industryId: "finance",
      skillNames: ["Unit Economics", "Excel"],
      status: "draft",
      ...over,
    });
    const cohortInput = (projectId: string, over: Partial<CohortInput> = {}): CohortInput => ({
      projectId,
      startDate: "2026-12-07",
      endDate: "2027-01-31",
      applicationDeadline: "2026-11-30",
      minStudents: 5,
      maxStudents: 10,
      zoomLink: "https://zoom.example.com/j/999",
      ...over,
    });
    const firstInstructorId = async (repo: Repository) => (await repo.listInstructorOptions())[0].id;

    it("keeps a draft out of the public catalog until it is published, and archives it again", async () => {
      const { repo } = await make();
      const saved = await repo.saveProject(baseProject(await firstInstructorId(repo)));
      assert.ok(saved.ok);
      if (!saved.ok) return;
      assert.equal(await repo.getProject("audit-fictional-coffee-roaster"), null);
      assert.equal((await repo.listProjects({ q: "roaster", page: 1, pageSize: 10 })).total, 0);

      assert.ok(await repo.setProjectStatus(saved.id, "published"));
      const detail = await repo.getProject("audit-fictional-coffee-roaster");
      assert.equal(detail?.title, "Audit a Fictional Coffee Roaster's Unit Economics");
      assert.deepEqual(detail?.skills.map((s) => s.name), ["Unit Economics", "Excel"]);
      assert.equal((await repo.listProjects({ q: "roaster", page: 1, pageSize: 10 })).total, 1);
      assert.ok((await repo.listSkillTags()).some((t) => t.id === "unit-economics"));

      assert.ok(await repo.setProjectStatus(saved.id, "archived"));
      assert.equal(await repo.getProject("audit-fictional-coffee-roaster"), null);
      assert.equal(await repo.setProjectStatus("prj-does-not-exist", "published"), false);
    });

    it("edits a project in place, keeping its cohorts, and refuses a duplicate or invalid slug target", async () => {
      const { repo } = await make();
      const existing = (await repo.listProjectsAdmin({ page: 1, pageSize: 5 })).items[0];
      const full = (await repo.getProjectAdmin(existing.id))!;
      const edited = await repo.saveProject({ ...full, title: "A Retitled Project For Testing" });
      assert.ok(edited.ok && edited.id === existing.id);
      assert.equal((await repo.getProjectAdmin(existing.id))?.title, "A Retitled Project For Testing");
      assert.equal((await repo.listCohortsAdmin(existing.id)).length, existing.cohortCount);

      const other = (await repo.listProjectsAdmin({ page: 1, pageSize: 5 })).items[1];
      const clash = await repo.saveProject({ ...(await repo.getProjectAdmin(other.id))!, slug: full.slug });
      assert.ok(!clash.ok && clash.fieldErrors.slug);

      const badInstructor = await repo.saveProject(baseProject("ins-nope"));
      assert.ok(!badInstructor.ok && badInstructor.fieldErrors.instructorId);
      const badIndustry = await repo.saveProject(baseProject(await firstInstructorId(repo), { industryId: "nope" }));
      assert.ok(!badIndustry.ok && badIndustry.fieldErrors.industryId);
      const missing = await repo.saveProject({ ...full, id: "prj-does-not-exist" });
      assert.ok(!missing.ok);
    });

    it("lists drafts for admins only, filters by status, and paginates", async () => {
      const { repo } = await make(40);
      const saved = await repo.saveProject(baseProject(await firstInstructorId(repo)));
      assert.ok(saved.ok);
      const drafts = await repo.listProjectsAdmin({ status: "draft", page: 1, pageSize: 10 });
      assert.equal(drafts.total, 1);
      assert.equal(drafts.items[0].status, "draft");
      const all = await repo.listProjectsAdmin({ page: 1, pageSize: 10 });
      assert.equal(all.total, 41);
      assert.equal(all.items.length, 10);
      assert.equal((await repo.listProjectsAdmin({ q: "coffee", page: 1, pageSize: 10 })).total, 1);
    });

    it("creates and edits cohorts, and keeps the zoom link out of public data", async () => {
      const { repo } = await make();
      const project = await repo.saveProject(baseProject(await firstInstructorId(repo), { status: "published" }));
      assert.ok(project.ok);
      if (!project.ok) return;
      const created = await repo.saveCohort(cohortInput(project.id));
      assert.ok(created.ok);
      if (!created.ok) return;

      const listed = await repo.listCohortsAdmin(project.id);
      assert.equal(listed.length, 1);
      assert.equal(listed[0].zoomLink, "https://zoom.example.com/j/999");
      assert.equal(listed[0].seatsTaken, 0);

      const detail = await repo.getProject("audit-fictional-coffee-roaster");
      assert.equal(detail?.cohorts.length, 1);
      assert.equal(detail?.cohorts[0].maxStudents, 10);
      assert.ok(!JSON.stringify(detail).includes("zoom.example.com/j/999"), "zoomLink leaked");
      assert.ok(!JSON.stringify(await repo.getApplyContext(created.id)).includes("zoom.example.com"), "zoomLink leaked");

      const edited = await repo.saveCohort({ ...cohortInput(project.id), id: created.id, maxStudents: 12 });
      assert.ok(edited.ok);
      assert.equal((await repo.getCohortAdmin(created.id))?.maxStudents, 12);
    });

    it("refuses invalid cohort dates and capacity below the seats already taken", async () => {
      const { repo } = await make();
      const demo = (await repo.getCohortAdmin(DEMO_COHORT_ID))!;
      assert.ok(demo.seatsTaken >= 9);
      const tooSmall = await repo.saveCohort({ ...demo, maxStudents: demo.seatsTaken - 1, minStudents: 1 });
      assert.ok(!tooSmall.ok && tooSmall.fieldErrors.maxStudents);
      const atSeats = await repo.saveCohort({ ...demo, maxStudents: demo.seatsTaken, minStudents: 1 });
      assert.ok(atSeats.ok);

      const bad = await repo.saveCohort({
        ...demo,
        startDate: "2026-12-10",
        endDate: "2026-12-01",
        applicationDeadline: "2026-12-20",
        minStudents: 9,
        maxStudents: 8,
      });
      assert.ok(!bad.ok);
      if (!bad.ok) {
        assert.ok(bad.fieldErrors.endDate && bad.fieldErrors.applicationDeadline && bad.fieldErrors.minStudents);
      }
      const orphan = await repo.saveCohort(cohortInput("prj-does-not-exist"));
      assert.ok(!orphan.ok);
    });

    it("creates an instructor with a new organization, rejects a duplicate slug, and lets a project use them", async () => {
      const { repo } = await make();
      const input: InstructorInput = {
        slug: "dana-test-instructor",
        name: "Dana Testwell",
        title: "Fictional Analyst",
        bio: "Dana is a fictional analyst created for the test suite and nothing else at all.",
        organizationName: "Brand New Fictional Institute",
        linkedinUrl: "",
      };
      const created = await repo.saveInstructor(input);
      assert.ok(created.ok);
      if (!created.ok) return;
      const option = (await repo.listInstructorOptions()).find((o) => o.id === created.id);
      assert.equal(option?.organizationName, "Brand New Fictional Institute");

      const dup = await repo.saveInstructor({ ...input, name: "Someone Else" });
      assert.ok(!dup.ok && dup.fieldErrors.slug);

      // Reusing an existing organization by name does not create a second one.
      const again = await repo.saveInstructor({ ...input, slug: "dana-two", name: "Dana Two" });
      assert.ok(again.ok);

      const project = await repo.saveProject(baseProject(created.id, { status: "published" }));
      assert.ok(project.ok);
      const detail = await repo.getProject("audit-fictional-coffee-roaster");
      assert.equal(detail?.instructor.name, "Dana Testwell");
      assert.equal(detail?.organization.name, "Brand New Fictional Institute");

      const edited = await repo.saveInstructor({ ...input, id: created.id, title: "Senior Fictional Analyst" });
      assert.ok(edited.ok);
      assert.equal((await repo.getInstructorAdmin(created.id))?.title, "Senior Fictional Analyst");
      assert.ok((await repo.listInstructorsAdmin(1, 500)).items.some((i) => i.id === created.id && i.projectCount === 1));
    });
  });
}
