# Step — Freeze gameplay clocks in background

## Problem
When the document became hidden, physics paused but Danger and Overdrive still used absolute `performance.now()` deadlines. Returning to the app could therefore:
- trigger near-instant or instant game over;
- consume most/all of an active Overdrive while the app was backgrounded.

## Change
- Added `shiftGameplayClocksForPause(...)` in `src/gameplay.ts`.
- Added unit tests for active/inactive clocks and invalid pause durations.
- Updated the visibility handler in `src/App.tsx` to:
  - record hidden start time;
  - compute hidden duration on resume;
  - shift Danger start timestamp;
  - shift active Overdrive end timestamp;
  - reset physics accumulator without advancing game time.

## Scope
Physics constants and game balance are unchanged.

## Verification
PR #21:
- typecheck ✓
- lint ✓
- unit ✓
- physics/bundle budgets ✓
- build/audit ✓
- browser E2E ✓
- responsive/accessibility ✓

Completed:
- post-merge CI ✓
- Cloudflare deploy ✓
- production live smoke ✓
