import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Single worker: all tests share one test user, so parallel runs cause session conflicts
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
    },
    {
      // Screenshot worker — runs Playwright internally; must start before tests
      command: 'node --experimental-strip-types src/workers/screenshot.ts',
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      // Allow up to 30s for the worker to start
      timeout: 30000,
    },
  ],
});
