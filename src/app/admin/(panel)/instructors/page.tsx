import type { Metadata } from "next";
import Link from "next/link";
import { getRepo } from "@/data";
import { Pagination } from "@/components/pagination";
import { requireAdmin } from "@/lib/auth";
import { plural } from "@/lib/format";
import { first, hrefWith, toPositiveInt, type SearchParams } from "@/lib/query";

export const metadata: Metadata = { title: "Instructors" };
const PAGE_SIZE = 25;

export default async function AdminInstructors({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const result = await getRepo().listInstructorsAdmin(toPositiveInt(sp.page), PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Instructors</h1>
          <p className="text-sm text-muted">
            <strong className="text-ink">{plural(result.total, "instructor")}</strong>
          </p>
        </div>
        <Link
          href="/admin/instructors/new"
          className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink shadow-sm transition-colors hover:bg-accent-strong active:bg-accent-deep"
        >
          New instructor
        </Link>
      </div>
      {first(sp.saved) ? (
        <p role="status" className="rounded-md border border-line bg-accent-soft p-3 text-sm text-accent">
          Instructor saved.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-3 py-2">Name</th>
              <th scope="col" className="px-3 py-2">Title</th>
              <th scope="col" className="px-3 py-2">Organization</th>
              <th scope="col" className="px-3 py-2">Projects</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((i) => (
              <tr key={i.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <Link href={`/admin/instructors/${i.id}`} className="font-medium text-accent hover:underline">
                    {i.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{i.title}</td>
                <td className="px-3 py-2">{i.organizationName}</td>
                <td className="px-3 py-2">{i.projectCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        hrefFor={(p) => hrefWith("/admin/instructors", { page: p > 1 ? p : undefined })}
      />
    </div>
  );
}
