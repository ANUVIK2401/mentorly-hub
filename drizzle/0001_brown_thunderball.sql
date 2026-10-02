ALTER TABLE "project_tags" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;