import { expect, test } from '@playwright/test';

test('manifest and service worker provide an offline app shell', async ({
  page,
  context,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('chromium'));

  await page.goto('/');

  await expect(page.getByLabel(/Monster tank/)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return false;
        await navigator.serviceWorker.ready;
        return true;
      }),
    )
    .toBe(true);

  if (
    !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  ) {
    await page.reload();
  }

  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  // Warm Vite's hashed JS/CSS through the active service worker once.
  // The first page load happens before service-worker control is established.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByLabel(/Monster tank/)).toBeVisible();

  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const manifestJson = await manifest.json();
  expect(manifestJson.start_url).toBe('/');
  expect(manifestJson.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      }),
      expect.objectContaining({
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      }),
    ]),
  );

  const icon = await page.request.get('/icons/icon-192.png');
  expect(icon.ok()).toBe(true);
  expect(icon.headers()['content-type']).toContain('image/png');

  await page.evaluate(async () => {
    const cache = await caches.open('monster-merge-lab-runtime-v2');
    for (let index = 0; index < 30; index += 1) {
      await cache.put(
        '/assets/stale-' + String(index) + '.js',
        new Response('stale', {
          headers: { 'content-type': 'application/javascript' },
        }),
      );
    }

    await fetch('/assets/lab-bg-v1.webp?cache-prune-check=1');
  });

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const names = await caches.keys();
        const runtime = await caches.open('monster-merge-lab-runtime-v2');
        return {
          names,
          runtimeEntries: (await runtime.keys()).length,
        };
      }),
    )
    .toMatchObject({
      names: expect.arrayContaining([
        'monster-merge-lab-shell-v2',
        'monster-merge-lab-runtime-v2',
      ]),
      runtimeEntries: 24,
    });

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByLabel(/Monster tank/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Drop monster' })).toBeVisible();

  await context.setOffline(false);
});
