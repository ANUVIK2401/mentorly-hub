import type { Metadata } from "next";
import Link from "next/link";
import { getRepo } from "@/data";
import type { CohortStatus } from "@/data/types";
import { CohortStatusBadge } from "@/components/badges";
import { Pagination } from "@/components/pagination";
import { requireAdmin } from "@/lib/auth";
import { COHORT_STATUS_LABEL, formatDate, plural } from "@/lib/format";
import { first, hrefWith, toPositiveInt, type SearchParams } from "@/lib/query";

export const metadata: Metadata = { title: "Cohorts" };
const PAGE_SIZE = 25;
const STATUSES = Object.keys(COHORT_STATUS_LABEL) as CohortStatus[];

export default async function AdminCohorts({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const statusParam = first(sp.status) as CohortStatus;
  const status = STATUSES.includes(statusParam) ? statusParam : undefined;
  const page = toPositiveInt(sp.page);

  const all = (await getRepo().listCohortRows()).filter((r) => !status || r.status === status);
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = all.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-accent"}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Cohorts</h1>
        <p className="text-sm text-muted">
          <strong className="text-ink">{plural(all.length, "cohort")}</strong>. Capacity counts accepted and enrolled
          students.
        </p>
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        <Link href="/admin/cohorts" className={chip(!status)}>
          All
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={hrefWith("/admin/cohorts", { status: s })} className={chip(status === s)}>
            {COHORT_STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-3 py-2">Project</th>
              <th scope="col" className="px-3 py-2">Starts</th>
              <th scope="col" className="px-3 py-2">Status</th>
              <th scope="col" className="px-3 py-2">Seats</th>
              <th scope="col" className="px-3 py-2">Applications</th>
              <th scope="col" className="px-3 py-2">Waitlist</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cohortId} className="border-b border-line align-top last:border-0">
                <td className="px-3 py-3">
                  <Link href={`/projects/${r.projectSlug}`} className="font-medium hover:underline">
                    {r.projectTitle}
                  </Link>
                  <p className="text-muted">{r.instructorName}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {formatDate(r.startDate)}
                  <p className="text-xs text-muted">apply by {formatDate(r.applicationDeadline)}</p>
                </td>
                <td className="px-3 py-3">
                  <CohortStatusBadge status={r.status} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-24 rounded-full bg-line"
                      role="meter"
                      aria-label="Seats taken"
                      aria-valuemin={0}
                      aria-valuemax={r.maxStudents}
                      aria-valuenow={r.seatsTaken}
                    >
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.min(100, (r.seatsTaken / r.maxStudents) * 100)}%` }} />
                    </div>
                    <span className="tabular-nums">
                      {r.seatsTaken}/{r.maxStudents}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Link href={hrefWith("/admin/applications", { cohort: r.cohortId })} className="text-accent underline">
                    {r.applicationCount}
                  </Link>
                </td>
                <td className="px-3 py-3 tabular-nums">{r.waitlistCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={safePage}
        pageCount={pageCount}
        hrefFor={(p) => hrefWith("/admin/cohorts", { status, page: p > 1 ? p : undefined })}
      />
    </div>
  );
}
