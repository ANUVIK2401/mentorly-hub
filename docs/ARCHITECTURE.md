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
  MemoryRepository          PostgresRepository
  src/data/memory.ts        (Roadmap Phase 1, against src/db/schema.ts)
        │
  generateSeed()  src/data/seed.ts

  Used by both repositories and by actions:
    src/lib/rules.ts       pure capacity and cohort-status logic
    src/lib/validation.ts  zod schema for the application form
    src/lib/auth.ts        admin session (shared password for now)
    src/lib/export.ts      Excel workbook (exceljs)
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
| `/admin/export` | route handler | `.xlsx` download, honors the applications filters |
| `/robots.txt` | static | Disallows admin, apply, application |

"Dynamic" means rendered per request. The admin routes **must** be dynamic: `isAdmin()` reads `cookies()` first to guarantee it (see CLAUDE.md rule 3).

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
| Spam | Honeypot field. **No rate limiting yet** | `apply/[cohortId]/actions.ts` |
| Excel injection | Values are string cells, not formulas | `lib/export.ts` |
| Crawlers | `robots.txt` plus `noindex` on private pages | `app/robots.ts` |

Not yet handled: real authentication and roles, CSRF beyond Next's Server Action protections, rate limiting, audit log, data retention. These are Roadmap Phases 2 and 6, and Q10 in `DECISIONS.md`.

## Scale

Measured on the in-memory repository with 1,000 projects, about 1,350 cohorts and 11,800 applications: building the whole dataset takes about 60 ms, and a filtered, searched, paginated catalog query takes about 1.4 ms. Database numbers will differ, but the access patterns (index on industry, status, cohort, submitted date) are in the schema. Do not add a search service until profiling says so: Postgres handles this size comfortably.

## Why these choices

- **Server components and URL state**: the catalog needs no client JavaScript, links are shareable, and tests stay simple.
- **Repository interface**: lets the demo run free with zero setup while keeping the real database one file away.
- **Derived cohort status**: a stored flag would be wrong the moment a deadline passes.
- **No UI library**: nothing to install, nothing to fetch at build time, trivial to re-theme through CSS variables.

## Testing

| Layer | Tool | What it proves |
|---|---|---|
| `tests/rules.test.ts` | node:test via tsx | Capacity and status rules, edge cases at the deadline |
| `tests/repository.test.ts` | node:test | Seed determinism and uniqueness at 1,152 projects, filters, search, duplicate and capacity rules, no PII in public DTOs, the demo scenario |
| `tests/schema.test.ts` | node:test | TypeScript types and Postgres enums have not drifted |
| `tests/e2e/smoke.spec.ts` | Playwright on the production build | Browse and filter, apply with validation, duplicate block, admin access control including a forged cookie, accept, Excel contents, waitlist behavior |

**Phase 1 tip:** turn `repository.test.ts` into a contract suite that takes a repository factory, and run it against both implementations.
