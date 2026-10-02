-- Student details move onto the application so later applications cannot rewrite them.
-- Added nullable, backfilled from the student row, then made NOT NULL, so this also works on a database that already has applications.
ALTER TABLE "applications" ADD COLUMN "student_name" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "student_email" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "student_school" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "student_program" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "student_graduation_year" integer;--> statement-breakpoint
UPDATE "applications" a SET "student_name" = s."name", "student_email" = s."email", "student_school" = s."school", "student_program" = s."program", "student_graduation_year" = s."graduation_year" FROM "students" s WHERE s."id" = a."student_id";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "student_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "student_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "student_school" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "student_program" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "student_graduation_year" SET NOT NULL;
