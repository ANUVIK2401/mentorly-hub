---
description: Run the full quality gate and fix whatever fails
---
Run `npm run check` (lint, typecheck, unit tests, production build, Playwright e2e).

If anything fails:
1. Show me the first real error, not the whole log.
2. Find the root cause. Do not weaken a test or add a lint-disable to make it pass.
3. Fix it, then rerun `npm run check` from the top.

When it is green, also confirm in the build's route table that every `/admin/*` route is `ƒ` (dynamic), then summarize what changed and what is still untested.
