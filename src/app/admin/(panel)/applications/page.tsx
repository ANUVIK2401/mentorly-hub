import type { Metadata } from "next";
import Link from "next/link";
import { getRepo } from "@/data";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/data/types";
import { ApplicationStatusBadge } from "@/components/badges";
import { Pagination } from "@/components/pagination";
import { requireAdmin } from "@/lib/auth";
import { APPLICATION_STATUS_LABEL, formatDate, formatDateTime, plural } from "@/lib/format";
import { first, hrefWith, toPositiveInt, type SearchParams } from "@/lib/query";
import { updateStatuses } from "../actions";

export const metadata: Metadata = { title: "Applications" };
const PAGE_SIZE = 25;

export default async function AdminApplications({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;

  const statusParam = first(sp.status) as ApplicationStatus;
  const status = APPLICATION_STATUSES.includes(statusParam) ? statusParam : undefined;
  const cohortId = first(sp.cohort) || undefined;
  const q = first(sp.q).trim().slice(0, 100) || undefined;
  const page = toPositiveInt(sp.page);

  const result = await getRepo().listApplications({ status, cohortId, q, page, pageSize: PAGE_SIZE });

  const filterParams = { status, cohort: cohortId, q };
  const listHref = (p: number) => hrefWith("/admin/applications", { ...filterParams, page: p > 1 ? p : undefined });
  const exportHref = hrefWith("/admin/export", filterParams);
  const returnTo = listHref(result.page);

  const updated = first(sp.updated);
  const waitlisted = Number(first(sp.waitlisted) || 0);
  const notice = first(sp.notice);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Applications</h1>
          <p className="text-sm text-muted" aria-live="polite">
            <strong className="text-ink">{plural(result.total, "application")}</strong>
            {cohortId ? " in one cohort" : ""}
          </p>
        </div>
        <a
          href={exportHref}
          className="inline-flex h-10 items-center rounded-md border border-accent px-4 text-sm font-medium text-accent hover:bg-accent-soft"
        >
          Export these to Excel
        </a>
      </div>

      {updated ? (
        <p role="status" className="rounded-md border border-line bg-accent-soft p-3 text-sm text-accent">
          Updated {plural(Number(updated), "application")}.
          {waitlisted > 0
            ? ` ${plural(waitlisted, "acceptance")} became waitlist entries because the cohort is full.`
            : ""}
        </p>
      ) : null}
      {notice === "none_selected" ? (
        <p role="alert" className="rounded-md border border-bad bg-bad-soft p-3 text-sm text-bad">
          Select at least one application first.
        </p>
      ) : null}
      {notice === "bad_status" ? (
        <p role="alert" className="rounded-md border border-bad bg-bad-soft p-3 text-sm text-bad">
          Choose a valid status.
        </p>
      ) : null}

      <form method="GET" action="/admin/applications" className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3">
        {cohortId ? <input type="hidden" name="cohort" value={cohortId} /> : null}
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-medium text-muted">
          Search name, email, school, project
          <input
            type="search"
            name="q"
            defaultValue={q}
            className="h-10 rounded-md border border-line bg-paper px-3 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Status
          <select name="status" defaultValue={status ?? ""} className="h-10 rounded-md border border-line bg-paper px-2 text-sm text-ink">
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {APPLICATION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink hover:opacity-90">
          Filter
        </button>
        {status || cohortId || q ? (
          <Link href="/admin/applications" className="h-10 content-center text-sm text-muted underline">
            Clear
          </Link>
        ) : null}
      </form>

      <form action={updateStatuses} className="space-y-3">
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            Set selected to
            <select name="status" defaultValue="under_review" className="h-9 rounded-md border border-line bg-paper px-2">
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-9 rounded-md bg-ink px-4 font-medium text-paper hover:opacity-90">
            Apply to selected
          </button>
          <span className="text-muted">Accepting into a full cohort adds the student to the waitlist instead.</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="w-10 px-3 py-2">
                  <span className="sr-only">Select</span>
                </th>
                <th scope="col" className="px-3 py-2">Student</th>
                <th scope="col" className="px-3 py-2">Project and cohort</th>
                <th scope="col" className="px-3 py-2">Submitted</th>
                <th scope="col" className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-muted">
                    No applications match.
                  </td>
                </tr>
              ) : (
                result.items.map((a) => (
                  <tr key={a.id} className="border-b border-line align-top last:border-0">
                    <td className="px-3 py-3">
                      <input type="checkbox" name="ids" value={a.id} aria-label={`Select ${a.student.name}`} className="h-4 w-4 accent-[var(--accent)]" />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium">
                        <Link href={`/admin/applications/${a.id}`} className="text-accent hover:underline">
                          {a.student.name}
                        </Link>
                      </p>
                      <p className="text-muted">{a.student.email}</p>
                      <p className="text-muted">
                        {a.student.school} · {a.student.program} · {a.student.graduationYear}
                      </p>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-accent">Statement</summary>
                        <p className="mt-1 max-w-md whitespace-pre-wrap text-muted">{a.statement}</p>
                      </details>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/projects/${a.projectSlug}`} className="font-medium hover:underline">
                        {a.projectTitle}
                      </Link>
                      <p className="text-muted">
                        {a.instructorName} · starts {formatDate(a.cohortStart)}
                      </p>
                      <Link href={hrefWith("/admin/applications", { cohort: a.cohortId })} className="text-xs text-accent underline">
                        This cohort only
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted">{formatDateTime(a.submittedAt)}</td>
                    <td className="px-3 py-3">
                      <ApplicationStatusBadge status={a.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </form>

      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={listHref} />
    </div>
  );
}
