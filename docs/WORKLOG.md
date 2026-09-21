# Monster Merge Lab — Worklog

This file is updated after each major production step.

## 2026-09-19 — Production polish sequence

### Telemetry hooks
- Added typed internal telemetry event bus.
- Instrumented run/session/drop/HOLD/Power/merge/chain/Orders/Overdrive/danger/game-over/Experiment events.
- Added unit and browser coverage.
- CI green; deployed.

### Daily fairness
- Materialized deterministic fixed Daily queue.
- Kept identical start/queue per UTC day and disabled pay-to-win Power.
- Added day-to-day opener variation and fairness invariants.
- CI green; deployed.

### Experiment goals
- Added real goal evaluator and run limits.
- Added chain, score, danger rescue, merge-count, safe-pile, tier and Order goals.
- Added Experiment failure UX for drop-limit challenges.
- CI green; deployed.

### Meta progression isolation
- Endless-only persistent best score/tier/Orders/coins/Power economy.
- Shop purchases disabled outside Endless.
- Lab stats now show persistent Orders rather than run-local challenge state.
- CI green; deployed.

### CI modernization
- Updated official GitHub Actions to Node 24-compatible majors.
- Removed Node 20 deprecation warnings.
- CI green; deployed.

### Experiment progression
- Persist highest completed Experiment count.
- Resume first incomplete Experiment after reload/re-entry.
- Lab shows Continue/Replay and completed count.
- Fixed Complete → Lab → Continue path.
- CI green; deployed.

### Background gameplay clocks — DONE
- Problem: physics paused in background, but Danger and Overdrive clocks kept consuming wall time.
- Added pure clock-shift helper and unit tests.
- Runtime shifts active Danger/Overdrive deadlines by actual hidden duration on resume.
- PR #21 merged.
- PR + post-merge CI: typecheck ✓ lint ✓ unit ✓ physics/bundle budgets ✓ build/audit ✓ browser E2E ✓ responsive/accessibility ✓.
- Cloudflare deploy ✓.
- Production live smoke ✓.


### Active run persistence — DONE
- Recover active run after mobile tab/process eviction or reload.
- Versioned/validated snapshot preserves mode, physics bodies, queue/HOLD, run counters, Danger and Overdrive.
- Body IDs are recreated safely; relative body age is restored.
- Daily seeded RNG state is serialized so deterministic continuation is preserved.
- Stale/corrupt/wrong-day snapshots fall back safely.
- Terminal states clear the snapshot.
- PR #22 + post-merge CI ✓.
- Cloudflare deploy ✓.
- Production live smoke ✓.
- Reload E2E: Experiment body restore ✓ Daily queue continuity ✓ corrupt snapshot fallback ✓.


### Background transient gameplay timers — MERGED, DEPLOY PENDING
- Confirmed remaining pause bug after PR #21: drop cooldown, chain reset, drop-limit settle and body age could keep advancing while the document was hidden.
- Added explicit deadlines for drop cooldown, combo reset and drop-limit settle.
- Hidden state clears active timers without consuming their remaining game time.
- Resume shifts/re-arms deadlines, body bornAt, chain timestamp and merge-burst timestamps.
- Added unit coverage plus browser visibility-pause regression.
- PR #23 code run #106: full CI ✓.
- Documentation-only follow-up runs failed before checkout with no steps/logs.
- PR #23 merged as controlled CI infrastructure exception.
- Post-merge run hit the same pre-job failure, so deploy was skipped.
- Next successful main CI/deploy will carry PR #23 into production.


### Parallel CI gates — DONE
- Replaced monolithic verify job with independent parallel gates:
  - Chromium
  - WebKit
  - Offline/PWA
  - Performance
  - Audit
- Added mobile + desktop WebKit Playwright projects.
- Added a real PWA manifest, service worker and offline app-shell E2E.
- Performance owns the verified production artifact.
- Aggregate Gate requires all five jobs to succeed before Deploy.
- Deploy remains main-only and consumes the verified production-dist artifact.
- Making the repository public restored GitHub-hosted runners.
- PR #24 final PR run: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Post-merge main run #119: all five parallel jobs ✓ Aggregate Gate ✓ Deploy ✓.
- Production live smoke ✓.
- Fixes made during validation:
  - Vite import-meta type definitions;
  - non-fatal service-worker registration;
  - service-worker syntax check in Audit;
  - offline smoke warms hashed Vite assets through active SW before offline reload.


