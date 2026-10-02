# Architecture

## Shape

```
Browser
  │ GET                                   POST (forms)
  ▼                                          ▼
Server Components (src/app/**)       Server Actions / Route Handlers
  │  filters + pagination in URL        │  requireAdmin() first on every admin one
  └──────────────┬──────────────────────┘
                 ▼
             getRepo()                 src/data/index.ts
                 │
          Repository (interface)       src/data/repository.ts
        ┌────────┴──────────────┐
  MemoryRepository          PostgresRepository        chosen by DATABASE_URL
  src/data/memory.ts        src/data/postgres.ts      (Drizzle, src/db/schema.ts)
        │                           │
  generateSeed()            loadSeed()  src/db/load-seed.ts  (npm run db:seed)
  src/data/seed.ts

  Used by both repositories and by actions:
    src/lib/rules.ts       pure capacity and cohort-status logic
    src/lib/validation.ts  zod schema for the application form
    src/lib/auth.ts        admin session (shared password for now)
    src/lib/export.ts      Excel workbook (exceljs)
    src/lib/mailer.ts      email seam (console only until a provider is approved)
    src/lib/rate-limit.ts  per-instance fixed-window limiter (apply, login)
    src/proxy.ts           per-request CSP nonce + optimistic admin gate
```

Everything left of `getRepo()` knows nothing about how data is stored. That is the point.

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | static | Redirects to `/projects` |
| `/projects` | dynamic | Catalog: industry chips, search, skill filter, open-only, grid/list, pagination |
| `/projects/[slug]` | dynamic | Project detail, cohorts with seats left, instructor card |
| `/instructors`, `/instructors/[slug]` | dynamic | Instructor catalog and profile |
| `/apply/[cohortId]` | dynamic | Application form (Server Action) |
| `/application/[id]` | dynamic | Student status page (capability link, noindex) |
| `/admin/login` | dynamic | Sign in |
| `/admin`, `/admin/applications`, `/admin/cohorts` | dynamic | Overview, review table with bulk status change, capacity |
| `/admin/applications/[id]` | dynamic | One application: details, full statement, audit trail of status changes |
| `/admin/projects`, `/new`, `/[id]` | dynamic | Project list (drafts included), editor, publish/unpublish/archive, cohort list |
| `/admin/projects/[id]/cohorts/new`, `/[cohortId]` | dynamic | Cohort editor. Capacity cannot drop below seats taken |
| `/admin/instructors`, `/new`, `/[id]` | dynamic | Instructor list and editor (organization created by name) |
| `/admin/export` | route handler | `.xlsx` download, honors the applications filters |
| `/robots.txt` | static | Disallows admin, apply, application |

Every page is dynamic: the root layout calls `await connection()` so each response can carry its own CSP nonce. The admin routes **must** be dynamic: `isAdmin()` reads `cookies()` first to guarantee it (see CLAUDE.md rule 3).

## Key flows

**Apply.** Form posts to `submitApplication` (Server Action) which re-validates with zod, then `repo.createApplication`. The repository refuses an unknown cohort, a cohort that is not `open`, and a duplicate (cohort, email). On success: redirect to `/application/[uuid]`.

**Review.** Admin selects rows, picks a status, posts to `updateStatuses`. For each id, `repo.updateApplicationStatus` calls `resolveStatusChange()`, which may downgrade `accepted` to `waitlisted` if the cohort is full. The redirect carries counts back as `?updated=&waitlisted=` for the notice. The return path is validated to stay inside `/admin/applications`.

**Export.** `GET /admin/export?status=&cohort=&q=` checks `isAdmin()` (401 if not), asks the repository for the filtered rows plus cohort capacity, and streams a two-sheet workbook. Student text is written as plain string cells, never formulas.

## Security model

