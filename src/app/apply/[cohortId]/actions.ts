"use server";

import { redirect } from "next/navigation";
import { getRepo } from "@/data";
import type { ApplicationFormValues, ApplyState } from "@/lib/apply-state";
import { applicationSchema } from "@/lib/validation";

const FIELDS = ["name", "email", "school", "program", "graduationYear", "statement"] as const;

/**
 * Server Action. Reachable by direct POST, so everything is re-validated here:
 * field shape (zod), cohort state and the one-application-per-email rule (repository).
 */
export async function submitApplication(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")])) as ApplicationFormValues;
  const cohortId = String(formData.get("cohortId") ?? "");

  // Honeypot: real users never see or fill this field.
  if (String(formData.get("website") ?? "") !== "") {
    return { status: "error", formError: "Something went wrong. Please try again.", fieldErrors: {}, values };
  }

  const parsed = applicationSchema.safeParse({ cohortId, ...values });
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ApplicationFormValues, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && (FIELDS as readonly string[]).includes(key)) {
        const k = key as keyof ApplicationFormValues;
        fieldErrors[k] ??= issue.message;
      }
    }
    return { status: "error", fieldErrors, values };
  }

  const { cohortId: cid, statement, ...student } = parsed.data;
  const result = await getRepo().createApplication({ cohortId: cid, student, statement });
  if (!result.ok) {
    return { status: "error", formError: result.message, fieldErrors: {}, values };
  }

  redirect(`/application/${result.application.id}`);
}
