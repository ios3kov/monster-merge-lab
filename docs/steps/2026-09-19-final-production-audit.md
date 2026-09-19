# Step — Final production audit

## Scope
Audit the current production branch after modes, Experiments, Daily fairness,
telemetry, meta isolation, background timing and active-run persistence have all
landed.

## Checks
- mobile UX and mode transitions;
- active-session restore edge cases;
- game-feel/difficulty invariants without changing base physics;
- strict TypeScript / lint / unit tests;
- browser E2E, responsive and accessibility smoke;
- physics and bundle performance budgets;
- production dependency/security headers;
- Cloudflare deploy chain and live smoke;
- documentation consistency.

## Rules
- Fix only concrete defects.
- Do not change physics world constants unless a measured gameplay issue requires it.
- Do not do a large `App.tsx` refactor during this audit.
- Keep every production fix behind green CI before merge/deploy.

## Current status
Audit started from `main` after PR #22. Active-run persistence is deployed and
live smoke is green.
