import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/data";
import type { ProjectStatus } from "@/data/types";
import { CohortStatusBadge } from "@/components/badges";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { first, type SearchParams } from "@/lib/query";
import { AdminForm } from "../../admin-form";
import { saveProjectAction, setProjectStatusAction } from "../../save-actions";
import { projectDefaults, projectFields } from "../project-fields";

export const metadata: Metadata = { title: "Edit project" };

const NOTICES: Record<string, string> = {
  "1": "Project saved.",
  cohort: "Cohort saved.",
  status: "Status updated.",
};
const TRANSITIONS: Record<ProjectStatus, { to: ProjectStatus; label: string }[]> = {
  draft: [{ to: "published", label: "Publish" }, { to: "archived", label: "Archive" }],
  published: [{ to: "draft", label: "Unpublish" }, { to: "archived", label: "Archive" }],
  archived: [{ to: "draft", label: "Restore as draft" }],
};

export default async function EditProject({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const { id } = await params;
  const notice = NOTICES[first((await searchParams).saved)];
  const repo = getRepo();
  const project = await repo.getProjectAdmin(id);
  if (!project) notFound();

  const [instructors, industries, cohorts] = await Promise.all([
    repo.listInstructorOptions(),
    repo.listIndustries(),
    repo.listCohortsAdmin(id),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <Link href="/admin/projects" className="text-sm text-muted underline">
          All projects
        </Link>
        <h1 className="text-3xl font-semibold">{project.title}</h1>
        {notice ? (
          <p role="status" className="rounded-md border border-line bg-accent-soft p-3 text-sm text-accent">
            {notice}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Status: <strong className="text-ink">{project.status}</strong></span>
          {TRANSITIONS[project.status].map((t) => (
            <form key={t.to} action={setProjectStatusAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value={t.to} />
              <button type="submit" className="h-8 rounded-md border border-line px-3 hover:border-accent">
                {t.label}
              </button>
            </form>
          ))}
          {project.status === "published" ? (
            <Link href={`/projects/${project.slug}`} className="text-accent underline">
              View public page
            </Link>
          ) : null}
        </div>
      </div>

      <AdminForm
        action={saveProjectAction}
        fields={projectFields(instructors, industries)}
        defaults={projectDefaults(project)}
        hidden={{ id }}
        submitLabel="Save changes"
      />

      <section aria-labelledby="cohorts-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="cohorts-heading" className="text-xl font-semibold">
            Cohorts
          </h2>
          <Link
            href={`/admin/projects/${id}/cohorts/new`}
            className="inline-flex h-9 items-center rounded-md border border-accent px-3 text-sm font-medium text-accent hover:bg-accent-soft"
          >
            Add cohort
          </Link>
        </div>
        {cohorts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
            No cohorts yet. Students can only apply once a cohort exists.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2">Starts</th>
                  <th scope="col" className="px-3 py-2">Apply by</th>
                  <th scope="col" className="px-3 py-2">Seats</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">{formatDate(c.startDate)}</td>
                    <td className="px-3 py-2">{formatDate(c.applicationDeadline)}</td>
                    <td className="px-3 py-2">{c.seatsTaken} / {c.maxStudents}</td>
                    <td className="px-3 py-2"><CohortStatusBadge status={c.status} /></td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/admin/projects/${id}/cohorts/${c.id}`} className="text-accent underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
