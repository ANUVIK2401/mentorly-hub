/**
 * Postgres-backed Repository (Drizzle). Behaves exactly like src/data/memory.ts; both run the
 * same contract suite (tests/contract/repository.contract.ts).
 *
 * Rules that keep it honest:
 *  - Cohort status and capacity decisions come from src/lib/rules.ts, never from SQL. SQL only
 *    counts seats; TypeScript derives status.
 *  - Public queries name their columns. Nothing public selects `cohorts.zoom_link` or student columns.
 *  - Anything that reads seats then writes (create/update application) runs in a transaction that
 *    locks the cohort row first, so two admins cannot both take the last seat.
 *  - The clock is injected (`now`) and `submitted_at` is written explicitly, so tests are reproducible.
 */
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  applications,
  cohorts,
  instructors,
  organizations,
  projects,
  projectTags,
  students,
  tags,
} from "@/db/schema";
import {
  deriveCohortStatus,
  notOpenMessage,
  resolveStatusChange,
  SEAT_STATUSES,
} from "@/lib/rules";
import { isUuid } from "@/lib/uuid";
import type { AdminStats, ApplicationStatusView, ApplyContext, Repository } from "./repository";
import {
  APPLICATION_STATUSES,
  type AdminApplicationFilter,
  type AdminApplicationRow,
  type AdminCohortRow,
  type ApplicationStatus,
  type CohortStatus,
  type CohortView,
  type CreateApplicationResult,
  type InstructorCard,
  type InstructorDetail,
  type Page,
  type ProjectCard,
  type ProjectDetail,
  type StatusChangeResult,
  type Tag,
} from "./types";

type Executor = Pick<Db, "select" | "insert" | "update" | "execute">;

const STATUS_RANK: Record<CohortStatus, number> = { open: 0, full: 1, closed: 2, completed: 3 };
const UNIQUE_VIOLATION = "23505";

function paginate<T>(all: T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), total: all.length, page: safePage, pageSize, pageCount };
}

const termsOf = (q?: string) => (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
const likeTerm = (t: string) => `%${t.replace(/[\\%_]/g, "\\$&")}%`;
const isUniqueViolation = (e: unknown): boolean => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === UNIQUE_VIOLATION || err?.cause?.code === UNIQUE_VIOLATION;
};

interface CohortCounts {
  seats: number;
  applications: number;
  waitlisted: number;
}

const COHORT_COLUMNS = {
  id: cohorts.id,
  projectId: cohorts.projectId,
  startDate: cohorts.startDate,
  endDate: cohorts.endDate,
  applicationDeadline: cohorts.applicationDeadline,
  minStudents: cohorts.minStudents,
  maxStudents: cohorts.maxStudents,
}; // deliberately no zoomLink

type CohortRow = { [K in keyof typeof COHORT_COLUMNS]: (typeof COHORT_COLUMNS)[K]["_"]["data"] };

async function countsFor(db: Executor, cohortIds?: string[]): Promise<Map<string, CohortCounts>> {
  if (cohortIds && cohortIds.length === 0) return new Map();
  const rows = await db
    .select({
      cohortId: applications.cohortId,
      seats: sql<number>`count(*) filter (where ${inArray(applications.status, [...SEAT_STATUSES])})::int`,
      total: sql<number>`count(*)::int`,
      waitlisted: sql<number>`count(*) filter (where ${eq(applications.status, "waitlisted")})::int`,
    })
    .from(applications)
    .where(cohortIds ? inArray(applications.cohortId, cohortIds) : undefined)
    .groupBy(applications.cohortId);
  return new Map(rows.map((r) => [r.cohortId, { seats: r.seats, applications: r.total, waitlisted: r.waitlisted }]));
}

