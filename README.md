# Monster Merge Lab

Mobile-first physics merge game with living round monsters.

## Development

```bash
npm ci
npm run dev
```

## Production verification

```bash
npm run verify
npm run test:e2e
```

The CI pipeline additionally runs responsive browser, accessibility and
frame-time smoke tests in Chromium.

## Performance profiling

```bash
npm run profile:physics
npm run build
npm run profile:bundle
```

Budgets and audit notes are documented in
[`docs/PRODUCTION_AUDIT.md`](docs/PRODUCTION_AUDIT.md).

## Deployment

Pushes to `main` are verified first. The verified `dist` artifact is then
deployed to the Cloudflare Worker `monster-merge-lab`.

Production: https://monster-merge-lab.os3kov.workers.dev
