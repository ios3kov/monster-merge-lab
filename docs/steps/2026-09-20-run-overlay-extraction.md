# Terminal Run Overlay Extraction

## Goal

Reduce terminal-state presentation responsibility in `src/App.tsx` without changing run behavior.

## Scope

Move terminal run dialogs into `src/run-overlays.tsx`:

- Experiment Complete;
- Experiment Failed;
- Endless/Daily/Experiment game-over presentation.

`App.tsx` continues to own:

- current run state;
- restart behavior;
- selecting/resetting the next Experiment;
- opening Lab;
- physics, timers, persistence and telemetry.

## Risk controls

- dialog roles and labels preserved;
- Retry / Try again / Lab callbacks remain owned by App;
- Next Experiment availability is still derived from `getNextExperimentId`;
- score/best/daily/title copy preserved;
- no gameplay constants or schemas changed;
- no new dependencies.

## Initial result

- `App.tsx`: 1957 → 1925 lines;
- new `src/run-overlays.tsx`.

## Existing coverage

Browser E2E already exercises:

- Experiment Complete;
- Next Experiment;
- Experiment Failed;
- related mode progression after terminal dialogs.

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

## CI correction

PR #32 run #142 failed in Audit at TypeScript before merge:

- root cause: `exactOptionalPropertyTypes` distinguished an optional/omitted prop from a prop explicitly passed as `undefined`;
- affected props: `dailyKey`, `successLabel`, `onNextExperiment`;
- fix: make those three passed props explicitly accept `undefined`;
- no runtime behavior changed.

Status: IN PROGRESS.
