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

  await expect(page.getByLabel(/Monster tank/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Drop monster' })).toBeVisible();

  await context.setOffline(false);
});


test('service worker removes obsolete cache generations', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('chromium'));

  await page.goto('/');
  await expect
    .poll(() =>
      page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return false;
        await navigator.serviceWorker.ready;
        return true;
      }),
    )
    .toBe(true);

  await page.evaluate(async () => {
    await caches.open('monster-merge-lab-shell-v1');
    await caches.open('monster-merge-lab-runtime-v1');
  });

  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const keys = await caches.keys();
        return {
          oldShell: keys.includes('monster-merge-lab-shell-v1'),
          oldRuntime: keys.includes('monster-merge-lab-runtime-v1'),
          newShell: keys.includes('monster-merge-lab-shell-v2'),
        };
      }),
    )
    .toEqual({
      oldShell: false,
      oldRuntime: false,
      newShell: true,
    });
});
