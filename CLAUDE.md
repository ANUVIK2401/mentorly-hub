@AGENTS.md

# Project Hub

A catalog and application tracker for instructor-led projects: students browse projects, apply to a cohort, and an admin reviews applications and exports them to Excel. **Not an LMS.** Teaching happens on Zoom, outside this app.

This repo is a **reference build** for Prof. Ben Lee's education-platform idea. It runs today on synthetic data and in-memory storage so it can be deployed free on Vercel with zero setup. It is designed to be built on top of.

## Read first
- `docs/PRD.md`: what we are building and why (each requirement says who asked for it)
- `docs/ARCHITECTURE.md`: how it fits together
- `docs/ROADMAP.md`: what to build next, in order, with a starter prompt per phase
- `docs/DECISIONS.md`: open questions for Ben and decisions already made. **Check here before guessing at product behavior.**

## Commands
```
npm run dev          # http://localhost:3000, admin password in dev is "admin"
npm run check        # everything below, in CI order. Run before saying a task is done.
npm run lint
npm run typecheck
npm test             # unit tests (tsx --test), ~1s
npm run build        # production build
npm run test:e2e     # Playwright against `next start`; needs a build first
npm run db:generate  # regenerate SQL from src/db/schema.ts (no database needed)
```
- First time on a machine: `npx playwright install chromium`. In sandboxes with a preinstalled browser: `CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.
- `SEED_COUNT=1000 npm run dev` loads 1,000 projects (max 1,152 unique). Default is 240.

## Architecture in six lines
1. `src/app/**` pages are **server components**; filters and pagination live in the URL (no client state).
2. Pages, actions and route handlers call **`getRepo()`** (`src/data/index.ts`), never a database directly.
3. `Repository` (`src/data/repository.ts`) is the storage seam. Today: `src/data/memory.ts` over a deterministic seed (`src/data/seed.ts`).
4. Business rules are pure functions in `src/lib/rules.ts`. **Capacity and cohort status logic lives only there.**
5. Public pages receive DTOs (`ProjectCard`, `CohortView`...) that cannot contain student PII or Zoom links.
6. `src/db/schema.ts` + `/drizzle` are the Postgres version of the model, verified but **not wired in yet**.

## Rules (and why)
1. **Never put student PII or `zoomLink` in a public DTO, page or log.** Public data goes through the DTO types in `src/data/types.ts`. Applicant data exists only in `AdminApplicationRow` and admin code paths.
2. **Call `requireAdmin()` at the top of every admin page, server action and route handler.** Server Actions are reachable by direct POST. `proxy.ts` and layouts are not security.
3. **Do not reorder `isAdmin()` in `src/lib/auth.ts`.** It reads `cookies()` first on purpose, which keeps admin routes dynamic. Without it a build with no `ADMIN_PASSWORD` prerenders admin pages as static redirects. (This was found in a real build, check the route table says `ƒ`.)
4. **Cohort status is derived, never stored.** Use `deriveCohortStatus()`. Capacity changes go through `resolveStatusChange()`. Do not re-implement either.
5. **Validate on the server.** Client checks are a courtesy. Forms use zod (`src/lib/validation.ts`) inside the Server Action.
6. **Paginate every list.** Assume 1,000+ projects and 15,000+ applications.
7. **Seed data is synthetic and must stay so.** Do not copy content, names or logos from other sites. Fictional organizations only.
8. **Do not add dependencies without asking.** The stack is deliberately small.
9. **Schema, types and validation move together.** Changing a field means `src/data/types.ts`, `src/db/schema.ts` (then `npm run db:generate`), `src/lib/validation.ts`, the form, `src/lib/export.ts`, and tests. `tests/schema.test.ts` catches enum drift. Use `/add-field`.

## Next.js 16 specifics (verified in this repo, see AGENTS.md)
- `params` and `searchParams` are **Promises**. Always `await` them. Type them as `Promise<...>`.
- `middleware.ts` is now **`proxy.ts`** (`export function proxy`).
- `cookies()` is **async**.
- A file with `"use server"` may export **only async functions**. Put shared constants and types elsewhere (see `src/lib/apply-state.ts`).
- Read `node_modules/next/dist/docs/` before using an API you are unsure about. Do not trust memory of older versions.

## Where to change things
| I want to... | Edit |
|---|---|
| Change app fields collected from students | `/add-field`, then `docs/DECISIONS.md` Q3 |
| Change Excel columns | `APPLICATION_COLUMNS` in `src/lib/export.ts` only |
| Change colors, fonts | CSS variables in `src/app/globals.css` |
| Add an industry, subject or skill to the seed | `src/data/seed-content.ts` |
| Change what appears on a card | `src/components/project-card.tsx` |
| Add a catalog filter | `src/lib/query.ts` (URL state), `ProjectQuery` in types, `listProjects` in `memory.ts`, the form in `src/app/projects/page.tsx` |
| Add an admin page | New folder under `src/app/admin/(panel)/`, call `requireAdmin()` first |
| Replace in-memory storage | Implement `Repository`, return it from `src/data/index.ts`. See ROADMAP Phase 1. |

## Definition of done
`npm run check` passes (lint, typecheck, unit, build, e2e). The build's route table shows admin routes as `ƒ`. New behavior has a test. If you changed UI, you looked at it (screenshot), including a phone-width viewport.

## Known limitations (do not paper over these)
- **Applications are stored in server memory.** On Vercel they can vanish when an instance recycles and may not be visible across instances. Seeded data is unaffected. Fixing this is ROADMAP Phase 1.
- Admin uses one shared password. Not suitable for real student data.
- No email sending, no resume upload, no instructor login, no project/instructor CRUD yet.
- No rate limiting on the apply form (a honeypot field only).
