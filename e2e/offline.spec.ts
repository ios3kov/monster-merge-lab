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
  expect((await manifest.json()).start_url).toBe('/');

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  const field = page.getByLabel(/Monster tank/);
  await expect(field).toBeVisible();
  await expect(field).toHaveAttribute('aria-disabled', 'false');
  await expect(page.getByRole('button', { name: 'Drop monster' })).toHaveCount(0);

  await context.setOffline(false);
});


test('service worker prunes stale runtime assets after online navigation', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('chromium'));

  await page.goto('/');
  await expect
    .poll(() =>
      page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return false;
        await navigator.serviceWorker.ready;
        return Boolean(navigator.serviceWorker.controller);
      }),
    )
    .toBe(true);

  await page.evaluate(async () => {
    const runtime = await caches.open('monster-merge-lab-runtime-v2');
    await runtime.put(
      '/assets/stale-build.js',
      new Response('stale', {
        headers: { 'content-type': 'text/javascript' },
      }),
    );
  });

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByLabel(/Monster tank/)).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const runtime = await caches.open('monster-merge-lab-runtime-v2');
        return Boolean(await runtime.match('/assets/stale-build.js'));
      }),
    )
    .toBe(false);
});
