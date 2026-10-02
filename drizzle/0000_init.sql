CREATE TYPE "public"."admin_role" AS ENUM('admin', 'instructor');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('submitted', 'under_review', 'accepted', 'waitlisted', 'rejected', 'enrolled', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."tag_type" AS ENUM('industry', 'skill');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" "admin_role" NOT NULL,
	"instructor_id" text
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"resume_url" text,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text
);
--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"application_deadline" date NOT NULL,
	"min_students" integer DEFAULT 5 NOT NULL,
	"max_students" integer DEFAULT 15 NOT NULL,
	"zoom_link" text
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"certificate_issued" timestamp with time zone,
	CONSTRAINT "enrollments_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "instructors" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"bio" text NOT NULL,
	"photo_url" text,
	"linkedin_url" text,
	"organization_id" text NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo_url" text
);
--> statement-breakpoint
CREATE TABLE "project_tags" (
	"project_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "project_tags_project_id_tag_id_pk" PRIMARY KEY("project_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"learning_goals" text[] DEFAULT '{}' NOT NULL,
	"deliverable" text NOT NULL,
	"instructor_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"industry_id" text NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"school" text NOT NULL,
	"program" text NOT NULL,
	"graduation_year" integer NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "tag_type" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_industry_id_tags_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applications_cohort_student_uq" ON "applications" USING btree ("cohort_id","student_id");--> statement-breakpoint
CREATE INDEX "applications_cohort_status_idx" ON "applications" USING btree ("cohort_id","status");--> statement-breakpoint
CREATE INDEX "applications_submitted_idx" ON "applications" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "cohorts_project_idx" ON "cohorts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cohorts_start_idx" ON "cohorts" USING btree ("start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "instructors_slug_uq" ON "instructors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_tags_tag_idx" ON "project_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_uq" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_industry_idx" ON "projects" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_instructor_idx" ON "projects" USING btree ("instructor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_email_uq" ON "students" USING btree ("email");