### Restored Experiment drop-limit resolution — DONE
- Confirmed restore bug: active Experiment snapshots always restored with `canDrop=true`, even when `runDrops` already reached the configured drop limit.
- Restore disables DROP at the limit and schedules the same 1.5s settle resolution used during normal play.
- Browser regression covers Experiment 12 at 14/14 drops.
- PR #25: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Post-merge main run #121: all five jobs ✓ Aggregate Gate ✓ Deploy ✓.
- Production live smoke ✓.


### Canonical telemetry and run metrics — DONE
- Canonical events: run_started, first_drop, first_merge, hold_used, power_used, overdrive_started, danger_started, rescued, experiment_started, experiment_completed, experiment_failed.
- Low-level drop/merge/chain/order_complete/danger_end/overdrive_end remain available where useful.
- Terminal events include run duration, first-decision time, drops, merges, highest tier, HOLD/Power usage, Overdrive starts, danger starts and rescues.
- Active run timing excludes background time.
- Optional telemetry timing/counters persist across reload without breaking existing v1 snapshots.
- No external analytics SDK, persistence service, network calls or PII.
- PR #26: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Post-merge main run #127: all five jobs ✓ Aggregate Gate ✓ Deploy ✓.
- Production live smoke ✓.


### Final production sign-off — DONE
- PR #27 merged.
- PR CI run #128: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Post-merge main run #129: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓ Deploy ✓.
- Production endpoint responds and renders the expected game shell/HUD ✓.
- Interactive live smoke was explicitly waived by the user on 2026-09-20 after deploy; no product failure was observed.
- Production-polish phase closed. New work proceeds as a separate architecture phase.

## 2026-09-20 — Architecture phase

### Renderer extraction — DONE
- Goal: reduce App.tsx responsibility before future feature-heavy work.
- Scope is behavior-neutral: moved monster/canvas drawing helpers and MonsterArt into src/rendering.tsx.
- Physics, state, timers, persistence, telemetry and game rules remain unchanged.
- App.tsx reduced from 2506 to 2116 lines.
- Exact extraction review: renderer implementation matches the original source block 1:1 after exports/imports.
- Hidden/bidirectional Unicode controls: none in changed files.
- PR #28 run #130: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Final PR head run #131: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- PR #28 merged as 6ec36f8.
- Post-merge main run #132: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓ Deploy ✓.
- Production endpoint renders the expected game shell/HUD ✓.
- Interactive live smoke remains waived by explicit user decision.

### Fixed-step game-loop controller — DONE
- Goal: separate RAF/fixed-step scheduling from React without moving gameplay rules.
- New src/game-loop.ts owns requestAnimationFrame scheduling, 120 Hz fixed-step accumulation, 50 ms delta clamp, pause behavior and clock reset.
- App.tsx keeps Danger/Overdrive rules, physics callbacks, rendering, persistence and telemetry behavior.
- Unit coverage verifies active stepping, long-gap clamping, pause/reset semantics and frame cancellation.
- App.tsx reduced from 2116 to 2104 lines.
- PR #29 run #133: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- No gameplay/storage/session/telemetry schema changes.
- Final PR head run #134: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- PR #29 merged as 07586a5.
- Post-merge main run #135: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓ Deploy ✓.
- Production endpoint renders the expected game shell/HUD ✓.
- Interactive live smoke remains waived by explicit user decision.

### Game modal extraction — DONE
- Goal: reduce React presentation responsibility in App.tsx without touching game behavior.
- Scope: moved MONSTERS, SHOP and LAB dialog markup into src/game-modals.tsx.
- App.tsx keeps modal visibility state, mode transitions, purchases and all gameplay logic.
- App.tsx reduced from 2104 to 2004 lines after extraction/cleanup.
- Existing E2E already covers modal open/close, mode navigation, Shop isolation and modal accessibility.
- Code review: labels, disabled states, callbacks, backdrop close and autofocus behavior preserved.
- PR #30 run #136: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- No physics, timing, persistence, storage, telemetry or gameplay-rule changes.
- Final PR head run #137: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- PR #30 merged as c4e5753.
- Post-merge main run #138: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓ Deploy ✓.
- Production endpoint renders the expected game shell/HUD ✓.
- Interactive live smoke remains waived by explicit user decision.

