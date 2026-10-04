"use client";

import { useActionState } from "react";
import { INITIAL_APPLY_STATE, MAX_GRAD_YEAR, MIN_GRAD_YEAR, type ApplicationFormValues } from "@/lib/apply-state";
import { submitApplication } from "./actions";

const input =
  "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-muted aria-[invalid=true]:border-bad";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ApplyForm({ cohortId }: { cohortId: string }) {
  const [state, action, pending] = useActionState(submitApplication, INITIAL_APPLY_STATE);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values: Partial<ApplicationFormValues> = state.status === "error" ? state.values : {};
  const years = Array.from({ length: MAX_GRAD_YEAR - MIN_GRAD_YEAR + 1 }, (_, i) => MIN_GRAD_YEAR + i);

  const common = (name: keyof ApplicationFormValues) => ({
    id: name,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="cohortId" value={cohortId} />
      {/* Honeypot: hidden from people and assistive tech, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.status === "error" && state.formError ? (
        <p role="alert" className="rounded-md border border-bad bg-bad-soft p-3 text-sm text-bad">
          {state.formError}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={errors.name}>
          <input {...common("name")} type="text" autoComplete="name" defaultValue={values.name} className={input} />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <input {...common("email")} type="email" autoComplete="email" defaultValue={values.email} className={input} />
        </Field>
        <Field id="school" label="School" error={errors.school}>
          <input {...common("school")} type="text" defaultValue={values.school} className={input} />
        </Field>
        <Field id="program" label="Program or major" error={errors.program}>
          <input {...common("program")} type="text" defaultValue={values.program} className={input} />
        </Field>
        <Field id="graduationYear" label="Expected graduation year" error={errors.graduationYear}>
          <select {...common("graduationYear")} defaultValue={values.graduationYear ?? ""} className={input}>
            <option value="" disabled>
              Choose a year
            </option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="statement" label="Why do you want to join this project?" error={errors.statement}>
        <textarea
          {...common("statement")}
          rows={6}
          defaultValue={values.statement}
          className={`${input} h-auto py-2 leading-relaxed`}
        />
        <p className="text-xs text-muted">40 to 1,500 characters.</p>
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-accent px-6 text-sm font-semibold text-accent-ink shadow-sm transition-colors hover:bg-accent-strong active:bg-accent-deep disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
