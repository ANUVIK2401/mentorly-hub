import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/data";
import { requireAdmin } from "@/lib/auth";
import { AdminForm } from "../../../../admin-form";
import { saveCohortAction } from "../../../../save-actions";
import { COHORT_FIELDS, cohortDefaults } from "../../../cohort-fields";

export const metadata: Metadata = { title: "Add cohort" };

export default async function NewCohort({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const project = await getRepo().getProjectAdmin(id);
  if (!project) notFound();
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link href={`/admin/projects/${id}`} className="text-sm text-muted underline">
          {project.title}
        </Link>
        <h1 className="text-3xl font-semibold">Add cohort</h1>
      </div>
      <AdminForm
        action={saveCohortAction}
        fields={COHORT_FIELDS}
        defaults={cohortDefaults()}
        hidden={{ projectId: id }}
        submitLabel="Create cohort"
      />
    </div>
  );
}
