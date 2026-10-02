import { z } from "zod";
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
