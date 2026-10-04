"use client";

import { useActionState } from "react";
import { INITIAL_ADMIN_FORM_STATE, type AdminFormState, type FieldSpec } from "@/lib/admin-form";

const control =
  "w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-muted aria-[invalid=true]:border-bad";

interface AdminFormProps {
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  fields: FieldSpec[];
  defaults: Record<string, string>;
  hidden?: Record<string, string>;
  submitLabel: string;
}

/** Generic admin form: field specs are plain data so server pages can pass them in. */
export function AdminForm({ action, fields, defaults, hidden = {}, submitLabel }: AdminFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_ADMIN_FORM_STATE);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : defaults;

  return (
    <form action={formAction} className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2" noValidate>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state.status === "error" && state.formError ? (
        <p role="alert" className="rounded-md border border-bad bg-bad-soft p-3 text-sm text-bad sm:col-span-2">
          {state.formError}
        </p>
      ) : null}

      {fields.map((f) => {
        const error = errors[f.name];
        const common = {
          id: f.name,
          name: f.name,
          defaultValue: values[f.name] ?? "",
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error ? `${f.name}-error` : f.hint ? `${f.name}-hint` : undefined,
        };
        return (
          <div key={f.name} className={`min-w-0 space-y-1 ${f.half ? "" : "sm:col-span-2"}`}>
            <label htmlFor={f.name} className="text-sm font-medium">
              {f.label}
            </label>
            {f.kind === "textarea" ? (
              <textarea {...common} rows={f.rows ?? 4} className={`${control} py-2 leading-relaxed`} />
            ) : f.kind === "select" ? (
              <select {...common} className={`${control} h-10`}>
                <option value="">Choose…</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...common}
                type={f.kind === "text" ? "text" : f.kind}
                inputMode={f.kind === "number" ? "numeric" : undefined}
                className={`${control} h-10`}
              />
            )}
            {f.hint ? (
              <p id={`${f.name}-hint`} className="text-xs text-muted">
                {f.hint}
              </p>
            ) : null}
            {error ? (
              <p id={`${f.name}-error`} role="alert" className="text-sm text-bad">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-lg btn-primary px-6 text-sm font-semibold "
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
