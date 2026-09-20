# Direct Field Drop UX

Date: 2026-09-20

## Goal

Remove the redundant dedicated DROP button and make the game field itself the
unambiguous primary drop control.

## Interaction model

- pointer/touch: drag or tap on the field, release to drop;
- desktop keyboard: Left/Right aim, Space/Enter drop, H hold;
- bottom toolbar: Shop / Monsters / Power-ups / Lab only.

## Layout

The four-action bottom toolbar is aligned to the same modular grid as the game
field:

- left: 12.8%;
- right: 12.8%;
- width matches the game frame;
- four equal action columns.

The toolbar is rendered visibly in DOM/CSS rather than depending on transparent
hit zones for the old five-button artwork.

## Accessibility / testability

The canvas now publishes `aria-disabled` when a drop is temporarily unavailable
because of cooldown or a terminal state.

This preserves explicit readiness feedback for browser tests and assistive
technology even though there is no separate drop button.

## Regression coverage

- no accessible DROP button exists;
- field is the actual drop surface;
- cooldown survives background pause;
- Experiment completion/progression works through field drops;
- restored drop-limit state disables field drop;
- Daily queue persistence works through field drops;
- toolbar width and left/right edges match the game field across target viewports;
- production smoke performs a real field drop and sees `first_drop` telemetry.

## Risk controls

No changes to:

- physics;
- scoring;
- merge rules;
- queue generation;
- economy;
- persistence/session schema;
- telemetry schema.

## Verification

Required before merge:

- TypeScript
- ESLint
- unit tests
- Chromium
- WebKit
- Offline/PWA
- Performance
- dependency audit
- Aggregate Gate
- main Deploy
- production interaction smoke

## Verification catch

PR #37 run #174 found one stale Offline/PWA assertion that still expected the
removed DROP button after an offline reload.

The product behavior was correct; the regression test was outdated. The test
now verifies:

- the game field is visible and drop-ready;
- no accessible DROP button exists.

Status: IN PROGRESS.
