# Final reference UI rebuild — 2026-09-20

## Goal
Implement the approved second concept directly in the live game. No new mockups or generated interface images.

## Source of truth
- clean workshop background from the approved second concept;
- concept logo;
- concept tank frame;
- concept-derived button/frame styling;
- all text, counters, state, monsters and interactions remain live React/game content.

## Layout contract
- playfield is the dominant element;
- portrait playfield width: 92% of the game shell;
- top HUD left/right edges match the playfield;
- bottom toolbar left/right edges match the playfield;
- no DROP button; drop remains direct field interaction;
- HUD is a compact modular grid;
- interactive targets remain at least 44×44 px;
- landscape may widen centered controls only where needed for accessibility.

## Architecture decision
The final interface uses a new isolated presentation namespace:
- `reference-hud`
- `reference-field`
- `reference-toolbar`
- related `reference-*` child classes

This prevents legacy HUD/layout CSS from leaking into the final composition. Gameplay, physics, scoring, economy, storage/session and telemetry logic are unchanged.

## Verification
Pending branch CI:
- Chromium
- WebKit
- Offline/PWA
- Performance
- Audit
- Aggregate Gate

Responsive geometry remains covered at 320×568, 390×844, 430×932 and 844×390.
