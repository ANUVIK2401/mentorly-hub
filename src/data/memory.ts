/**
 * In-memory Repository backed by the synthetic seed.
 *
 * LIMITATION (important for the Vercel demo): state lives in the server process.
 * Seeded data is identical everywhere (deterministic), but applications submitted
 * through the UI live only in that one serverless instance and are lost when it
 * recycles. Swap in a database-backed Repository for anything real.
 */
import { randomUUID } from "node:crypto";
import { isUuid } from "@/lib/uuid";
import { slugify } from "./seed";
import { applicationKey, cohortRuleErrors, deriveCohortStatus, notOpenMessage, occupiesSeat, resolveStatusChange } from "@/lib/rules";
import type { AdminStats, ApplicationStatusView, ApplyContext, Repository } from "./repository";
import type { SeedData } from "./seed";
import {
  APPLICATION_STATUSES,
  type AdminApplicationDetail,
  type AdminApplicationFilter,
  type ApplicationEvent,
  type AdminCohortEdit,
  type AdminInstructorRow,
  type AdminProjectRow,
  type InstructorInput,
  type InstructorOption,
  type ProjectInput,
  type SaveResult,
  type AdminApplicationRow,
  type AdminCohortRow,
  type Application,
  type ApplicationStatus,
  type Cohort,
  type CohortStatus,
  type CohortView,
  type CreateApplicationInput,
  type CreateApplicationResult,
  type Instructor,
  type InstructorCard,
  type InstructorDetail,
  type Page,
  type Project,
  type ProjectCard,
  type ProjectDetail,
  type ProjectQuery,
  type StatusChangeResult,
} from "./types";

const STATUS_RANK: Record<CohortStatus, number> = { open: 0, full: 1, closed: 2, completed: 3 };

function paginate<T>(all: T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: all.slice(start, start + pageSize),
    total: all.length,
    page: safePage,
    pageSize,
    pageCount,
  };
}

