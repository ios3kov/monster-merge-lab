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

CI runs five independent production gates in parallel: Chromium, WebKit,
Offline/PWA, Performance and Audit. An Aggregate Gate requires all five before
main-branch deployment can start.

## Performance profiling

```bash
npm run profile:physics
npm run build
npm run profile:bundle
```

Budgets and audit notes are documented in
[`docs/PRODUCTION_AUDIT.md`](docs/PRODUCTION_AUDIT.md).

## Deployment

Pushes to `main` must pass Chromium, WebKit, Offline/PWA, Performance and
Audit plus the Aggregate Gate. The verified `dist` artifact from Performance
is then deployed to the Cloudflare Worker `monster-merge-lab`.

Production: https://monster-merge-lab.os3kov.workers.dev
