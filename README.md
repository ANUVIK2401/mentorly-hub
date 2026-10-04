# Mentorly Hub

A catalog and application tracker for instructor-led projects. Students browse projects and apply to a cohort. An admin reviews applications and exports them to Excel. Teaching happens on Zoom, outside the app.

This is a **reference build**: it runs on synthetic data with zero setup, deploys free on Vercel, and is structured to be built on top of with Claude Code.

> **Storage.** The live demo runs on Supabase Postgres, so applications persist. With no database URL (`DATABASE_URL` or `POSTGRES_URL`), applications are held in server memory and can disappear when a Vercel instance recycles.

## What works today

| Area | Status |
|---|---|
| Catalog: industry chips, search, skill filter, open-only toggle, grid/list, pagination | Done |
| Project and instructor pages, cohorts with seats left | Done |
| Apply form with server-side validation, one application per student per cohort | Done |
| Student status page (private link, no account) | Done |
| Admin: review table, bulk status change, **waitlist when a cohort is full**, capacity view | Done |
| **Excel export** (applications plus cohort capacity), respects filters | Done |
| 1,000+ project scale | Verified (seed supports up to 1,152) |
| **Postgres persistence** (Drizzle), same behavior as the in-memory repository, proven by one shared test suite | Done, switches on `DATABASE_URL` |
| **Admin editing**: projects (draft, publish, archive), cohorts (capacity can never drop below seats taken), instructors | Done |
| Application detail page with an audit trail of status changes | Done |
| Confirmation email seam (logs only until a provider is approved), rate limiting on apply and login, enforced nonce CSP and security headers | Done |
| Real auth and roles, instructor portal, status-change emails, resume upload, image upload | Not built (see `docs/ROADMAP.md` and `docs/IMPLEMENTATION_PLAN.md`) |

Verified: lint, typecheck, 74 unit tests (the repository contract runs against memory and Postgres via PGlite), production build, 18 browser tests (Playwright). `npm run check` runs all of it.

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

Admin is at `/admin`. In development the password is `admin`.

More data: `SEED_COUNT=1000 npm run dev`. Tests: `npm run check` (first time: `npx playwright install chromium`).

## Five-minute demo script

1. **Catalog** (`/projects`). Note the live count, then click **Finance**, search `credit`, tick **Open applications only**, switch to **List**. Open it on a phone: it reflows.
2. **Project page.** Open the first project on the unfiltered catalog ("Build a Discounted Cash Flow Valuation of a Regional Retailer"). The cohort card says **10 seats total, 1 left**.
3. **Apply** with made-up details. Try submitting empty first to show validation. You land on a private status page. Applying again with the same email is refused.
4. **Admin** (`/admin`). Open **Applications**, then filter to this cohort: `/admin/applications?cohort=coh-prj-1-1&status=submitted`. You will see your application plus four seeded ones. Select all, set **Accepted**, click **Apply to selected**. The notice says one was accepted and the rest **became waitlist entries because the cohort is full**.
5. **Cohorts** (`/admin/cohorts?status=full`). The cohort is now full. The public project page no longer offers **Apply**.
6. **Export.** On the Applications page click **Export these to Excel**, or use **Export to Excel** in the nav for everything. Open the file: two sheets, filters on, header frozen.
7. **Scale.** Mention that `SEED_COUNT=1000` loads 1,000 projects with no slowdown.

Then show Ben `docs/DECISIONS.md` and ask the open questions. Q3 (application fields) and Q9 (Excel columns) change the build the most.

## Database

```bash
vercel env pull .env.local         # the Vercel Supabase integration's POSTGRES_URL* variables
npm run db:migrate                # applies /drizzle (uses POSTGRES_URL_NON_POOLING, or DATABASE_URL)
npm run db:seed                   # loads the synthetic catalog (SEED_COUNT, default 240)
```

The seed's cohort dates are relative to the day you seed. Re-run `npm run db:seed -- --reset --yes-really` whenever the demo's cohorts have aged out. **`--reset` deletes all data in that database**, including real applications, so it always requires `--yes-really`. Without a database URL the app runs on memory and needs none of this. Both scripts read `.env.local` (Node 22.9+); `DATABASE_URL` overrides the integration's variables.

**Supabase setup used by the demo:** `vercel integration add supabase` (connected to Production and Development, not Preview). It creates `POSTGRES_URL` (pooled, port 6543) and `POSTGRES_URL_NON_POOLING`, never `DATABASE_URL`; the app accepts either (`src/db/url.ts`). Migration `0004` enables row level security on every table, because Supabase serves `public` tables through its REST API to anyone holding the public anon key. `tests/db.test.ts` fails if a new table misses it.

**Careful:** after `vercel env pull`, `npm run dev` on your machine reads and writes the demo database. The e2e suite is pinned to memory regardless.

