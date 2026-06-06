import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  workers: 1,
  use: {
    headless: true,
    baseURL: 'http://localhost:3010',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3010',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
