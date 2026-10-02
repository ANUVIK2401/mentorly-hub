# Project Hub

A catalog and application tracker for instructor-led projects. Students browse projects and apply to a cohort. An admin reviews applications and exports them to Excel. Teaching happens on Zoom, outside the app.

This is a **reference build**: it runs on synthetic data with zero setup, deploys free on Vercel, and is structured to be built on top of with Claude Code.

> **Heads up before you demo it.** Applications you submit are held in server memory. On Vercel they can disappear when the instance recycles, so run the whole demo in one sitting. The seeded data always comes back identical. Real persistence is Roadmap Phase 1 and the schema for it is already here.

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
| Persistent database | Schema and migration ready, **not wired in** |
| Real auth, instructor logins, project editing in the UI, email, resume upload | Not built (see `docs/ROADMAP.md`) |

Verified: lint, typecheck, 34 unit tests, production build, 9 browser tests (Playwright). `npm run check` runs all of it.

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

## Deploy free on Vercel

I verified the production build and `next start` locally. **I could not deploy to Vercel from my environment**, so these steps are untested end to end. They are the standard flow for a Next.js app.

**From GitHub (recommended)**
1. Push this folder to a new GitHub repository.
2. On vercel.com choose **Add New, Project**, import the repo. The Next.js preset is detected. Leave build settings alone.
3. Before deploying, add environment variables:
   - `ADMIN_PASSWORD`: choose a strong password. **Required.** Without it `/admin` is disabled in production by design.
   - `SESSION_SECRET`: output of `openssl rand -hex 32`. Recommended.
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
| `DATABASE_URL` | Phase 1 | Not used yet |

See `.env.example`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run check` | Lint, typecheck, unit tests, build, browser tests |
| `npm test` | Unit tests only (about a second) |
| `npm run test:e2e` | Browser tests against a production build |
| `npm run db:generate` | Regenerate SQL from `src/db/schema.ts` (no database needed) |

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

- **In-memory applications** (above). Do not store real student data.
- **One shared admin password.** Fine for a demo, not for real data.
- No emails, no resume upload, no instructor logins, no project editing UI.
- No rate limiting on the apply form, only a honeypot field.
- All people, organizations and projects are fictional. Do not present them as real.

## Docs

`docs/PRD.md` (what and why) · `docs/ARCHITECTURE.md` (how) · `docs/DATA_MODEL.md` · `docs/DECISIONS.md` (**questions for Ben**) · `docs/ROADMAP.md` (what next).
