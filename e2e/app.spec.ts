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
  await expect(page.getByRole('button', { name: 'Lab and game modes' })).toBeVisible();

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
  await expect(page.getByRole('button', { name: 'Shop' })).toBeFocused();

  await page.getByRole('button', { name: 'Monsters' }).click();
  await expect(
    page.getByRole('dialog', { name: 'MONSTER EVOLUTION' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  await expect(page.getByRole('dialog', { name: 'LAB' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Endless Lab/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Experiments/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Daily Experiment/ })).toBeVisible();
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

test('background pause freezes active gameplay timers', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.goto('/');
  const dropButton = page.getByRole('button', { name: 'Drop monster' });
  await dropButton.click();
  await expect(dropButton).toBeDisabled();

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await page.waitForTimeout(550);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await expect(dropButton).toBeDisabled();
  await page.waitForTimeout(450);
  await expect(dropButton).toBeEnabled();
});

test('meta shop and saved Order stats stay isolated from non-Endless modes', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.addInitScript(() => {
    localStorage.setItem('monster-merge-coins-v3', '500');
    localStorage.setItem('monster-merge-order-v3', '5');
  });

  await page.goto('/');

  await page.getByRole('button', { name: 'Shop' }).click();
  const endlessShop = page.getByRole('dialog', { name: 'SHOP' });
  await expect(endlessShop.getByRole('button', { name: '● 200' })).toBeEnabled();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  await page.getByRole('button', { name: /Daily Experiment/ }).click();

  await page.getByRole('button', { name: 'Shop' }).click();
  const dailyShop = page.getByRole('dialog', { name: 'SHOP' });
  await expect(dailyShop).toContainText('Purchases are available in Endless Lab.');
  await expect(dailyShop.getByRole('button', { name: '● 200' })).toBeDisabled();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  const lab = page.getByRole('dialog', { name: 'LAB' });
  const ordersRow = lab.locator('dt', { hasText: 'Orders completed' }).locator('..');
  await expect(ordersRow.locator('dd')).toHaveText('4');

  await expect(page.getByLabel('500 coins')).toBeVisible();
});

test('telemetry bridge emits real gameplay events', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.addInitScript(() => {
    const events: string[] = [];
    Object.defineProperty(window, '__monsterMergeTelemetry', {
      value: events,
      configurable: true,
    });
    window.addEventListener('monster-merge:telemetry', (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string }>).detail;
      if (detail?.name) events.push(detail.name);
    });
  });

  await page.goto('/');

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __monsterMergeTelemetry?: string[];
            }
          ).__monsterMergeTelemetry ?? [],
      ),
    )
    .toContain('run_started');

  await page.getByRole('button', { name: 'Drop monster' }).click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __monsterMergeTelemetry?: string[];
            }
          ).__monsterMergeTelemetry ?? [],
      ),
    )
    .toContain('first_drop');
});

test('mode hub starts functional Experiment and Daily runs', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.addInitScript(() => {
    const events: string[] = [];
    Object.defineProperty(window, '__monsterMergeTelemetry', {
      value: events,
      configurable: true,
    });
    window.addEventListener('monster-merge:telemetry', (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string }>).detail;
      if (detail?.name) events.push(detail.name);
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  await page.getByRole('button', { name: /Experiments/ }).click();

  await expect(
    page.getByRole('button', { name: 'Hold unavailable in this mode' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Power-up unavailable in this mode' }),
  ).toBeDisabled();
  await expect(page.getByLabel('Experiment 1 objective')).toContainText(
    'Create a Peep',
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __monsterMergeTelemetry?: string[];
            }
          ).__monsterMergeTelemetry ?? [],
      ),
    )
    .toContain('experiment_started');

  const dropButton = page.getByRole('button', { name: 'Drop monster' });
  await dropButton.click();
  await page.waitForTimeout(500);
  await dropButton.click();
  const completionDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'EXPERIMENT COMPLETE' });
  await expect(completionDialog).toBeVisible({ timeout: 4000 });
  await expect(
    completionDialog.getByRole('button', { name: 'Retry' }),
  ).toBeFocused();
  await expect(page.locator('.concept-toolbar')).toHaveAttribute('inert', '');
  await expect(page.getByLabel(/Monster tank/)).toHaveAttribute('inert', '');

  await expect(
    completionDialog.getByRole('button', { name: 'Next Experiment' }),
  ).toBeVisible();
  await completionDialog
    .getByRole('button', { name: 'Next Experiment' })
    .click();
  await expect(page.getByLabel('Experiment 2 objective')).toContainText(
    'Create a Puff',
  );
  await expect(page.locator('.concept-toolbar')).not.toHaveAttribute('inert', '');

  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  await page.getByRole('button', { name: /Daily Experiment/ }).click();

  await expect(
    page.getByRole('button', { name: 'Power-up unavailable in this mode' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: /Hold current monster/ }),
  ).toBeEnabled();
  await expect(page.getByLabel('Daily Experiment objective')).toContainText(
    'FAIR RUN',
  );
});

