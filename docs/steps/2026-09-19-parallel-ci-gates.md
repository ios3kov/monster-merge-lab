# Step — Parallel CI gates with aggregate deploy gate

## Goal
Replace the single long CI job with independent parallel checks so failures are isolated, browser coverage is explicit, and deploy only happens after one final aggregate gate.

## Parallel jobs
1. **Chromium**
   - build
   - mobile + desktop Chromium E2E
   - responsive/accessibility coverage
2. **WebKit**
   - build
   - mobile + desktop WebKit E2E
   - responsive/accessibility coverage
3. **Offline / PWA**
   - build
   - Chromium offline test
   - manifest + service worker + cached app-shell reload
4. **Performance**
   - physics budget
   - production build
   - bundle/first-load budgets
   - browser frame-time smoke
   - uploads `production-dist`
5. **Audit**
   - TypeScript
   - ESLint
   - unit tests
   - production dependency audit

## Aggregate gate
`aggregate-gate` runs after all five jobs and explicitly requires every result to be `success`.

## Deploy
- main branch only;
- requires `aggregate-gate`;
- downloads the verified `production-dist` artifact from Performance;
- deploys through Cloudflare Wrangler.

## PWA/offline support added because it did not exist
The repository previously had no manifest or service worker, so an Offline/PWA job would have been cosmetic.

Added:
- `public/manifest.webmanifest`;
- `public/sw.js`;
- production service-worker registration;
- offline reload E2E.

## PR #23 carry-forward
PR #23 was merged after a full green code run, while later documentation-only runs and the post-merge run failed before checkout with no job steps/logs. Its deploy is therefore still pending and will be included by the next successful aggregate-gated main deploy.

## Verification
Pending:
- Chromium job
- WebKit job
- Offline/PWA job
- Performance job
- Audit job
- Aggregate Gate
- post-merge Deploy
- production live smoke
