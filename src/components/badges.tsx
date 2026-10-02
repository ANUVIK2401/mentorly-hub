import type { ApplicationStatus, CohortStatus } from "@/data/types";
import { APPLICATION_STATUS_LABEL, COHORT_STATUS_LABEL } from "@/lib/format";

const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

const COHORT_STYLE: Record<CohortStatus, string> = {
  open: "bg-accent-soft text-accent",
  full: "bg-warn-soft text-warn",
  closed: "bg-line text-muted",
  completed: "bg-line text-muted",
};

export function CohortStatusBadge({ status }: { status: CohortStatus }) {
  return (
    <span className={`${base} ${COHORT_STYLE[status]}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {COHORT_STATUS_LABEL[status]}
    </span>
  );
}

const APPLICATION_STYLE: Record<ApplicationStatus, string> = {
  submitted: "bg-info-soft text-info",
  under_review: "bg-info-soft text-info",
  accepted: "bg-accent-soft text-accent",
  enrolled: "bg-accent-soft text-accent",
  waitlisted: "bg-warn-soft text-warn",
  rejected: "bg-bad-soft text-bad",
  withdrawn: "bg-line text-muted",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`${base} ${APPLICATION_STYLE[status]}`}>{APPLICATION_STATUS_LABEL[status]}</span>;
}

export function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-paper px-2 py-0.5 text-xs text-muted">
      {children}
    </span>
  );
}