### Game toolbar extraction — DONE
- Goal: reduce App.tsx presentation responsibility further without changing controls.
- Scope: moved SHOP, MONSTERS, DROP, POWER and LAB toolbar markup into src/game-toolbar.tsx.
- App.tsx keeps all callbacks, gameplay state and power/drop rules.
- App.tsx reduced from 2004 to 1957 lines.
- Existing E2E covers all five primary controls and Power availability by mode.
- Code review: labels/classes, DROP disabled state, POWER limit/aria-label logic and callbacks preserved.
- PR #31 run #139: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- No physics, timing, persistence, storage, telemetry or gameplay-rule changes.
- Final PR head run #140: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- PR #31 merged as 8b735c7.
- Post-merge main run #141: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓ Deploy ✓.
- Production endpoint renders the expected game shell/HUD ✓.
- Interactive live smoke remains waived by explicit user decision.

### Terminal run overlay extraction — DONE
- Goal: reduce App.tsx terminal-state presentation without moving run control.
- Scope: moved Experiment Complete, Experiment Failed and Game Over dialog markup into src/run-overlays.tsx.
- App.tsx keeps restart, next-Experiment selection/reset, Lab opening and all gameplay state/rules.
- App.tsx reduced from 1957 to 1925 lines.
- Existing E2E covers Experiment Complete/Next and Experiment Failed terminal flows.
- No physics, timing, persistence, storage, telemetry or gameplay-rule changes.
- PR #32 run #142 Audit caught an `exactOptionalPropertyTypes` prop-contract mismatch before merge; runtime/browser jobs were not the source.
- Fix: props that App always passes now explicitly accept `undefined` rather than being optional/omittable.
- PR #32 corrected-head run #143: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Code review: terminal visibility rules, copy, Retry/Next/Lab callbacks and game-over score/best/daily/title presentation preserved.
- Final PR head run #145: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- PR #32 merged as 8d9a988.
- Post-merge main run #146: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓ Deploy ✓.

### Architecture extraction phase — STOP CRITERION
- Renderer extracted to src/rendering.tsx.
- Fixed-step RAF scheduler extracted to src/game-loop.ts.
- Large modals extracted to src/game-modals.tsx.
- Gameplay toolbar extracted to src/game-toolbar.tsx.
- Terminal run overlays extracted to src/run-overlays.tsx.
- App.tsx reduced from 2506 to 1925 lines while retaining intentional state/gameplay orchestration.
- Stop after PR #32 post-merge verification unless a concrete feature or defect exposes a new architecture boundary.


## 2026-09-20 — Global audit & polish

### Pass 1 — DONE
- Full scope recorded in `docs/GLOBAL_AUDIT_2026-09-20.md`.
- P0 release blockers found: none.
- P1 confirmed:
  - landscape HUD readability at 5–6 px;
  - weak visual disabled state on illustrated bottom controls;
  - first-run coach omitted the core merge rule;
  - Performance gate profiled browser idle only.
- Baseline: physics 0.154 ms/step; idle 16.55 ms average / 16.80 ms p95; JS 89 KB gzip; total first-load 354 KB.
- Remediation implemented on branch:
  - landscape typography floor raised;
  - visible disabled control treatment;
  - concise full core-loop coach: aim/drop → match twins → avoid overflow;
  - portrait + landscape HUD text floor raised with regression coverage;
  - deterministic 48-body crowded-board browser profile;
  - Performance CI now runs idle + crowded browser profiles without duplicate browser-job execution.
- Measured crowded Chromium: 16.54 ms avg / 16.70 ms p95 / 16.80 ms max.
- Initial crowded WebKit observation: 20.23 ms avg / 30 ms p95 / 218 ms max; tracked as P2 watch because sustained metrics remain healthy.
- Final-head Chromium readability guard caught one remaining 7 px landscape reward; test stayed strict and UI was raised to 8 px.
- Related landscape objective hint was raised to the same 8 px floor.
- Gate: rerun full parallel CI → Aggregate Gate → merge → main Deploy.


### Global audit Pass 1 production verification — DONE
- PR #34 merged as 30b5c69.
- Post-merge main run #165: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓ Deploy ✓.
- Crowded-board performance profiling is now part of the dedicated Performance gate.
- No P0 blocker found.

