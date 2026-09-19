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


### Canonical telemetry and run metrics — IN PROGRESS
- Normalizing internal telemetry to the original production vocabulary.
- Canonical events: run_started, first_drop, first_merge, hold_used, power_used, overdrive_started, danger_started, rescued, experiment_started, experiment_completed, experiment_failed.
- Low-level drop/merge/chain/order_complete/danger_end/overdrive_end remain available where useful.
- Terminal events include run duration, first-decision time, drops, merges, HOLD/Power usage, Overdrive starts, danger starts and rescues.
- Active run timing excludes background time.
- Optional telemetry timing/counters persist across reload without breaking existing v1 snapshots.
- No external analytics SDK, persistence service, network calls or PII.
- Next: PR → parallel CI → Aggregate Gate → merge → deploy → final production gate.
