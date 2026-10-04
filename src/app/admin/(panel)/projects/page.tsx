import type { Metadata } from "next";
import Link from "next/link";
import { getRepo } from "@/data";
import { PROJECT_STATUSES, type ProjectStatus } from "@/data/types";
import { Pagination } from "@/components/pagination";
import { requireAdmin } from "@/lib/auth";
import { plural } from "@/lib/format";
import { first, hrefWith, toPositiveInt, type SearchParams } from "@/lib/query";

export const metadata: Metadata = { title: "Projects" };
const PAGE_SIZE = 25;
const STATUS_LABEL: Record<ProjectStatus, string> = { draft: "Draft", published: "Published", archived: "Archived" };
const STATUS_STYLE: Record<ProjectStatus, string> = {
  draft: "bg-warn-soft text-warn",
  published: "bg-accent-soft text-accent",
  archived: "bg-line text-muted",
};

export default async function AdminProjects({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const statusParam = first(sp.status) as ProjectStatus;
  const status = PROJECT_STATUSES.includes(statusParam) ? statusParam : undefined;
  const q = first(sp.q).trim().slice(0, 100) || undefined;
  const page = toPositiveInt(sp.page);

  const result = await getRepo().listProjectsAdmin({ status, q, page, pageSize: PAGE_SIZE });
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-accent"}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Projects</h1>
          <p className="text-sm text-muted" aria-live="polite">
            <strong className="text-ink">{plural(result.total, "project")}</strong>. Only published projects appear in the public catalog.
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink shadow-sm transition-colors hover:bg-accent-strong active:bg-accent-deep"
        >
          New project
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          <Link href={hrefWith("/admin/projects", { q })} className={chip(!status)}>
            All
          </Link>
          {PROJECT_STATUSES.map((s) => (
            <Link key={s} href={hrefWith("/admin/projects", { status: s, q })} className={chip(status === s)}>
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </nav>
        <form method="GET" action="/admin/projects" className="ml-auto flex gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label className="sr-only" htmlFor="q">
            Search projects
          </label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Title, slug, instructor…"
            className="h-10 w-64 rounded-md border border-line-strong bg-surface px-3 text-sm"
          />
          <button type="submit" className="h-10 rounded-md border border-line px-3 text-sm hover:border-accent">
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-3 py-2">Project</th>
              <th scope="col" className="px-3 py-2">Instructor</th>
              <th scope="col" className="px-3 py-2">Industry</th>
              <th scope="col" className="px-3 py-2">Cohorts</th>
              <th scope="col" className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <Link href={`/admin/projects/${p.id}`} className="font-medium text-accent hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-3 py-2">{p.instructorName}</td>
                <td className="px-3 py-2">{p.industryName}</td>
                <td className="px-3 py-2">{p.cohortCount}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  No projects match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        hrefFor={(p) => hrefWith("/admin/projects", { status, q, page: p > 1 ? p : undefined })}
      />
    </div>
  );
}
