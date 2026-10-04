import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/data";
import { CohortStatusBadge, TagChip } from "@/components/badges";
import { formatDate, plural } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getRepo().getProject(slug);
  if (!project) return { title: "Project not found" };
  return { title: project.title, description: project.summary };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getRepo().getProject(slug);
  if (!project) notFound();

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/projects" className="hover:underline">
          Projects
        </Link>
        {" / "}
        <Link href={`/projects?industry=${project.industry.id}`} className="hover:underline">
          {project.industry.name}
        </Link>
      </nav>

      <header className="space-y-3">
        <p className="rise-in flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-gold" />
          {project.industry.name}
        </p>
        <h1 className="rise-in max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">{project.title}</h1>
        <p className="max-w-3xl text-lg text-muted">{project.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          {project.skills.map((s) => (
            <TagChip key={s.id}>{s.name}</TagChip>
          ))}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">About this project</h2>
            {project.description.split("\n\n").map((para, i) => (
              <p key={i} className="max-w-prose leading-relaxed">
                {para}
              </p>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">What you will learn</h2>
            <ul className="max-w-prose list-disc space-y-1.5 pl-5">
              {project.learningGoals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">What you will produce</h2>
            <p className="max-w-prose rounded-2xl border border-gold/40 bg-gold-soft p-5 leading-relaxed text-ink">{project.deliverable}</p>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="cohorts-h" className="space-y-3 rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] p-5">
            <h2 id="cohorts-h" className="text-lg font-semibold">
              Cohorts and applications
            </h2>
            {project.cohorts.length === 0 ? (
              <p className="text-sm text-muted">No cohorts are scheduled yet.</p>
            ) : (
              <ul className="space-y-4">
                {project.cohorts.map((c) => (
                  <li key={c.id} className="space-y-2 border-t border-line pt-3 first:border-0 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">
                        {formatDate(c.startDate)} to {formatDate(c.endDate)}
                      </p>
                      <CohortStatusBadge status={c.status} />
                    </div>
                    <p className="text-sm text-muted">
                      Apply by {formatDate(c.applicationDeadline)} · {plural(c.maxStudents, "seat")} total
                      {c.status === "open" ? ` · ${c.seatsLeft} left` : ""}
                    </p>
                    {c.status === "open" ? (
                      <Link
                        href={`/apply/${c.id}`}
                        className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink shadow-sm transition-colors hover:bg-accent-strong active:bg-accent-deep"
                      >
                        Apply to this cohort
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="instructor-h" className="space-y-2 rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] p-5">
            <h2 id="instructor-h" className="text-lg font-semibold">
              Your instructor
            </h2>
            <p className="font-medium">
              <Link href={`/instructors/${project.instructor.slug}`} className="hover:underline">
                {project.instructor.name}
              </Link>
            </p>
            <p className="text-sm text-muted">
              {project.instructor.title}, {project.organization.name}
            </p>
            <p className="text-sm leading-relaxed">{project.instructorBio}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