### Pass 2 — DONE
- PR #33 closed as superseded because it mixed stale pre-#34 changes with remaining P1 work.
- Clean PR #35 implements the remaining P1 scope:
  - terminal Complete/Failed/Game Over focus trap + inert background;
  - layered Lab-over-terminal focus behavior;
  - two-line portrait Experiment objective hints;
  - automated post-deploy live production interaction smoke.
- PR #35 implementation run #166: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Performance after changes: physics 0.162 ms/step; crowded 16.61 ms avg / 16.70 ms p95; idle 16.61 ms avg / 16.80 ms p95; total 355 KB; raw dist 560 KB.
- No material performance regression.
- No gameplay rules, physics constants, economy, persistence schema or telemetry schema changed.
- Final documentation head must pass the same gate before merge.


### Final P2 cleanup — DONE
- Scope intentionally limited to two safe technical P2 items from the global audit.
- Canvas reduced-motion now reads the live `prefers-reduced-motion` media query without requiring reload.
- The MediaQueryList is reused; draw paths read its current `.matches` state dynamically.
- Service worker cache generation bumped to v2.
- Hashed runtime assets use a dedicated runtime cache.
- Successful online navigation prunes stale hashed runtime entries no longer referenced by the current index.
- Old cache generations are deleted during service-worker activation.
- Added unit coverage for dynamic reduced-motion state and Offline/PWA coverage for stale runtime cache pruning.
- PR #36 implementation run #171: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Measured: physics 0.204 ms/step; crowded 16.63 ms avg / 16.70 ms p95; idle 16.62 ms avg / 16.80 ms p95; first-load 355 KB; raw dist 561 KB.
- Performance remains materially unchanged and comfortably inside budgets.
- Explicitly deferred: PWA install icons, art recompression, WebKit one-off max-frame watch.
- No gameplay rules, physics constants, economy, persistence/session schema or telemetry schema changes.
- Final documentation head must pass the same gate before merge.


## 2026-09-20 — Direct field drop UX

### Remove redundant DROP button — DONE
- Goal: remove the redundant bottom DROP action because drag/tap release on the game field already performs the primary drop.
- Bottom toolbar now contains only Shop, Monsters, Power-ups and Lab.
- Toolbar rebuilt as a visible four-action panel instead of transparent hit zones relying on the baked five-button artwork.
- Toolbar left/right edges are locked to the game-field frame at 12.8% / 12.8%.
- Game field exposes `aria-disabled` during drop cooldown and terminal states so readiness remains testable and accessible after removing the button.
- Desktop keyboard drop (Space/Enter) remains supported.
- Mobile/pointer drop remains pointer down/move → pointer up.
- Browser tests are migrated from clicking a DROP button to interacting with the field itself.
- Production smoke now verifies a real field drop and `first_drop` telemetry without a DROP button.
- No physics, scoring, spawn queue, economy, persistence/session schema or telemetry schema changes.
- PR #37 run #174: Audit ✓ Performance ✓; Offline/PWA correctly caught one stale assertion that still expected a DROP button.
- Fix: offline smoke now validates the field as the drop surface and explicitly verifies there is no DROP button.
- PR #37 run #176: Offline/PWA ✓ Performance ✓; Chromium geometry gate caught a small landscape overlap between the field and the rebuilt toolbar.
- Fix: landscape toolbar moved lower.
- PR #37 run #178: Offline/PWA ✓ Performance ✓ Audit ✓; Chromium caught sub-44px toolbar targets in short landscape when forcing exact field width.
- Fix: portrait keeps exact field-width alignment; short landscape expands only to the minimum 198px centered width needed to preserve real 44px touch targets after padding, borders and grid gaps.
- PR #37 run #182: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Portrait toolbar matches the game-field width/edges; short landscape uses the documented centered accessibility-safe minimum.
- Field drop, cooldown, Experiments, Daily restore, offline reload and production-smoke scenario are covered without a DROP button.
- Final documentation head must pass the same gate before merge.


## 2026-09-20 — Modular HUD + larger field

