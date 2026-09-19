# Game Toolbar Extraction

## Goal

Reduce presentation responsibility in `src/App.tsx` without changing gameplay controls or behavior.

## Scope

Move the bottom gameplay toolbar into `src/game-toolbar.tsx`:

- SHOP;
- MONSTERS;
- DROP;
- POWER;
- LAB.

`App.tsx` continues to own all actions and state:

- opening Shop / Monsters / Lab;
- dropping;
- Power behavior;
- mode rules;
- power-use limits;
- gameplay, physics, timers, persistence and telemetry.

## Risk controls

- button labels and CSS classes preserved;
- DROP disabled-state logic preserved;
- POWER disabled-state and aria-label logic preserved;
- callbacks remain owned by App;
- no gameplay constants or schemas changed;
- no new dependencies.

## Initial result

- `App.tsx`: 2004 → 1957 lines;
- new `src/game-toolbar.tsx`;
- `RotateCcw` icon import moved with the toolbar.

## Existing coverage

Browser E2E already exercises:

- Shop;
- Monsters;
- Drop;
- Power availability/lock behavior;
- Lab navigation;
- responsive and accessibility checks.

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
