import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/data";
import { CohortStatusBadge } from "@/components/badges";
import { requireAdmin } from "@/lib/auth";
import { AdminForm } from "../../../../admin-form";
import { saveCohortAction } from "../../../../save-actions";
import { COHORT_FIELDS, cohortDefaults } from "../../../cohort-fields";

export const metadata: Metadata = { title: "Edit cohort" };

export default async function EditCohort({ params }: { params: Promise<{ id: string; cohortId: string }> }) {
  await requireAdmin();
  const { id, cohortId } = await params;
  const repo = getRepo();
  const [project, cohort] = await Promise.all([repo.getProjectAdmin(id), repo.getCohortAdmin(cohortId)]);
  if (!project || !cohort || cohort.projectId !== id) notFound();
  return (
    <div className="max-w-3xl space-y-5">
      <div className="space-y-1">
        <Link href={`/admin/projects/${id}`} className="text-sm text-muted underline">
          {project.title}
        </Link>
        <h1 className="text-3xl font-semibold">Edit cohort</h1>
        <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <CohortStatusBadge status={cohort.status} />
          <span>
            {cohort.seatsTaken} of {cohort.maxStudents} seats taken
          </span>
          <Link href={`/admin/applications?cohort=${cohort.id}`} className="text-accent underline">
            View applications
          </Link>
        </p>
      </div>
      <AdminForm
        action={saveCohortAction}
        fields={COHORT_FIELDS}
        defaults={cohortDefaults(cohort)}
        hidden={{ id: cohort.id, projectId: id }}
        submitLabel="Save changes"
      />
    </div>
  );
}
