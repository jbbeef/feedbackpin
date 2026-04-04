import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Single worker: all tests share one test user, so parallel runs cause session conflicts
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
