import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('core UI is usable and responsive', async ({ page }, testInfo) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByLabel(/Monster tank/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Shop' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Monsters' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Drop monster' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lab stats' })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    height: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  expect(overflow.width).toBeLessThanOrEqual(overflow.viewport + 1);
  expect(overflow.height).toBeLessThanOrEqual(overflow.viewportHeight + 1);

  await page.getByRole('button', { name: 'Shop' }).click();
  await expect(page.getByRole('dialog', { name: 'SHOP' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'SHOP' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Monsters' }).click();
  await expect(
    page.getByRole('dialog', { name: 'MONSTER EVOLUTION' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Lab stats' }).click();
  await expect(page.getByRole('dialog', { name: 'LAB' })).toBeVisible();
  await page.keyboard.press('Escape');

  if (testInfo.project.name.includes('desktop')) {
    const canvas = page.getByLabel(/Monster tank/);
    await canvas.focus();
    await page.keyboard.press('h');
    await expect(
      page.getByRole('button', { name: /Hold current monster|Swap current/ }),
    ).toBeDisabled();
    await page.keyboard.press(' ');
  } else {
    await page.getByRole('button', { name: /Hold current monster/ }).click();
    await page.getByRole('button', { name: 'Drop monster' }).click();
  }

  await page.waitForTimeout(550);
  expect(errors).toEqual([]);
});

test('initial screen has no serious automated accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  const result = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze();

  const serious = result.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );
  expect(serious).toEqual([]);

  await page.getByRole('button', { name: 'Shop' }).click();
  await expect(page.getByRole('dialog', { name: 'SHOP' })).toBeVisible();

  const modalResult = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze();
  const modalSerious = modalResult.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );
  expect(modalSerious).toEqual([]);

  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
});


test('idle render loop stays inside a safe frame budget', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.goto('/');
  await page.waitForTimeout(400);

  const stats = await page.evaluate(
    () =>
      new Promise<{ average: number; p95: number; max: number }>((resolve) => {
        const samples: number[] = [];
        let previous = performance.now();

        const sample = (time: number) => {
          samples.push(time - previous);
          previous = time;

          if (samples.length < 120) {
            requestAnimationFrame(sample);
            return;
          }

          const sorted = [...samples].sort((a, b) => a - b);
          const average =
            samples.reduce((sum, value) => sum + value, 0) / samples.length;
          const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
          const max = sorted[sorted.length - 1] ?? 0;
          resolve({ average, p95, max });
        };

        requestAnimationFrame(sample);
      }),
  );

  console.log(
    'Browser frame profile | average=' +
      stats.average.toFixed(2) +
      'ms | p95=' +
      stats.p95.toFixed(2) +
      'ms | max=' +
      stats.max.toFixed(2) +
      'ms',
  );

  expect(stats.average).toBeLessThan(35);
  expect(stats.p95).toBeLessThan(70);
});
