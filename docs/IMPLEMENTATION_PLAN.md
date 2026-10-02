# Implementation plan

Task-level breakdown of `docs/ROADMAP.md`. Each task is sized to be handed to one subagent with no other context: it says what to read, what to touch, how to prove it is done, and what not to do. Run them in order unless a task says it can run in parallel.

Written 2026-10-01 against the Phase 0 reference build. Re-check file paths before starting a task if much has changed since.

## How to hand off a task

Paste this to the subagent, with the task card below it:

```
You are working in the Project Hub repo. Read CLAUDE.md and AGENTS.md first; their rules override anything else.
Do exactly the task below. Do not start other tasks. Do not add dependencies unless the task card names them.
When finished, run the "Done when" commands and paste their final lines. If a check fails, fix the root cause; do not weaken a test.
Report: files changed, commands run with results, anything you deferred and why.

<task card>
```

After every task that touches `src/app/**`, `src/data/**` or a DTO, run the `privacy-reviewer` agent on the diff before merging.

**Model column:** `haiku` for mechanical work with an exact recipe, `sonnet` for normal implementation, `opus` for concurrency, auth and anything where a wrong design is expensive.

## Gates (human decisions, not agent work)

Agents must stop when they hit an unmet gate.

| Gate | What | Blocks |
|---|---|---|
| G1 | Ben answers Q1 to Q11 in `docs/DECISIONS.md` (send them now; answers take calendar time) | Phase 2 (Q2, Q4), Phase 3 (Q1), Phase 4 (Q4), resume upload (Q3, Q10), any real student data (Q10) |
| G2 | Approve Phase 1 dependencies: `postgres` (driver) and `@electric-sql/pglite` (dev, in-process Postgres for tests). CLAUDE.md rule 8 requires asking | T1.3 onward |
| G3 | Choose a database host. Recommended: **Supabase**, because Phase 2 auth and Phase 5 file storage can then use the same vendor | T1.8 |
| G4 | Approve D11 (student profile semantics, see T1.2) | T1.4b |
| G5 | Approve Phase 2 auth provider and its dependency | T2.2 |
| G6 | Approve Resend (or another mail provider) as a dependency | T5.2 |

## Findings that shaped this plan

Verified by reading the code on 2026-10-01. Each one is a trap for whoever implements Phase 1.

1. **Seed application ids are not UUIDs.** `src/data/seed.ts:124` produces `seed-app-N`, but `applications.id` is `uuid` in `src/db/schema.ts:147`. Loading the seed into Postgres fails on the first insert. Fixed in T1.2.
2. **A malformed id crashes Postgres lookups.** `getApplicationStatus("abc")` on a uuid column raises `invalid input syntax for type uuid`, which becomes a 500, not the 404 the e2e test (`unknown project and application ids 404`) expects. Validate the format and return `null`. Covered in T1.2 and T1.4b.
3. **Student identity differs between models.** In memory, each application carries its own student snapshot. In Postgres, `students.email` is unique, so a second application from the same email either overwrites the profile or keeps the old one. Needs decision D11 (G4).
4. **Time must be injectable.** `createMemoryRepository(seed, now)` takes a clock and the tests pin `NOW`. The Postgres repository must take the same `now` and pass `submittedAt` explicitly instead of relying on `defaultNow()`, or the contract suite cannot run against it.
5. **A seeded database ages.** The memory seed regenerates dates relative to "today" on every cold start. A Postgres seed is loaded once, so within weeks every seeded cohort is `closed` or `completed` and the demo scenario disappears. T1.5 must make reseeding a single command and document it.
6. **The Supabase pooler breaks prepared statements.** The transaction-mode pooler (port 6543) does not support them; `postgres` must be created with `prepare: false`. Covered in T1.3.
7. **Do not compute cohort status in SQL.** `openOnly` and the catalog sort depend on derived status. Writing it as SQL duplicates `deriveCohortStatus()` and violates CLAUDE.md rule 4. Fetch seat counts in SQL, derive in TypeScript. At 1,000 projects and about 1,350 cohorts this is cheap.
8. **PGlite cannot prove the capacity race.** It is single-connection, so two concurrent accepts cannot interleave. The row-lock test needs a real server (T1.6 makes it opt-in through `TEST_DATABASE_URL`).
9. **The in-memory repository precomputes indexes at construction** (`published`, `haystack`, the slug maps in `src/data/memory.ts:52-98`). Phase 3 writes must update or rebuild them, or new projects will not appear in search.
10. **No git repository.** The folder is not under version control, so there is no diff for `privacy-reviewer` and no worktree isolation for parallel subagents. Fixed in T0.1.
11. **No security headers.** `next.config.ts` is empty: no CSP, no `X-Frame-Options`, no `Referrer-Policy`. Cheap to add (T0.3).

