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

  const dropButton = page.getByRole('button', { name: 'Drop monster' });
  await expect(dropButton).toBeDisabled();
  await page.waitForTimeout(550);
  await expect(dropButton).toBeEnabled();
  await expect(
    page.getByRole('button', { name: /Hold current monster|Swap current/ }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test('enlarged tank stays inside the scene and clear of the toolbar', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  const viewports = [
    { name: 'small-phone', width: 320, height: 568 },
    { name: 'regular-phone', width: 390, height: 844 },
    { name: 'pro-max', width: 430, height: 932 },
    { name: 'landscape', width: 844, height: 390 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    const geometry = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>('.game-shell');
      const frame = document.querySelector<HTMLElement>('.game-frame');
      const toolbar = document.querySelector<HTMLElement>('.concept-toolbar');
      const hud = [
        '.next-board',
        '.hold-board',
        '.orders-board',
        '.overdrive-panel',
        '.score-plaque',
      ]
        .map((selector) => document.querySelector<HTMLElement>(selector))
        .filter((element): element is HTMLElement => element !== null)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
        });

      if (!shell || !frame || !toolbar) return null;

      const shellRect = shell.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();

      return {
        shell: {
          left: shellRect.left,
          top: shellRect.top,
          right: shellRect.right,
          bottom: shellRect.bottom,
          width: shellRect.width,
          height: shellRect.height,
        },
        frame: {
          left: frameRect.left,
          top: frameRect.top,
          right: frameRect.right,
          bottom: frameRect.bottom,
          width: frameRect.width,
          height: frameRect.height,
        },
        toolbar: {
          top: toolbarRect.top,
        },
        hud,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry, viewport.name).not.toBeNull();
    if (!geometry) continue;

    expect(
      Math.abs(geometry.frame.width / geometry.shell.width - 0.744),
      viewport.name + ' tank width ratio',
    ).toBeLessThan(0.01);
    expect(
      Math.abs(geometry.frame.height / geometry.shell.height - 0.649),
      viewport.name + ' tank height ratio',
    ).toBeLessThan(0.01);

    expect(geometry.frame.left, viewport.name + ' left edge').toBeGreaterThanOrEqual(
      geometry.shell.left - 1,
    );
    expect(geometry.frame.right, viewport.name + ' right edge').toBeLessThanOrEqual(
      geometry.shell.right + 1,
    );
    expect(geometry.frame.top, viewport.name + ' top edge').toBeGreaterThanOrEqual(
      geometry.shell.top - 1,
    );
    expect(geometry.frame.bottom, viewport.name + ' toolbar clearance').toBeLessThanOrEqual(
      geometry.toolbar.top + 1,
    );

    for (const rect of geometry.hud) {
      expect(rect.width, viewport.name + ' HUD width').toBeGreaterThan(0);
      expect(rect.height, viewport.name + ' HUD height').toBeGreaterThan(0);
      expect(rect.left, viewport.name + ' HUD left').toBeGreaterThanOrEqual(
        geometry.shell.left - 2,
      );
      expect(rect.right, viewport.name + ' HUD right').toBeLessThanOrEqual(
        geometry.shell.right + 2,
      );
      expect(rect.top, viewport.name + ' HUD top').toBeGreaterThanOrEqual(
        geometry.shell.top - 2,
      );
      expect(rect.bottom, viewport.name + ' HUD bottom').toBeLessThanOrEqual(
        geometry.shell.bottom + 2,
      );
    }

    expect(geometry.scrollWidth, viewport.name + ' horizontal overflow').toBeLessThanOrEqual(
      geometry.viewportWidth + 1,
    );
    expect(geometry.scrollHeight, viewport.name + ' vertical overflow').toBeLessThanOrEqual(
      geometry.viewportHeight + 1,
    );
  }
});

test('initial screen has no serious automated accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  const result = await new AxeBuilder({ page }).analyze();

  const serious = result.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );
  expect(serious).toEqual([]);

  await page.getByRole('button', { name: 'Shop' }).click();
  await expect(page.getByRole('dialog', { name: 'SHOP' })).toBeVisible();

  const modalResult = await new AxeBuilder({ page }).analyze();
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
