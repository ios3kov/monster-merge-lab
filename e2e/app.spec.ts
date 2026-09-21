import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function dropOnField(page: Page) {
  await page.getByLabel(/Monster tank/).click();
}

function dropSurface(page: Page) {
  return page.getByLabel(/Monster tank/);
}

test('core UI is usable and responsive', async ({ page }, testInfo) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByLabel(/Monster tank/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Shop' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Monster book' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restart run' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Monsters' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Power-up/ })).toHaveCount(0);

  const toolbarLabels = await page
    .locator('.reference-toolbar > button')
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label')),
    );
  expect(toolbarLabels).toEqual([
    'Shop',
    'Lab and game modes',
    'Monster book',
    'Restart run',
  ]);

  await expect(page.locator('.thumb-eye')).toHaveCount(0);
  await expect(page.locator('.thumb-mouth')).toHaveCount(0);
  const monsterSources = await page
    .locator('img.monster-body')
    .evaluateAll((images) =>
      images.map((image) => (image as HTMLImageElement).getAttribute('src')),
    );
  expect(monsterSources.length).toBeGreaterThan(0);
  for (const source of monsterSources) {
    expect(source).toMatch(/^\/assets\/monsters\/tier-[0-8]\.svg$/);
    expect(source).not.toContain('monster-tiers.webp');
  }
  await expect(page.locator('.monster-body:not(img)')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Drop monster' })).toHaveCount(0);
  await expect(dropSurface(page)).toHaveAttribute('aria-disabled', 'false');
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

  await page.getByRole('button', { name: 'Monster book' }).click();
  await expect(
    page.getByRole('dialog', { name: 'MONSTER EVOLUTION' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Restart run' }).click();
  await expect(dropSurface(page)).toHaveAttribute('aria-disabled', 'false');

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
    await dropOnField(page);
  }

  const field = dropSurface(page);
  await expect(field).toHaveAttribute('aria-disabled', 'true');
  await page.waitForTimeout(550);
  await expect(field).toHaveAttribute('aria-disabled', 'false');
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
  const field = dropSurface(page);
  await dropOnField(page);
  await expect(field).toHaveAttribute('aria-disabled', 'true');

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

  await expect(field).toHaveAttribute('aria-disabled', 'true');
  await page.waitForTimeout(450);
  await expect(field).toHaveAttribute('aria-disabled', 'false');
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

  await dropOnField(page);

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
  await expect(page.getByRole('button', { name: /^Power-up/ })).toHaveCount(0);
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

  await dropOnField(page);
  await page.waitForTimeout(500);
  await dropOnField(page);
  const completionDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'EXPERIMENT COMPLETE' });
  await expect(completionDialog).toBeVisible({ timeout: 4000 });
  await expect(
    completionDialog.getByRole('button', { name: 'Retry' }),
  ).toBeFocused();
  await expect(page.locator('.reference-toolbar')).toHaveAttribute('inert', '');
  await expect(page.getByLabel(/Monster tank/)).toHaveAttribute('inert', '');

  await completionDialog.getByRole('button', { name: 'Lab' }).click();
  const layeredLab = page.getByRole('dialog', { name: 'LAB' });
  await expect(layeredLab).toBeVisible();
  await expect(layeredLab.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(layeredLab).toHaveCount(0);
  await expect(
    completionDialog.getByRole('button', { name: 'Retry' }),
  ).toBeFocused();
  await expect(page.locator('.reference-toolbar')).toHaveAttribute('inert', '');

  await expect(
    completionDialog.getByRole('button', { name: 'Next Experiment' }),
  ).toBeVisible();
  await completionDialog
    .getByRole('button', { name: 'Next Experiment' })
    .click();
  await expect(page.getByLabel('Experiment 2 objective')).toContainText(
    'Create a Puff',
  );
  await expect(page.locator('.reference-toolbar')).not.toHaveAttribute('inert', '');

  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  await page.getByRole('button', { name: /Daily Experiment/ }).click();

  await expect(page.getByRole('button', { name: /^Power-up/ })).toHaveCount(0);
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

  await dropOnField(page);
  await page.waitForTimeout(500);
  await dropOnField(page);

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

  await dropOnField(page);
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

  await dropOnField(page);
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
  await expect(dropSurface(page)).toHaveAttribute('aria-disabled', 'true');

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

  await dropOnField(page);
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
      const frame = document.querySelector<HTMLElement>('.reference-field');
      const toolbar = document.querySelector<HTMLElement>('.reference-toolbar');
      const hudGrid = document.querySelector<HTMLElement>('.reference-hud');
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
        '.reference-score-card',
        '.reference-meta-actions',
        '.reference-next',
        '.reference-hold',
        '.reference-orders',
      ]
        .map((selector) => ({ selector, element: document.querySelector<HTMLElement>(selector) }))
        .filter((item): item is { selector: string; element: HTMLElement } => item.element !== null)
        .map(({ selector, element }) => ({ selector, ...rectOf(element) }));

      const touchTargets = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.reference-hold, .reference-toolbar button, .reference-sound',
        ),
      ).map(rectOf);

      const readableTextSizes = [
        '.reference-hold > span',
        '.reference-score span',
        '.reference-overdrive > span',
        '.reference-orders h2',
        '.reference-order-row.current span',
        '.reference-order-row.current b',
      ]
        .map((selector) => document.querySelector<HTMLElement>(selector))
        .filter((element): element is HTMLElement => element !== null)
        .map((element) => parseFloat(getComputedStyle(element).fontSize));

      const contentFit = [
        '.reference-score-card',
        '.reference-hud__meta',
        '.reference-orders',
        '.reference-coins',
      ]
        .map((selector) => ({
          selector,
          element: document.querySelector<HTMLElement>(selector),
        }))
        .filter(
          (item): item is { selector: string; element: HTMLElement } =>
            item.element !== null,
        )
        .map(({ selector, element }) => ({
          selector,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
        }));

      if (!shell || !frame || !toolbar || !hudGrid) return null;

      return {
        shell: rectOf(shell),
        frame: rectOf(frame),
        toolbar: rectOf(toolbar),
        hudGrid: rectOf(hudGrid),
        hud,
        touchTargets,
        readableTextSizes,
        contentFit,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry, viewport.name).not.toBeNull();
    if (!geometry) continue;

    expect(
      Math.abs(geometry.frame.width / geometry.shell.width - 0.92),
      viewport.name + ' tank width ratio',
    ).toBeLessThan(0.01);
    const expectedFrameHeight =
      viewport.name === 'landscape' ? 0.69 : 0.67;
    const expectedFrameTop =
      viewport.name === 'landscape' ? 0.154 : 0.18;

    expect(
      Math.abs(
        geometry.frame.height / geometry.shell.height - expectedFrameHeight,
      ),
      viewport.name + ' tank height ratio',
    ).toBeLessThan(0.01);
    expect(
      Math.abs(
        (geometry.frame.top - geometry.shell.top) / geometry.shell.height -
          expectedFrameTop,
      ),
      viewport.name + ' tank top ratio',
    ).toBeLessThan(0.01);

    if (viewport.name !== 'landscape') {
      expect(
        Math.abs(geometry.toolbar.width - geometry.frame.width),
        viewport.name + ' toolbar width matches tank',
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(geometry.toolbar.left - geometry.frame.left),
        viewport.name + ' toolbar left aligns with tank',
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(geometry.toolbar.right - geometry.frame.right),
        viewport.name + ' toolbar right aligns with tank',
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(geometry.hudGrid.width - geometry.frame.width),
        viewport.name + ' HUD width matches tank',
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(geometry.hudGrid.left - geometry.frame.left),
        viewport.name + ' HUD left aligns with tank',
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(geometry.hudGrid.right - geometry.frame.right),
        viewport.name + ' HUD right aligns with tank',
      ).toBeLessThanOrEqual(2);
    } else {
      expect(
        Math.abs(
          (geometry.toolbar.left + geometry.toolbar.right) / 2 -
            (geometry.frame.left + geometry.frame.right) / 2,
        ),
        'landscape toolbar stays centered on tank',
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(
          (geometry.hudGrid.left + geometry.hudGrid.right) / 2 -
            (geometry.frame.left + geometry.frame.right) / 2,
        ),
        'landscape HUD stays centered on tank',
      ).toBeLessThanOrEqual(2);
    }

    expect(geometry.frame.left, viewport.name + ' left edge').toBeGreaterThanOrEqual(
      geometry.shell.left - 1,
    );
    expect(geometry.frame.right, viewport.name + ' right edge').toBeLessThanOrEqual(
      geometry.shell.right + 1,
    );
    expect(geometry.frame.top, viewport.name + ' top edge').toBeGreaterThanOrEqual(
      geometry.shell.top - 1,
    );
    expect(
      geometry.hudGrid.bottom,
      viewport.name + ' HUD clearance above tank',
    ).toBeLessThanOrEqual(geometry.frame.top + 1);
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
      expect(overlapsTank, viewport.name + ' HUD must not overlap tank: ' + rect.selector + ' ' + JSON.stringify(rect)).toBe(false);
    }

    for (const rect of geometry.touchTargets) {
      expect(rect.width, viewport.name + ' touch target width').toBeGreaterThanOrEqual(44);
      expect(rect.height, viewport.name + ' touch target height').toBeGreaterThanOrEqual(44);
    }

    for (const fontSize of geometry.readableTextSizes) {
      expect(fontSize, viewport.name + ' HUD readable text size').toBeGreaterThanOrEqual(8);
    }

    for (const item of geometry.contentFit) {
      expect(
        item.scrollWidth,
        viewport.name + ' HUD content width: ' + item.selector,
      ).toBeLessThanOrEqual(item.clientWidth + 1);
      expect(
        item.scrollHeight,
        viewport.name + ' HUD content height: ' + item.selector,
      ).toBeLessThanOrEqual(item.clientHeight + 1);
    }

    expect(geometry.scrollWidth, viewport.name + ' horizontal overflow').toBeLessThanOrEqual(
      geometry.viewportWidth + 1,
    );
    expect(geometry.scrollHeight, viewport.name + ' vertical overflow').toBeLessThanOrEqual(
      geometry.viewportHeight + 1,
    );
  }
});