### HUD grid and field enlargement — DONE
- Goal: make the playfield the dominant visual area and align top HUD / field / bottom toolbar to one modular grid.
- Top HUD is now one `hud-grid` rather than five independently positioned overlays.
- Portrait HUD uses four modules: Score+Overdrive / Hold / Next / Coins+Sound+Orders.
- Portrait HUD left/right edges are locked to the game field at 12.8% / 12.8%.
- Bottom toolbar remains locked to the same field width.
- Game field top moves from 18.5% to 16.6%.
- Game field height increases from 64.9% to 67.4%.
- NEXT is contained inside its own module; its second preview no longer hangs outside the grid.
- Short landscape keeps the same centered modular composition but may use a wider accessibility-safe HUD/toolbar arrangement.
- E2E now locks HUD width/edges, field top/height ratios, HUD-to-field clearance, field-to-toolbar clearance and 44px touch targets.
- No gameplay, physics, scoring, economy, persistence/session schema or telemetry changes.
- PR #38 run #186: Audit ✓ Performance ✓ Offline/PWA ✓; Chromium geometry gate caught a 24px landscape Sound target.
- Fix: landscape meta module is now horizontal; Sound remains 44×44 while Coins and Orders stay inside the same 54px HUD row.
- PR #38 corrected-head run #188: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Measured: physics 0.159 ms/step; crowded 16.54 ms avg / 16.80 ms p95; first-load 356 KB; raw dist 565 KB.
- Geometry gates confirm the enlarged field, portrait HUD/field/toolbar alignment, landscape centering, clearances and 44px targets.
- Code review: UI composition changed only; gameplay/state/physics/economy/persistence/telemetry behavior unchanged.
- Final documentation head must pass the same PR gate before merge.

- 2026-09-20: Replaced oversized generated PNG workshop art with optimized local WebP assets, switched CSS to same-origin WebP paths, removed superseded PNGs and the one-shot conversion workflow. Verification: full CI rerun pending.

- 2026-09-20: Concept UI rebuild in PR #43. Extracted the approved master concept into independent local WebP modules (logo, HUD/frame panels, tank, navigation), widened the tank to concept proportions, replaced the full-height dashed aim line with a short subtle guide, introduced a compact concept-derived monster tier atlas, strengthened visual tier scaling while keeping physics radii authoritative, removed the superseded combined UI sheet, and kept Performance/Offline/Audit gates green. Responsive verification is still in progress: the remaining blocker is a single compact-phone HUD child overlap being isolated with selector-level E2E diagnostics. Do not merge/deploy until Chromium + WebKit + Aggregate Gate are green.
- 2026-09-20: Selector-level responsive diagnostics identified the remaining 320px HUD overlap as .orders-board (bottom 113.35px). Added a compact-phone-only containment rule for Orders so the module stays above the tank without shrinking the gameplay field. Full CI rerun required before merge/deploy.
- 2026-09-20: Responsive CI progressed past portrait HUD overlap and touch-target checks. The next blocker was landscape toolbar centering: the later master-concept rule overrode the earlier landscape left:50%/transform contract. Added an explicit final landscape concept override (50% anchor, 92% tank width, translateX(-50%)). Performance, Audit and Offline/PWA remain green; Chromium/WebKit must rerun before merge/deploy.
- 2026-09-20: CI #231 is fully green for the modular concept UI rebuild: Chromium, WebKit, Performance, Offline/PWA, Audit and Aggregate Gate all passed. Portrait and landscape geometry, 44px touch targets, tank/HUD/toolbar clearance, bundle/performance budgets and browser coverage are verified. Ready to merge PR #43; production deploy/smoke must be verified post-merge.

## 2026-09-20 — Clean concept UI rebuild

