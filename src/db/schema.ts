/**
 * Postgres schema (Drizzle). This is the REAL-DATABASE shape of docs/DATA_MODEL.md.
 *
 * STATUS: not wired in yet. The demo runs on the in-memory repository (src/data/memory.ts).
 * To go live: `npm run db:generate` (already done once, see /drizzle), run the SQL against
 * Supabase/Neon, then implement `Repository` (src/data/repository.ts) with Drizzle queries and
 * return it from src/data/index.ts when DATABASE_URL is set. See docs/ROADMAP.md, Phase 1.
 *
 * Differences from the in-memory model, on purpose:
 *  - Students are their own table (unique email), applications reference them.
 *  - Cohort status is still DERIVED (src/lib/rules.ts), never stored, so it cannot go stale.
 *  - `user_id` columns are for the auth provider's user id once real auth exists.
 */
import { relations } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const tagTypeEnum = pgEnum("tag_type", ["industry", "skill"]);
export const projectStatusEnum = pgEnum("project_status", ["draft", "published", "archived"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "under_review",
  "accepted",
  "waitlisted",
  "rejected",
  "enrolled",
  "withdrawn",
]);
export const adminRoleEnum = pgEnum("admin_role", ["admin", "instructor"]);

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
});

export const tags = pgTable("tags", {
  id: text("id").primaryKey(), // slug
  name: text("name").notNull(),
  type: tagTypeEnum("type").notNull(),
  /** Display order. Industry chips render in this order; skill tags are sorted by name instead. */
  position: integer("position").notNull().default(0),
});

export const instructors = pgTable(
  "instructors",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    title: text("title").notNull(),
    bio: text("bio").notNull(),
    photoUrl: text("photo_url"),
    linkedinUrl: text("linkedin_url"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: text("user_id"),
  },
  (t) => [uniqueIndex("instructors_slug_uq").on(t.slug)],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    learningGoals: text("learning_goals").array().notNull().default([]),
    deliverable: text("deliverable").notNull(),
    instructorId: text("instructor_id")
      .notNull()
      .references(() => instructors.id),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    industryId: text("industry_id")
      .notNull()
      .references(() => tags.id),
    status: projectStatusEnum("status").notNull().default("draft"),
  },
  (t) => [
    uniqueIndex("projects_slug_uq").on(t.slug),
    index("projects_industry_idx").on(t.industryId),
    index("projects_status_idx").on(t.status),
    index("projects_instructor_idx").on(t.instructorId),
  ],
);

export const projectTags = pgTable(
  "project_tags",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    /** Order of a project's skill tags on its card (most relevant first). */
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.tagId] }), index("project_tags_tag_idx").on(t.tagId)],
);

export const cohorts = pgTable(
  "cohorts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    applicationDeadline: date("application_deadline", { mode: "string" }).notNull(),
    minStudents: integer("min_students").notNull().default(5),
    maxStudents: integer("max_students").notNull().default(15),
    zoomLink: text("zoom_link"), // private: never selected by public queries
  },
  (t) => [index("cohorts_project_idx").on(t.projectId), index("cohorts_start_idx").on(t.startDate)],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Identity only: the first details seen for this email. Reviewers read the snapshot on `applications`.
  email: text("email").notNull(), // store lower-cased
    school: text("school").notNull(),
    program: text("program").notNull(),
    graduationYear: integer("graduation_year").notNull(),
    userId: text("user_id"),
  },
  (t) => [uniqueIndex("students_email_uq").on(t.email)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(), // unguessable: the /application/[id] link is a capability URL
    cohortId: text("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    // Student details as submitted WITH this application. Never rewritten by later applications, so a
    // second application (or someone submitting another person's email) cannot change what a reviewer sees.
    studentName: text("student_name").notNull(),
    studentEmail: text("student_email").notNull(), // lower-cased
    studentSchool: text("student_school").notNull(),
    studentProgram: text("student_program").notNull(),
    studentGraduationYear: integer("student_graduation_year").notNull(),
    statement: text("statement").notNull(),
    resumeUrl: text("resume_url"),
    status: applicationStatusEnum("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedBy: text("reviewed_by"),
  },
  (t) => [
    // one application per student per cohort, enforced by the database, not just app code
    uniqueIndex("applications_cohort_student_uq").on(t.cohortId, t.studentId),
    index("applications_cohort_status_idx").on(t.cohortId, t.status),
    index("applications_submitted_idx").on(t.submittedAt),
  ],
);

/** Audit trail: one row per real status change, written in the same transaction as the change. */
export const applicationEvents = pgTable(
  "application_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Insert order. Breaks ties when two events share a timestamp. */
    seq: serial("seq").notNull(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: applicationStatusEnum("from_status").notNull(),
    toStatus: applicationStatusEnum("to_status").notNull(),
    actor: text("actor").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("application_events_application_idx").on(t.applicationId, t.at)],
);

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .unique()
    .references(() => applications.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  certificateIssued: timestamp("certificate_issued", { withTimezone: true }),
});

/** Maps an auth-provider user id to a role. Not used until real auth replaces the shared password. */
export const adminUsers = pgTable("admin_users", {
  userId: text("user_id").primaryKey(),
  role: adminRoleEnum("role").notNull(),
  instructorId: text("instructor_id").references(() => instructors.id),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  instructor: one(instructors, { fields: [projects.instructorId], references: [instructors.id] }),
  organization: one(organizations, { fields: [projects.organizationId], references: [organizations.id] }),
  industry: one(tags, { fields: [projects.industryId], references: [tags.id] }),
  cohorts: many(cohorts),
  projectTags: many(projectTags),
}));

export const cohortsRelations = relations(cohorts, ({ one, many }) => ({
  project: one(projects, { fields: [cohorts.projectId], references: [projects.id] }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  cohort: one(cohorts, { fields: [applications.cohortId], references: [cohorts.id] }),
  student: one(students, { fields: [applications.studentId], references: [students.id] }),
}));
