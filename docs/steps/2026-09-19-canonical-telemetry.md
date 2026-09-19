# Step — Canonical gameplay telemetry and run metrics

## Goal
Bring internal telemetry in line with the original production event vocabulary and make run-level metrics useful for later balancing analysis without adding an external analytics service.

## Canonical events
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

Low-level internal events such as `drop`, `merge`, `chain`, `order_complete`, `danger_end` and `overdrive_end` remain where they are still useful.

## Run metrics
Terminal events include:
- run duration;
- time to first successful decision;
- drops;
- merges;
- highest tier;
- HOLD uses;
- Power uses;
- Overdrive starts;
- danger starts;
- rescues.

## Timing semantics
- Run duration uses active gameplay time.
- Background time is excluded by shifting the run start timestamp when the document resumes.
- First-decision time is captured once on the first successful DROP, HOLD or Power action.
- Timing and telemetry counters persist in the active-session snapshot so reload/process eviction does not reset them.

## Session compatibility
The new session fields are optional. Existing version-1 snapshots without telemetry timing/counters remain valid.

## Privacy / transport
- no external analytics SDK;
- no network telemetry;
- no user identifiers or PII;
- events continue through the internal sink and browser CustomEvent bridge only.

## Verification
Pending:
- typecheck
- lint
- unit
- session round-trip
- Chromium
- WebKit
- Offline/PWA
- Performance
- Audit
- Aggregate Gate
- merge
- deploy
- production live smoke
