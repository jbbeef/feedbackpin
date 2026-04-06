import { chromium } from '@playwright/test';

const CONFIRMED_EMAIL = 'testuser@feedbackpin-e2e.dev';
const CONFIRMED_PASSWORD = 'TestPassword123!';

/**
 * Global setup: signs in once and saves browser storage state to disk.
 * All test files then load this state via `storageState` in playwright.config.ts,
 * avoiding repeated sign-in calls that can trigger Supabase auth rate limits.
 */
export default async function globalSetup() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const page = await context.newPage();

  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(CONFIRMED_EMAIL);
  await page.getByLabel('Password').fill(CONFIRMED_PASSWORD);
  await page.locator('form button[type="submit"]').click();

  // Wait for redirect to /dashboard
  await page.waitForURL('/dashboard', { timeout: 20000 });

  // Save storage state (cookies + localStorage) to disk
  await context.storageState({ path: 'tests/auth-state.json' });
  await browser.close();
}
