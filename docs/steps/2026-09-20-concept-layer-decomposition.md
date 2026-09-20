# Concept layer decomposition — 2026-09-20

## Goal
Use the approved second reference as a master image, decompose it into real game layers/assets, and wire those layers into the live game instead of approximating the screen with generic CSS.

## Root cause found
The previous concept assets were not actually clean layers:
- `public/assets/concept/tank-frame.webp` contained the glass/frame **plus the complete baked monster pile and the top spawn monster**.
- `public/assets/concept/monster-tiers.webp` was a crop atlas from the same pile, so cells contained neighboring monsters/background and did not have a real alpha channel.
- The bottom toolbar still exposed `Shop / Monsters / Power / Lab`, which did not match the approved concept.

This explains the production screenshot: baked monsters from the frame were visible behind live physics monsters, while atlas crops appeared as rectangular image fragments.

## New layer model
1. **Environment** — existing clean `monster-workshop-background.webp`.
2. **Logo** — existing concept logo layer.
3. **HUD chrome** — exact crop from the approved reference, materialized as `hud-reference.webp`; live score/hold/next/after/coins/sound/orders are rendered over it.
4. **Field chrome** — old tank raster is used only through a perimeter CSS mask; its monster-filled interior is never rendered.
5. **Gameplay monsters** — new 3×3 transparent `monster-sprites.webp` sheet with one isolated monster per tier.
6. **Bottom navigation** — exact crop from the approved reference, materialized as `bottom-bar-reference.webp`, with semantic transparent hit zones.

## Bottom navigation contract
Left to right:
- Shop → existing Shop modal
- Lab → existing Lab/modes modal
- Book → existing Monster Evolution / collection modal
- Restart → real run restart handler

No fake relabeling of Power/Monsters actions.

## HUD contract
Left to right:
- Score + Overdrive
- Hold
- Next
- After (independent slot)
- right stack: Coins + Sound / Orders

## Geometry
Portrait follows the reference image coordinates:
- logo: top ~0–7.5%
- HUD: top 7.8%, height 12.5%
- field: top 20.3%, height 61.2%
- bottom navigation: bottom 7.35%, height 10.9%
- HUD, field and bottom navigation: 92% shell width

Short landscape keeps its dedicated accessibility-safe layout.

## Asset materialization
Binary concept assets are downloaded only during dev/build and verified by SHA-256 before use:
- `monster-sprites.webp`
- `hud-reference.webp`
- `bottom-bar-reference.webp`

Runtime references are same-origin under `/assets/concept/`.

## Non-goals
- No physics/scoring/session schema change.
- No new visual concept.
- No replacement of the approved reference with a new art direction.

## Acceptance gate
- typecheck
- lint
- unit tests
- build + bundle budget
- Chromium responsive/accessibility
- WebKit responsive/accessibility
- Offline/PWA
- Performance
- production interaction smoke after merge

Target portrait viewports remain 320×568, 390×844 and 430×932.
