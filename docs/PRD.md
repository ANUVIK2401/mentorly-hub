# Product requirements

Working name: **Mentorly Hub** (was Project Hub). Product owner: Prof. Ben Lee. Builder: Anuvik Thota.

## One-sentence mental model

A **catalog plus an applications database**: instructors each run a project, students browse and apply, and the owner reviews and exports everything. Teaching happens on Zoom, outside the platform.

## Context

- Discussed in the Sept 23, 2026 meeting (notes in `Pacsun_discussion_prof.txt`). It is **separate from the Paxon assistant**.
- Purpose is twofold: explore a lightweight alternative to a traditional LMS, and serve as a product-requirements and software-management exercise.
- **Paxon is the priority.** This is not urgent. Progress is expected before the end of the year, not within two weeks. Up to 10 hours per week in total, shared with Paxon.
- Ben sent a nonprofit's public project hub as the reference (a catalog with industry filters, project cards and an apply flow).

## Requirements

Source column: **Ben** = stated in the meeting. **Ref** = observed on the reference site. **Builder** = my addition, easy to remove.

| # | Requirement | Source | Status |
|---|---|---|---|
| R1 | Catalog pages that showcase projects and instructors, with summary, tags, learning goals and application info | Ben | Built |
| R2 | Not full course delivery. Classes run on Zoom | Ben | By design |
| R3 | Track student applications and enrollment information in a retrievable database | Ben | Built. Postgres when `DATABASE_URL` is set (deploy and verify: plan T1.8) |
| R4 | Export that data to Excel | Ben | Built |
| R5 | Support multiple instructors, each leading a project | Ben | Built |
| R6 | About 5 to 15 students per project | Ben | Built as cohort capacity (min 5, max up to 15) |
| R7 | Industry or discipline tags | Ben | Built (8 industries, shared skill tags) |
| R8 | Scale from 200+ active projects toward about 1,000 | Ben | Seed supports 1,152. Verified at 1,000 |
| R9 | Industry chips, result count, open-applications toggle, grid and list views | Ref | Built |
| R10 | Project cards: instructor, organization, role, title, skill tags with "+N more", application status | Ref | Built |
| R11 | Browse by text search and skill filter | Builder | Built |
| R12 | Applications are per **cohort** (a project run at a specific time with a seat limit) | Builder (inferred from slugs like `-1-1-1` on the reference) | Built. Confirm with Ben (Q5) |
| R13 | Student can check their application status without an account | Builder | Built as an unguessable link |
| R14 | Admin reviews applications, changes status in bulk, sees capacity | Builder (implied by R3, R4) | Built |
| R15 | Accepting into a full cohort waitlists instead of over-enrolling | Ben (5 to 15 per project) | Built and tested |
| R16 | Instructors can see their own applicants | Builder | Not built. Phase 4 |
| R17 | Admin can create and edit projects, instructors, tags and cohorts in the UI | Builder | Built for projects, cohorts and instructors (tags and organizations are created by name inside those forms). Image upload not built |
| R18 | Confirmation and status emails | Builder | Confirmation email built behind a seam that only logs. No provider, no status-change emails |

## Out of scope for now

Course delivery, video, grading, payments, certificates, messaging, a native app. A video-oriented platform was mentioned in the meeting as a **separate future idea**.

## Users

| Role | Can |
|---|---|
| Visitor / student | Browse, filter, search, read a project, apply, view own status via link |
| Admin (Ben) | Everything: review, change status, see capacity, export |
| Instructor | Phase 4: see and manage applicants for their own cohorts only |

## Acceptance criteria for the demo (what "works" means)

1. Browsing 240 projects (and 1,000 with `SEED_COUNT=1000`) feels instant, on a phone too.
2. A student can apply once per cohort. A duplicate email, a full cohort and a closed deadline are all refused with a clear message.
3. Admin can find an application, accept it, and download an Excel file containing it.
4. Accepting more students than seats waitlists the extras.
5. Anonymous visitors cannot reach any admin page or the export, and public pages never show student email or Zoom links.

All five are covered by automated tests (`npm run check`).

## Open product questions

See `DECISIONS.md`. The ones that change the build most: who can create projects (Q1), whether students need accounts (Q2), the exact application fields (Q3), and the exact Excel columns (Q9).
