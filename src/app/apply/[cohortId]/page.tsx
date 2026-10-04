import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/data";
import { CohortStatusBadge } from "@/components/badges";
import { formatDate, plural } from "@/lib/format";
import { ApplyForm } from "./apply-form";

type Props = { params: Promise<{ cohortId: string }> };

export const metadata: Metadata = { title: "Apply", robots: { index: false } };

export default async function ApplyPage({ params }: Props) {
  const { cohortId } = await params;
  const ctx = await getRepo().getApplyContext(cohortId);
  if (!ctx) notFound();
  const { cohort, project, instructorName } = ctx;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href={`/projects/${project.slug}`} className="hover:underline">
          ← Back to project
        </Link>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold leading-tight">Apply: {project.title}</h1>
        <p className="text-muted">
          With {instructorName} · {formatDate(cohort.startDate)} to {formatDate(cohort.endDate)}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <CohortStatusBadge status={cohort.status} />
          {cohort.status === "open" ? (
            <span className="text-muted">
              Apply by {formatDate(cohort.applicationDeadline)} · {plural(cohort.seatsLeft, "seat")} left
            </span>
          ) : null}
        </div>
      </header>

      {cohort.status === "open" ? (
        <>
          <p className="rounded-md border border-line bg-warn-soft p-3 text-sm text-warn">
            This is a demo. Use made-up details, not your real name or email.
          </p>
          <ApplyForm cohortId={cohort.id} />
        </>
      ) : (
        <div className="rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] p-6">
          <p className="font-medium">This cohort is not accepting applications.</p>
          <p className="mt-1 text-sm text-muted">
            <Link href={`/projects/${project.slug}`} className="text-accent underline">
              See other cohorts for this project
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
