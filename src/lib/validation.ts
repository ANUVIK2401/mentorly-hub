import { z } from "zod";
import { PROJECT_STATUSES } from "@/data/types";
import { MAX_GRAD_YEAR, MIN_GRAD_YEAR } from "./apply-state";

/**
 * Application form schema. Ben has not yet specified the exact fields (docs/DECISIONS.md, Q3),
 * so this is a sensible default. Add or remove fields here, in the form component, in
 * CreateApplicationInput (src/data/types.ts) and in the export columns (src/lib/export.ts).
 */
export const applicationSchema = z.object({
  cohortId: z.string().min(1),
  name: z.string().trim().min(2, "Enter your full name").max(100, "Name is too long"),
  email: z.string().trim().max(200, "Email is too long").pipe(z.email("Enter a valid email address")),
  school: z.string().trim().min(2, "Enter your school").max(120, "School name is too long"),
  program: z.string().trim().min(2, "Enter your program or major").max(120, "Program name is too long"),
  graduationYear: z.coerce
    .number("Choose a graduation year")
    .int("Choose a graduation year")
    .min(MIN_GRAD_YEAR, "Choose a graduation year")
    .max(MAX_GRAD_YEAR, "Choose a graduation year"),
  statement: z
    .string()
    .trim()
    .min(40, "Tell us a little more (at least 40 characters)")
    .max(1500, "Please keep this under 1,500 characters"),
});

/* ----------------------- Admin editing (Phase 3) ----------------------- */

const slug = z
  .string()
  .trim()
  .min(2, "Enter a URL slug")
  .max(120, "Slug is too long")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

const isoDate = z.iso.date("Enter a date");
const optionalUrl = z
  .string()
  .trim()
  .max(300, "Link is too long")
  .refine((v) => v === "" || /^https?:\/\//.test(v), "Must start with http:// or https://");

export const projectInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(5, "Enter a title (at least 5 characters)").max(160, "Title is too long"),
  slug,
  summary: z.string().trim().min(20, "Write a summary (at least 20 characters)").max(400, "Keep the summary under 400 characters"),
  description: z.string().trim().min(40, "Write a description (at least 40 characters)").max(6000, "Description is too long"),
  learningGoals: z.array(z.string().trim().min(1).max(200)).min(1, "Add at least one learning goal").max(10, "At most 10 learning goals"),
  deliverable: z.string().trim().min(3, "Describe the deliverable").max(300, "Deliverable is too long"),
  instructorId: z.string().min(1, "Choose an instructor"),
  industryId: z.string().min(1, "Choose an industry"),
  skillNames: z.array(z.string().trim().min(1).max(60)).min(1, "Add at least one skill").max(8, "At most 8 skills"),
  status: z.enum(PROJECT_STATUSES),
});

export const cohortInputSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  startDate: isoDate,
  endDate: isoDate,
  applicationDeadline: isoDate,
  minStudents: z.coerce.number("Enter a number").int("Enter a whole number").min(1, "At least 1").max(100, "At most 100"),
  maxStudents: z.coerce.number("Enter a number").int("Enter a whole number").min(1, "At least 1").max(100, "At most 100"),
  zoomLink: optionalUrl.optional(),
});

export const instructorInputSchema = z.object({
  id: z.string().optional(),
  slug,
  name: z.string().trim().min(2, "Enter a name").max(100, "Name is too long"),
  title: z.string().trim().min(2, "Enter a job title").max(120, "Title is too long"),
  bio: z.string().trim().min(20, "Write a short bio (at least 20 characters)").max(1500, "Keep the bio under 1,500 characters"),
  organizationName: z.string().trim().min(2, "Enter an organization").max(120, "Organization name is too long"),
  linkedinUrl: optionalUrl.optional(),
});

/** First message per field, keyed by the field's name. Used by every admin form action. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
