/** Shared by the admin form actions (server) and AdminForm (client). Free of zod so the client bundle stays small. */

export interface FieldSpec {
  name: string;
  label: string;
  kind: "text" | "textarea" | "select" | "date" | "number" | "url";
  hint?: string;
  rows?: number;
  options?: { value: string; label: string }[];
  /** Layout: half-width on wide screens. Defaults to full width. */
  half?: boolean;
}

export type AdminFormState =
  | { status: "idle" }
  | { status: "error"; formError?: string; fieldErrors: Record<string, string>; values: Record<string, string> };

export const INITIAL_ADMIN_FORM_STATE: AdminFormState = { status: "idle" };

/** One string per named field, so a failed submit can re-render exactly what was typed. */
export function readFields(formData: FormData, names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((n) => [n, String(formData.get(n) ?? "")]));
}

export const lines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

export const commaList = (text: string): string[] =>
  text
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

export function errorState(
  values: Record<string, string>,
  fieldErrors: Record<string, string>,
  formError?: string,
): AdminFormState {
  return { status: "error", values, fieldErrors, formError };
}
