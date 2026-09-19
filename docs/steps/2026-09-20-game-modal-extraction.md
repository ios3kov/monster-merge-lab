# Game Modal Extraction

## Goal

Reduce React presentation responsibility in `src/App.tsx` before future feature work, without changing gameplay behavior.

## Scope

Move the existing dialog presentation into `src/game-modals.tsx`:

- MONSTER EVOLUTION modal;
- SHOP modal;
- LAB / game-mode modal.

`App.tsx` continues to own:

- whether each modal is open;
- mode transitions;
- Shop purchase behavior;
- gameplay state and rules;
- physics and game loop;
- persistence/session restore;
- telemetry and timers.

## Risk controls

- existing labels, button states and callbacks preserved;
- backdrop-close behavior preserved;
- autofocus close buttons preserved;
- no physics/gameplay constants changed;
- no storage/session/telemetry schema changes;
- no new dependencies.

## Initial result

- `App.tsx`: 2104 → 2004 lines;
- new `src/game-modals.tsx`;
- stale `MODE_OPTIONS` import removed after extraction.

## Verification gate

Required before merge:

- TypeScript;
- ESLint;
- unit tests;
- Chromium E2E/accessibility;
- WebKit E2E/accessibility;
- Offline/PWA;
- Performance budgets;
- dependency audit;
- Aggregate Gate.

Status: IN PROGRESS.
