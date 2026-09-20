# Monster Merge Lab — Global Audit & Polish

Date: 2026-09-20

## Scope

Full production review across:

- core game loop and first-run UX;
- game-feel and interaction feedback;
- UX/UI readability and control states;
- mobile/landscape/responsive behavior;
- accessibility and reduced motion;
- physics/runtime performance;
- browser frame-time performance;
- bundle/first-load budgets;
- persistence/PWA/offline behavior;
- telemetry/test/CI quality;
- maintainability and production deployment.

## Baseline

Latest verified production baseline before this pass:

- physics stress: 48 bodies / 480 steps / **0.154 ms per 120 Hz step**;
- idle browser frame profile: **16.55 ms average / 16.80 ms p95**;
- JS: **89 KB gzip**;
- CSS: **4 KB gzip**;
- estimated total first load: **354 KB gzip**;
- raw dist: **560 KB**;
- Chromium ✓;
- WebKit ✓;
- Offline/PWA ✓;
- Audit ✓;
- Aggregate Gate ✓;
- production Deploy ✓.

Existing budgets remain healthy. The largest performance-audit gap was that browser frame time was measured only while idle.

## Findings

### P0 — release blockers

None found in the audited baseline.

### P1 — user-visible polish

#### 1. Landscape HUD readability

Confirmed in CSS: several landscape HUD labels were rendered at **5–6 px**, including Order reward/progress and mode objective copy.

Why it matters:
- automated axe checks do not flag text that is technically present but practically unreadable;
- this weakens fast scanning during active play.

Remediation in this pass:
- raise critical landscape HUD text to an 8 px minimum while preserving current geometry.

#### 2. Disabled control affordance

The five bottom controls are transparent hit-zones aligned over the illustrated lab background. Disabled controls previously only lost pointer events, with almost no visual state change.

Why it matters:
- DROP cooldown / unavailable POWER can feel like a dead tap;
- the player has weak feedback about why an action is unavailable.

Remediation in this pass:
- add a restrained dark/inset disabled treatment without changing the background-art concept.

#### 3. First-run explanation of the core merge rule

The first-run coach explained only aiming and dropping. It did not state the central rule that matching monsters merge.

Why it matters:
- first 30-second comprehension depends on discovering the core action quickly;
- the user should not need an accidental collision to understand the loop.

Genre benchmark:
- the official Suika Game onboarding explicitly teaches three steps: drop, combine identical pieces, avoid overflow while chasing score;
- Monster Merge Lab now mirrors that clarity without adding a blocking tutorial screen.

Remediation in this pass:
- keep onboarding one-line and lightweight: aim/drop, match twins, do not overflow.

#### Verification catch

The first final-head Chromium pass correctly rejected a remaining 7 px landscape Order reward. The regression guard was kept strict; the UI was fixed instead of weakening the test. The related landscape objective hint was also raised to the same 8 px floor.

### P1 — portrait HUD readability

Several secondary portrait HUD labels were also 7–8 px. They were usable but below the intended polish floor.

Remediation in this pass:
- raise critical gameplay labels to an 8–9 px floor;
- add computed-style E2E assertions across target viewports.

### P1 — performance verification gap

Browser profiling covered idle animation only.

Why it matters:
- the actual expensive state is a crowded, moving board with physics + face rendering + collision solving;
- a healthy idle profile alone cannot validate worst-case game feel.

Remediation in this pass:
- add a deterministic 48-body active-board browser frame profile;
- run idle + crowded profiles only in the dedicated Performance gate to avoid duplicate CI work.

Measured after implementation:
- crowded Chromium: **16.54 ms average / 16.70 ms p95 / 16.80 ms max**;
- synthetic crowded WebKit observation during the initial audit run: **20.23 ms average / 30 ms p95 / 218 ms max**;
- the WebKit p95 remains healthy; the one-off max spike is tracked as a P2 watch item rather than treated as a sustained bottleneck.

## P2 — follow-up findings

### Reduced-motion runtime preference — RESOLVED

Canvas rendering now reads a live cached `MediaQueryList.matches` value. The
browser updates that value when the OS preference changes, so canvas motion
responds without a page reload. The query object is reused to avoid repeated
`matchMedia` allocation in the render loop.

### PWA install icon completeness

The manifest currently has no `icons` entries and the document has no Apple touch icon.

Status: non-blocking, but installed-app polish is incomplete. Schedule a dedicated asset/PWA pass rather than inventing production artwork inside this UX patch.

### Service-worker cache lifecycle — RESOLVED

Service-worker storage now separates shell and hashed runtime caches with v2
generations. Activation removes obsolete cache generations. On each successful
online navigation, the current HTML is parsed for active `/assets/` references
and stale hashed runtime entries are pruned. Offline navigation behavior remains
unchanged and covered by Playwright.

