# Transparent monster sprite assets — 2026-09-21

## Goal
Remove the legacy cropped atlas from the live game and use one transparent production asset per gameplay tier.

## Source of truth
The approved second concept remains the visual reference for monster color, personality, silhouette language and decorative motifs.

## Runtime contract
The renderer uses these files directly:

| Tier | Asset |
| --- | --- |
| 0 | `/assets/monsters/tier-0.svg` |
| 1 | `/assets/monsters/tier-1.svg` |
| 2 | `/assets/monsters/tier-2.svg` |
| 3 | `/assets/monsters/tier-3.svg` |
| 4 | `/assets/monsters/tier-4.svg` |
| 5 | `/assets/monsters/tier-5.svg` |
| 6 | `/assets/monsters/tier-6.svg` |
| 7 | `/assets/monsters/tier-7.svg` |
| 8 | `/assets/monsters/tier-8.svg` |

Each file has a transparent document background. No atlas cropping, CSS clipping or rectangular image cell is needed at runtime.

## Architecture
- HUD thumbnails render the same per-tier asset through `MonsterArt`.
- Canvas gameplay preloads the nine files as `Image` objects and draws the matching tier directly.
- Procedural canvas face rendering remains only as a fallback while an image has not loaded.
- The superseded `public/assets/concept/monster-tiers.webp` file is removed.

## Visual rules
- No baked rectangular background.
- No duplicated runtime eyes/mouth on top of finished sprite artwork.
- No neighboring-monster fragments.
- Tier silhouette/color remains distinct and readable at small HUD size.

## Verification
E2E must verify:
- the live monster DOM uses `img.monster-body` paths under `/assets/monsters/`;
- all nine sprite files return successfully;
- every sprite is SVG with a transparent document background;
- the legacy atlas name is rejected as deprecated artwork.

Full CI and production interaction smoke remain required before this phase is complete.
