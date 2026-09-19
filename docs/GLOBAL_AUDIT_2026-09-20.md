# Global Product / UX / Performance / Technical Audit — 2026-09-20

## Scope

Audit of the current production game across:

- core gameplay experience and onboarding;
- UX/UI readability and interaction states;
- accessibility and keyboard/focus behavior;
- responsive behavior;
- performance and bundle/asset weight;
- session/reload reliability;
- security and dependency health;
- test/CI/deployment quality;
- maintainability and architecture.

Production baseline: `https://monster-merge-lab.os3kov.workers.dev`.

## Current production baseline

Post-merge main run #146 is green:

- Chromium ✓
- WebKit ✓
- Offline/PWA ✓
- Performance ✓
- Audit ✓
- Aggregate Gate ✓
- Deploy ✓

Production endpoint renders the expected game shell/HUD.

### Measured performance

From production-equivalent CI profiling:

- physics stress: **0.154 ms per 120 Hz step** (budget 3 ms);
- browser idle frame average: **16.55 ms**;
- browser idle frame p95: **16.80 ms**;
- browser idle frame max: **16.80 ms**;
- JavaScript: **90.18 KB gzip** / 286.65 KB raw;
- CSS: **4.53 KB gzip** / 16.45 KB raw;
- estimated total first load: **354 KB gzip-equivalent**;
- raw dist: **560 KB**.

Largest first-load files:

- `monster-atlas-v1.webp`: 145.7 KB;
- `lab-bg-v1.webp`: 120.5 KB;
- application JS: 90.2 KB gzip.

The two runtime art files are roughly three quarters of the first-load transfer.
Runtime performance is strong; asset weight is the main remaining performance lever.

## What is already strong

### Gameplay / reliability

- fixed-step 120 Hz physics;
- controlled drop cooldown, combo timing, danger grace and Overdrive timing;
- deterministic Daily queue;
- designed Experiment progression and goals;
- active-run persistence and safe restore;
- background gameplay timers freeze correctly;
- terminal snapshots clear safely;
- corrupt/stale snapshots fail safe;
- typed internal telemetry lifecycle.

### UX / accessibility

- minimum 44×44 primary touch targets are regression-tested;
- target layouts cover 320×568, 390×844, 430×932 and 844×390;
- keyboard aim/drop/HOLD supported;
- reduced-motion support;
- focus-visible styling;
- Shop/Monsters/Lab modal focus trap and inert background;
- Chromium + WebKit automated accessibility checks.

### Engineering / security

- strict TypeScript and ESLint;
- deterministic unit tests;
- Chromium and WebKit E2E;
- Offline/PWA E2E;
- physics, bundle and browser-frame budgets;
- production dependency audit;
- restrictive production security headers;
- main-only deploy after Aggregate Gate;
- no external analytics transport or PII.

## Findings

### P0 — release blockers

None found in the audited scope.

### P1 — fix in the current global-polish phase

#### 1. Terminal dialogs do not isolate the background

Experiment Complete / Experiment Failed / Game Over use `role="dialog"` and
`aria-modal="true"`, but unlike Shop/Monsters/Lab they did not trap focus or
make the background inert.

Impact:

- keyboard focus could leave a terminal dialog;
- background controls remained part of the accessibility tree;
- `aria-modal` semantics did not match actual interaction isolation.

Action: extend dialog isolation to nested terminal dialogs and restore focus to
the last background control when the dialog closes.

#### 2. Critical HUD copy is too small

Confirmed CSS values include 7–9 px in the normal layout and 5–6 px in
landscape for objective/Order text.

Impact:

- poor glance readability;
- important challenge information can be hard to read on small/landscape phones;
- automated axe checks do not flag tiny but technically valid text.

Action: raise critical HUD copy sizes and add a browser readability regression
guard so important HUD text cannot fall below 7 px.

#### 3. Objective hints are over-truncated

Experiment objective hints use a single-line ellipsis even though the hint can
contain the actual strategy/instruction.

Action: allow two-line objective hints in portrait, retain a compact one-line
layout in short landscape.

#### 4. Disabled primary controls have weak visual feedback

The five bottom controls are transparent interaction hit-zones aligned over the
background artwork. Their DOM labels/icons are intentionally invisible, and
disabled state previously only removed pointer events.

Impact: DROP/POWER availability can be visually ambiguous.

Action: add a visible translucent disabled overlay while preserving the art.

#### 5. First-run coach explains input but not the core merge rule

Current coach explains drag/release only.

Action: explicitly state that identical monsters merge.

#### 6. Production deployment has no real post-deploy browser interaction gate

PR E2E verifies the build before deploy, but deployed production previously had
only a manual/static smoke step.

Action: after deploy, run a Chromium smoke against production that:

- loads the live site;
- opens/closes LAB;
- performs a real DROP;
- verifies the `first_drop` telemetry event;
- fails on console/page runtime errors.

### P2 — follow-up optimization / maintenance

#### Asset transfer weight

Art assets dominate first-load cost:

- atlas: 145.7 KB;
- lab background: 120.5 KB.

Target for a dedicated visual-asset optimization pass: reduce combined runtime
art by 15–25% without visible quality loss, then lower the total-load budget.
Do not recompress blindly without pixel-level comparison.

#### Dependency major drift

The lockfile is healthy and production audit is green, but the toolchain has
intentional major-version drift:

- React resolves to 19.3.0;
- Playwright resolves to 1.63.0;
- Vite resolves to 6.4.3 while newer major generations exist;
- TypeScript resolves to 5.9.3 while a newer major exists.

No major upgrade is required for this polish phase. Upgrade Vite/TypeScript only
in dedicated compatibility PRs with full CI and bundle comparison.

#### Browser matrix

Chromium and WebKit are strong coverage for the current target. Firefox is not
in the gate. Add Firefox only if it becomes an explicit supported target; do
not increase CI cost without a product requirement.

#### UI art dependency

Several visual labels are baked into the background artwork while semantic DOM
controls sit above them. This is performant and visually controlled but makes
dynamic visual states harder. Keep for this phase; reconsider if the toolbar is
redesigned or localized.

## Product / game-experience risks that tests cannot prove

The code can verify correctness, but it cannot prove retention or fun.

Current internal telemetry has the right lifecycle vocabulary but no external
transport. Therefore these questions still require actual player sessions:

- Does the player understand matching/merging in the first 10–20 seconds?
- Is HOLD discovered naturally?
- Does Overdrive feel earned and noticeable?
- Are Experiments 5–7 a smooth complexity ramp?
- Is Danger exciting rather than confusing?
- Does the player immediately start another run after failure?

These are product-validation questions, not current release blockers.

## Global-polish execution order

1. P1 accessibility/readability/control-state/onboarding fixes.
2. Automated production interaction smoke.
3. Full PR CI + code review.
4. Main deploy + production smoke.
5. Re-profile performance and compare baseline.
6. Dedicated asset optimization only if visual QA is available and savings are
   material.
7. Stop technical polish when all gates are green and no P0/P1 issue remains.

## Stop criteria

The global-polish phase is complete when:

- no known P0/P1 issue remains;
- Chromium ✓;
- WebKit ✓;
- Offline/PWA ✓;
- Performance ✓;
- Audit ✓;
- Aggregate Gate ✓;
- Deploy ✓;
- automated production interaction smoke ✓;
- measured performance is not worse than baseline outside normal noise;
- documentation records final metrics and intentionally deferred P2 work.