### Rebuild the live game screen from clean concept layers — VERIFIED
- User rejected the previous PR #43 composition as visually incorrect; this pass replaces that presentation layer rather than stacking more overrides on top of it.
- The second approved concept remains the visual source of truth.
- Kept only the clean workshop background, logo, tank frame and dynamic monster tier artwork from the concept-derived raster set.
- Added clean geometry-only UI assets: `panel-frame.svg`, `toolbar-frame.svg` and `button-frame.svg`. They contain no labels, icons, counters or monsters; all semantic content remains live React UI.
- Removed the old hidden field-art marketing layer from `App.tsx` so no baked MERGE/GROW/EVOLVE/BELONG or BETTER MONSTERS copy remains in the playfield DOM.
- Removed superseded baked concept modules: `hud-frame.webp`, `score-panel.webp`, `hold-panel.webp`, `next-panel.webp`, `orders-panel.webp` and `nav-frame.webp`. The earlier combined `monster-ui-assets.webp` sheet was already absent.
- Rebuilt layout on one 92%-wide field grid: portrait HUD, tank and bottom toolbar share 4% side edges; tank is the dominant 67%-height element; toolbar remains four actions with no DROP button.
- Landscape keeps the same centered composition with a compact 54px HUD and accessibility-safe 44px touch targets.
- Added E2E regression coverage that rejects every deprecated baked UI asset and verifies the clean frame/button assets, responsive geometry, field/HUD/toolbar clearances and existing touch-target/readability constraints.
- Gameplay rules, physics, scoring, economy, persistence/session schemas and telemetry are unchanged.
- PR #44 CI run #235: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Responsive/content-fit checks pass at 320×568, 390×844, 430×932 and 844×390; no clipped HUD content, geometry overlap, viewport overflow or sub-44px tested touch targets.
- Performance remains healthy: physics 0.194 ms/step; crowded board 16.55 ms average / 16.70 ms p95; idle 16.54 ms average / 16.80 ms p95.
- Bundle profile: JS 90 KB gzip, CSS 6 KB gzip, total first-load 252 KB gzip, raw dist 467 KB.
- Final PR head CI #236: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- PR #44 squash-merged to `main` as `bde60e43e8580c5f54eb9fcb069205a5764d4e33`.
- Post-merge main CI #237: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Production deploy succeeded to `https://monster-merge-lab.os3kov.workers.dev`; Cloudflare Worker version `25b0e7b7-4896-44f7-914b-3c948509fe5a`.
- Production Playwright smoke: Lab navigation + a real first drop ✓ (1/1 passed).
- Independent live fetch confirmed the deployed app shell and current HUD/action labels are served successfully.


## 2026-09-20 — Final reference UI rebuild

### Direct implementation from the approved second concept — VERIFIED
- No new UI mockup/image is being generated; work is applied directly to the live project.
- Replaced the accumulated game-screen presentation classes with an isolated `reference-*` UI layer so legacy HUD/layout CSS cannot leak into the final composition.
- The approved second concept is the sole visual source: clean workshop background, logo, tank frame and concept-derived button/frame styling.
- Portrait HUD, playfield and bottom toolbar share the same 92%-wide grid.
- DROP remains removed; pointer release on the playfield is the primary drop action.
- Gameplay, physics, scoring, economy, persistence/session and telemetry behavior are unchanged.
- Responsive/E2E selectors were migrated to the final presentation layer.
- CI #242: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Responsive geometry passes at 320×568, 390×844, 430×932 and 844×390, including 44×44 px interactive-target checks.
- CI exposed and closed compact-phone HUD containment, Orders height, and short-landscape meta overflow before merge.
- Final documentation-only head must pass the same gate before merge/deploy.


### Final reference UI production verification — DONE
- PR #45 squash-merged to `main` as `3a4d2f8e3be6955b815d531a890c874f23f757f6`.
- Post-merge main CI #244: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Verified production build deployed successfully.
- Production interaction smoke ✓ after deploy.
- Final UI is live with the approved second-concept presentation layer; no gameplay/physics/economy/persistence/telemetry behavior changed.


## 2026-09-20 — Concept decomposition rebuild

### Phase 1 — live navigation contract
- Approved second reference is the sole visual source of truth.
- The concept is being decomposed into production layers/assets rather than approximated with another independent UI design.
- Verified that the current workshop background asset is already clean: no gameplay monsters are baked into the scene.
- Current combined monster atlas remains rejected because rectangular crop content can leak into gameplay/HUD; replacement is tracked as a separate asset phase.
- Bottom navigation changed at source level from `Shop / Monsters / Power / Lab` to the exact concept order `Shop / Lab / Book / Restart`.
- `Book` opens the existing Monster Evolution/collection UI; `Restart` calls the real run reset handler.
- No fake relabeling: removed toolbar Power from this presentation because it does not exist in the approved concept; gameplay power logic remains untouched elsewhere.
- E2E coverage updated for Book and real Restart behavior.
- Next: decompose HUD/chrome proportions and replace the rejected monster atlas with clean transparent assets.