export function createMemoryRepository(seed: SeedData, now: () => Date = () => new Date()): Repository {
  const industries = new Map(seed.industries.map((t) => [t.id, t]));
  const skills = new Map(seed.skills.map((t) => [t.id, t]));
  const orgs = new Map(seed.organizations.map((o) => [o.id, o]));
  const instructorsById = new Map(seed.instructors.map((i) => [i.id, i]));
  const projectsById = new Map(seed.projects.map((p) => [p.id, p]));
  const cohortsById = new Map(seed.cohorts.map((c) => [c.id, c]));

  // Derived indexes. Rebuilt by reindex() after any admin write (project, cohort or instructor
  // changes), otherwise new or edited projects would be missing from search.
  let instructorsBySlug = new Map<string, Instructor>();
  let projectsBySlug = new Map<string, Project>();
  let cohortsByProject = new Map<string, Cohort[]>();
  let published: Project[] = [];
  let haystack = new Map<string, string>();

  function reindex() {
    instructorsBySlug = new Map([...instructorsById.values()].map((i) => [i.slug, i]));
    projectsBySlug = new Map([...projectsById.values()].map((p) => [p.slug, p]));
    cohortsByProject = new Map();
    for (const c of cohortsById.values()) {
      const list = cohortsByProject.get(c.projectId) ?? [];
      list.push(c);
      cohortsByProject.set(c.projectId, list);
    }
    published = [...projectsById.values()].filter((p) => p.status === "published");
    haystack = new Map();
    for (const p of published) {
      const ins = instructorsById.get(p.instructorId)!;
      const text = [
        p.title,
        p.summary,
        ins.name,
        orgs.get(p.organizationId)?.name,
        industries.get(p.industryId)?.name,
        ...p.skillTagIds.map((id) => skills.get(id)?.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      haystack.set(p.id, text);
    }
  }

  const applications = new Map<string, Application>();
  const events = new Map<string, ApplicationEvent[]>();
  const appKeys = new Set<string>();
  const seatsTaken = new Map<string, number>();
  const appCount = new Map<string, number>();
  const waitlistCount = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string, d: number) => m.set(k, (m.get(k) ?? 0) + d);

  for (const a of seed.applications) {
    applications.set(a.id, a);
    appKeys.add(applicationKey(a.cohortId, a.student.email));
    bump(appCount, a.cohortId, 1);
    if (occupiesSeat(a.status)) bump(seatsTaken, a.cohortId, 1);
    if (a.status === "waitlisted") bump(waitlistCount, a.cohortId, 1);
  }
  reindex();

  /* ------------------------------ helpers ------------------------------ */

  const cohortView = (c: Cohort): CohortView => {
    const taken = seatsTaken.get(c.id) ?? 0;
    return {
      id: c.id,
      projectId: c.projectId,
      startDate: c.startDate,
      endDate: c.endDate,
      applicationDeadline: c.applicationDeadline,
      minStudents: c.minStudents,
      maxStudents: c.maxStudents,
      status: deriveCohortStatus(c, taken, now()),
      seatsTaken: taken,
      seatsLeft: Math.max(0, c.maxStudents - taken),
    };
  };

  const viewsFor = (projectId: string): CohortView[] =>
    (cohortsByProject.get(projectId) ?? []).map(cohortView).sort((a, b) => a.startDate.localeCompare(b.startDate));

  /** Open first (soonest), then full/closed, then the most recent completed. */
  const featured = (views: CohortView[]): CohortView | undefined => {
    if (views.length === 0) return undefined;
    return [...views].sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        (a.status === "completed" ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate)),
    )[0];
  };

  const toCard = (p: Project, views = viewsFor(p.id)): ProjectCard => {
    const ins = instructorsById.get(p.instructorId)!;
    return {
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      instructor: { slug: ins.slug, name: ins.name, title: ins.title },
      organization: { name: orgs.get(p.organizationId)!.name },
      industry: industries.get(p.industryId)!,
      skills: p.skillTagIds.map((id) => skills.get(id)!).filter(Boolean),
      featuredCohort: featured(views),
      applicationsOpen: views.some((v) => v.status === "open"),
    };
  };

  const toInstructorCard = (i: Instructor): InstructorCard => ({
    slug: i.slug,
    name: i.name,
    title: i.title,
    organization: { name: orgs.get(i.organizationId)!.name },
    projectCount: published.filter((p) => p.instructorId === i.id).length,
  });

  const toAdminRow = (a: Application): AdminApplicationRow => {
    const cohort = cohortsById.get(a.cohortId)!;
    const project = projectsById.get(cohort.projectId)!;
    return {
      id: a.id,
      submittedAt: a.submittedAt,
      status: a.status,
      student: a.student,
      statement: a.statement,
      cohortId: cohort.id,
      cohortStart: cohort.startDate,
      projectTitle: project.title,
      projectSlug: project.slug,
      instructorName: instructorsById.get(project.instructorId)!.name,
    };
  };

  const toCohortEdit = (c: Cohort): AdminCohortEdit => {
    const v = cohortView(c);
    return {
      id: c.id,
      projectId: c.projectId,
      startDate: c.startDate,
      endDate: c.endDate,
      applicationDeadline: c.applicationDeadline,
      minStudents: c.minStudents,
      maxStudents: c.maxStudents,
      zoomLink: c.zoomLink,
      status: v.status,
      seatsTaken: v.seatsTaken,
    };
  };

  const filteredApplications = (f: Omit<AdminApplicationFilter, "page" | "pageSize">): AdminApplicationRow[] => {
    const terms = (f.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const rows: AdminApplicationRow[] = [];
    for (const a of applications.values()) {
      if (f.status && a.status !== f.status) continue;
      if (f.cohortId && a.cohortId !== f.cohortId) continue;
      const row = toAdminRow(a);
      if (terms.length) {
        const hay = `${row.student.name} ${row.student.email} ${row.student.school} ${row.projectTitle}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) continue;
      }
      rows.push(row);
    }
    return rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  };

  /* ---------------------------- Repository ----------------------------- */

  return {
    async listIndustries() {
      return [...industries.values()];
    },

    async listSkillTags(industryId) {
      const ids = new Set<string>();
      for (const p of published) {
        if (industryId && p.industryId !== industryId) continue;
        p.skillTagIds.forEach((id) => ids.add(id));
      }
      return [...ids]
        .map((id) => skills.get(id)!)
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async listProjects(q: ProjectQuery) {
      const terms = (q.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      const matches: { p: Project; views: CohortView[]; top?: CohortView }[] = [];
      for (const p of published) {
        if (q.industry && p.industryId !== q.industry) continue;
        if (q.tag && !p.skillTagIds.includes(q.tag)) continue;
        if (terms.length) {
          const hay = haystack.get(p.id)!;
          if (!terms.every((t) => hay.includes(t))) continue;
        }
        const views = viewsFor(p.id);
        if (q.openOnly && !views.some((v) => v.status === "open")) continue;
        matches.push({ p, views, top: featured(views) });
      }
      matches.sort(
        (a, b) =>
          (a.top ? STATUS_RANK[a.top.status] : 9) - (b.top ? STATUS_RANK[b.top.status] : 9) ||
          (a.top?.startDate ?? "").localeCompare(b.top?.startDate ?? "") ||
          a.p.title.localeCompare(b.p.title),
      );
      const pageData = paginate(matches, q.page, q.pageSize);
      return { ...pageData, items: pageData.items.map((m) => toCard(m.p, m.views)) };
    },

    async getProject(slug): Promise<ProjectDetail | null> {
      const p = projectsBySlug.get(slug);
      if (!p || p.status !== "published") return null;
      const views = viewsFor(p.id);
      return {
        ...toCard(p, views),
        description: p.description,
        learningGoals: p.learningGoals,
        deliverable: p.deliverable,
        instructorBio: instructorsById.get(p.instructorId)!.bio,
        cohorts: views,
      };
    },

    async listInstructors(page, pageSize) {
      const sorted = [...instructorsById.values()]
        .filter((i) => published.some((p) => p.instructorId === i.id))
        .sort((a, b) => a.name.localeCompare(b.name));
      const pageData = paginate(sorted, page, pageSize);
      return { ...pageData, items: pageData.items.map(toInstructorCard) };
    },

    async getInstructor(slug): Promise<InstructorDetail | null> {
      const i = instructorsBySlug.get(slug);
      if (!i) return null;
      return {
        ...toInstructorCard(i),
        bio: i.bio,
        projects: published.filter((p) => p.instructorId === i.id).map((p) => toCard(p)),
      };
    },

    async getApplyContext(cohortId): Promise<ApplyContext | null> {
      const c = cohortsById.get(cohortId);
      if (!c) return null;
      const p = projectsById.get(c.projectId);
      if (!p || p.status !== "published") return null;
      return {
        cohort: cohortView(c),
        project: { slug: p.slug, title: p.title },
        instructorName: instructorsById.get(p.instructorId)!.name,
      };
    },

    async createApplication(input: CreateApplicationInput): Promise<CreateApplicationResult> {
      const cohort = cohortsById.get(input.cohortId);
      if (!cohort) return { ok: false, code: "cohort_not_found", message: "That cohort does not exist." };

      const view = cohortView(cohort);
      if (view.status !== "open") {
        return { ok: false, code: "not_open", message: notOpenMessage(view.status, cohort.applicationDeadline) };
      }

      const key = applicationKey(cohort.id, input.student.email);
      if (appKeys.has(key)) {
        return {
          ok: false,
          code: "duplicate",
          message: "An application with this email already exists for this cohort.",
        };
      }

      const application: Application = {
        id: randomUUID(),
        cohortId: cohort.id,
        student: { ...input.student, email: input.student.email.trim().toLowerCase() },
        statement: input.statement,
        status: "submitted",
        submittedAt: now().toISOString(),
      };
      applications.set(application.id, application);
      appKeys.add(key);
      bump(appCount, cohort.id, 1);
      return { ok: true, application };
    },

    async getApplicationStatus(id): Promise<ApplicationStatusView | null> {
      if (!isUuid(id)) return null;
      const a = applications.get(id);
      if (!a) return null;
      const cohort = cohortsById.get(a.cohortId)!;
      const project = projectsById.get(cohort.projectId)!;
      return {
        id: a.id,
        status: a.status,
        submittedAt: a.submittedAt,
        studentName: a.student.name,
        projectTitle: project.title,
        projectSlug: project.slug,
        cohortStart: cohort.startDate,
        cohortEnd: cohort.endDate,
      };
    },

    async getAdminStats(): Promise<AdminStats> {
      const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
      for (const a of applications.values()) byStatus[a.status] += 1;
      let openCohorts = 0;
      for (const c of cohortsById.values()) if (cohortView(c).status === "open") openCohorts += 1;
      return {
        projects: published.length,
        instructors: instructorsById.size,
        openCohorts,
        applications: applications.size,
        byStatus,
      };
    },

    async listApplications(filter) {
      const pageData = paginate(filteredApplications(filter), filter.page, filter.pageSize);
      return pageData;
    },

    async getAdminApplication(id): Promise<AdminApplicationDetail | null> {
      if (!isUuid(id)) return null;
      const a = applications.get(id);
      return a ? { ...toAdminRow(a), events: [...(events.get(id) ?? [])] } : null;
    },

    async exportApplications(filter) {
      return filteredApplications(filter);
    },

    async listCohortRows(): Promise<AdminCohortRow[]> {
      return [...cohortsById.values()]
        .map((c) => {
          const v = cohortView(c);
          const p = projectsById.get(c.projectId)!;
          return {
            cohortId: c.id,
            projectTitle: p.title,
            projectSlug: p.slug,
            instructorName: instructorsById.get(p.instructorId)!.name,
            startDate: c.startDate,
            applicationDeadline: c.applicationDeadline,
            status: v.status,
            maxStudents: c.maxStudents,
            seatsTaken: v.seatsTaken,
            applicationCount: appCount.get(c.id) ?? 0,
            waitlistCount: waitlistCount.get(c.id) ?? 0,
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
      const a = applications.get(id);
      if (!a) return { ok: false, message: "Application not found." };
      const cohort = cohortsById.get(a.cohortId)!;
      const result = resolveStatusChange({
        current: a.status,
        requested,
        seatsTaken: seatsTaken.get(cohort.id) ?? 0,
        maxStudents: cohort.maxStudents,
      });

      const wasSeat = occupiesSeat(a.status);
      const isSeat = occupiesSeat(result.status);
      if (wasSeat !== isSeat) bump(seatsTaken, cohort.id, isSeat ? 1 : -1);
      if (a.status === "waitlisted") bump(waitlistCount, cohort.id, -1);
      if (result.status === "waitlisted") bump(waitlistCount, cohort.id, 1);

      if (a.status !== result.status) {
        const list = events.get(a.id) ?? [];
        list.unshift({ from: a.status, to: result.status, actor: reviewer, at: now().toISOString() });
        events.set(a.id, list);
      }
      a.status = result.status;
      a.reviewedBy = reviewer;
      return { ok: true, status: result.status, waitlistedBecauseFull: result.waitlistedBecauseFull };
    },

    /* ------------------------------ admin editing ------------------------------ */

    async listProjectsAdmin(filter): Promise<Page<AdminProjectRow>> {
      const terms = (filter.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      const rows = [...projectsById.values()]
        .filter((p) => !filter.status || p.status === filter.status)
        .map((p) => ({
          p,
          hay: `${p.title} ${p.slug} ${instructorsById.get(p.instructorId)!.name}`.toLowerCase(),
        }))
        .filter(({ hay }) => terms.every((t) => hay.includes(t)))
        .map(
          ({ p }): AdminProjectRow => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            status: p.status,
            instructorName: instructorsById.get(p.instructorId)!.name,
            industryName: industries.get(p.industryId)!.name,
            cohortCount: (cohortsByProject.get(p.id) ?? []).length,
          }),
        )
        .sort((a, b) => a.title.localeCompare(b.title));
      return paginate(rows, filter.page, filter.pageSize);
    },

    async getProjectAdmin(id): Promise<ProjectInput | null> {
      const p = projectsById.get(id);
      if (!p) return null;
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        description: p.description,
        learningGoals: p.learningGoals,
        deliverable: p.deliverable,
        instructorId: p.instructorId,
        industryId: p.industryId,
        skillNames: p.skillTagIds.map((sid) => skills.get(sid)!.name),
        status: p.status,
      };
    },

    async saveProject(input): Promise<SaveResult> {
      const existing = input.id ? projectsById.get(input.id) : undefined;
      if (input.id && !existing) return { ok: false, fieldErrors: {}, message: "That project no longer exists." };

      const fieldErrors: Record<string, string> = {};
      const clash = projectsBySlug.get(input.slug);
      if (clash && clash.id !== input.id) fieldErrors.slug = "Another project already uses this slug.";
      const instructor = instructorsById.get(input.instructorId);
      if (!instructor) fieldErrors.instructorId = "Choose an existing instructor.";
      if (!industries.has(input.industryId)) fieldErrors.industryId = "Choose an existing industry.";
      if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

      const skillTagIds: string[] = [];
      for (const name of input.skillNames) {
        const id = slugify(name);
        if (!id || skillTagIds.includes(id)) continue;
        if (!skills.has(id)) skills.set(id, { id, name: name.trim(), type: "skill" });
        skillTagIds.push(id);
      }

      const project: Project = {
        id: existing?.id ?? `prj-${randomUUID().slice(0, 8)}`,
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        description: input.description,
        learningGoals: input.learningGoals,
        deliverable: input.deliverable,
        instructorId: input.instructorId,
        organizationId: instructor!.organizationId,
        industryId: input.industryId,
        skillTagIds,
        status: input.status,
      };
      projectsById.set(project.id, project);
      reindex();
      return { ok: true, id: project.id };
    },

    async setProjectStatus(id, status) {
      const p = projectsById.get(id);
      if (!p) return false;
      projectsById.set(id, { ...p, status });
      reindex();
      return true;
    },

    async listCohortsAdmin(projectId): Promise<AdminCohortEdit[]> {
      return (cohortsByProject.get(projectId) ?? [])
        .map((c) => toCohortEdit(c))
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
    },

    async getCohortAdmin(id) {
      const c = cohortsById.get(id);
      return c ? toCohortEdit(c) : null;
    },

    async saveCohort(input): Promise<SaveResult> {
      const existing = input.id ? cohortsById.get(input.id) : undefined;
      if (input.id && !existing) return { ok: false, fieldErrors: {}, message: "That cohort no longer exists." };
      if (!projectsById.has(input.projectId)) return { ok: false, fieldErrors: {}, message: "That project does not exist." };

      const fieldErrors = cohortRuleErrors(input, existing ? (seatsTaken.get(existing.id) ?? 0) : 0);
      if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

      const cohort: Cohort = {
        id: existing?.id ?? `coh-${randomUUID().slice(0, 8)}`,
        projectId: input.projectId,
        startDate: input.startDate,
        endDate: input.endDate,
        applicationDeadline: input.applicationDeadline,
        minStudents: input.minStudents,
        maxStudents: input.maxStudents,
        zoomLink: input.zoomLink || undefined,
      };
      cohortsById.set(cohort.id, cohort);
      reindex();
      return { ok: true, id: cohort.id };
    },

    async listInstructorsAdmin(page, pageSize): Promise<Page<AdminInstructorRow>> {
      const rows = [...instructorsById.values()]
        .map(
          (i): AdminInstructorRow => ({
            id: i.id,
            slug: i.slug,
            name: i.name,
            title: i.title,
            organizationName: orgs.get(i.organizationId)!.name,
            projectCount: [...projectsById.values()].filter((p) => p.instructorId === i.id).length,
          }),
        )
        .sort((a, b) => a.name.localeCompare(b.name));
      return paginate(rows, page, pageSize);
    },

    async getInstructorAdmin(id): Promise<InstructorInput | null> {
      const i = instructorsById.get(id);
      if (!i) return null;
      return {
        id: i.id,
        slug: i.slug,
        name: i.name,
        title: i.title,
        bio: i.bio,
        organizationName: orgs.get(i.organizationId)!.name,
        linkedinUrl: i.linkedinUrl ?? "",
      };
    },

    async listInstructorOptions(): Promise<InstructorOption[]> {
      return [...instructorsById.values()]
        .map((i) => ({ id: i.id, name: i.name, organizationName: orgs.get(i.organizationId)!.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async saveInstructor(input): Promise<SaveResult> {
      const existing = input.id ? instructorsById.get(input.id) : undefined;
      if (input.id && !existing) return { ok: false, fieldErrors: {}, message: "That instructor no longer exists." };
      const clash = instructorsBySlug.get(input.slug);
      if (clash && clash.id !== input.id) {
        return { ok: false, fieldErrors: { slug: "Another instructor already uses this slug." } };
      }

      const orgName = input.organizationName.trim();
      const orgId = slugify(orgName);
      if (!orgs.has(orgId)) orgs.set(orgId, { id: orgId, name: orgName });

      const instructor: Instructor = {
        id: existing?.id ?? `ins-${randomUUID().slice(0, 8)}`,
        slug: input.slug,
        name: input.name,
        title: input.title,
        bio: input.bio,
        organizationId: orgId,
        linkedinUrl: input.linkedinUrl || undefined,
      };
      instructorsById.set(instructor.id, instructor);
      // A project's organization follows its instructor.
      for (const p of projectsById.values()) {
        if (p.instructorId === instructor.id && p.organizationId !== orgId) projectsById.set(p.id, { ...p, organizationId: orgId });
      }
      reindex();
      return { ok: true, id: instructor.id };
    },
  };
}
