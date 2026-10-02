# Decisions

## Open questions for Ben

Send these before starting Phase 1. "Assumption" is what the build does today. Record answers here with a date.

| # | Question | Current assumption | What it changes |
|---|---|---|---|
| Q1 | Who creates projects: only you, or do instructors self-serve with approval? | Admin only (nothing in the UI yet) | Phase 3 scope, instructor role, approval workflow |
| Q2 | Do students need accounts, or is a public form with email enough? | No accounts. Status via unguessable link | Phase 2 auth scope, "my applications" page, duplicate rules |
| Q3 | What does the application collect? | Name, email, school, program, graduation year, a statement | `/add-field`, validation, schema, export |
| Q4 | Who reviews applications: you, the instructor, or both? | Admin only | Phase 4 permissions |
| Q5 | Are projects run in dated cohorts (like 8-week runs), or rolling? | Dated cohorts, 8 weeks, apply by a deadline one week before | Core data model. Rolling would remove `Cohort` as a dated entity |
| Q6 | Is there any cost or payment? | None | Payments are a large separate scope |
| Q7 | Certificates of completion in v1? | No | `enrollments.certificate_issued` exists but unused |
| Q8 | Name, logo, colors? | "Mentorly Hub" (chosen by Anuvik 2026-10-01, confirm with Ben), green accent | `globals.css` tokens, layout |
| Q9 | Exact Excel columns? | 12 columns on Applications plus a cohort capacity sheet | `APPLICATION_COLUMNS` in `src/lib/export.ts` |
| Q10 | Privacy constraints on student data (university policy, retention, who may see it)? | None assumed. Demo uses fake data only | **Blocks real data.** Retention, deletion, access rules |
| Q11 | Budget and hosting expectations once this is real? | Free tier for the demo | Vercel's Hobby plan is for personal, non-commercial use (check its current terms). A real product likely needs a paid plan and a paid database |

## Decisions already made

| # | Decision | Why | Revisit when |
|---|---|---|---|
| D1 | Demo runs on an **in-memory repository** over deterministic synthetic data | Free Vercel deploy with zero accounts or setup, and a stable demo | Phase 1. Before any real student data |
| D2 | All storage goes through a `Repository` interface | Swapping to Postgres touches one file, not every page | Never, it is the seam |
| D3 | **Cohort status is derived**, never stored | A stored "open" flag goes stale the moment a deadline passes | Never |
| D4 | Capacity logic exists in **one place** (`src/lib/rules.ts`) with unit tests | The rule most likely to be implemented twice and wrong | Never |
| D5 | Catalog filters, search and pagination live in **URL query params**, rendered on the server | Shareable links, no client JS, simple to test | If filters need instant client-side feedback |
| D6 | One-student-one-application-per-cohort is keyed on **lower-cased email** | No accounts yet (Q2). Postgres enforces it with a unique index too | Phase 2 if accounts arrive |
| D7 | Admin is a **single shared password** with a signed cookie, disabled in production unless `ADMIN_PASSWORD` is set | Smallest thing that protects a demo. No default password in production | Phase 2, before real data |
| D8 | Student status page is a **capability link** (UUID in the URL), `noindex`, shows name and status but never email | Lets students check status without accounts | Phase 2 if accounts arrive |
| D9 | Synthetic content only, fictional organizations and people | Do not copy a real organization's content or branding | Never |
| D10 | Tailwind with CSS-variable tokens, system font stack, no component library | Zero build-time network dependencies, easy to re-theme | If a design system is chosen |
| D11 | **Each application keeps its own copy of the student details** (name, email, school, program, graduation year). The Postgres `students` row is identity only (first details seen) and is never updated | A first version updated the student row on every application ("latest wins"). A code review showed that lets anyone who knows an email overwrite what reviewers see on earlier applications | If student accounts arrive (Phase 2): link applications to the account, keep the snapshot for history |

## Decision log

Add dated entries here as Ben answers questions or you change a decision.

- _2026-10-01_: Reference build created. Q1 to Q11 sent: _pending_.
