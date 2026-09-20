const CACHE_NAME = 'monster-merge-lab-shell-v2';
const RUNTIME_CACHE = 'monster-merge-lab-runtime-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/lab-bg-v1.webp',
  '/assets/monster-atlas-v1.webp',
];

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
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
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
