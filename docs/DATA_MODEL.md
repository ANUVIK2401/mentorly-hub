# Data model

Source of truth in code: `src/data/types.ts` (app) and `src/db/schema.ts` (Postgres). `tests/schema.test.ts` keeps their enums in sync. The generated SQL is in `/drizzle`.

```
Organization 1 ──< Instructor 1 ──< Project >── industry Tag
                         └───────────────┘ │
                                           ├──< ProjectTag >── skill Tag
                                           └──< Cohort 1 ──< Application >── 1 Student
                                                                  └── 0..1 Enrollment
```

## Entities

| Entity | Key fields | Notes |
|---|---|---|
| **Organization** | id, name | Fictional in the seed |
| **Instructor** | id, slug, name, title, bio, organization | One project each in the seed. The schema allows several |
| **Project** | id, slug, title, summary, description, learning goals[], deliverable, instructor, industry, skill tags, status | `status`: draft, published, archived. Only published is public |
| **Tag** | id (slug), name, type, position | `industry` (exactly one per project) or `skill` (3 to 5 in the seed). `position` orders industry chips; a project's skills are ordered by `project_tags.position` |
| **Cohort** | id, project, start, end, application deadline, min (5), max (8 to 15), zoom link | A project run at a specific time. **Status is derived**, not stored |
| **Student** | name, email, school, program, graduation year | PII. In the demo it is embedded in the application. In Postgres it is its own table, unique on email |
| **Application** | id (UUID), cohort, student, statement, status, submitted at, reviewed by | One per student per cohort. The UUID is the capability link |
| **Enrollment** | application, enrolled at, completed at, certificate issued | In schema, unused by the demo |
| **ApplicationEvent** | application, from status, to status, actor, at | Audit trail. One row per real status change, written with the change. Admin-only |
| **AdminUser** | user id, role, instructor | In schema, unused until Phase 2 |

## Cohort status (derived)

Computed by `deriveCohortStatus()` from capacity, deadline, end date and "now":

| Status | When |
|---|---|
| `completed` | end date has passed |
| `full` | accepted plus enrolled seats >= max |
| `closed` | deadline has passed (the deadline day itself is still open) |
| `open` | otherwise |

## Application status

`submitted`, `under_review`, `accepted`, `waitlisted`, `rejected`, `enrolled`, `withdrawn`.

**Seats are held by `accepted` and `enrolled` only.** Moving someone into a seat status when the cohort is full turns the change into `waitlisted` (`resolveStatusChange()`). Moving from `accepted` to `enrolled` does not take a second seat. Freeing a seat (reject, withdraw) reopens the cohort if the deadline has not passed.

## Invariants (tested)

- One application per (cohort, lower-cased email). The Postgres schema also enforces it with a unique index.
- Seats taken never exceed capacity through the admin flow.
- Public DTOs contain no student email and no Zoom link.
- Seeded applications are never dated in the future. Seeded application ids are deterministic UUIDs (the Postgres column type).
- A cohort's capacity never drops below its accepted plus enrolled seats (`cohortRuleErrors()`).
- A project's organization always follows its instructor's.
- Project and instructor slugs are unique. A draft or archived project is not reachable publicly.

## Seed

`generateSeed({ projectCount, now })` is deterministic. Titles are verb x subject (12 x 96 = 1,152 unique). Cohort dates are generated relative to "now", so there are always open, full, closed and completed cohorts. The first project's first cohort is a **guaranteed demo scenario**: open, starts in a week, one seat left, several pending applicants.
