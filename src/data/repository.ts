/**
 * The seam between the app and its storage.
 *
 * Pages, server actions and route handlers talk ONLY to this interface (via getRepo()).
 * Today the implementation is in-memory (src/data/memory.ts). To go real, write a
 * Postgres implementation against src/db/schema.ts and return it from src/data/index.ts.
 * Nothing else in the app should need to change.
 */
import type {
  AdminApplicationFilter,
  AdminApplicationRow,
  AdminCohortRow,
  ApplicationStatus,
  CohortView,
  CreateApplicationInput,
  CreateApplicationResult,
  InstructorCard,
  InstructorDetail,
  Page,
  ProjectCard,
  ProjectDetail,
  ProjectQuery,
  StatusChangeResult,
  Tag,
} from "./types";

/** What a student sees on their own status page. Deliberately minimal. */
export interface ApplicationStatusView {
  id: string;
  status: ApplicationStatus;
  submittedAt: string;
  studentName: string;
  projectTitle: string;
  projectSlug: string;
  cohortStart: string;
  cohortEnd: string;
}

export interface ApplyContext {
  cohort: CohortView;
  project: { slug: string; title: string };
  instructorName: string;
}

export interface AdminStats {
  projects: number;
  instructors: number;
  openCohorts: number;
  applications: number;
  byStatus: Record<ApplicationStatus, number>;
}

export interface Repository {
  /* ---- public ---- */
  listIndustries(): Promise<Tag[]>;
  listSkillTags(industryId?: string): Promise<Tag[]>;
  listProjects(query: ProjectQuery): Promise<Page<ProjectCard>>;
  getProject(slug: string): Promise<ProjectDetail | null>;
  listInstructors(page: number, pageSize: number): Promise<Page<InstructorCard>>;
  getInstructor(slug: string): Promise<InstructorDetail | null>;
  getApplyContext(cohortId: string): Promise<ApplyContext | null>;
  createApplication(input: CreateApplicationInput): Promise<CreateApplicationResult>;
  getApplicationStatus(id: string): Promise<ApplicationStatusView | null>;

  /* ---- admin: callers MUST have passed requireAdmin() first ---- */
  getAdminStats(): Promise<AdminStats>;
  listApplications(filter: AdminApplicationFilter): Promise<Page<AdminApplicationRow>>;
  /** Unpaginated, for Excel export. */
  exportApplications(filter: Omit<AdminApplicationFilter, "page" | "pageSize">): Promise<AdminApplicationRow[]>;
  listCohortRows(): Promise<AdminCohortRow[]>;
  updateApplicationStatus(
    id: string,
    requested: ApplicationStatus,
    reviewer: string,
  ): Promise<StatusChangeResult>;
}
