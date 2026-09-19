# Monster Merge Lab

Mobile-first physics merge game with living round monsters.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm run audit:prod
```

## Cloudflare

The app is configured as a Cloudflare Worker with static assets via `wrangler.jsonc`.
Deployment is performed from GitHub Actions on pushes to `main`.
