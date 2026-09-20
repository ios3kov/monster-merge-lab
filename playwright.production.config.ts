import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'production.spec.ts',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL ??
      'https://monster-merge-lab.os3kov.workers.dev',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
