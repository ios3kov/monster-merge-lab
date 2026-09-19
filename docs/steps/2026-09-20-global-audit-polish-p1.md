# Global Audit / Polish P1

## Goal

Apply the confirmed P1 findings from the 2026-09-20 global audit without
changing core gameplay rules.

## Changes

### UX / accessibility

- terminal Complete/Failed/Game Over dialogs now use the same focus isolation
  principles as Shop/Monsters/Lab;
- background controls become inert while a terminal dialog is active;
- nested top-level modals (for example LAB opened from completion) take focus
  priority over the underlying terminal dialog;
- focus returns to the last background control after closing a modal;
- first-run coach now explains the merge rule as well as drag/drop input.

### UI readability

- increased critical HUD copy that fell to 5–9 px;
- landscape objective/Order copy has a 7 px minimum guardrail;
- portrait objective hints may use two lines instead of hiding strategy behind
  a single-line ellipsis;
- disabled bottom controls receive visible state feedback.

### Regression coverage

- modal focus restoration;
- terminal-dialog inert background;
- HUD readability across 320×568, 390×844, 430×932 and 844×390.

### Deployment reliability

Added an automated production interaction smoke after successful main deploy:

- load live production;
- open/close LAB;
- perform a real DROP;
- verify `first_drop` telemetry;
- fail on console/page runtime errors.

## Performance baseline

Before this PR:

- physics: 0.154 ms/step;
- frame average: 16.55 ms;
- frame p95: 16.80 ms;
- JS: 90.18 KB gzip;
- total first load: 354 KB;
- raw dist: 560 KB.

The PR must not materially regress these values.

## Verification gate

- TypeScript
- ESLint
- unit tests
- Chromium
- WebKit
- Offline/PWA
- Performance
- Audit
- Aggregate Gate
- post-merge Deploy
- automated production interaction smoke

## CI correction

PR #33 run #147 failed in Audit at TypeScript before merge:

- run #147 showed TS7022 around the DOM traversal temporary;
- renaming alone did not resolve the recursive control-flow inference; run #148 reproduced TS7022 on the new name;
- actual fix: explicitly type the traversal parent as `HTMLElement | null`;
- no behavior or UX semantics changed.
- run #149 then exposed two E2E test-isolation issues:
  - the new coach copy contains “monsters”, so the old non-exact toolbar locator matched two buttons;
  - the readability viewport loop persisted Experiment mode into the next viewport, where Overdrive is intentionally absent.
- fix: exact toolbar locator + isolate persisted state for the readability viewport loop.
- run #151 showed the first isolation attempt was still vulnerable to the app's pagehide persistence: clearing storage before reload allowed the outgoing page to immediately save the Experiment snapshot again.
- final test-isolation fix: clear localStorage from an init script before app startup on every navigation, with no intermediate reload.
- product behavior remains unchanged by these test corrections.
- manual code review then found a real layered-dialog edge case: closing LAB opened over Experiment Complete could restore focus to a background control while the terminal dialog was still active.
- fix: only restore background focus when no dialog remains, and actively focus the first control when a still-open dialog regains the top layer.
- added E2E coverage for LAB-over-completion open/close focus behavior.

Status: IN PROGRESS.