`TEST_DATABASE_URL=postgres://... npm test` additionally runs a concurrency test against a real server (it wipes that database).

## Deploy free on Vercel

Deployed and smoke-tested at https://mentorly-hub.vercel.app (GitHub integration: every push to `main` deploys to production, other branches get preview URLs).

**From GitHub (recommended)**
1. Push this folder to a new GitHub repository.
2. On vercel.com choose **Add New, Project**, import the repo. The Next.js preset is detected. Leave build settings alone.
3. Before deploying, add environment variables:
   - `ADMIN_PASSWORD`: choose a strong password. **Required.** Without it `/admin` is disabled in production by design.
   - `SESSION_SECRET`: output of `openssl rand -hex 32`. Recommended.
   - `DATABASE_URL`: your **pooled** Postgres connection string (Supabase Transaction pooler, port 6543), for persistence. Run `npm run db:migrate && npm run db:seed` against it once, from your machine (see "Database").
   - `SITE_URL`: your public origin, used in email links (optional on Vercel).
   - `SEED_COUNT`: optional, `1000` to show scale.
4. Deploy. Open `/projects`, then `/admin/login`.

**From the CLI**
```bash
npx vercel                                   # link the project, first run asks questions
npx vercel env add ADMIN_PASSWORD production
npx vercel env add SESSION_SECRET production
npx vercel --prod
```

**Free-tier notes.** Vercel's Hobby plan is meant for personal, non-commercial use. Check its current terms if this becomes a real product. A database (Phase 1) adds its own free tier and limits.

**After changing env vars, redeploy.** They are read at runtime, but a redeploy also gives you a fresh in-memory state.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | In production | Enables `/admin`. No default exists in production |
| `SESSION_SECRET` | Recommended | Signs the admin cookie. Falls back to `ADMIN_PASSWORD` |
| `SEED_COUNT` | No | Synthetic projects, 1 to 1152. Default 240 |
| `DATABASE_URL` | For persistence | Postgres connection string. Falls back to `POSTGRES_URL` (set by the Vercel Supabase integration). Neither set means in-memory demo data |
| `SITE_URL` | No | Public origin for links in emails |
| `MAIL_DEBUG` | No | Local only: print outgoing emails to the console |

See `.env.example`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run check` | Lint, typecheck, unit tests, build, browser tests |
| `npm test` | Unit tests only (about a second) |
| `npm run test:e2e` | Browser tests against a production build |
| `npm run db:generate` | Regenerate SQL from `src/db/schema.ts` (no database needed) |
| `npm run db:migrate` / `db:seed` | Apply migrations / load the synthetic catalog (needs `DATABASE_URL`) |
| `npm run bench` | Time the hot queries at 1,000 projects and about 11,900 applications |

## Building on it with Claude Code

Open this folder in Claude Code. `CLAUDE.md` loads automatically and holds the rules, commands and a "where do I change X" table. Included:

| | |
|---|---|
| `/phase <n>` | Plans and builds a roadmap phase, stopping if a product question is unanswered |
| `/add-field` | Adds an application field across types, schema, validation, form, export and tests |
| `/check` | Runs the full gate and fixes root causes, not tests |
| `privacy-reviewer` agent | Reviews a diff for student-data leaks and missing admin checks. Run it after touching pages, actions or DTOs |

Suggested first session: `/phase 1`, plan mode, approve, build.

## Layout

```
CLAUDE.md  AGENTS.md  README.md
docs/        PRD, ARCHITECTURE, DATA_MODEL, DECISIONS (open questions), ROADMAP
.claude/     settings, slash commands, privacy-reviewer agent
drizzle/     generated SQL migration
src/
  app/       routes (server components, server actions, route handlers)
  components/  cards, badges, pagination
  data/      types, Repository interface, in-memory implementation, seed
  db/        Postgres schema (not wired in yet)
  lib/       rules (capacity), auth, validation, export, query, format
  proxy.ts   optimistic admin redirect
tests/       unit tests and Playwright e2e
```

## Limitations

- **Without a database URL, applications live in memory** and can vanish. With one (the live demo has Supabase), they persist.
- **One shared admin password.** Fine for a demo, not for real data (Phase 2).
- No instructor logins, no resume or image upload, no status-change emails. The confirmation email only logs until a provider is chosen.
- Rate limits are per server instance (in memory), so on Vercel the effective limit is higher than configured.
- Do not store real student data until `docs/DECISIONS.md` Q10 (privacy) is answered.
- All people, organizations and projects are fictional. Do not present them as real.

## Docs

`docs/PRD.md` (what and why) · `docs/ARCHITECTURE.md` (how) · `docs/DATA_MODEL.md` · `docs/DECISIONS.md` (**questions for Ben**) · `docs/ROADMAP.md` (what next) · `docs/IMPLEMENTATION_PLAN.md` (task-level plan and status).
