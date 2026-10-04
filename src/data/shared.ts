/**
 * Ordering, paging and search helpers both repositories use. One copy, so the memory and
 * Postgres implementations cannot drift apart. Cohort status itself is derived in src/lib/rules.ts.
 */
import type { CohortStatus, CohortView, Page } from "./types";

export const STATUS_RANK: Record<CohortStatus, number> = { open: 0, full: 1, closed: 2, completed: 3 };

/** Clamps `page` into range, so a stale or hand-edited URL still gets a real page. */
export function paginate<T>(all: T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), total: all.length, page: safePage, pageSize, pageCount };
}

/** Lower-cased search terms; every term must match. */
export const searchTerms = (q?: string): string[] => (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);

/** The cohort a card shows: open first (soonest), then full/closed, then the most recent completed. */
export function featuredCohort(views: CohortView[]): CohortView | undefined {
  return [...views].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      (a.status === "completed" ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate)),
  )[0];
}

/** Catalog order: projects whose featured cohort is open come first, soonest start, then title. */
export function byCatalogOrder(
  a: { title: string; top?: CohortView },
  b: { title: string; top?: CohortView },
): number {
  return (
    (a.top ? STATUS_RANK[a.top.status] : 9) - (b.top ? STATUS_RANK[b.top.status] : 9) ||
    (a.top?.startDate ?? "").localeCompare(b.top?.startDate ?? "") ||
    a.title.localeCompare(b.title)
  );
}
