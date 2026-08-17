import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Signal Monitor (the app under test) lives in its own separate project,
  // not inside this automation repo, so it isn't auto-started here; start
  // it per its own README (backend on :3000, frontend on :5173) before
  // running this suite. See automation/README.md.
});
