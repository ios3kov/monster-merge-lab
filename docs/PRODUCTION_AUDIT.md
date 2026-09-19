# Monster Merge Lab — Production Audit

## Scope

This pass covers gameplay runtime stability, UX/UI, accessibility, performance,
asset delivery, security headers, test coverage, CI and Cloudflare deployment.

## Production gates

Every merge to `main` is expected to pass:

- TypeScript strict checks
- ESLint + React hook dependency checks
- deterministic gameplay unit tests
- physics performance budget
- production build
- bundle/first-load size budgets
- production dependency audit
- mobile + desktop Chromium smoke tests
- automated accessibility checks
- browser frame-time smoke profile

Cloudflare deploy is gated behind the verified build artifact rather than running
in parallel with CI.

## Performance budgets

- JavaScript gzip: <= 105 KB
- CSS gzip: <= 10 KB
- estimated first-load transfer including art: <= 400 KB
- raw `dist`: <= 700 KB
- physics stress profile: <= 3 ms per 120 Hz step on the CI runner
- browser idle average frame time: < 35 ms
- browser idle p95 frame time: < 70 ms

These are guardrails rather than marketing benchmarks. Tightening them should be
done only after collecting several stable CI runs.

## Runtime changes

- Collision broad phase sorts in place to avoid repeated array allocation.
- Physics solver iterations scale down for unusually crowded boards.
- Canvas DPR is capped more aggressively on low-memory/low-core devices.
- Render-time same-tier lookup buckets are reused between frames.
- Merge burst storage is compacted in place instead of allocating every frame.
- Static canvas gradients are created once per renderer lifecycle.
- Rendering pauses while the document is hidden.
- Reduced-motion preference suppresses decorative breathing/tilt motion.
- Critical background and monster atlas art are vendored into the app and served
  by Cloudflare with immutable caching.

## UX/UI changes

- minimum touch targets improved for settings and modal close controls
- keyboard aiming/drop/Hold support added on desktop
- modal focus is trapped and background controls become inert
- backdrop tap closes modal dialogs
- visible focus state added to the canvas
- compact portrait layout refined for shorter phones
- top HUD overlap and translucent ghosting over the baked concept UI removed
- fatal runtime errors fall back to a reload screen instead of a blank app

## Security

- runtime art no longer depends on a third-party image origin
- Content Security Policy restricts scripts, images, connections, objects, forms
  and framing
- frame embedding is denied
- camera, microphone and geolocation are disabled by policy
- referrer leakage is disabled
- production source maps remain off

## Remaining architectural debt

`App.tsx` is still larger than ideal because rendering, UI and game-loop
orchestration live together. Pure spawn/order rules have been extracted into
`src/gameplay.ts`, but a future feature-heavy phase should extract the canvas
renderer and game-loop controller before adding substantially more modes.

Current-run persistence across a browser process eviction is also not implemented.
Meta progress (coins, best score, best tier, orders, sound and power charges) is
persisted. Session persistence should be added if background-resume continuity
becomes a product requirement.
