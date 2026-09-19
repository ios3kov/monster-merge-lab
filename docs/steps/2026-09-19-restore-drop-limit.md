# Step — Resolve restored Experiments at the drop limit

## Problem
Active-run persistence restored every non-terminal snapshot with `canDrop = true`.

For an Experiment with a drop limit, a snapshot saved at the exact limit could therefore:
- enable one extra illegal drop after reload;
- skip the normal 1.5s settle window;
- leave goal/failure resolution inconsistent with uninterrupted play.

Experiment 12 currently uses `limits.drops = 14`.

## Change
- During session restore, compare `session.ui.runDrops` with the restored preset's drop limit.
- If already at or above the limit:
  - restore with DROP disabled;
  - mark a pending restored-limit resolution;
  - schedule the same `DROP_LIMIT_SETTLE_MS` resolution used by the live drop path.
- Reset the pending flag on a fresh run.

## Regression
Browser E2E restores a valid Experiment 12 session at 14/14 drops and verifies:
- Experiment 12 restores;
- DROP is disabled immediately;
- no 15th drop is allowed;
- the normal `EXPERIMENT FAILED / DROP LIMIT` dialog appears;
- the terminal snapshot is removed.

## Scope
No goal definitions, drop limits, physics values or difficulty tuning are changed.

## Verification
Pending:
- Chromium
- WebKit
- Offline/PWA
- Performance
- Audit
- Aggregate Gate
- merge
- main deploy
- production live smoke
