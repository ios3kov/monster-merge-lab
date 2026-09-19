# Fixed-step Game-loop Controller

## Goal

Separate animation-frame scheduling and fixed-step timing from `App.tsx` without changing gameplay behavior.

## Scope

New `src/game-loop.ts` owns:

- `requestAnimationFrame` lifecycle;
- fixed 120 Hz simulation stepping;
- 50 ms foreground delta clamp;
- paused-frame behavior;
- explicit clock reset after visibility changes;
- frame cancellation on cleanup.

`App.tsx` continues to own:

- physics world and merge/impact callbacks;
- Danger and Overdrive rules;
- Experiment completion/failure;
- persistence and telemetry;
- canvas rendering calls;
- visibility pause clock shifting.

## Unit coverage

`tests/game-loop.test.ts` verifies:

- physics steps run before the rendered frame;
- a long foreground gap is clamped to the existing 50 ms budget;
- paused frames do not step or render;
- `resetClock` clears carried accumulator time;
- stopping the controller cancels the queued frame.

## Risk controls

- production constants remain 120 Hz and 50 ms;
- `stepWorld` still receives the same timestamp and fixed step;
- gameplay frame logic is moved only behind `onFrame`, not rewritten;
- visibility handling still resets the loop clock after pause adjustment;
- no storage/session/telemetry schema changes.

## Initial result

- `App.tsx`: 2116 → 2104 lines;
- new `game-loop.ts`;
- new unit coverage.

## Verification gate

Required before merge:

- TypeScript
- ESLint
- unit tests
- Chromium E2E/accessibility
- WebKit E2E/accessibility
- Offline/PWA
- Performance
- dependency audit
- Aggregate Gate

## Verification result

- TypeScript ✓
- ESLint ✓
- unit tests ✓
- Chromium E2E/accessibility ✓
- WebKit E2E/accessibility ✓
- Offline/PWA ✓
- Performance ✓
- dependency audit ✓
- Aggregate Gate ✓

PR #29 CI run #133 passed on the implementation head.
The final documentation-only commit must pass the same gate before merge.

Status: DONE.