test('game screen keeps artwork clean and UI content live', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.goto('/');

  await expect(page.locator('.field-art')).toHaveCount(0);

  const layers = await page.evaluate(() => {
    const backgroundImage = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      return element ? getComputedStyle(element).backgroundImage : '';
    };

    return {
      shell: backgroundImage('.game-shell'),
      frame: backgroundImage('.reference-field'),
      hud: backgroundImage('.reference-hud'),
      holdButton: backgroundImage('.reference-hold'),
      soundButton: backgroundImage('.reference-sound'),
      toolbar: backgroundImage('.reference-toolbar'),
      button: backgroundImage('.reference-toolbar .reference-toolbar-button'),
    };
  });

  expect(layers.shell).toContain('monster-workshop-background.webp');
  expect(layers.frame).toContain('tank-frame.webp');
  expect(layers.hud).toContain('toolbar-frame.svg');
  expect(layers.holdButton).toContain('linear-gradient');
  expect(layers.holdButton).not.toContain('button-frame.svg');
  expect(layers.soundButton).toContain('linear-gradient');
  expect(layers.soundButton).not.toContain('button-frame.svg');
  expect(layers.toolbar).toContain('toolbar-frame.svg');
  expect(layers.button).toContain('button-frame.svg');

  const deprecatedArtwork = [
    'monster-ui-assets.webp',
    'hud-frame.webp',
    'score-panel.webp',
    'hold-panel.webp',
    'next-panel.webp',
    'orders-panel.webp',
    'monster-tiers.webp',
    'nav-frame.webp',
  ];
  for (const asset of deprecatedArtwork) {
    for (const layer of Object.values(layers)) {
      expect(layer, asset + ' must not be used').not.toContain(asset);
    }
  }
});


