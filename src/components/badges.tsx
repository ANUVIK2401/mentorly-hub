import type { ApplicationStatus, CohortStatus } from "@/data/types";
import { APPLICATION_STATUS_LABEL, COHORT_STATUS_LABEL } from "@/lib/format";

const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

const COHORT_STYLE: Record<CohortStatus, string> = {
  open: "bg-good-soft text-good ring-good/15",
  full: "bg-gold-soft text-gold-ink ring-gold/30",
  closed: "bg-paper text-muted ring-line",
  completed: "bg-paper text-muted ring-line",
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
  submitted: "bg-info-soft text-info ring-info/15",
  under_review: "bg-info-soft text-info ring-info/15",
  accepted: "bg-good-soft text-good ring-good/15",
  enrolled: "bg-good-soft text-good ring-good/15",
  waitlisted: "bg-gold-soft text-gold-ink ring-gold/30",
  rejected: "bg-bad-soft text-bad ring-bad/15",
  withdrawn: "bg-paper text-muted ring-line",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`${base} ${APPLICATION_STYLE[status]}`}>{APPLICATION_STATUS_LABEL[status]}</span>;
}

export function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-surface px-2 py-0.5 text-xs text-muted">
      {children}
    </span>
  );
}
