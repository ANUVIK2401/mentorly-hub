import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
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
    `rounded-full border px-4 py-1.5 text-sm transition-colors duration-150 ${
      active
        ? "border-accent bg-accent text-accent-ink shadow-sm"
        : "border-white/70 bg-white/55 text-ink hover:border-accent/40 hover:bg-white/90 hover:text-accent"
    }`;
  const hasFilters = Boolean(params.q || params.industry || params.tag || params.open);

  return (
    <div className="space-y-8">
      <section className="space-y-6 pb-2 pt-8 sm:pt-14">
        <p className="rise-in flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-gold-ink">
          <span aria-hidden className="h-px w-8 bg-gold" />
          Instructor-led · 8-week cohorts
        </p>
        <h1
          className="rise-in max-w-3xl text-balance text-4xl font-semibold leading-[1.08] sm:text-6xl"
          style={{ "--i": 1 } as CSSProperties}
        >
          Find a project. Build something{" "}
          <span className="relative whitespace-nowrap text-accent">
            real.
            <span aria-hidden className="absolute inset-x-0 -bottom-1 h-[3px] rounded-full bg-gold" />
          </span>
        </h1>
        <p className="rise-in max-w-2xl text-lg leading-relaxed text-muted" style={{ "--i": 2 } as CSSProperties}>
          Instructor-led projects with small cohorts, live workshops, and a deliverable you can show to employers.
        </p>
        <ul className="rise-in flex flex-wrap gap-2 text-sm" style={{ "--i": 3 } as CSSProperties}>
          {VALUE_PROPS.map((v) => (
            <li
              key={v}
              className="glass-thin flex items-center gap-2 rounded-full px-3.5 py-1.5 text-ink"
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold" />
              {v}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Filters" className="glass space-y-4 rounded-3xl p-3 sm:p-4">
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

        <form
          method="GET"
          action="/projects"
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/80 bg-white/70 p-3 sm:p-4"
        >
          {params.industry ? <input type="hidden" name="industry" value={params.industry} /> : null}
          {params.view === "list" ? <input type="hidden" name="view" value="list" /> : null}
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-medium text-muted">
            Search
            <input
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Title, instructor, skill…"
              className="h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-sm text-ink transition-colors placeholder:text-muted hover:border-accent/50 focus:border-accent"
            />
          </label>
          <label className="flex min-w-44 flex-col gap-1 text-xs font-medium text-muted">
            Skill
            <select
              name="tag"
              defaultValue={params.tag}
              className="h-11 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink transition-colors hover:border-accent/50 focus:border-accent"
            >
              <option value="">All skills</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="open" value="1" defaultChecked={params.open} className="h-4 w-4 accent-[var(--accent)]" />
            Open applications only
          </label>
          <button
            type="submit"
            className="btn-primary h-11 rounded-xl px-6 text-sm font-semibold"
          >
            Search
          </button>
          {hasFilters ? (
            <Link href="/projects" className="h-11 content-center text-sm text-muted underline underline-offset-4 hover:text-accent">
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
          <div className="glass-thin inline-flex overflow-hidden rounded-full p-1 text-sm" role="group" aria-label="Layout">
            {(["grid", "list"] as const).map((v) => (
              <Link
                key={v}
                href={catalogHref(params, { view: v })}
                aria-current={params.view === v ? "true" : undefined}
                className={`rounded-full px-4 py-1.5 capitalize transition-colors duration-150 ${params.view === v ? "bg-accent text-accent-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]" : "text-muted hover:text-accent"}`}
              >
                {v}
              </Link>
            ))}
          </div>
        </div>

        {result.items.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center text-muted">
            No projects match those filters.{" "}
            <Link href="/projects" className="text-accent underline">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className={params.view === "grid" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
            {result.items.map((card, i) => (
              <ProjectCard key={card.slug} card={card} layout={params.view} index={i} />
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
