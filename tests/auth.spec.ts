import { test, expect, type Page } from '@playwright/test';

const CONFIRMED_EMAIL = 'testuser@feedbackpin-e2e.dev';
const CONFIRMED_PASSWORD = 'TestPassword123!';

/** Signs in via the login form and waits for /dashboard. */
async function signInViaForm(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(CONFIRMED_EMAIL);
  await page.getByLabel('Password').fill(CONFIRMED_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL('/dashboard', { timeout: 20000 });
}

// ---------------------------------------------------------------------------
// F001 — Sign up
// Needs unauthenticated context — overrides global storageState with empty state.
// ---------------------------------------------------------------------------
test.describe('F001 – sign up', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('sign up form renders with email and password fields', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('button[type="button"]', { hasText: 'Sign up' }).click();

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.locator('form button[type="submit"]', { hasText: 'Create account' })).toBeVisible();
  });

  test('sign up with invalid password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('button[type="button"]', { hasText: 'Sign up' }).click();
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('123');
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL('/login');
    await expect(page.locator('.text-red-600')).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// F002 — Sign in
// Needs unauthenticated context — overrides global storageState with empty state.
// ---------------------------------------------------------------------------
test.describe('F002 – sign in', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('owner can sign in with email and password', async ({ page }) => {
    await signInViaForm(page);
    await expect(page.getByText(CONFIRMED_EMAIL)).toBeVisible();
  });

  test('wrong password shows error and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email').fill(CONFIRMED_EMAIL);
    await page.getByLabel('Password').fill('WrongPassword999!');
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL('/login');
    await expect(page.locator('.text-red-600')).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// F003 — Log out
// Uses pre-loaded auth state (global storageState) — already authenticated.
// Runs last (auth project depends on main) so signOut doesn't affect other tests.
// ---------------------------------------------------------------------------
test.describe('F003 – log out', () => {
  test('owner can log out and is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login', { timeout: 10000 });
  });

  test('after logout, /dashboard redirects back to /login', async ({ page }) => {
    // The previous F003 test revoked the global session — sign in again to get a fresh one.
    await signInViaForm(page);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login', { timeout: 10000 });

    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});
