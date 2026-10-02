---
description: Plan and build one roadmap phase (usage: /phase 1)
argument-hint: <phase number from docs/ROADMAP.md>
---
Work on **Phase $ARGUMENTS** from `docs/ROADMAP.md`.

1. Read `CLAUDE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md` and `docs/ARCHITECTURE.md`.
2. If the phase depends on an unanswered question in `docs/DECISIONS.md`, stop and tell me which one. Do not guess product behavior.
3. Enter plan mode. Present: the files you will touch, the order, what tests you will add, and anything that could break existing behavior. Wait for my approval.
4. Build in small steps. After each step run `npm run typecheck && npm test`.
5. Finish with `/check`. Update `docs/ROADMAP.md` (mark the phase done, note anything deferred) and `CLAUDE.md` if a rule or limitation changed.
