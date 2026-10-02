import type { Metadata } from "next";
import Link from "next/link";
import { getRepo } from "@/data";
import { Pagination } from "@/components/pagination";
import { hrefWith, toPositiveInt, type SearchParams } from "@/lib/query";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Instructors" };
const PAGE_SIZE = 24;

export default async function InstructorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const page = toPositiveInt((await searchParams).page);
  const result = await getRepo().listInstructors(page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Instructors</h1>
        <p className="text-muted">
          <strong className="text-ink">{plural(result.total, "instructor")}</strong>, each leading their own project.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((i) => (
          <li key={i.slug} className="rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent">
            <h2 className="text-lg font-semibold">
              <Link href={`/instructors/${i.slug}`} className="hover:underline">
                {i.name}
              </Link>
            </h2>
            <p className="text-sm text-muted">
              {i.title}, {i.organization.name}
            </p>
            <p className="mt-3 text-sm">{plural(i.projectCount, "project")}</p>
          </li>
        ))}
      </ul>
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(p) => hrefWith("/instructors", { page: p > 1 ? p : undefined })} />
    </div>
  );
}
