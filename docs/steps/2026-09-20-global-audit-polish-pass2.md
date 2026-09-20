# Global Audit / Polish Pass 2

## Goal

Close the remaining confirmed P1 findings after PR #34 without reintroducing
overlapping or stale changes from superseded PR #33.

## Changes

### Terminal dialog accessibility

- terminal Complete / Failed / Game Over dialogs isolate background controls;
- focus is trapped inside the active dialog;
- the first dialog action receives focus;
- Lab opened above a terminal dialog takes top-layer priority;
- closing Lab returns focus to the underlying terminal dialog;
- closing the last dialog restores the previous background control.

### Experiment objective clarity

- portrait hint copy can use two lines;
- short landscape stays single-line for geometry safety.

### Deployment verification

- main Deploy runs a live Chromium smoke against production;
- LAB open/close is verified;
- a real DROP is executed;
- canonical first_drop telemetry is verified;
- console/page runtime errors fail the smoke.

## Regression coverage

- terminal background inert assertions;
- terminal initial focus;
- layered modal focus restoration;
- inert cleanup after Next Experiment;
- portrait/landscape objective wrapping behavior.

## Safety constraints

No changes to:

- physics constants;
- gameplay scoring/rules;
- Daily fairness;
- Experiment definitions;
- economy;
- persistence/session schema;
- telemetry schema.

## Verification gate

- TypeScript
- ESLint
- unit
- Chromium
- WebKit
- Offline/PWA
- Performance
- Audit
- Aggregate Gate
- post-merge Deploy
- production interaction smoke

Status: IN PROGRESS.
