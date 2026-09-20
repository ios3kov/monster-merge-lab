const CACHE_NAME = 'monster-merge-lab-shell-v2';
const RUNTIME_CACHE = 'monster-merge-lab-runtime-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/lab-bg-v1.webp',
  '/assets/monster-atlas-v1.webp',
];

function currentRuntimeAssetPaths(html) {
  const paths = new Set();
  for (const match of html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)) {
    paths.add(match[1]);
  }
  return paths;
}

async function cacheNavigationResponse(response) {
  const html = await response.clone().text();
  const currentAssets = currentRuntimeAssetPaths(html);

  const [shellCache, runtimeCache] = await Promise.all([
    caches.open(CACHE_NAME),
    caches.open(RUNTIME_CACHE),
  ]);

  await shellCache.put('/index.html', response.clone());

  const runtimeRequests = await runtimeCache.keys();
  await Promise.all(
    runtimeRequests.map((request) => {
      const path = new URL(request.url).pathname;
      if (path.startsWith('/assets/') && !currentAssets.has(path)) {
        return runtimeCache.delete(request);
      }
      return Promise.resolve(false);
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            void cacheNavigationResponse(response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match('/index.html')) ??
            (await caches.match('/')) ??
            Response.error()
          );
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          const cacheName = url.pathname.startsWith('/assets/')
            ? RUNTIME_CACHE
            : CACHE_NAME;
          void caches.open(cacheName).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