---

## Phase 0: Ready the repo (S)

### T0.1 Version control and baseline
- **Model:** haiku · **Depends:** none · **Parallel:** no, everything else depends on it
- **Do:** `git init`, confirm `.gitignore` covers `node_modules`, `.next`, `.env*` (except `.env.example`), `test-results`, `playwright-report`. Then `npm ci`, `npx playwright install chromium`, `npm run check`. Commit as `chore: initial import of reference build`.
- **Done when:** `npm run check` passes and the build route table shows every `/admin/*` route as `ƒ`. Record test counts (expected: 34 unit, 9 e2e) in the report.
- **Don't:** fix anything that fails. Report it instead; a red baseline changes the plan.

### T0.2 Send the questions
- **Owner:** Anuvik (not an agent) · **Depends:** none
- Send Q1 to Q11 from `docs/DECISIONS.md` to Ben. Log the date in the decision log. Everything after Phase 1 waits on the answers.

### T0.3 Security headers
- **Model:** sonnet · **Depends:** T0.1 · **Parallel:** with T1.1, T1.2
- **Read:** `node_modules/next/dist/docs/` for `headers()` in `next.config.ts` (Next 16, do not trust memory).
- **Touch:** `next.config.ts`, `tests/e2e/smoke.spec.ts`.
- **Do:** add `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a CSP. Start the CSP as `Content-Security-Policy-Report-Only` because Next inlines scripts; switching to enforced with nonces is T6.4.
- **Done when:** a new e2e assertion checks the headers on `/projects`; `npm run check` passes.

---

## Phase 1: Real persistence (M)

Goal: applications survive a redeploy. Order: T1.1 and T1.2 in parallel, then T1.3, T1.4a, T1.4b, T1.5, T1.6, T1.7, T1.8, T1.9.

### T1.1 Contract test suite
- **Model:** sonnet · **Depends:** T0.1 · **Parallel:** with T1.2
- **Read:** `tests/repository.test.ts`, `src/data/repository.ts`.
- **Touch:** new `tests/contract/repository.contract.ts`, `tests/repository.test.ts`.
- **Do:** move every test that goes through the `Repository` interface (catalog queries, applications, demo scenario) into `export function runRepositoryContract(name: string, makeRepo: (seed: SeedData, now: () => Date) => Promise<Repository>)`. Keep seed-only tests (determinism, uniqueness, realism) in `tests/repository.test.ts`, which also calls the contract with the memory factory. Change the `npm test` glob only if the contract file would otherwise run on its own with no factory (name it so it does not match `tests/*.test.ts`).
- **Done when:** `npm test` passes with the same number of tests as the T0.1 baseline.
- **Don't:** change assertions. This is a pure move.

### T1.2 Make the seed and schema agree
- **Model:** sonnet · **Depends:** T0.1 · **Parallel:** with T1.1
- **Touch:** `src/data/seed.ts`, `tests/repository.test.ts`, `docs/DECISIONS.md`.
- **Do:**
  1. Generate seed application ids as deterministic UUID-format strings from the seeded RNG (`mulberry32`), formatted as v4 (version and variant bits set). No new dependency.
  2. Add `isUuid(id)` in `src/lib/` and use it at the top of `getApplicationStatus` in `memory.ts` (return `null` if not a UUID), so both repositories share the behavior.
  3. Write D11 in `DECISIONS.md` as **proposed**: "Postgres keeps one `students` row per lower-cased email; a later application updates the profile (latest wins). Each application still shows the profile as it is now, not as it was when submitted." Alternative to list: snapshot school, program and year on `applications`. Mark it pending G4.
- **Done when:** a test asserts every seed application id matches the UUID regex and that determinism still holds; `npm test` passes; e2e does not reference `seed-app-` ids (it does not today).

### T1.3 Database client
- **Model:** sonnet · **Depends:** G2, T0.1
- **Touch:** `package.json` (add `postgres`, dev `@electric-sql/pglite`), new `src/db/client.ts`, `.env.example`.
- **Do:** `getDb()` returns a Drizzle instance over `postgres(DATABASE_URL, { prepare: false, max: 1 })`, cached on `globalThis` like `src/data/index.ts` does. Export the Drizzle database type so the repository can also accept a PGlite-backed instance (`drizzle-orm/pglite`). Use `import "server-only"` if the package is already resolvable; otherwise skip it (no new dependency).
- **Done when:** `npm run typecheck` passes; a short unit test builds a PGlite instance, applies `drizzle/0000_init.sql`, and runs `select 1`.

### T1.4a PostgresRepository: public reads
- **Model:** sonnet · **Depends:** T1.1, T1.2, T1.3
- **Read:** `src/data/memory.ts` (the reference behavior), `src/lib/rules.ts`, `src/db/schema.ts`, `src/data/types.ts`.
- **Touch:** new `src/data/postgres.ts`.
- **Do:** `createPostgresRepository(db, now = () => new Date()): Repository`. Implement `listIndustries`, `listSkillTags`, `listProjects`, `getProject`, `listInstructors`, `getInstructor`, `getApplyContext`. Every other method throws `new Error("not implemented")` for now.
  - Seat counts: one grouped query, `count(*) filter (where status in SEAT_STATUSES)` per cohort. Import `SEAT_STATUSES` from `rules.ts`; do not retype the list.
  - Cohort status: `deriveCohortStatus()` in TypeScript.
  - `listProjects`: SQL filters for industry, tag and text (`ilike` per term, all terms must match, same fields as the memory haystack), then fetch those projects' cohorts with seat counts, derive status, apply `openOnly`, sort exactly like memory, paginate in TypeScript, hydrate only the page. Leave a `ponytail:` comment naming the ceiling (whole filtered set in memory; fine below about 10,000 projects).
  - **Never select `cohorts.zoom_link` here.** Name columns explicitly; no `select *`.
- **Done when:** the contract suite's catalog tests pass against PGlite (temporary runner is fine; T1.6 makes it permanent).

### T1.4b PostgresRepository: applications and admin
- **Model:** opus · **Depends:** T1.4a, G4
- **Touch:** `src/data/postgres.ts`.
- **Do:**
  - `createApplication`: in one transaction, lock the cohort row (`for update`), derive status, refuse if not `open`, upsert the student per D11, insert the application with `submittedAt: now()`. Catch unique violation `23505` on `applications_cohort_student_uq` and return `{ ok: false, code: "duplicate" }` with the same message as memory. Lower-case and trim email exactly as memory does.
  - `updateApplicationStatus`: one transaction; `select ... for update` on the cohort; count seats; `resolveStatusChange()`; update. Two admins accepting the last seat at once must produce one `accepted` and one `waitlisted`.
  - `getApplicationStatus`: `isUuid` guard, then query. No email in the result.
  - `listApplications`: `limit/offset` in SQL, `count(*)` for total, sort `submitted_at desc`, search with `ilike` over name, email, school and project title. Clamp `page` like memory's `paginate`.
  - `exportApplications`, `getAdminStats`, `listCohortRows`: match memory's output and sort order.
- **Done when:** the full contract suite passes against PGlite; `npm run typecheck` passes.
- **Don't:** reimplement capacity logic. If a rule seems to need SQL, stop and report.

### T1.5 Seed loader
- **Model:** sonnet · **Depends:** T1.2, T1.3 · **Parallel:** with T1.4a
- **Touch:** new `src/db/load-seed.ts`, new `scripts/seed-db.ts`, `package.json` (`"db:seed": "tsx scripts/seed-db.ts"`).
- **Do:** `loadSeed(db, seed)` inserts organizations, tags, instructors, projects, project_tags, cohorts, students, applications in dependency order, in batches of 500, in one transaction. The script refuses to run unless the database is empty or `--reset` is passed, and refuses `--reset` when `NODE_ENV=production` unless `--yes-really` is also passed. Reads `SEED_COUNT`.
- **Done when:** a test loads a 120-project seed into PGlite and row counts match the `SeedData` arrays.
- **Note for the docs:** reseeding is how the demo scenario comes back once dates age out (finding 5).

### T1.6 Run the contract against Postgres in CI
- **Model:** sonnet · **Depends:** T1.4b, T1.5
- **Touch:** new `tests/repository.postgres.test.ts`.
- **Do:** for each run, create PGlite, apply every file in `drizzle/` in journal order, `loadSeed`, then `runRepositoryContract("postgres", ...)`. Add one concurrency test, skipped unless `TEST_DATABASE_URL` is set: fire two `updateApplicationStatus(..., "accepted")` calls at a one-seat cohort with `Promise.all` and assert exactly one `accepted`.
- **Done when:** `npm test` runs both contracts and passes; total runtime still under about 10 seconds (report the number).

### T1.7 Switch storage on DATABASE_URL
- **Model:** haiku · **Depends:** T1.6
- **Touch:** `src/data/index.ts`.
- **Do:** if `DATABASE_URL` is set, return `createPostgresRepository(getDb())`; otherwise the memory repository as today. E2E keeps running on memory (the Playwright config does not set `DATABASE_URL`).
- **Done when:** `npm run check` passes; `npm run build` with `DATABASE_URL` unset still works with no database present.

### T1.8 Deploy and prove persistence
- **Owner:** Anuvik, with an agent for the commands · **Depends:** T1.7, G3
- Create the database, put the **pooled** URL in Vercel and `.env.local`, `npm run db:migrate`, `npm run db:seed`, deploy. Submit an application, redeploy, confirm it is still there and visible from `/admin`.
- **Done when:** the application survives a redeploy. This is the Phase 1 exit criterion in `ROADMAP.md`.

### T1.9 Docs and review
- **Model:** haiku · **Depends:** T1.8
- Run `privacy-reviewer` on the Phase 1 diff and fix findings. Update `README.md` (env table, `db:seed`, demo caveat), `CLAUDE.md` (Known limitations: in-memory no longer applies when `DATABASE_URL` is set), `ARCHITECTURE.md` (diagram), `ROADMAP.md` (Phase 1 done).

---

## Phase 2: Real authentication and roles (M), blocked by G1 (Q2, Q4) and G5

Re-plan this phase once Q2 and Q4 are answered. Shape assuming "no student accounts, admin plus instructor roles":

| Task | Model | Depends | What | Done when |
|---|---|---|---|---|
| T2.1 Session abstraction | opus | Phase 1 | `getSession(): Promise<{ role: "admin" \| "instructor"; instructorId?: string } \| null>`. Re-implement `isAdmin()` and `requireAdmin()` on it, still backed by the shared password. Add `requireInstructor()`. **Keep `cookies()` as the first await** (CLAUDE.md rule 3). Pure refactor | All e2e pass; build route table shows admin routes `ƒ` |
| T2.2 Provider | opus | T2.1, G5 | Magic-link sign-in (Supabase Auth if G3 chose Supabase). Map the provider user id through `admin_users` | Sign in as a seeded admin works locally |
| T2.3 Bootstrap admin | sonnet | T2.2 | `scripts/grant-role.ts <email> admin\|instructor [instructorId]` | Test covers both roles |
| T2.4 Remove the password path | sonnet | T2.3 | Delete `ADMIN_PASSWORD` code, env docs and the login form. Keep the forged-cookie e2e test, rewritten for the new session | `grep -r ADMIN_PASSWORD src` is empty; new e2e: an instructor gets redirected from `/admin` |

E2E needs a test-only sign-in path that is impossible to enable in production (for example, compiled out unless `NODE_ENV=test` and `E2E_AUTH=1`). Design this in T2.1, not later.

---

## Phase 3: Admin CRUD (L), blocked by G1 (Q1)

| Task | Model | Depends | What | Done when |
|---|---|---|---|---|
| T3.1 Write contract | opus | Phase 1 | Add `createProject`, `updateProject`, `setProjectStatus`, `upsertInstructor`, `upsertCohort`, `upsertTag` to `Repository`. Zod schemas in `src/lib/validation.ts`: slug format and uniqueness, `start < end`, `deadline <= start`, `min <= max`, and lowering `max` below seats already taken is refused (put that last rule in `rules.ts`). Contract tests first | Contract tests written and failing for the right reason |
| T3.2 Memory implementation | sonnet | T3.1 | Implement, and keep the precomputed indexes correct (finding 9) | Contract passes on memory |
| T3.3 Postgres implementation | sonnet | T3.1 | Implement; map unique violations to typed errors | Contract passes on PGlite. **Parallel with T3.2** |
| T3.4 Project editor UI | sonnet | T3.2 | `/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]`: draft, publish, archive. `requireAdmin()` first in every page and action | E2E: create, publish, visible in catalog |
| T3.5 Cohort editor UI | sonnet | T3.2 | Create and edit cohorts under a project; shows seats taken | E2E: cannot shrink below seats taken. **Parallel with T3.4** |
| T3.6 Instructors, organizations, tags UI | sonnet | T3.2 | Simple list and edit pages | E2E for one create path. **Parallel with T3.4** |
| T3.7 Image upload | deferred | G1 (Q10) | Needs object storage and a decision on hosting. Do not start without approval | |

---

## Phase 4: Instructor portal (M), blocked by Phase 2 and Q4

| Task | Model | Depends | What | Done when |
|---|---|---|---|---|
| T4.1 Scoped repository calls | opus | Phase 2 | Add a required `scope: { instructorId } \| "all"` to the admin application and cohort methods. The repository enforces it in the query and in `updateApplicationStatus`, so a forged id in a form cannot cross scopes | Contract test: instructor A's scope cannot read or update B's application |
| T4.2 `/instructor` pages | sonnet | T4.1 | Cohorts, applicants, accept, waitlist, reject, roster. `requireInstructor()` first; scope always comes from the session, never from the form | Pages render for a seeded instructor |
| T4.3 Cross-instructor e2e | sonnet | T4.2 | Direct POST to the instructor action with B's application id while signed in as A | Refused, and B's application is unchanged |

---

## Phase 5: Email and files (M)

| Task | Model | Depends | What | Done when |
|---|---|---|---|---|
| T5.1 Mailer seam | sonnet | Phase 1 | `Mailer` interface plus a console implementation used in dev and tests. Send after a successful `createApplication` and after status changes, using Next's `after()` (check the Next 16 docs) so a mail failure never fails the request. Log failures with the application id, never the email or statement | Unit test: the console mailer is called once per application; a throwing mailer does not break apply |
| T5.2 Resend | sonnet | T5.1, G6 | Production implementation chosen by env var | Manual send to a test inbox |
| T5.3 Resume upload | deferred | G1 (Q3, Q10) | Private bucket, type and size checked on the server, signed URLs only for admins | |

---

## Phase 6: Hardening (M to L)

Mostly independent; run in parallel after Phase 1.

| Task | Model | What | Done when |
|---|---|---|---|
| T6.1 Rate limiting | opus | Apply and login. Fixed-window counter in a Postgres table keyed by a hashed IP, so no new dependency. Memory mode uses a `Map` | E2E: the 6th login attempt in a minute is refused |
| T6.2 Audit log | sonnet | `status_changes` table written in the same transaction as `updateApplicationStatus` (who, from, to, when). Admin view per application | Contract test: every status change writes one row |
| T6.3 Accessibility | sonnet | Keyboard path through catalog, apply and admin bulk update; labels; contrast of the CSS tokens; `prefers-reduced-motion` | An axe check in e2e reports no serious violations on the 4 main pages |
| T6.4 Enforced CSP | opus | Move T0.3's report-only CSP to enforced, with nonces through `proxy.ts` (check the Next 16 docs) | No CSP violations in the browser console across e2e |
| T6.5 Retention and deletion | opus | Blocked by Q10. Delete a student and their applications; scheduled purge after the retention period | Per Q10's rules |
| T6.6 Load test | sonnet | 1,000 projects and 15,000 applications in Postgres; measure p95 of `/projects` with filters and `/admin/applications` | Numbers recorded in `ARCHITECTURE.md`; add indexes only where the measurement says so |
| T6.7 Monitoring and backups | Anuvik | Error monitoring, a restore drill from the provider's backup | Drill done once and written down |

---

## Critical path

```
T0.1 ─┬─ T0.3
      ├─ T1.1 ─┐
      └─ T1.2 ─┼─ T1.3 (G2) ─┬─ T1.4a ─ T1.4b (G4) ─┐
               │             └─ T1.5 ───────────────┼─ T1.6 ─ T1.7 ─ T1.8 (G3) ─ T1.9
T0.2 ── (wait for Ben) ── Phase 2 ── Phase 4
                      └── Phase 3
Phase 5 and 6 can start any time after T1.9.
```

Phase 1 is roughly 8 agent tasks, all unblocked except by G2 and G4, which are yours to answer today. Everything after it waits on Ben, so send T0.2 first.
