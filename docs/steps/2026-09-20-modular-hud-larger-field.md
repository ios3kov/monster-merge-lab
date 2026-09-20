# Modular HUD + Larger Field

Date: 2026-09-20

## Goal

Make the playfield visually dominant and rebuild the top HUD on the same
modular grid as the game field and bottom toolbar.

## Portrait grid

All three major UI bands share the same horizontal bounds:

- left: 12.8%;
- right: 12.8%;
- width: 74.4%.

The top HUD is a single four-column grid:

1. Score + Overdrive;
2. Hold;
3. Next + following preview;
4. Coins + Sound + Orders / mode objective.

## Field enlargement

Previous field:

- top: 18.5%;
- height: 64.9%.

New field:

- top: 16.6%;
- height: 67.4%.

This increases active play area while preserving clearance above the bottom
toolbar.

## NEXT

The next and after-next monsters are contained inside the NEXT module. The
secondary preview no longer hangs outside the module into adjacent UI.

## Landscape

Short landscape is space-constrained. It keeps the HUD centered on the game
field while allowing the existing accessibility-safe wider composition needed
for 44px touch targets.

## Regression coverage

Browser geometry tests verify:

- field width ratio remains 74.4%;
- field height ratio is 67.4%;
- field top ratio is 16.6%;
- portrait HUD width and edges match the field;
- portrait toolbar width and edges match the field;
- short-landscape HUD and toolbar remain centered on the field;
- HUD does not overlap the field;
- field does not overlap the toolbar;
- HUD stays inside the viewport;
- interactive targets remain at least 44x44px;
- no horizontal or vertical overflow.

## Risk controls

No changes to:

- drop / merge rules;
- physics;
- scoring;
- orders/economy;
- persistence/session schema;
- telemetry schema.

## Required verification

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

Status: IN PROGRESS.