test('all transparent monster tier assets are available', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.goto('/');

  const assets = await page.evaluate(async () => {
    const results = [];
    for (let tier = 0; tier <= 8; tier += 1) {
      const path = '/assets/monsters/tier-' + String(tier) + '.svg';
      const response = await fetch(path);
      const text = await response.text();
      results.push({
        path,
        ok: response.ok,
        contentType: response.headers.get('content-type') ?? '',
        hasSvg: text.includes('<svg'),
        hasOpaqueCanvas: /<rect[^>]+(?:fill=["'](?:#fff|#ffffff|white)|width=["']256["'][^>]+height=["']256["'])/i.test(text),
      });
    }
    return results;
  });

  expect(assets).toHaveLength(9);
  for (const asset of assets) {
    expect(asset.ok, asset.path).toBe(true);
    expect(asset.contentType, asset.path).toContain('image/svg+xml');
    expect(asset.hasSvg, asset.path).toBe(true);
    expect(asset.hasOpaqueCanvas, asset.path).toBe(false);
  }
});

test('Experiment objective hints wrap in portrait and stay compact in landscape', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.addInitScript(() => localStorage.clear());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Lab and game modes' }).click();
  await page.getByRole('button', { name: /^Experiments\b/ }).click();

  const hint = page.locator('.reference-objective span');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('Merge two Sprouts');

  const portraitStyle = await hint.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      whiteSpace: style.whiteSpace,
      lineClamp: style.getPropertyValue('-webkit-line-clamp'),
    };
  });
  expect(portraitStyle.whiteSpace).toBe('normal');
  expect(portraitStyle.lineClamp).toBe('2');

  await page.setViewportSize({ width: 844, height: 390 });
  const landscapeStyle = await hint.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      whiteSpace: style.whiteSpace,
      lineClamp: style.getPropertyValue('-webkit-line-clamp'),
    };
  });
  expect(landscapeStyle.whiteSpace).toBe('nowrap');
  expect(landscapeStyle.lineClamp).toBe('1');
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


