import { expect, test } from '@playwright/test';

test('production supports Lab navigation and a real first drop', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.addInitScript(() => {
    localStorage.clear();
    const events: string[] = [];
    Object.defineProperty(window, '__productionSmokeTelemetry', {
      value: events,
      configurable: true,
    });
    window.addEventListener('monster-merge:telemetry', (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string }>).detail;
      if (detail?.name) events.push(detail.name);
    });
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle('Monster Merge Lab');
  await expect(page.getByLabel(/Monster tank/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Drop monster' })).toBeVisible();

  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  await expect(page.getByRole('dialog', { name: 'LAB' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'LAB' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Drop monster' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __productionSmokeTelemetry?: string[];
            }
          ).__productionSmokeTelemetry ?? [],
      ),
    )
    .toContain('first_drop');

  expect(errors).toEqual([]);
});
