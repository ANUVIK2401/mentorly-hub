import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/data";
import { ApplicationStatusBadge } from "@/components/badges";
import { requireAdmin } from "@/lib/auth";
import { APPLICATION_STATUS_LABEL, formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Application" };

export default async function AdminApplication({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const a = await getRepo().getAdminApplication(id);
  if (!a) notFound();

  const facts: [string, string][] = [
    ["Email", a.student.email],
    ["School", a.student.school],
    ["Program", a.student.program],
    ["Graduation year", String(a.student.graduationYear)],
    ["Submitted", formatDateTime(a.submittedAt)],
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link href="/admin/applications" className="text-sm text-muted underline">
          All applications
        </Link>
        <h1 className="text-3xl font-semibold">{a.student.name}</h1>
        <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <ApplicationStatusBadge status={a.status} />
          <span>
            {a.projectTitle}, cohort starting {formatDate(a.cohortStart)}
          </span>
          <Link href={`/admin/applications?cohort=${a.cohortId}`} className="text-accent underline">
            Same cohort
          </Link>
        </p>
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-line bg-surface p-4 text-sm sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
            <dd className="break-words">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="statement-heading" className="space-y-2">
        <h2 id="statement-heading" className="text-xl font-semibold">
          Statement
        </h2>
        <p className="whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 leading-relaxed">{a.statement}</p>
      </section>

      <section aria-labelledby="history-heading" className="space-y-2">
        <h2 id="history-heading" className="text-xl font-semibold">
          History
        </h2>
        {a.events.length === 0 ? (
          <p className="text-sm text-muted">No status changes yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {a.events.map((e, i) => (
              <li key={i} className="rounded-md border border-line bg-surface px-3 py-2">
                {APPLICATION_STATUS_LABEL[e.from]} → <strong>{APPLICATION_STATUS_LABEL[e.to]}</strong>
                <span className="text-muted">
                  {" "}
                  by {e.actor}, {formatDateTime(e.at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
