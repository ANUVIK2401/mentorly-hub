import type { AdminCohortEdit } from "@/data/types";
import type { FieldSpec } from "@/lib/admin-form";

export const COHORT_FIELDS: FieldSpec[] = [
  { name: "startDate", label: "Start date", kind: "date", half: true },
  { name: "endDate", label: "End date", kind: "date", half: true },
  { name: "applicationDeadline", label: "Application deadline", kind: "date", half: true, hint: "The deadline day itself is still open." },
  { name: "minStudents", label: "Minimum students", kind: "number", half: true },
  { name: "maxStudents", label: "Capacity", kind: "number", half: true, hint: "Cannot drop below the seats already taken." },
  { name: "zoomLink", label: "Zoom link", kind: "url", half: true, hint: "Private. Never shown on public pages." },
];

const DAY_MS = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Sensible starting values for a new cohort: starts in two weeks, 8 weeks long, applications close a week before. */
export function cohortDefaults(c?: AdminCohortEdit): Record<string, string> {
  if (c) {
    return {
      startDate: c.startDate,
      endDate: c.endDate,
      applicationDeadline: c.applicationDeadline,
      minStudents: String(c.minStudents),
      maxStudents: String(c.maxStudents),
      zoomLink: c.zoomLink ?? "",
    };
  }
  const start = Date.now() + 14 * DAY_MS;
  return {
    startDate: isoDay(start),
    endDate: isoDay(start + 55 * DAY_MS),
    applicationDeadline: isoDay(start - 7 * DAY_MS),
    minStudents: "5",
    maxStudents: "10",
    zoomLink: "",
  };
}
