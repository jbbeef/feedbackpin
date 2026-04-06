import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Single worker: all tests share one test user, so parallel runs cause session conflicts
  workers: 1,
  timeout: 60000,
  // Global setup signs in once and saves auth state — avoids per-test sign-in rate limits
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    // Re-use the saved auth state so tests don't need to sign in themselves
    storageState: 'tests/auth-state.json',
  },
  // Run auth tests last: F003 logout uses scope:'global' which revokes all sessions.
  // Other tests must complete first while the global setup session is still valid.
  projects: [
    {
      name: 'main',
      testMatch: [
        '**/comments.spec.ts',
        '**/project-creation.spec.ts',
        '**/share.spec.ts',
      ],
    },
    {
      name: 'auth',
      testMatch: ['**/auth.spec.ts'],
      // Runs after main — session invalidation from signOut doesn't affect other tests
      dependencies: ['main'],
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run start',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120000,
    },
    // Screenshot worker is intentionally excluded from the automated test suite
    // because it launches a full Chromium browser internally that causes OOM on
    // machines with limited free RAM (~50 MB free on this dev machine).
    // To run F007 (screenshot) tests manually: start the worker first with
    //   node --experimental-strip-types src/workers/screenshot.ts
    // then run: npx playwright test tests/screenshot.spec.ts
  ],
});