test('Experiment progress persists and resumes after reload', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.goto('/');
  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  await page.getByRole('button', { name: /Experiments/ }).click();

  const dropButton = page.getByRole('button', { name: 'Drop monster' });
  await dropButton.click();
  await page.waitForTimeout(500);
  await dropButton.click();

  const completionDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'EXPERIMENT COMPLETE' });
  await expect(completionDialog).toBeVisible({ timeout: 4000 });

  await completionDialog.getByRole('button', { name: 'Lab' }).click();
  const completedExperimentCard = page.getByRole('button', {
    name: /^Experiments\b/,
  });
  await expect(completedExperimentCard).toBeEnabled();
  await expect(completedExperimentCard).toContainText('CONTINUE');

  await page.reload();
  await page.getByRole('button', { name: 'Lab and game modes' }).click();

  const experimentCard = page.getByRole('button', {
    name: /^Experiments\b/,
  });
  await expect(experimentCard).toContainText(
    'Continue with Experiment 2 of 12.',
  );
  await expect(experimentCard).toContainText('CONTINUE');

  const lab = page.getByRole('dialog', { name: 'LAB' });
  const completedRow = lab
    .locator('dt', { hasText: 'Experiments completed' })
    .locator('..');
  await expect(completedRow.locator('dd')).toHaveText('1/12');

  await experimentCard.click();
  await expect(page.getByLabel('Experiment 2 objective')).toContainText(
    'Create a Puff',
  );
});

test('active Experiment run restores its physics state after reload', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.goto('/');
  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  await page.getByRole('button', { name: /Experiments/ }).click();

  const dropButton = page.getByRole('button', { name: 'Drop monster' });
  await dropButton.click();
  await page.waitForTimeout(550);

  await page.reload();
  await expect(page.getByLabel('Experiment 1 objective')).toContainText(
    'Create a Peep',
  );

  const restoredSession = await page.evaluate(() => {
    const raw = localStorage.getItem('monster-merge-active-run-v1');
    return raw ? JSON.parse(raw) : null;
  });
  expect(restoredSession?.mode).toBe('experiments');
  expect(restoredSession?.bodies?.length).toBe(1);

  await page.getByRole('button', { name: 'Drop monster' }).click();
  const completionDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'EXPERIMENT COMPLETE' });
  await expect(completionDialog).toBeVisible({ timeout: 4000 });
});

test('restored Experiment at drop limit resolves without an extra drop', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.addInitScript(() => {
    const session = {
      version: 1,
      savedAt: Date.now(),
      mode: 'experiments',
      experimentId: 'exp-12',
      ui: {
        score: 0,
        progress: 0,
        orderNo: 1,
        currentTier: 0,
        nextTier: 1,
        afterNextTier: 2,
        holdTier: null,
        canHold: true,
        bestCombo: 0,
        overdrive: 0,
        overdriveActive: false,
        runHighestTier: 3,
        runMerges: 0,
        runDrops: 14,
        runHoldUses: 0,
        runPowerUses: 0,
        runOrdersCompleted: 0,
        runRescues: 0,
      },
      bodies: [],
      fixedQueue: [],
      spawnBag: [],
      aimX: 180,
      dangerElapsedMs: null,
      overdriveRemainingMs: 0,
    };
    localStorage.setItem(
      'monster-merge-active-run-v1',
      JSON.stringify(session),
    );
  });

  await page.goto('/');

  await expect(page.getByLabel('Experiment 12 objective')).toContainText(
    'Create a Beast',
  );
  await expect(
    page.getByRole('button', { name: 'Drop monster' }),
  ).toBeDisabled();

  const failedDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'EXPERIMENT FAILED' });
  await expect(failedDialog).toBeVisible({ timeout: 3500 });
  await expect(failedDialog).toContainText('DROP LIMIT');

  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem('monster-merge-active-run-v1'),
      ),
    )
    .toBeNull();
});

