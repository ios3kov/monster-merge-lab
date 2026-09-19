const SHELL_CACHE = 'monster-merge-lab-shell-v2';
const RUNTIME_CACHE = 'monster-merge-lab-runtime-v2';
const RUNTIME_CACHE_LIMIT = 24;
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/assets/lab-bg-v1.webp',
  '/assets/monster-atlas-v1.webp',
];

async function trimRuntimeCache(cache) {
  const keys = await cache.keys();
  const overflow = keys.length - RUNTIME_CACHE_LIMIT;
  if (overflow <= 0) return;

  await Promise.all(
    keys.slice(0, overflow).map((request) => cache.delete(request)),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
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
            .filter(
              (key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE,
            )
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
            const copy = response.clone();
            void caches
              .open(SHELL_CACHE)
              .then((cache) => cache.put('/index.html', copy));
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

      return fetch(request).then(async (response) => {
        if (response.ok && url.pathname.startsWith('/assets/')) {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(request, response.clone());
          await trimRuntimeCache(cache);
        }
        return response;
      });
    }),
  );
});
