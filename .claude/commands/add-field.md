---
description: Add or change a field on the student application, end to end
argument-hint: <field name and type, e.g. "linkedinUrl: optional url">
---
Add this application field: **$ARGUMENTS**

A field touches several layers. Do all of them, in this order, so nothing drifts:

1. `src/data/types.ts`: `Student` or `Application`, and `CreateApplicationInput` if needed.
2. `src/lib/apply-state.ts`: `ApplicationFormValues`, and the server action's `FIELDS` list in `src/app/apply/[cohortId]/actions.ts`.
3. `src/lib/validation.ts`: the zod rule and its error message.
4. `src/app/apply/[cohortId]/apply-form.tsx`: the input, label, error display.
5. `src/data/memory.ts` and `src/data/seed.ts`: store it, and generate a plausible synthetic value.
6. `src/db/schema.ts`: the column, then `npm run db:generate` and review the new SQL file.
7. `src/lib/export.ts`: add a column to `APPLICATION_COLUMNS`.
8. Admin applications table (`src/app/admin/(panel)/applications/page.tsx`) if reviewers need to see it.
9. Tests: unit test for validation or storage, and extend `tests/e2e/smoke.spec.ts` if the form flow changes.

Remember rule 1 in CLAUDE.md: new applicant data is PII. It must never reach a public DTO or page. Finish with `/check`.
