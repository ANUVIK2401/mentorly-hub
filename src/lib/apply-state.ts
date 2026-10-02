/** Form state shared by the apply server action and the client form. Kept free of zod so it stays out of the client bundle. */

export const MIN_GRAD_YEAR = 2026;
export const MAX_GRAD_YEAR = 2032;

export type ApplicationFormValues = Record<
  "name" | "email" | "school" | "program" | "graduationYear" | "statement",
  string
>;

export type ApplyState =
  | { status: "idle" }
  | {
      status: "error";
      formError?: string;
      fieldErrors: Partial<Record<keyof ApplicationFormValues, string>>;
      values: ApplicationFormValues;
    };

export const INITIAL_APPLY_STATE: ApplyState = { status: "idle" };