### Phase 2 — monster rendering + concept HUD — VERIFIED
- Root cause of the square monster artifacts was confirmed in `src/rendering.tsx`: complete raster faces from `monster-tiers.webp` were rendered as rectangular atlas cells and then a second runtime face layer was painted on top.
- Removed the duplicate thumbnail face DOM (`thumb-eye` / `thumb-mouth`) from `MonsterArt`.
- Canvas rendering now clips each atlas cell to a circular monster silhouette before drawing, so the rectangular source cell cannot leak into the visible playfield.
- Runtime face drawing is retained only for the procedural fallback when the raster atlas is unavailable.
- Removed obsolete thumbnail-face CSS.
- Reworked the approved-reference HUD palette from the previous light cream approximation to dark wood panels matching the concept; Orders remains the light card.
- Bottom toolbar remains the exact concept order: Shop / Lab / Book / Restart.
- The old visual Power button stays removed. Existing power gameplay code is retained; desktop fallback shortcut `P` keeps the action reachable without changing the approved visual layout.
- E2E now locks:
  - exact bottom-toolbar order;
  - absence of old Monsters/Power buttons;
  - absence of duplicate raster face overlays;
  - circular clipping of raster monster art.
- Implementation head CI #265: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Chromium initially caught a stale artwork expectation from the previous light Hold/Sound treatment; the test contract was updated to explicitly require the new dark-gradient concept treatment and reject the old button-frame asset there.
- Final documentation-only head must pass the same gate before merge and production deploy.


### Concept decomposition production verification — DEPLOYED, ASSET PHASE CONTINUES
- PR #47 squash-merged to `main` as `f52005125a38304b58b9400950992ec89b494fed`.
- Post-merge main CI #267: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Verified production build deployed successfully.
- Production interaction smoke ✓ after deploy.
- Current production removes the visible rectangular monster artifacts by clipping atlas cells and removes duplicate face overlays.
- This is **not yet the final asset-decomposition stop criterion**: gameplay monsters still originate from `monster-tiers.webp`; the next phase must replace that atlas dependency with individual transparent RGBA sprite files before the full user task is considered complete.


## 2026-09-21 — Transparent monster sprites

### Phase 3 — remove atlas dependency — VERIFIED
- Added nine independent transparent vector sprite assets under `public/assets/monsters/tier-0.svg` … `tier-8.svg`.
- Sprite styling follows the approved second concept: warm glossy round bodies, tier-distinct colors, leaves/horns/spikes, expressive faces and transparent outer canvas.
- `MonsterArt` now renders a direct `img` for the matching tier asset instead of selecting a rectangular cell from an atlas.
- Canvas gameplay preloads the same nine tier assets and draws each sprite directly.
- Removed runtime atlas indexing/cropping and removed the temporary circular clip workaround.
- Deleted superseded `public/assets/concept/monster-tiers.webp`.
- Procedural face/body drawing remains only as a loading fallback; it is no longer painted over completed sprite artwork.
- E2E now requires:
  - direct `/assets/monsters/tier-N.svg` paths;
  - no non-image `.monster-body` presentation;
  - all nine sprite files available with SVG MIME type and transparent document background;
  - legacy `monster-tiers.webp` rejected as deprecated artwork.
- Detailed asset contract: `docs/steps/2026-09-21-transparent-monster-sprites.md`.
- Implementation head CI #268: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- All nine transparent tier assets are served successfully and the live renderer no longer references the removed atlas.
- Final documentation-only head must pass the same gate before merge and production deploy.


### Transparent monster sprites production verification — DONE
- PR #48 squash-merged to `main` as `edf6b6d402eb4fa3b0c25edc5ef6c5a453d4a6fb`.
- Post-merge main CI #270: Chromium ✓ WebKit ✓ Offline/PWA ✓ Performance ✓ Audit ✓ Aggregate Gate ✓.
- Production deploy ✓.
- Production interaction smoke ✓.
- `monster-tiers.webp` is removed from production source/assets.
- Live HUD and canvas now use nine independent transparent tier sprites from `/assets/monsters/`.
- The concept-decomposition stop criterion is satisfied: clean background/chrome, concept bottom navigation, dark concept HUD treatment, and no rectangular monster atlas path remain in the live renderer.
