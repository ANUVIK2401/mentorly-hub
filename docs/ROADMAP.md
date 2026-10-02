# Roadmap

Sizes are rough: **S** about 4 hours or less, **M** about 5 to 10, **L** about 10 to 20. Work is shared with Paxon, which is the priority, so expect calendar time to stretch.

Start any phase in Claude Code with `/phase <n>`. It reads these docs, stops if a blocking question is unanswered, and plans before building.

## Phase 0: Reference build (done)

Catalog, filters, search, grid and list, pagination, project and instructor pages, apply flow with validation, status link, admin review with bulk status and waitlist rule, cohort capacity view, Excel export, shared-password admin, synthetic seed up to 1,152 projects, Postgres schema and migration, 34 unit tests, 9 browser tests.

## Phase 1: Real persistence (M) **do this before showing anyone real data**

**Why:** on Vercel the in-memory store can lose applications when an instance recycles and may not share them across instances.

**Needs:** Q10 (privacy) answered if any real student data will be stored. Q11 for hosting budget.

**Tasks**
1. Create a free Postgres (Supabase or Neon). Put `DATABASE_URL` in Vercel and `.env.local`.
2. Apply `/drizzle/0000_init.sql` (`npm run db:migrate`). Use the **pooled** connection string on serverless.
3. Implement `PostgresRepository` against `src/db/schema.ts`, return it from `src/data/index.ts` when `DATABASE_URL` is set. Keep the memory repository for tests and quick demos.
4. Write a seed loader that inserts `generateSeed()` output into Postgres.
5. Turn `tests/repository.test.ts` into a contract suite run against both repositories (PGlite works for the Postgres one in CI without a server).
6. Capacity changes must be transactional: lock the cohort row while counting seats and updating status so two admins cannot over-accept.

**Done when:** submit an application on the deployed site, redeploy, and it is still there; `npm run check` passes against both repositories.

**Starter prompt:** `/phase 1` then "Use Supabase. Pooled connection string is in .env.local as DATABASE_URL."

## Phase 2: Real authentication and roles (M)

**Needs:** Q2 (student accounts?) and Q4 (who reviews?).

**Tasks:** replace the shared password with Supabase Auth or Auth.js; populate `admin_users`; add roles (admin, instructor); optional student accounts and `/account/applications`; keep `requireAdmin()` as the single enforcement point, now role-aware; remove the shared-password path.

**Done when:** no code path depends on `ADMIN_PASSWORD`; the forged-cookie e2e test still passes; an instructor account cannot reach `/admin`.

## Phase 3: Admin CRUD (L)

**Needs:** Q1 (who creates projects).

**Tasks:** create, edit, archive projects, instructors, cohorts, tags in the admin UI; zod validation shared with the repository; slug uniqueness; draft and publish; logo and photo upload (object storage, size and type limits).

**Done when:** Ben can add a project and a cohort without touching code, and it appears in the public catalog.

## Phase 4: Instructor portal (M)

**Needs:** Q4.

**Tasks:** `/instructor` showing only the instructor's own cohorts and applicants; accept, waitlist and reject limited to their own cohorts (authorize by `instructor_id`, never by a form field); roster view.

**Done when:** an e2e test proves instructor A cannot see or change instructor B's applicants, including by direct POST.

## Phase 5: Email and files (M)

**Tasks:** confirmation and status-change emails (Resend); resume upload with type and size limits and private storage; unsubscribe and bounce handling basics.

**Done when:** applying sends a confirmation; a rejected upload type is refused server-side.

## Phase 6: Hardening and scale (M to L)

**Tasks:** rate limiting on apply and login; audit log of status changes; caching for the public catalog (profile first); accessibility pass (keyboard, screen reader, contrast); analytics; backups and a restore drill; privacy policy, retention and deletion tooling per Q10; error monitoring; load test at 1,000 projects and 15,000 applications.

**Done when:** a written checklist in `docs/` is green and Q10's rules are implemented.

## Parking lot

Certificates (Q7), payments (Q6), a video-oriented platform (a separate idea from the meeting), project-based "workspaces", multi-language, public API.
