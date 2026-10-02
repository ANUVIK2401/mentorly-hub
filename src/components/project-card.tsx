import Link from "next/link";
import type { ProjectCard as Card } from "@/data/types";
import { formatDate, plural } from "@/lib/format";
import { CohortStatusBadge, TagChip } from "./badges";

function CohortLine({ card }: { card: Card }) {
  const c = card.featuredCohort;
  if (!c) return <span className="text-muted">No cohorts scheduled</span>;
  if (c.status === "open") {
    return (
      <span>
        Starts {formatDate(c.startDate)} · <strong>{plural(c.seatsLeft, "seat")} left</strong>
      </span>
    );
  }
  if (c.status === "completed") return <span className="text-muted">Last ran {formatDate(c.startDate)}</span>;
  return <span className="text-muted">Starts {formatDate(c.startDate)}</span>;
}

export function ProjectCard({ card, layout }: { card: Card; layout: "grid" | "list" }) {
  const shown = card.skills.slice(0, 3);
  const extra = card.skills.length - shown.length;
  const href = `/projects/${card.slug}`;

  const tags = (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <TagChip key={s.id}>{s.name}</TagChip>
      ))}
      {extra > 0 ? <TagChip>+{extra} more</TagChip> : null}
    </div>
  );

  const byline = (
    <p className="text-sm text-muted">
      <Link href={`/instructors/${card.instructor.slug}`} className="font-medium text-ink hover:underline">
        {card.instructor.name}
      </Link>
      {" · "}
      {card.instructor.title}, {card.organization.name}
    </p>
  );

  if (layout === "list") {
    return (
      <article className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{card.industry.name}</p>
          <h3 className="text-lg font-semibold leading-snug">
            <Link href={href} className="hover:underline">
              {card.title}
            </Link>
          </h3>
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
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{card.industry.name}</p>
        {card.featuredCohort ? <CohortStatusBadge status={card.featuredCohort.status} /> : null}
      </div>
      <h3 className="text-lg font-semibold leading-snug">
        <Link href={href} className="hover:underline">
          {card.title}
        </Link>
      </h3>
      <p className="line-clamp-3 text-sm text-muted">{card.summary}</p>
      {tags}
      <div className="mt-auto space-y-1 border-t border-line pt-3 text-sm">
        {byline}
        <p>
          <CohortLine card={card} />
        </p>
      </div>
    </article>
  );
}
