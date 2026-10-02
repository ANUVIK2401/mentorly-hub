/**
 * The seam between the app and its storage.
 *
 * Pages, server actions and route handlers talk ONLY to this interface (via getRepo()).
 * Today the implementation is in-memory (src/data/memory.ts). To go real, write a
 * Postgres implementation against src/db/schema.ts and return it from src/data/index.ts.
 * Nothing else in the app should need to change.
 */
import type {
  AdminApplicationDetail,
  AdminCohortEdit,
  AdminInstructorRow,
  AdminProjectFilter,
  AdminProjectRow,
  AdminApplicationFilter,
  AdminApplicationRow,
  AdminCohortRow,
  ApplicationStatus,
  CohortView,
  CreateApplicationInput,
  CreateApplicationResult,
  CohortInput,
  InstructorCard,
  InstructorDetail,
  InstructorInput,
  InstructorOption,
  Page,
  ProjectCard,
  ProjectDetail,
  ProjectInput,
  ProjectQuery,
  ProjectStatus,
  SaveResult,
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
  /** One application with its audit trail (every real status change, newest first). */
  getAdminApplication(id: string): Promise<AdminApplicationDetail | null>;
  /** Unpaginated, for Excel export. */
  exportApplications(filter: Omit<AdminApplicationFilter, "page" | "pageSize">): Promise<AdminApplicationRow[]>;
  listCohortRows(): Promise<AdminCohortRow[]>;
  updateApplicationStatus(
    id: string,
    requested: ApplicationStatus,
    reviewer: string,
  ): Promise<StatusChangeResult>;

  /* ---- admin editing: callers MUST have passed requireAdmin() first ---- */
  /** Every project, including drafts and archived. Paginated. */
  listProjectsAdmin(filter: AdminProjectFilter): Promise<Page<AdminProjectRow>>;
  getProjectAdmin(id: string): Promise<ProjectInput | null>;
  /** Create (no id) or update. Slug must be unique. Unknown skill names become new skill tags. */
  saveProject(input: ProjectInput): Promise<SaveResult>;
  setProjectStatus(id: string, status: ProjectStatus): Promise<boolean>;
  listCohortsAdmin(projectId: string): Promise<AdminCohortEdit[]>;
  getCohortAdmin(id: string): Promise<AdminCohortEdit | null>;
  /** Create or update. Enforces cohortRuleErrors(), including "capacity cannot drop below seats taken". */
  saveCohort(input: CohortInput): Promise<SaveResult>;
  listInstructorsAdmin(page: number, pageSize: number): Promise<Page<AdminInstructorRow>>;
  getInstructorAdmin(id: string): Promise<InstructorInput | null>;
  /** All instructors by name, for a <select>. ponytail: unpaginated; switch to a search box past ~2,000. */
  listInstructorOptions(): Promise<InstructorOption[]>;
  saveInstructor(input: InstructorInput): Promise<SaveResult>;
}
