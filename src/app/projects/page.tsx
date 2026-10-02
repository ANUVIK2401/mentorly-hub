import type { Metadata } from "next";
import Link from "next/link";
import { getRepo } from "@/data";
import { Pagination } from "@/components/pagination";
import { ProjectCard } from "@/components/project-card";
import { catalogHref, parseCatalogParams, type SearchParams } from "@/lib/query";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Browse projects" };

const PAGE_SIZE = 12;
const VALUE_PROPS = ["8-week projects", "Live Zoom workshops", "Portfolio-ready deliverables", "Cohorts of 5 to 15"];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = parseCatalogParams(await searchParams);
  const repo = getRepo();

  const [industries, skills, result] = await Promise.all([
    repo.listIndustries(),
    repo.listSkillTags(params.industry || undefined),
    repo.listProjects({
      q: params.q || undefined,
      industry: params.industry || undefined,
      tag: params.tag || undefined,
      openOnly: params.open,
      page: params.page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-accent"
    }`;
  const hasFilters = Boolean(params.q || params.industry || params.tag || params.open);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-tight sm:text-5xl">
          Find a project. Build something real.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Instructor-led projects with small cohorts, live workshops, and a deliverable you can show to employers.
        </p>
        <ul className="flex flex-wrap gap-2 text-sm">
          {VALUE_PROPS.map((v) => (
            <li key={v} className="rounded-full bg-accent-soft px-3 py-1 text-accent">
              {v}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Filters" className="space-y-4">
        <nav aria-label="Industry" className="flex flex-wrap gap-2">
          <Link
            href={catalogHref(params, { industry: "", tag: "", page: 1 })}
            className={chip(!params.industry)}
            aria-current={!params.industry ? "true" : undefined}
          >
            All projects
          </Link>
          {industries.map((i) => (
            <Link
              key={i.id}
              href={catalogHref(params, { industry: i.id, tag: "", page: 1 })}
              className={chip(params.industry === i.id)}
              aria-current={params.industry === i.id ? "true" : undefined}
            >
              {i.name}
            </Link>
          ))}
        </nav>

        <form method="GET" action="/projects" className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3">
          {params.industry ? <input type="hidden" name="industry" value={params.industry} /> : null}
          {params.view === "list" ? <input type="hidden" name="view" value="list" /> : null}
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-medium text-muted">
            Search
            <input
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Title, instructor, skill…"
              className="h-10 rounded-md border border-line bg-paper px-3 text-sm text-ink placeholder:text-muted"
            />
          </label>
          <label className="flex min-w-44 flex-col gap-1 text-xs font-medium text-muted">
            Skill
            <select
              name="tag"
              defaultValue={params.tag}
              className="h-10 rounded-md border border-line bg-paper px-2 text-sm text-ink"
            >
              <option value="">All skills</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" name="open" value="1" defaultChecked={params.open} className="h-4 w-4 accent-[var(--accent)]" />
            Open applications only
          </label>
          <button type="submit" className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink hover:opacity-90">
            Search
          </button>
          {hasFilters ? (
            <Link href="/projects" className="h-10 content-center text-sm text-muted underline">
              Clear all
            </Link>
          ) : null}
        </form>
      </section>

      <section aria-label="Results" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted" aria-live="polite">
            <strong className="text-ink">{plural(result.total, "project")}</strong>
            {result.pageCount > 1 ? ` · page ${result.page} of ${result.pageCount}` : null}
          </p>
          <div className="inline-flex overflow-hidden rounded-md border border-line text-sm" role="group" aria-label="Layout">
            {(["grid", "list"] as const).map((v) => (
              <Link
                key={v}
                href={catalogHref(params, { view: v })}
                aria-current={params.view === v ? "true" : undefined}
                className={`px-3 py-1.5 capitalize ${params.view === v ? "bg-ink text-paper" : "bg-surface hover:bg-line"}`}
              >
                {v}
              </Link>
            ))}
          </div>
        </div>

        {result.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">
            No projects match those filters.{" "}
            <Link href="/projects" className="text-accent underline">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className={params.view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
            {result.items.map((card) => (
              <ProjectCard key={card.slug} card={card} layout={params.view} />
            ))}
          </div>
        )}

        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          hrefFor={(p) => catalogHref(params, { page: p })}
        />
      </section>
    </div>
  );
}
