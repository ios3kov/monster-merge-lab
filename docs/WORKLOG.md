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


### Active run persistence — VERIFIED IN PR
- Recover active run after mobile tab/process eviction or reload.
- Versioned/validated snapshot preserves mode, physics bodies, queue/HOLD, run counters, Danger and Overdrive.
- Body IDs are recreated safely; relative body age is restored.
- Daily seeded RNG state is serialized so deterministic continuation is preserved.
- Stale/corrupt/wrong-day snapshots fall back safely.
- Terminal states clear the snapshot.
- PR #22 verification: typecheck ✓ lint ✓ unit ✓ physics/bundle budgets ✓ build/audit ✓ browser E2E ✓ responsive/accessibility ✓.
- Reload E2E: Experiment body restore ✓ Daily queue continuity ✓ corrupt snapshot fallback ✓.
- Next: final-head CI → merge → post-merge CI → Cloudflare deploy → live smoke.
