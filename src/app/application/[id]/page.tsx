import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/data";
import type { ApplicationStatus } from "@/data/types";
import { ApplicationStatusBadge } from "@/components/badges";
import { formatDate, formatDateTime } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

// This URL is a capability link: anyone holding it can see the status. Keep it out of search engines.
export const metadata: Metadata = { title: "Application status", robots: { index: false, follow: false } };

const NEXT_STEPS: Record<ApplicationStatus, string> = {
  submitted: "We have your application. A reviewer will look at it before the application deadline.",
  under_review: "A reviewer is looking at your application now.",
  accepted: "You have a seat. You will receive the Zoom details before the cohort starts.",
  enrolled: "You are enrolled. See you at the first workshop.",
  waitlisted: "The cohort is full right now. You will be contacted if a seat opens up.",
  rejected: "Thanks for applying. This cohort was not a fit this time, and you are welcome to apply to another.",
  withdrawn: "This application was withdrawn.",
};

export default async function ApplicationStatusPage({ params }: Props) {
  const { id } = await params;
  const app = await getRepo().getApplicationStatus(id);
  if (!app) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Application received</h1>
        <p className="text-muted">Thanks, {app.studentName}. Bookmark this page to check your status.</p>
      </header>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            <Link href={`/projects/${app.projectSlug}`} className="hover:underline">
              {app.projectTitle}
            </Link>
          </h2>
          <ApplicationStatusBadge status={app.status} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Cohort</dt>
            <dd>
              {formatDate(app.cohortStart)} to {formatDate(app.cohortEnd)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Submitted</dt>
            <dd>{formatDateTime(app.submittedAt)}</dd>
          </div>
        </dl>
        <p className="border-t border-line pt-4 text-sm">{NEXT_STEPS[app.status]}</p>
      </section>

      <Link href="/projects" className="text-sm text-accent underline">
        Browse more projects
      </Link>
    </div>
  );
}
