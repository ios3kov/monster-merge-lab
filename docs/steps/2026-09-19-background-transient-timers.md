# Step — Freeze transient gameplay time in background

## Problem
PR #21 froze Danger and Overdrive, but several shorter gameplay clocks could still advance while the app was backgrounded:
- drop cooldown;
- chain/combo reset;
- 1.5s drop-limit settle/failure resolution;
- body age used by merge/danger eligibility.

That could make a paused run behave differently after returning to the app.

## Change
- Added explicit gameplay constants for combo reset and drop-limit settle.
- Added deadline refs for:
  - drop cooldown;
  - combo reset;
  - drop-limit settle.
- On document hide:
  - active transient timers are cleared;
  - deadlines remain recorded.
- On resume:
  - deadlines shift by hidden duration;
  - timers are re-armed with the correct remaining time;
  - body `bornAt`, last-merge timestamp and burst timestamps shift by the same hidden duration.
- Existing Danger/Overdrive clock shifting remains unchanged.

## Tests
- Unit: finite timestamps shift; non-finite sentinel timestamps remain unchanged.
- Browser E2E: a drop cooldown does not expire while the page is simulated as hidden.
- Existing full CI remains the production gate.

## Scope
No physics constants, score tuning, queue rules or difficulty values are changed.

## Verification
PR #23:
- typecheck ✓
- lint ✓
- unit ✓
- physics/bundle budgets ✓
- build/audit ✓
- browser E2E ✓
- responsive/accessibility ✓
- visibility-pause regression ✓

Pending:
- final-head CI after documentation update
- post-merge CI
- Cloudflare deploy
- production live smoke