### WebKit worst-frame spike under synthetic crowd

The crowded synthetic board produced a healthy 30 ms p95 in WebKit but one 218 ms maximum frame on CI.

Status: P2 watch. Do not optimize blindly while sustained metrics remain healthy; re-profile if future rendering/features increase p95 or repeated hitches appear.

### First-load headroom

354 KB gzip is below the 400 KB budget, but leaves only ~46 KB of planned headroom.

Status: healthy but should be treated as a feature-budget constraint. Future art/features should not silently consume the remaining margin.

## Confirmed strengths

- physics CPU headroom is excellent;
- idle rendering is effectively 60 fps in CI;
- active-run persistence is versioned and validated;
- background gameplay clocks are frozen correctly;
- Daily/Experiments/Endless meta state is isolated;
- modal focus trap + inert background are implemented;
- touch targets are regression-tested at >=44 px;
- Chromium + WebKit + offline/PWA are mandatory parallel gates;
- deploy consumes the verified Performance artifact only;
- no external analytics SDK or PII telemetry transport;
- renderer/game-loop/modal/toolbar/terminal presentation boundaries are already separated.

## Pass 1 stop criteria

This PR is complete only when:

- TypeScript ✓
- ESLint ✓
- unit tests ✓
- Chromium E2E/accessibility ✓
- WebKit E2E/accessibility ✓
- Offline/PWA ✓
- idle browser profile ✓
- crowded active-board profile ✓
- bundle/physics budgets ✓
- dependency audit ✓
- Aggregate Gate ✓
- post-merge main Deploy ✓

No additional refactor is included unless a failing gate identifies a concrete defect.


## Pass 2 — remaining P1 remediation

After merged PR #34, three P1 items remained:

### Terminal dialog isolation

Terminal Complete / Failed / Game Over dialogs now participate in the same
keyboard-focus isolation model as top-level Shop / Monsters / Lab dialogs.

Expected behavior:

- first dialog control receives focus;
- background layers become inert and aria-hidden;
- Tab / Shift+Tab stay inside the active dialog;
- a top-level Lab modal opened above a terminal dialog takes priority;
- closing the top layer returns focus to the underlying terminal dialog;
- closing the final dialog restores the last background control.

### Experiment hint clarity

Portrait Experiment objective hints now use up to two lines instead of forcing a
single-line ellipsis. Short landscape stays intentionally compact at one line.

### Automated production interaction smoke

Main Deploy now runs a Chromium check against live production after deployment:

- load the production URL;
- verify the game shell and DROP control;
- open and close LAB;
- perform a real DROP;
- verify the canonical `first_drop` telemetry event;
- fail on console/page runtime errors.

This replaces the previous static-only post-deploy confidence gap.

### Pass 2 verification gate

- TypeScript
- ESLint
- unit tests
- Chromium
- WebKit
- Offline/PWA
- Performance
- Audit
- Aggregate Gate
- main Deploy
- live production interaction smoke

### Pass 2 measured result

PR #35 implementation run #166:

- Chromium ✓
- WebKit ✓
- Offline/PWA ✓
- Performance ✓
- Audit ✓
- Aggregate Gate ✓
- physics: 0.162 ms/step;
- crowded Chromium: 16.61 ms average / 16.70 ms p95 / 16.80 ms max;
- idle Chromium: 16.61 ms average / 16.80 ms p95 / 16.80 ms max;
- JS: 90.45 KB gzip;
- CSS: 4.59 KB gzip;
- total first-load budget reading: 355 KB;
- raw dist: 560 KB.

Compared with baseline, runtime performance is effectively unchanged. The
1 KB total-transfer increase is within expected build noise and remains below
the 400 KB budget.

Final documentation head must pass the same PR gate before merge.

Status: DONE.


## Final global audit / polish closure

P0: none.

P1: resolved in PR #34 and PR #35:
- critical HUD readability;
- disabled-control feedback;
- first-run core-rule clarity;
- crowded-board performance profiling;
- terminal dialog focus/inert isolation;
- portrait objective hint readability;
- automated live production interaction smoke.

Final safe P2 remediation:
- dynamic canvas reduced-motion response;
- service-worker cache-generation and stale-runtime cleanup.

Accepted / deferred P2:
- PWA install icons: requires deliberate production artwork;
- runtime art recompression: requires visual pixel-level QA;
- isolated WebKit max-frame spike: monitor p95 before optimizing;
- dependency major upgrades: dedicated compatibility work only.

### Final stop criterion

After the final P2 PR passes all PR gates, main Deploy, and production
interaction smoke, the 2026-09-20 global technical/UX polish phase is DONE.

Do not continue refactoring, asset recompression, dependency upgrades, or visual
redesign without a concrete product requirement, measured regression, or
reported defect.
