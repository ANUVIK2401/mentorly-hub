import type { Metadata } from "next";
import Link from "next/link";
import { getRepo } from "@/data";
import { requireAdmin } from "@/lib/auth";
import { AdminForm } from "../../admin-form";
import { saveProjectAction } from "../../save-actions";
import { projectDefaults, projectFields } from "../project-fields";

export const metadata: Metadata = { title: "New project" };

export default async function NewProject() {
  await requireAdmin();
  const repo = getRepo();
  const [instructors, industries] = await Promise.all([repo.listInstructorOptions(), repo.listIndustries()]);
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link href="/admin/projects" className="text-sm text-muted underline">
          All projects
        </Link>
        <h1 className="text-3xl font-semibold">New project</h1>
        <p className="text-sm text-muted">
          Save it as a draft first. Add a cohort, then publish. Need a new instructor?{" "}
          <Link href="/admin/instructors/new" className="text-accent underline">
            Create one
          </Link>
          .
        </p>
      </div>
      <AdminForm
        action={saveProjectAction}
        fields={projectFields(instructors, industries)}
        defaults={projectDefaults()}
        submitLabel="Create project"
      />
    </div>
  );
}
