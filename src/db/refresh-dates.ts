/**
 * Moves the seeded demo forward in time without deleting anything.
 *
 * The seed is deterministic: the same project count always yields the same cohort and application
 * ids, and only the dates depend on `now`. So regenerating it for today and copying the dates onto
 * the matching ids restores the demo scenario (open, full, running, completed cohorts) while every
 * row an admin or student created, and every status change, stays as it is.
 */
import { sql } from "drizzle-orm";
import type { SeedData } from "@/data/seed";
import type { Db } from "./client";

const BATCH = 500;

export async function refreshDemoDates(db: Db, seed: SeedData): Promise<{ cohorts: number; applications: number }> {
  let cohortCount = 0;
  let applicationCount = 0;
  await db.transaction(async (tx) => {
    for (let i = 0; i < seed.cohorts.length; i += BATCH) {
      const rows = seed.cohorts
        .slice(i, i + BATCH)
        .map((c) => sql`(${c.id}, ${c.startDate}::date, ${c.endDate}::date, ${c.applicationDeadline}::date)`);
      const res = await tx.execute(sql`
        update cohorts set start_date = v.s, end_date = v.e, application_deadline = v.d
        from (values ${sql.join(rows, sql`, `)}) as v(id, s, e, d)
        where cohorts.id = v.id`);
      cohortCount += affected(res);
    }
    for (let i = 0; i < seed.applications.length; i += BATCH) {
      const rows = seed.applications
        .slice(i, i + BATCH)
        .map((a) => sql`(${a.id}::uuid, ${a.submittedAt}::timestamptz)`);
      const res = await tx.execute(sql`
        update applications set submitted_at = v.t
        from (values ${sql.join(rows, sql`, `)}) as v(id, t)
        where applications.id = v.id`);
      applicationCount += affected(res);
    }
  });
  return { cohorts: cohortCount, applications: applicationCount };
}

/** Row count from an UPDATE on either driver (postgres-js: `count`, PGlite: `affectedRows`). */
function affected(res: unknown): number {
  const r = res as { count?: number; affectedRows?: number };
  return r.count ?? r.affectedRows ?? 0;
}
