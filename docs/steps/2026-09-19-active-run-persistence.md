# Step — Persist and restore active runs

## Goal
Recover an in-progress run after a mobile browser reload, tab eviction, or process restart.

## Constraints
- Do not change physics constants or game balance.
- Do not let a restored Daily diverge from the deterministic daily sequence.
- Do not mutate persistent Endless meta progression during restore.
- Reject stale/corrupt snapshots safely and fall back to a fresh run.
- Avoid restoring terminal states as active gameplay.

## Planned session data
- schema version + save timestamp;
- mode / Experiment id / Daily key;
- score and run counters;
- current / next / after-next / HOLD;
- remaining fixed queue and spawn bag;
- physics bodies;
- aim position;
- Danger and Overdrive remaining time rather than raw wall-clock deadlines.

## Verification plan
- pure serialization/validation unit tests;
- reload E2E that restores an active run;
- invalid/stale snapshot fallback test;
- existing mode/Daily/Experiment tests;
- full CI and performance budgets;
- Cloudflare deploy;
- production live smoke.


## CI notes
- First PR gate stopped at TypeScript `exactOptionalPropertyTypes`: the optional RNG state was inferred as `number | undefined`.
- Fix: compute RNG state once and only add the property when it is defined.
- No runtime code reached browser/deploy from the failed gate.


## PR verification
After the exact-optional fix:
- typecheck ✓
- lint ✓
- unit tests ✓
- physics performance budget ✓
- production build ✓
- bundle/first-load budgets ✓
- production dependency audit ✓
- browser E2E ✓
- responsive smoke ✓
- accessibility smoke ✓
- Experiment body survives reload and completes with the next matching drop ✓
- Daily visible queue position survives reload ✓
- corrupt snapshot is discarded and fresh Endless loads ✓

Completed:
- final-head CI after documentation commit ✓
- merged as PR #22 ✓
- post-merge CI ✓
- Cloudflare deploy ✓
- production live smoke ✓
