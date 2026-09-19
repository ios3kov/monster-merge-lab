#!/usr/bin/env bash
set -euo pipefail

url="${MONSTER_MERGE_PRODUCTION_URL:-https://monster-merge-lab.os3kov.workers.dev/}"
body="/tmp/monster-merge-index.html"
headers="/tmp/monster-merge-headers.txt"
clean_headers="/tmp/monster-merge-headers.clean"
asset_headers="/tmp/monster-merge-asset-headers.txt"
clean_asset_headers="/tmp/monster-merge-asset-headers.clean"

success=0
for attempt in 1 2 3 4 5 6; do
  if curl -fsS --connect-timeout 10 --max-time 30     -D "$headers" -o "$body" "$url" &&
    grep -q "Monster Merge Lab" "$body"; then
    success=1
    break
  fi
  sleep 5
done

if [[ "$success" -ne 1 ]]; then
  echo "Production smoke failed: app did not become readable at $url" >&2
  exit 1
fi

tr -d '\r' < "$headers" > "$clean_headers"
grep -qi '^content-security-policy:' "$clean_headers"
grep -qi '^x-content-type-options: *nosniff' "$clean_headers"
grep -qi '^referrer-policy: *no-referrer' "$clean_headers"
grep -qi '^x-frame-options: *DENY' "$clean_headers"
grep -qi '^permissions-policy:' "$clean_headers"

asset_path="$(
  grep -oE '/assets/[^" ]+\.js' "$body" | sed -n '1p'
)"
if [[ -z "$asset_path" ]]; then
  echo "Production smoke failed: no fingerprinted JS asset found" >&2
  exit 1
fi

origin="${url%/}"
curl -fsS --connect-timeout 10 --max-time 30   -D "$asset_headers"   -o /dev/null   "${origin}${asset_path}"
tr -d '\r' < "$asset_headers" > "$clean_asset_headers"
grep -qi '^cache-control:.*immutable' "$clean_asset_headers"

echo "Production smoke passed: app, security headers and immutable asset cache are live."
