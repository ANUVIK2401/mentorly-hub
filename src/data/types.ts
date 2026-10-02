/**
 * Domain types. These mirror docs/DATA_MODEL.md and src/db/schema.ts.
 * Keep all three in sync when you change one.
 */

export type TagType = "industry" | "skill";

export interface Tag {
  /** Stable slug, also used in URLs (?industry=finance, ?tag=financial-modeling). */
  id: string;
  name: string;
  type: TagType;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Instructor {
  id: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  organizationId: string;
  linkedinUrl?: string;
}

export type ProjectStatus = "draft" | "published" | "archived";
export const PROJECT_STATUSES = ["draft", "published", "archived"] as const satisfies readonly ProjectStatus[];

export interface Project {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  learningGoals: string[];
  deliverable: string;
  instructorId: string;
  organizationId: string;
  industryId: string;
  skillTagIds: string[];
  status: ProjectStatus;
}

/** Stored cohort. Its open/closed/full status is DERIVED, see src/lib/rules.ts. */
export interface Cohort {
  id: string;
  projectId: string;
  /** ISO dates (YYYY-MM-DD). */
  startDate: string;
  endDate: string;
  applicationDeadline: string;
  minStudents: number;
  maxStudents: number;
  /** Private. Never render on public pages or return it from public DTOs. */
  zoomLink?: string;
}

export type CohortStatus = "open" | "closed" | "full" | "completed";

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "waitlisted"
  | "rejected"
  | "enrolled"
  | "withdrawn";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "accepted",
  "waitlisted",
  "rejected",
  "enrolled",
  "withdrawn",
];

/** Student PII. Lives only on Application records and admin views. */
export interface Student {
  name: string;
  email: string;
  school: string;
  program: string;
  graduationYear: number;
}

export interface Application {
  /** Unguessable id (UUID). The /application/[id] status page is a capability URL. */
  id: string;
  cohortId: string;
  student: Student;
  statement: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedBy?: string;
}

/* ----------------------------- Public DTOs ----------------------------- */
/* Anything returned to public pages goes through these. No PII, no zoomLink. */

export interface CohortView {
  id: string;
  projectId: string;
  startDate: string;
  endDate: string;
  applicationDeadline: string;
  minStudents: number;
  maxStudents: number;
  status: CohortStatus;
  seatsTaken: number;
  seatsLeft: number;
}

export interface ProjectCard {
  slug: string;
  title: string;
  summary: string;
  instructor: { slug: string; name: string; title: string };
  organization: { name: string };
  industry: Tag;
  skills: Tag[];
  /** The cohort most relevant to a visitor: open first, then soonest upcoming. */
  featuredCohort?: CohortView;
  applicationsOpen: boolean;
}

export interface ProjectDetail extends ProjectCard {
  description: string;
  learningGoals: string[];
  deliverable: string;
  instructorBio: string;
  cohorts: CohortView[];
}

export interface InstructorCard {
  slug: string;
  name: string;
  title: string;
  organization: { name: string };
  projectCount: number;
}

export interface InstructorDetail extends InstructorCard {
  bio: string;
  projects: ProjectCard[];
}

/* ------------------------------ Query types ----------------------------- */

export interface ProjectQuery {
  q?: string;
  industry?: string;
  tag?: string;
  openOnly?: boolean;
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Admin-only row. Contains PII. Only returned to authenticated admin code paths. */
export interface AdminApplicationRow {
  id: string;
  submittedAt: string;
  status: ApplicationStatus;
  student: Student;
  statement: string;
  cohortId: string;
  cohortStart: string;
  projectTitle: string;
  projectSlug: string;
  instructorName: string;
}

export interface AdminApplicationFilter {
  status?: ApplicationStatus;
  cohortId?: string;
  q?: string;
  page: number;
  pageSize: number;
}

export interface AdminCohortRow {
  cohortId: string;
  projectTitle: string;
  projectSlug: string;
  instructorName: string;
  startDate: string;
  applicationDeadline: string;
  status: CohortStatus;
  maxStudents: number;
  seatsTaken: number;
  applicationCount: number;
  waitlistCount: number;
}

export type CreateApplicationInput = {
  cohortId: string;
  student: Student;
  statement: string;
};

export type CreateApplicationResult =
  | { ok: true; application: Application }
  | { ok: false; code: "cohort_not_found" | "not_open" | "duplicate"; message: string };

export type StatusChangeResult =
  | { ok: true; status: ApplicationStatus; waitlistedBecauseFull: boolean }
  | { ok: false; message: string };

/* ---------------------------- Admin editing (Phase 3) ---------------------------- */
/* Admin-only shapes. Cohort `zoomLink` appears here and only here. */

export interface ProjectInput {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  learningGoals: string[];
  deliverable: string;
  instructorId: string;
  industryId: string;
  /** Skill tag names in display order. Unknown names become new skill tags. */
  skillNames: string[];
  status: ProjectStatus;
}

export interface AdminProjectRow {
  id: string;
  slug: string;
  title: string;
  status: ProjectStatus;
  instructorName: string;
  industryName: string;
  cohortCount: number;
}

export interface AdminProjectFilter {
  q?: string;
  status?: ProjectStatus;
  page: number;
  pageSize: number;
}

export interface CohortInput {
  id?: string;
  projectId: string;
  startDate: string;
  endDate: string;
  applicationDeadline: string;
  minStudents: number;
  maxStudents: number;
  zoomLink?: string;
}

export interface AdminCohortEdit extends CohortInput {
  id: string;
  status: CohortStatus;
  seatsTaken: number;
}

export interface InstructorInput {
  id?: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  /** Matched to an existing organization by name, or created. */
  organizationName: string;
  linkedinUrl?: string;
}

export interface AdminInstructorRow {
  id: string;
  slug: string;
  name: string;
  title: string;
  organizationName: string;
  projectCount: number;
}

export interface InstructorOption {
  id: string;
  name: string;
  organizationName: string;
}

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string>; message?: string };
