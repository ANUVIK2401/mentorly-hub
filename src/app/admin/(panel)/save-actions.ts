"use server";

import { redirect } from "next/navigation";
import { getRepo } from "@/data";
import { PROJECT_STATUSES, type ProjectStatus } from "@/data/types";
import { slugify } from "@/data/seed";
import { requireAdmin } from "@/lib/auth";
import { commaList, errorState, lines, readFields, type AdminFormState } from "@/lib/admin-form";
import { cohortInputSchema, fieldErrorsOf, instructorInputSchema, projectInputSchema } from "@/lib/validation";

const PROJECT_FIELDS = [
  "title", "slug", "summary", "description", "learningGoals", "deliverable",
  "instructorId", "industryId", "skillNames", "status",
] as const;
const COHORT_FIELDS = [
  "startDate", "endDate", "applicationDeadline", "minStudents", "maxStudents", "zoomLink",
] as const;
const INSTRUCTOR_FIELDS = ["name", "slug", "title", "bio", "organizationName", "linkedinUrl"] as const;

const idOf = (formData: FormData) => String(formData.get("id") ?? "") || undefined;

/** Server Actions are reachable by direct POST: every one starts with requireAdmin() and re-validates. */
export async function saveProjectAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const values = readFields(formData, PROJECT_FIELDS);
  const parsed = projectInputSchema.safeParse({
    id: idOf(formData),
    ...values,
    slug: values.slug.trim() || slugify(values.title),
    learningGoals: lines(values.learningGoals),
    skillNames: commaList(values.skillNames),
  });
  if (!parsed.success) return errorState(values, fieldErrorsOf(parsed.error));

  const result = await getRepo().saveProject(parsed.data);
  if (!result.ok) return errorState(values, result.fieldErrors, result.message);
  redirect(`/admin/projects/${result.id}?saved=1`);
}

export async function saveCohortAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const values = readFields(formData, COHORT_FIELDS);
  const projectId = String(formData.get("projectId") ?? "");
  const parsed = cohortInputSchema.safeParse({ id: idOf(formData), projectId, ...values });
  if (!parsed.success) return errorState(values, fieldErrorsOf(parsed.error));

  const result = await getRepo().saveCohort(parsed.data);
  if (!result.ok) return errorState(values, result.fieldErrors, result.message);
  redirect(`/admin/projects/${projectId}?saved=cohort`);
}

export async function saveInstructorAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const values = readFields(formData, INSTRUCTOR_FIELDS);
  const parsed = instructorInputSchema.safeParse({
    id: idOf(formData),
    ...values,
    slug: values.slug.trim() || slugify(values.name),
  });
  if (!parsed.success) return errorState(values, fieldErrorsOf(parsed.error));

  const result = await getRepo().saveInstructor(parsed.data);
  if (!result.ok) return errorState(values, result.fieldErrors, result.message);
  redirect(`/admin/instructors?saved=1`);
}

export async function setProjectStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ProjectStatus;
  if (!id || !PROJECT_STATUSES.includes(status)) redirect("/admin/projects");
  await getRepo().setProjectStatus(id, status);
  redirect(`/admin/projects/${id}?saved=status`);
}
