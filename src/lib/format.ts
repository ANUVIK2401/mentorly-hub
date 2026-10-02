import type { ApplicationStatus, CohortStatus } from "@/data/types";

/** "2026-10-14" -> "Oct 14, 2026". Always UTC so server and browser agree. */
export function formatDate(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Not selected",
  enrolled: "Enrolled",
  withdrawn: "Withdrawn",
};

export const COHORT_STATUS_LABEL: Record<CohortStatus, string> = {
  open: "Applications open",
  full: "Cohort full",
  closed: "Applications closed",
  completed: "Completed",
};

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
