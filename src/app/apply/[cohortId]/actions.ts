"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { getRepo } from "@/data";
import type { ApplicationFormValues, ApplyState } from "@/lib/apply-state";
import { applicationReceivedMail, sendSafely } from "@/lib/mailer";
import { APPLY_RULE, limitByClient } from "@/lib/rate-limit";
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

  // Counted only once the form is valid, so typos do not burn a shared campus IP's quota.
  if (!(await limitByClient({ ...APPLY_RULE, name: `apply:${parsed.data.cohortId}` })).allowed) {
    return {
      status: "error",
      formError: "Too many applications from your network. Please wait a few minutes and try again.",
      fieldErrors: {},
      values,
    };
  }

  const { cohortId: cid, statement, ...student } = parsed.data;
  const repo = getRepo();
  const result = await repo.createApplication({ cohortId: cid, student, statement });
  if (!result.ok) {
    return { status: "error", formError: result.message, fieldErrors: {}, values };
  }

  // After the response, so a slow or failing mail transport never delays or fails the application.
  const projectTitle = (await repo.getApplyContext(cid))?.project.title ?? "your project";
  const mail = applicationReceivedMail({
    to: result.application.student.email,
    name: result.application.student.name,
    projectTitle,
    applicationId: result.application.id,
  });
  after(() => sendSafely(mail));

  redirect(`/application/${result.application.id}`);
}
