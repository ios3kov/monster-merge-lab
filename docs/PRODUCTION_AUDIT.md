# Monster Merge Lab — Production Audit

## Sign-off scope

This audit covers gameplay runtime stability, mobile/desktop UX, accessibility,
session continuity, PWA/offline behavior, performance budgets, security headers,
test coverage, CI gating and Cloudflare deployment.

No known release-blocking defects remain in the audited scope.

## Production architecture

- mobile-first React/Vite application
- deterministic physics merge loop
- Endless, Experiments and Daily modes
- active-run persistence across reload/process eviction
- deterministic Daily seed/queue continuation
- PWA manifest + service worker + offline app shell
- Cloudflare Worker static asset deployment

## Required CI gates

Every PR and push to `main` is evaluated through independent parallel jobs:

1. **Chromium**
   - production build
   - mobile + desktop Chromium E2E
   - responsive behavior
   - automated accessibility checks
2. **WebKit**
   - production build
   - mobile + desktop WebKit E2E
   - responsive behavior
   - automated accessibility checks
3. **Offline / PWA**
   - manifest/service-worker smoke
   - controlled online warm-up
   - offline reload of the app shell
4. **Performance**
   - physics stress budget
   - production build
   - bundle / first-load budgets
   - browser frame-time smoke
   - verified `production-dist` artifact
5. **Audit**
   - TypeScript strict checks
   - ESLint / React hooks
   - deterministic unit tests
   - service-worker syntax check
   - production dependency audit

`Aggregate Gate` requires all five jobs to succeed. Only then may the
main-branch `Deploy` job consume the verified build artifact and publish it.

## Performance budgets

- JavaScript gzip: <= 105 KB
- CSS gzip: <= 10 KB
- estimated first-load transfer including art: <= 400 KB
- raw `dist`: <= 700 KB
- physics stress profile: <= 3 ms per 120 Hz step on CI
- browser idle average frame time: < 35 ms
- browser idle p95 frame time: < 70 ms

These are regression guardrails, not marketing benchmarks.

## Runtime stability

- collision broad phase sorts in place to reduce allocation
- solver iterations adapt on unusually crowded boards
- canvas DPR is capped on lower-memory/lower-core devices
- same-tier render buckets are reused
- merge burst storage compacts in place
- static canvas gradients are created once per renderer lifecycle
- physics and gameplay clocks pause while the document is hidden
- Danger, Overdrive, combo, drop cooldown, drop-limit settle, body age and
  related timestamps resume without consuming background wall time
- fatal runtime errors fall back to a reload screen instead of a blank page

## Session continuity

Active run snapshots are versioned and validated. They preserve:

- mode and Experiment/Daily identity
- physics bodies and relative body age
- visible queue, HOLD and deterministic RNG continuation
- score and run counters
- Danger and Overdrive state
- optional telemetry timing/counters

Corrupt, stale and wrong-day Daily snapshots fall back safely. Terminal states
clear the active snapshot. Experiment restore at its configured drop limit
re-enters the normal settle/complete/fail path and cannot gain an extra drop.

## Game-mode isolation

- Endless owns persistent best score/tier, Orders, coins and Power inventory
- Daily and Experiments cannot mutate Endless meta progression
- Shop purchases are disabled outside Endless
- Daily uses deterministic per-UTC-day queue generation and no pay-to-win Power
- Experiment progression persists and resumes the first incomplete scenario

## Telemetry

Telemetry is internal only: no analytics SDK, external network transport or PII.

Canonical lifecycle events include:

- `run_started`
- `first_drop`
- `first_merge`
- `hold_used`
- `power_used`
- `overdrive_started`
- `danger_started`
- `rescued`
- `experiment_started`
- `experiment_completed`
- `experiment_failed`

Terminal metrics include active run duration, first-decision time, drops,
merges, highest tier, HOLD/Power usage, Overdrive starts, danger starts and
rescues. Background time is excluded.

## UX and accessibility

- minimum touch targets for primary controls
- mobile-first responsive layout including short portrait screens
- desktop keyboard aiming/drop/HOLD support
- modal focus handling with inert background controls
- backdrop close behavior
- visible focus state
- reduced-motion support
- Chromium and WebKit responsive/accessibility coverage

## PWA / offline

- manifest linked from the document
- production service worker registration is non-fatal
- app shell and runtime Vite assets are cached
- offline reload is covered by Playwright
- service-worker JavaScript is syntax-checked in Audit

## Security

- self-hosted runtime art
- restrictive Content Security Policy
- frame embedding denied
- camera, microphone and geolocation disabled
- referrer leakage disabled
- `nosniff` enabled
- COOP set to same-origin
- production source maps remain off
- production dependency audit is part of every Aggregate Gate

## Deployment

Production:

`https://monster-merge-lab.os3kov.workers.dev`

Deployment is main-only and occurs only after the five parallel gates and
Aggregate Gate are green. Live production smoke is performed after production
changes.

## Remaining non-blocking architectural debt

`App.tsx` still owns rendering, UI and game-loop orchestration and is larger
than ideal. If a future feature-heavy phase begins, extract the canvas renderer
and game-loop controller before adding substantial new systems.

This is maintainability debt, not a current release blocker.

## Production sign-off criteria

Monster Merge Lab is considered production-ready when the final sign-off change
passes:

- Chromium
- WebKit
- Offline/PWA
- Performance
- Audit
- Aggregate Gate
- main-branch Deploy
- production live smoke

No new feature work is part of this sign-off.