| Concern | How it is handled | Where |
|---|---|---|
| Admin access | Signed httpOnly cookie, HMAC, 8 hour expiry. Checked inside every page, action and handler | `lib/auth.ts` |
| Proxy gate | Optimistic redirect when the cookie is absent. Not a security boundary | `proxy.ts` |
| Production default | Admin is **disabled** unless `ADMIN_PASSWORD` is set. No default password | `lib/auth.ts` |
| PII exposure | Public pages only receive DTOs that cannot carry applicant data or Zoom links | `data/types.ts` |
| Student status link | UUID, `noindex`, shows name and status but not email | `app/application/[id]` |
| Open redirect | Bulk-update return path is parsed and pinned to `/admin/applications` | `admin/(panel)/actions.ts` |
| Spam and guessing | Honeypot field; rate limit of 10 applications per 10 minutes and 5 login attempts per minute per client (hashed IP, per instance) | `apply/[cohortId]/actions.ts`, `admin/login/actions.ts`, `lib/rate-limit.ts` |
| Script injection | Enforced CSP with a per-request nonce and `strict-dynamic`; `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS | `proxy.ts`, `next.config.ts` |
| Audit | Every real status change is recorded (who, from, to, when) in the same transaction | `application_events` |
| Admin writes | Each admin form action calls `requireAdmin()` first and re-validates with zod | `admin/(panel)/save-actions.ts` |
| Excel injection | Values are string cells, not formulas | `lib/export.ts` |
| Crawlers | `robots.txt` plus `noindex` on private pages | `app/robots.ts` |

Not yet handled: real authentication and roles, CSRF beyond Next's Server Action protections, shared (cross-instance) rate limiting, data retention and deletion. These are Roadmap Phases 2 and 6, and Q10 in `DECISIONS.md`. `style-src` keeps `'unsafe-inline'` because two admin bars use `style="width: N%"`.

## Scale

`npm run bench` at 1,000 projects, 1,358 cohorts and 11,861 applications (median of 5 runs):

| Query | Memory | Postgres (PGlite, in-process) |
|---|---|---|
| Catalog page 1, unfiltered | 1.1 ms | 38 ms |
| Catalog with industry + search + open only | 0.1 ms | 2.8 ms |
| Admin applications page 1 | 4.3 ms | 7.4 ms |
| Admin applications text search | 2.9 ms | 56 ms |
| Admin cohort rows (all) | 1.2 ms | 16 ms |
| Export all applications | 4.3 ms | 109 ms |

PGlite has no network, so a hosted database adds a round trip per query (the catalog page runs about four). The unfiltered catalog derives cohort status for the whole filtered set in TypeScript (`ponytail` note in `postgres.ts`): fine to about 10,000 projects. Add indexes or a search service only when a measurement against the real database says so. Not yet measured against a real hosted Postgres.

## Why these choices

- **Server components and URL state**: the catalog needs no client JavaScript, links are shareable, and tests stay simple.
- **Repository interface**: lets the demo run free with zero setup while keeping the real database one file away.
- **Derived cohort status**: a stored flag would be wrong the moment a deadline passes.
- **No UI library**: nothing to install, nothing to fetch at build time, trivial to re-theme through CSS variables.

## Testing

| Layer | Tool | What it proves |
|---|---|---|
| `tests/rules.test.ts` | node:test via tsx | Capacity and status rules, edge cases at the deadline |
| `tests/contract/repository.contract.ts` | node:test | The behavior every repository must have: filters, search, duplicate and capacity rules, no PII or zoom link in public DTOs, the demo scenario, audit events, admin editing. Run by both files below |
| `tests/repository.test.ts` | node:test | Runs the contract on the in-memory repository, plus seed determinism, uniqueness and UUID checks |
| `tests/repository.postgres.test.ts` | node:test + PGlite | Runs the same contract on `PostgresRepository` against the real migrations. A concurrent-accept test runs when `TEST_DATABASE_URL` is set |
| `tests/db.test.ts`, `mailer.test.ts`, `rate-limit.test.ts` | node:test | Migrations and seed loader, email content and failure handling, limiter windows |
| `tests/schema.test.ts` | node:test | TypeScript types and Postgres enums have not drifted |
| `tests/e2e/smoke.spec.ts` | Playwright on the production build (in-memory repository) | Browse and filter, apply with validation, duplicate block, admin access control including a forged cookie and every editing page, accept, audit trail, Excel contents, waitlist, admin editing end to end, security headers, no CSP violations, rate limiting, skip link |