export function createPostgresRepository(db: Db, now: () => Date = () => new Date()): Repository {
  const viewOf = (c: CohortRow, counts: Map<string, CohortCounts>): CohortView => {
    const taken = counts.get(c.id)?.seats ?? 0;
    return { ...c, status: deriveCohortStatus(c, taken, now()), seatsTaken: taken, seatsLeft: Math.max(0, c.maxStudents - taken) };
  };

  /** Open first (soonest), then full/closed, then the most recent completed. */
  const featured = (views: CohortView[]): CohortView | undefined =>
    [...views].sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        (a.status === "completed" ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate)),
    )[0];

  /** Cohort views grouped by project id, sorted by start date. */
  async function viewsByProject(projectIds: string[]): Promise<Map<string, CohortView[]>> {
    const out = new Map<string, CohortView[]>();
    if (projectIds.length === 0) return out;
    const rows = await db.select(COHORT_COLUMNS).from(cohorts).where(inArray(cohorts.projectId, projectIds));
    const counts = await countsFor(db, rows.map((r) => r.id));
    for (const r of rows) {
      const list = out.get(r.projectId) ?? [];
      list.push(viewOf(r, counts));
      out.set(r.projectId, list);
    }
    for (const list of out.values()) list.sort((a, b) => a.startDate.localeCompare(b.startDate));
    return out;
  }

  async function skillsByProject(projectIds: string[]): Promise<Map<string, Tag[]>> {
    const out = new Map<string, Tag[]>();
    if (projectIds.length === 0) return out;
    const rows = await db
      .select({ projectId: projectTags.projectId, id: tags.id, name: tags.name, type: tags.type })
      .from(projectTags)
      .innerJoin(tags, eq(tags.id, projectTags.tagId))
      .where(and(inArray(projectTags.projectId, projectIds), eq(tags.type, "skill")))
      .orderBy(asc(projectTags.position), asc(tags.name));
    for (const r of rows) {
      const list = out.get(r.projectId) ?? [];
      list.push({ id: r.id, name: r.name, type: r.type });
      out.set(r.projectId, list);
    }
    return out;
  }

  const PROJECT_COLUMNS = {
    id: projects.id,
    slug: projects.slug,
    title: projects.title,
    summary: projects.summary,
    description: projects.description,
    learningGoals: projects.learningGoals,
    deliverable: projects.deliverable,
    instructorSlug: instructors.slug,
    instructorName: instructors.name,
    instructorTitle: instructors.title,
    instructorBio: instructors.bio,
    organizationName: organizations.name,
    industryId: tags.id,
    industryName: tags.name,
  };
  type ProjectRow = { [K in keyof typeof PROJECT_COLUMNS]: (typeof PROJECT_COLUMNS)[K]["_"]["data"] };

  const projectSelect = () =>
    db
      .select(PROJECT_COLUMNS)
      .from(projects)
      .innerJoin(instructors, eq(instructors.id, projects.instructorId))
      .innerJoin(organizations, eq(organizations.id, projects.organizationId))
      .innerJoin(tags, eq(tags.id, projects.industryId));

  const toCard = (p: ProjectRow, views: CohortView[], skills: Tag[]): ProjectCard => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    instructor: { slug: p.instructorSlug, name: p.instructorName, title: p.instructorTitle },
    organization: { name: p.organizationName },
    industry: { id: p.industryId, name: p.industryName, type: "industry" },
    skills,
    featuredCohort: featured(views),
    applicationsOpen: views.some((v) => v.status === "open"),
  });

  async function cardsFor(rows: ProjectRow[]): Promise<ProjectCard[]> {
    const ids = rows.map((r) => r.id);
    const [views, skills] = await Promise.all([viewsByProject(ids), skillsByProject(ids)]);
    return rows.map((r) => toCard(r, views.get(r.id) ?? [], skills.get(r.id) ?? []));
  }

  const adminRowSelect = () =>
    db
      .select({
        id: applications.id,
        submittedAt: applications.submittedAt,
        status: applications.status,
        statement: applications.statement,
        name: students.name,
        email: students.email,
        school: students.school,
        program: students.program,
        graduationYear: students.graduationYear,
        cohortId: cohorts.id,
        cohortStart: cohorts.startDate,
        projectTitle: projects.title,
        projectSlug: projects.slug,
        instructorName: instructors.name,
      })
      .from(applications)
      .innerJoin(students, eq(students.id, applications.studentId))
      .innerJoin(cohorts, eq(cohorts.id, applications.cohortId))
      .innerJoin(projects, eq(projects.id, cohorts.projectId))
      .innerJoin(instructors, eq(instructors.id, projects.instructorId));

  const applicationFilter = (f: Omit<AdminApplicationFilter, "page" | "pageSize">): SQL | undefined => {
    const conds: SQL[] = [];
    if (f.status) conds.push(eq(applications.status, f.status));
    if (f.cohortId) conds.push(eq(applications.cohortId, f.cohortId));
    for (const t of termsOf(f.q)) {
      const like = likeTerm(t);
      conds.push(
        or(ilike(students.name, like), ilike(students.email, like), ilike(students.school, like), ilike(projects.title, like))!,
      );
    }
    return conds.length ? and(...conds) : undefined;
  };

  type AdminRowRaw = Awaited<ReturnType<ReturnType<typeof adminRowSelect>["limit"]>>[number];
  const toAdminRow = (r: AdminRowRaw): AdminApplicationRow => ({
    id: r.id,
    submittedAt: r.submittedAt.toISOString(),
    status: r.status,
    student: { name: r.name, email: r.email, school: r.school, program: r.program, graduationYear: r.graduationYear },
    statement: r.statement,
    cohortId: r.cohortId,
    cohortStart: r.cohortStart,
    projectTitle: r.projectTitle,
    projectSlug: r.projectSlug,
    instructorName: r.instructorName,
  });

  /** Locks the cohort row for the rest of the transaction and returns it with its current seat count. */
  async function lockCohort(tx: Executor, cohortId: string) {
    const [cohort] = await tx
      .select({ ...COHORT_COLUMNS })
      .from(cohorts)
      .where(eq(cohorts.id, cohortId))
      .for("update");
    if (!cohort) return null;
    const counts = await countsFor(tx, [cohortId]);
    return { cohort, seatsTaken: counts.get(cohortId)?.seats ?? 0 };
  }

  return {
    /* ---------------------------------- public ---------------------------------- */

    async listIndustries() {
      const rows = await db
        .select({ id: tags.id, name: tags.name, type: tags.type })
        .from(tags)
        .where(eq(tags.type, "industry"))
        .orderBy(asc(tags.position), asc(tags.name));
      return rows;
    },

    async listSkillTags(industryId) {
      const conds: SQL[] = [eq(projects.status, "published"), eq(tags.type, "skill")];
      if (industryId) conds.push(eq(projects.industryId, industryId));
      return db
        .selectDistinct({ id: tags.id, name: tags.name, type: tags.type })
        .from(projectTags)
        .innerJoin(projects, eq(projects.id, projectTags.projectId))
        .innerJoin(tags, eq(tags.id, projectTags.tagId))
        .where(and(...conds))
        .orderBy(asc(tags.name));
    },

    async listProjects(q) {
      const conds: SQL[] = [eq(projects.status, "published")];
      if (q.industry) conds.push(eq(projects.industryId, q.industry));
      if (q.tag) {
        conds.push(
          sql`exists (select 1 from ${projectTags} where ${projectTags.projectId} = ${projects.id} and ${projectTags.tagId} = ${q.tag})`,
        );
      }
      for (const t of termsOf(q.q)) {
        const like = likeTerm(t);
        conds.push(
          or(
            ilike(projects.title, like),
            ilike(projects.summary, like),
            ilike(instructors.name, like),
            ilike(organizations.name, like),
            ilike(tags.name, like),
            sql`exists (select 1 from ${projectTags} pt join ${tags} st on st.id = pt.tag_id where pt.project_id = ${projects.id} and st.type = 'skill' and st.name ilike ${like})`,
          )!,
        );
      }
      const rows = await projectSelect().where(and(...conds));

      // ponytail: derives status for the whole filtered set in memory. Fine below ~10,000 projects;
      // beyond that, page in SQL by a precomputed ordering.
      const views = await viewsByProject(rows.map((r) => r.id));
      const matches = rows
        .map((p) => ({ p, views: views.get(p.id) ?? [], top: featured(views.get(p.id) ?? []) }))
        .filter((m) => !q.openOnly || m.views.some((v) => v.status === "open"));
      matches.sort(
        (a, b) =>
          (a.top ? STATUS_RANK[a.top.status] : 9) - (b.top ? STATUS_RANK[b.top.status] : 9) ||
          (a.top?.startDate ?? "").localeCompare(b.top?.startDate ?? "") ||
          a.p.title.localeCompare(b.p.title),
      );
      const pageData = paginate(matches, q.page, q.pageSize);
      const pageRows = pageData.items.map((m) => m.p);
      const skills = await skillsByProject(pageRows.map((r) => r.id));
      return {
        ...pageData,
        items: pageData.items.map((m) => toCard(m.p, m.views, skills.get(m.p.id) ?? [])),
      };
    },

    async getProject(slug): Promise<ProjectDetail | null> {
      const [p] = await projectSelect().where(and(eq(projects.slug, slug), eq(projects.status, "published")));
      if (!p) return null;
      const [card] = await cardsFor([p]);
      const views = (await viewsByProject([p.id])).get(p.id) ?? [];
      return {
        ...card,
        description: p.description,
        learningGoals: p.learningGoals,
        deliverable: p.deliverable,
        instructorBio: p.instructorBio,
        cohorts: views,
      };
    },

    async listInstructors(page, pageSize) {
      const base = db
        .select({
          slug: instructors.slug,
          name: instructors.name,
          title: instructors.title,
          organizationName: organizations.name,
          projectCount: count(projects.id),
        })
        .from(instructors)
        .innerJoin(projects, and(eq(projects.instructorId, instructors.id), eq(projects.status, "published")))
        .innerJoin(organizations, eq(organizations.id, instructors.organizationId))
        .groupBy(instructors.id, organizations.name)
        .orderBy(asc(instructors.name));
      const all = await base;
      const pageData = paginate(all, page, pageSize);
      const items: InstructorCard[] = pageData.items.map((r) => ({
        slug: r.slug,
        name: r.name,
        title: r.title,
        organization: { name: r.organizationName },
        projectCount: r.projectCount,
      }));
      return { ...pageData, items };
    },

    async getInstructor(slug): Promise<InstructorDetail | null> {
      const [i] = await db
        .select({
          id: instructors.id,
          slug: instructors.slug,
          name: instructors.name,
          title: instructors.title,
          bio: instructors.bio,
          organizationName: organizations.name,
        })
        .from(instructors)
        .innerJoin(organizations, eq(organizations.id, instructors.organizationId))
        .where(eq(instructors.slug, slug));
      if (!i) return null;
      const rows = await projectSelect().where(and(eq(projects.instructorId, i.id), eq(projects.status, "published")));
      return {
        slug: i.slug,
        name: i.name,
        title: i.title,
        organization: { name: i.organizationName },
        projectCount: rows.length,
        bio: i.bio,
        projects: await cardsFor(rows),
      };
    },

    async getApplyContext(cohortId): Promise<ApplyContext | null> {
      const [row] = await db
        .select({
          ...COHORT_COLUMNS,
          projectSlug: projects.slug,
          projectTitle: projects.title,
          instructorName: instructors.name,
        })
        .from(cohorts)
        .innerJoin(projects, eq(projects.id, cohorts.projectId))
        .innerJoin(instructors, eq(instructors.id, projects.instructorId))
        .where(and(eq(cohorts.id, cohortId), eq(projects.status, "published")));
      if (!row) return null;
      const counts = await countsFor(db, [row.id]);
      return {
        cohort: viewOf(row, counts),
        project: { slug: row.projectSlug, title: row.projectTitle },
        instructorName: row.instructorName,
      };
    },

    async createApplication(input): Promise<CreateApplicationResult> {
      const email = input.student.email.trim().toLowerCase();
      const duplicate: CreateApplicationResult = {
        ok: false,
        code: "duplicate",
        message: "An application with this email already exists for this cohort.",
      };
      try {
        return await db.transaction(async (tx): Promise<CreateApplicationResult> => {
          const locked = await lockCohort(tx, input.cohortId);
          if (!locked) return { ok: false, code: "cohort_not_found", message: "That cohort does not exist." };
          const status = deriveCohortStatus(locked.cohort, locked.seatsTaken, now());
          if (status !== "open") {
            return { ok: false, code: "not_open", message: notOpenMessage(status, locked.cohort.applicationDeadline) };
          }

          const [student] = await tx
            .insert(students)
            .values({ ...input.student, email })
            .onConflictDoUpdate({
              target: students.email,
              set: {
                name: input.student.name,
                school: input.student.school,
                program: input.student.program,
                graduationYear: input.student.graduationYear,
              },
            })
            .returning({ id: students.id });

          // The cohort row is locked, so this check cannot race another application to the same cohort.
          const [existing] = await tx
            .select({ id: applications.id })
            .from(applications)
            .where(and(eq(applications.cohortId, input.cohortId), eq(applications.studentId, student.id)));
          if (existing) return duplicate;

          const submittedAt = now();
          const [row] = await tx
            .insert(applications)
            .values({ cohortId: input.cohortId, studentId: student.id, statement: input.statement, submittedAt })
            .returning({ id: applications.id });
          return {
            ok: true,
            application: {
              id: row.id,
              cohortId: input.cohortId,
              student: { ...input.student, email },
              statement: input.statement,
              status: "submitted",
              submittedAt: submittedAt.toISOString(),
            },
          };
        });
      } catch (e) {
        if (isUniqueViolation(e)) return duplicate; // backstop: applications_cohort_student_uq
        throw e;
      }
    },

    async getApplicationStatus(id): Promise<ApplicationStatusView | null> {
      if (!isUuid(id)) return null;
      const [r] = await db
        .select({
          id: applications.id,
          status: applications.status,
          submittedAt: applications.submittedAt,
          studentName: students.name,
          projectTitle: projects.title,
          projectSlug: projects.slug,
          cohortStart: cohorts.startDate,
          cohortEnd: cohorts.endDate,
        })
        .from(applications)
        .innerJoin(students, eq(students.id, applications.studentId))
        .innerJoin(cohorts, eq(cohorts.id, applications.cohortId))
        .innerJoin(projects, eq(projects.id, cohorts.projectId))
        .where(eq(applications.id, id));
      return r ? { ...r, submittedAt: r.submittedAt.toISOString() } : null;
    },

    /* ----------------------------------- admin ---------------------------------- */

    async getAdminStats(): Promise<AdminStats> {
      const [[projectCount], [instructorCount], statusRows, cohortRows] = await Promise.all([
        db.select({ n: count() }).from(projects).where(eq(projects.status, "published")),
        db.select({ n: count() }).from(instructors),
        db.select({ status: applications.status, n: count() }).from(applications).groupBy(applications.status),
        db.select(COHORT_COLUMNS).from(cohorts),
      ]);
      const counts = await countsFor(db);
      const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
      let total = 0;
      for (const r of statusRows) {
        byStatus[r.status] = r.n;
        total += r.n;
      }
      return {
        projects: projectCount.n,
        instructors: instructorCount.n,
        openCohorts: cohortRows.filter((c) => viewOf(c, counts).status === "open").length,
        applications: total,
        byStatus,
      };
    },

    async listApplications(filter) {
      const where = applicationFilter(filter);
      const [{ n: total }] = await db
        .select({ n: count() })
        .from(applications)
        .innerJoin(students, eq(students.id, applications.studentId))
        .innerJoin(cohorts, eq(cohorts.id, applications.cohortId))
        .innerJoin(projects, eq(projects.id, cohorts.projectId))
        .where(where);
      const pageCount = Math.max(1, Math.ceil(total / filter.pageSize));
      const page = Math.min(Math.max(1, filter.page), pageCount);
      const rows = await adminRowSelect()
        .where(where)
        .orderBy(desc(applications.submittedAt), asc(applications.id))
        .limit(filter.pageSize)
        .offset((page - 1) * filter.pageSize);
      return { items: rows.map(toAdminRow), total, page, pageSize: filter.pageSize, pageCount };
    },

    async exportApplications(filter) {
      const rows = await adminRowSelect()
        .where(applicationFilter(filter))
        .orderBy(desc(applications.submittedAt), asc(applications.id));
      return rows.map(toAdminRow);
    },

    async listCohortRows(): Promise<AdminCohortRow[]> {
      const [rows, counts] = await Promise.all([
        db
          .select({
            ...COHORT_COLUMNS,
            projectTitle: projects.title,
            projectSlug: projects.slug,
            instructorName: instructors.name,
          })
          .from(cohorts)
          .innerJoin(projects, eq(projects.id, cohorts.projectId))
          .innerJoin(instructors, eq(instructors.id, projects.instructorId)),
        countsFor(db),
      ]);
      return rows
        .map((c) => {
          const v = viewOf(c, counts);
          const n = counts.get(c.id);
          return {
            cohortId: c.id,
            projectTitle: c.projectTitle,
            projectSlug: c.projectSlug,
            instructorName: c.instructorName,
            startDate: c.startDate,
            applicationDeadline: c.applicationDeadline,
            status: v.status,
            maxStudents: c.maxStudents,
            seatsTaken: v.seatsTaken,
            applicationCount: n?.applications ?? 0,
            waitlistCount: n?.waitlisted ?? 0,
          };
        })
        .sort(
          (a, b) =>
            STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
            a.startDate.localeCompare(b.startDate) ||
            a.projectTitle.localeCompare(b.projectTitle),
        );
    },

    async updateApplicationStatus(id, requested, reviewer): Promise<StatusChangeResult> {
      if (!isUuid(id)) return { ok: false, message: "Application not found." };
      return db.transaction(async (tx): Promise<StatusChangeResult> => {
        const [found] = await tx
          .select({ cohortId: applications.cohortId })
          .from(applications)
          .where(eq(applications.id, id));
        if (!found) return { ok: false, message: "Application not found." };

        // Lock the cohort BEFORE reading seats, then re-read the application under the lock.
        const locked = await lockCohort(tx, found.cohortId);
        const [current] = await tx
          .select({ status: applications.status })
          .from(applications)
          .where(eq(applications.id, id));
        if (!locked || !current) return { ok: false, message: "Application not found." };

        const result = resolveStatusChange({
          current: current.status,
          requested,
          seatsTaken: locked.seatsTaken,
          maxStudents: locked.cohort.maxStudents,
        });
        await tx.update(applications).set({ status: result.status, reviewedBy: reviewer }).where(eq(applications.id, id));
        return { ok: true, status: result.status, waitlistedBecauseFull: result.waitlistedBecauseFull };
      });
    },
  };
}
