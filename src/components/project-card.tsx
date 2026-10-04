import Link from "next/link";
import type { CSSProperties } from "react";
import type { ProjectCard as Card } from "@/data/types";
import { formatDate, plural } from "@/lib/format";
import { CohortStatusBadge, TagChip } from "./badges";

const FEW_SEATS = 3;
const MAX_STAGGER = 11; // entrance stagger stops growing after a dozen cards

function CohortLine({ card }: { card: Card }) {
  const c = card.featuredCohort;
  if (!c) return <span className="text-muted">No cohorts scheduled</span>;
  if (c.status === "open") {
    const few = c.seatsLeft <= FEW_SEATS;
    return (
      <span>
        Starts {formatDate(c.startDate)} ·{" "}
        <strong className={few ? "text-gold-ink" : "text-ink"}>
          {few ? "Only " : ""}
          {plural(c.seatsLeft, "seat")} left
        </strong>
      </span>
    );
  }
  if (c.status === "completed") return <span className="text-muted">Last ran {formatDate(c.startDate)}</span>;
  return <span className="text-muted">Starts {formatDate(c.startDate)}</span>;
}

function IndustryLabel({ name }: { name: string }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
      <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-gold" />
      {name}
    </p>
  );
}

export function ProjectCard({ card, layout, index = 0 }: { card: Card; layout: "grid" | "list"; index?: number }) {
  const shown = card.skills.slice(0, 3);
  const extra = card.skills.length - shown.length;
  const href = `/projects/${card.slug}`;
  const stagger = { "--i": Math.min(index, MAX_STAGGER) } as CSSProperties;

  const tags = (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <TagChip key={s.id}>{s.name}</TagChip>
      ))}
      {extra > 0 ? <TagChip>+{extra} more</TagChip> : null}
    </div>
  );

  // The instructor link sits above the card-wide project link (z-10), so both stay clickable.
  const byline = (
    <p className="text-sm text-muted">
      <Link
        href={`/instructors/${card.instructor.slug}`}
        className="relative z-10 font-medium text-ink underline-offset-4 hover:text-accent hover:underline"
      >
        {card.instructor.name}
      </Link>
      {" · "}
      {card.instructor.title}, {card.organization.name}
    </p>
  );

  // The title link stretches over the whole card, so any click on the card opens the project.
  const title = (
    <h3 className="text-xl font-semibold leading-snug">
      <Link
        href={href}
        className="transition-colors duration-150 after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
      >
        {card.title}
      </Link>
    </h3>
  );

  if (layout === "list") {
    return (
      <article
        style={stagger}
        className="rise-in card-lift group relative grid gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
      >
        <div className="space-y-2.5">
          <IndustryLabel name={card.industry.name} />
          {title}
          {byline}
          {tags}
        </div>
        <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
          {card.featuredCohort ? <CohortStatusBadge status={card.featuredCohort.status} /> : null}
          <CohortLine card={card} />
        </div>
      </article>
    );
  }

  return (
    <article
      style={stagger}
      className="rise-in card-lift group relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-line bg-surface p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <IndustryLabel name={card.industry.name} />
        {card.featuredCohort ? <CohortStatusBadge status={card.featuredCohort.status} /> : null}
      </div>
      {title}
      <p className="line-clamp-3 text-sm leading-relaxed text-muted">{card.summary}</p>
      {tags}
      <div className="mt-auto space-y-1.5 border-t border-line pt-4 text-sm">
        {byline}
        <div className="flex items-center justify-between gap-3">
          <CohortLine card={card} />
          <span
            aria-hidden
            className="text-accent opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none"
          >
            →
          </span>
        </div>
      </div>
    </article>
  );
}
