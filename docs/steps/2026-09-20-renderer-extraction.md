# Renderer Extraction

## Goal

Reduce `src/App.tsx` responsibility before future feature-heavy work without changing gameplay behavior.

## Scope

Move the existing monster/canvas rendering implementation into `src/rendering.tsx`:

- monster atlas setup;
- reduced-motion rendering flag;
- `MonsterArt` React visual;
- tank drawing;
- runtime face drawing;
- monster canvas drawing.

Remain in `App.tsx`:

- React state and UI orchestration;
- physics/game loop;
- timers and background-pause handling;
- persistence/session restore;
- telemetry;
- gameplay rules and mode transitions.

## Risk controls

- no gameplay constants changed;
- no physics code changed;
- no timing code changed;
- no storage schema changed;
- no telemetry schema changed;
- extraction uses the same implementation and call sites.

## Initial result

- `App.tsx`: 2506 → 2116 lines;
- new `rendering.tsx`: 402 lines.

## Verification gate

Required before merge:

- TypeScript ✓
- ESLint ✓
- unit tests ✓
- Chromium E2E/accessibility ✓
- WebKit E2E/accessibility ✓
- Offline/PWA ✓
- Performance budgets ✓
- dependency audit ✓
- Aggregate Gate ✓

Status: IN PROGRESS.
