/**
 * Business rules. Pure functions, no I/O, easy to unit test (tests/rules.test.ts).
 * This is the ONE place capacity and cohort-status logic lives.
 * Any repository implementation (memory, Postgres) must call these.
 */
import type { ApplicationStatus, Cohort, CohortStatus } from "@/data/types";

/** Statuses that occupy a seat in a cohort. */
export const SEAT_STATUSES: readonly ApplicationStatus[] = ["accepted", "enrolled"];

export function occupiesSeat(status: ApplicationStatus): boolean {
  return SEAT_STATUSES.includes(status);
}

/** End of a YYYY-MM-DD day, in UTC. The deadline day itself is still open. */
function endOfDay(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

export function deriveCohortStatus(
  cohort: Pick<Cohort, "maxStudents" | "applicationDeadline" | "endDate">,
  seatsTaken: number,
  now: Date,
): CohortStatus {
  if (endOfDay(cohort.endDate) < now) return "completed";
  if (seatsTaken >= cohort.maxStudents) return "full";
  if (endOfDay(cohort.applicationDeadline) < now) return "closed";
  return "open";
}

/** User-facing reason a cohort refuses applications. Shared so every repository words it the same. */
export function notOpenMessage(status: Exclude<CohortStatus, "open">, applicationDeadline: string): string {
  const reason: Record<Exclude<CohortStatus, "open">, string> = {
    full: "This cohort is full.",
    closed: `Applications closed on ${applicationDeadline}.`,
    completed: "This cohort has already finished.",
  };
  return reason[status];
}

/**
 * Decide the resulting status when an admin changes an application's status.
 * Accepting someone into a full cohort turns into a waitlist entry instead.
 */
export function resolveStatusChange(args: {
  current: ApplicationStatus;
  requested: ApplicationStatus;
  seatsTaken: number;
  maxStudents: number;
}): { status: ApplicationStatus; waitlistedBecauseFull: boolean } {
  const { current, requested, seatsTaken, maxStudents } = args;
  const needsNewSeat = occupiesSeat(requested) && !occupiesSeat(current);
  if (needsNewSeat && seatsTaken >= maxStudents) {
    return { status: "waitlisted", waitlistedBecauseFull: true };
  }
  return { status: requested, waitlistedBecauseFull: false };
}

/** Normalised key for the "one application per student per cohort" rule. */
export function applicationKey(cohortId: string, email: string): string {
  return `${cohortId}::${email.trim().toLowerCase()}`;
}

export interface CohortDates {
  startDate: string;
  endDate: string;
  applicationDeadline: string;
  minStudents: number;
  maxStudents: number;
}

/**
 * Field errors for a cohort being created or edited. `seatsTaken` is the current count of accepted
 * and enrolled applications (0 for a new cohort): capacity may never drop below it, or the cohort
 * would be over-enrolled. Every repository calls this, so the rule lives in one place.
 */
export function cohortRuleErrors(c: CohortDates, seatsTaken: number): Record<string, string> {
  const errors: Record<string, string> = {};
  if (c.applicationDeadline > c.startDate) errors.applicationDeadline = "The deadline must be on or before the start date.";
  if (c.endDate <= c.startDate) errors.endDate = "The end date must be after the start date.";
  if (c.minStudents > c.maxStudents) errors.minStudents = "The minimum cannot exceed the maximum.";
  if (c.maxStudents < seatsTaken) {
    errors.maxStudents = `Capacity cannot be below the ${seatsTaken} seat${seatsTaken === 1 ? "" : "s"} already taken.`;
  }
  return errors;
}
