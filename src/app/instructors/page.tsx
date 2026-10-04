import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
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
        {result.items.map((i, n) => (
          <li
            key={i.slug}
            style={{ "--i": Math.min(n, 11) } as CSSProperties}
            className="rise-in card-lift group relative overflow-hidden rounded-2xl border border-line bg-surface p-6"
          >
            <span
              aria-hidden
              className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent font-display text-sm font-semibold tracking-wide text-gold-bright ring-4 ring-accent-soft"
            >
              {i.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <h2 className="text-lg font-semibold">
              <Link
                href={`/instructors/${i.slug}`}
                className="transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
              >
                {i.name}
              </Link>
            </h2>
            <p className="text-sm text-muted">
              {i.title}, {i.organization.name}
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-gold-ink">
              <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-gold" />
              {plural(i.projectCount, "project")}
            </p>
          </li>
        ))}
      </ul>
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(p) => hrefWith("/instructors", { page: p > 1 ? p : undefined })} />
    </div>
  );
}