test('crowded active board stays inside a safe frame budget', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'));

  await page.addInitScript(() => {
    const bodies = Array.from({ length: 48 }, (_, index) => {
      const column = index % 8;
      const row = Math.floor(index / 8);
      return {
        tier: 0,
        x: 55 + column * 36,
        y: 220 + row * 42,
        vx: column % 2 === 0 ? 8 : -8,
        vy: 0,
        angle: 0,
        omega: 0,
        impact: 0,
        pressure: 0,
        ageMs: 1200,
      };
    });

    localStorage.setItem(
      'monster-merge-active-run-v1',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        mode: 'endless',
        ui: {
          score: 0,
          progress: 0,
          orderNo: 1,
          currentTier: 0,
          nextTier: 1,
          afterNextTier: 0,
          holdTier: null,
          canHold: true,
          bestCombo: 0,
          overdrive: 0,
          overdriveActive: false,
          runHighestTier: 0,
          runMerges: 0,
          runDrops: 48,
          runHoldUses: 0,
          runPowerUses: 0,
          runOrdersCompleted: 0,
          runRescues: 0,
        },
        bodies,
        fixedQueue: [],
        spawnBag: [],
        aimX: 180,
        dangerElapsedMs: null,
        overdriveRemainingMs: 0,
      }),
    );
  });

  await page.goto('/');
  await expect(page.getByLabel(/Monster tank/)).toBeVisible();
  await page.waitForTimeout(300);

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
          resolve({
            average:
              samples.reduce((sum, value) => sum + value, 0) / samples.length,
            p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
            max: sorted[sorted.length - 1] ?? 0,
          });
        };

        requestAnimationFrame(sample);
      }),
  );

  console.log(
    'Crowded board frame profile | average=' +
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
