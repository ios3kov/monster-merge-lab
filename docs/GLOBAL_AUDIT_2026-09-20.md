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
- raise critical landscape HUD text to a 7–8 px floor while preserving current geometry.

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

Remediation in this pass:
- keep onboarding one-line and lightweight, but explicitly mention matching twins to merge.

### P1 — performance verification gap

Browser profiling covered idle animation only.

Why it matters:
- the actual expensive state is a crowded, moving board with physics + face rendering + collision solving;
- a healthy idle profile alone cannot validate worst-case game feel.

Remediation in this pass:
- add a deterministic 48-body active-board browser frame profile;
- run both idle and crowded profiles in the Performance gate.

## P2 — follow-up findings

### Reduced-motion runtime preference

Canvas reduced-motion preference is read when the rendering module loads. CSS responds dynamically, but canvas behavior will not react if the OS preference changes while the page remains open.

Status: non-blocking. Candidate for a later accessibility polish PR if needed.

### Service-worker cache lifecycle

Runtime hashed assets use cache-first behavior and the cache name remains `monster-merge-lab-shell-v1`. Old hashed runtime assets can accumulate across deployments for long-lived users.

Status: non-blocking storage/maintenance issue. Offline behavior is currently verified and production navigation is network-first.

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
