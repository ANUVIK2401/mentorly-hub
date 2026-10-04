import Link from "next/link";
import { getRepo } from "@/data";
import { APPLICATION_STATUSES } from "@/data/types";
import { requireAdmin } from "@/lib/auth";
import { APPLICATION_STATUS_LABEL } from "@/lib/format";

export default async function AdminOverview() {
  await requireAdmin();
  const stats = await getRepo().getAdminStats();
  const max = Math.max(1, ...Object.values(stats.byStatus));

  const cards = [
    { label: "Published projects", value: stats.projects },
    { label: "Instructors", value: stats.instructors },
    { label: "Cohorts open for applications", value: stats.openCohorts },
    { label: "Applications", value: stats.applications },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Overview</h1>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] p-5">
            <dt className="text-sm text-muted">{c.label}</dt>
            <dd className="mt-1 font-display text-3xl font-semibold">{c.value.toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3 rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] p-5">
        <h2 className="text-lg font-semibold">Applications by status</h2>
        <ul className="space-y-2">
          {APPLICATION_STATUSES.map((s) => (
            <li key={s} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3 text-sm">
              <Link href={`/admin/applications?status=${s}`} className="hover:underline">
                {APPLICATION_STATUS_LABEL[s]}
              </Link>
              <div className="h-2 rounded-full bg-line">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${(stats.byStatus[s] / max) * 100}%` }} />
              </div>
              <span className="text-right tabular-nums">{stats.byStatus[s].toLocaleString("en-US")}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-muted">
        Demo storage is in memory: applications you submit here can disappear when the server recycles. Seeded data always
        comes back identical.
      </p>
    </div>
  );
}