test('Daily restores the same visible queue position after reload', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.goto('/');
  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  await page.getByRole('button', { name: /Daily Experiment/ }).click();

  await page.getByRole('button', { name: 'Drop monster' }).click();
  await page.waitForTimeout(550);
  const expectedNext = await page
    .getByRole('group', { name: /Next monster tier/ })
    .getAttribute('aria-label');

  await page.reload();
  await expect(page.getByLabel('Daily Experiment objective')).toContainText(
    'FAIR RUN',
  );
  await expect(
    page.getByRole('group', { name: /Next monster tier/ }),
  ).toHaveAttribute('aria-label', expectedNext ?? '');
});

test('invalid active-run snapshot falls back safely and is discarded', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.addInitScript(() => {
    localStorage.setItem('monster-merge-active-run-v1', '{bad json');
  });
  await page.goto('/');

  await expect(page.getByRole('region', { name: 'Orders' })).toBeVisible();
  await expect(
    page.getByLabel('Experiment 1 objective'),
  ).toHaveCount(0);
  const snapshot = await page.evaluate(() =>
    localStorage.getItem('monster-merge-active-run-v1'),
  );
  expect(snapshot).toBeNull();
});

test('enlarged tank and HUD stay clear across target viewports', async ({
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
      const rectOf = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      };

      const hud = [
        '.status-cluster',
        '.concept-top-actions',
        '.next-board',
        '.hold-board',
        '.orders-board',
      ]
        .map((selector) => document.querySelector<HTMLElement>(selector))
        .filter((element): element is HTMLElement => element !== null)
        .map(rectOf);

      const touchTargets = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.hold-board, .concept-toolbar button, .icon-button',
        ),
      ).map(rectOf);

      if (!shell || !frame || !toolbar) return null;

      return {
        shell: rectOf(shell),
        frame: rectOf(frame),
        toolbar: rectOf(toolbar),
        hud,
        touchTargets,
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
      expect(rect.left, viewport.name + ' HUD viewport left').toBeGreaterThanOrEqual(-2);
      expect(rect.right, viewport.name + ' HUD viewport right').toBeLessThanOrEqual(
        geometry.viewportWidth + 2,
      );
      expect(rect.top, viewport.name + ' HUD viewport top').toBeGreaterThanOrEqual(-2);
      expect(rect.bottom, viewport.name + ' HUD viewport bottom').toBeLessThanOrEqual(
        geometry.viewportHeight + 2,
      );

      const overlapsTank =
        rect.left < geometry.frame.right - 1 &&
        rect.right > geometry.frame.left + 1 &&
        rect.top < geometry.frame.bottom - 1 &&
        rect.bottom > geometry.frame.top + 1;
      expect(overlapsTank, viewport.name + ' HUD must not overlap tank').toBe(false);
    }

    for (const rect of geometry.touchTargets) {
      expect(rect.width, viewport.name + ' touch target width').toBeGreaterThanOrEqual(44);
      expect(rect.height, viewport.name + ' touch target height').toBeGreaterThanOrEqual(44);
    }

    expect(geometry.scrollWidth, viewport.name + ' horizontal overflow').toBeLessThanOrEqual(
      geometry.viewportWidth + 1,
    );
    expect(geometry.scrollHeight, viewport.name + ' vertical overflow').toBeLessThanOrEqual(
      geometry.viewportHeight + 1,
    );
  }
});


test('critical HUD copy stays legible across target viewports', async ({
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

    const initialSizes = await page.evaluate(() => {
      const selectors = [
        '.score-plaque span',
        '.overdrive-panel > span',
        '.orders-board h2',
        '.order-row.current span',
        '.order-row.current b',
        '.coach',
      ];
      return selectors.map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        return {
          selector,
          size: element ? Number.parseFloat(getComputedStyle(element).fontSize) : 0,
        };
      });
    });

    for (const item of initialSizes) {
      expect(
        item.size,
        viewport.name + ' ' + item.selector + ' font size',
      ).toBeGreaterThanOrEqual(7);
    }

    await page.getByRole('button', { name: 'Lab and game modes' }).click();
    await page.getByRole('button', { name: /^Experiments\b/ }).click();

    const objectiveSizes = await page.evaluate(() => {
      const selectors = ['.mode-objective strong', '.mode-objective span'];
      return selectors.map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        return {
          selector,
          size: element ? Number.parseFloat(getComputedStyle(element).fontSize) : 0,
        };
      });
    });

    for (const item of objectiveSizes) {
      expect(
        item.size,
        viewport.name + ' ' + item.selector + ' font size',
      ).toBeGreaterThanOrEqual(7);
    }
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
