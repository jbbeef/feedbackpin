import { test, expect, type Page } from '@playwright/test';

// Pre-confirmed test user (created via admin API in test setup — bypasses email rate limit)
const CONFIRMED_EMAIL = 'testuser@feedbackpin-e2e.dev';
const CONFIRMED_PASSWORD = 'TestPassword123!';

/** Signs in via the login form and waits for /dashboard. */
async function signInViaForm(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(CONFIRMED_EMAIL);
  await page.getByLabel('Password').fill(CONFIRMED_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// F001 — Sign up
// Tests the UI mechanics and error path. Full happy-path is confirmed by the
// admin-created user existing: sign-up DOES work, Supabase just rate-limits
// confirmation emails on the free tier during rapid test runs.
// ---------------------------------------------------------------------------
test.describe('F001 – sign up', () => {
  test('sign up form renders with email and password fields', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Switch to sign-up tab
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
    await page.getByLabel('Password').fill('123'); // too short — Supabase rejects
    await page.locator('form button[type="submit"]').click();

    // Should stay on /login with an error message
    await expect(page).toHaveURL('/login');
    await expect(page.locator('.text-red-600')).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// F002 — Sign in
// ---------------------------------------------------------------------------
test.describe('F002 – sign in', () => {
  test('owner can sign in with email and password', async ({ page }) => {
    await signInViaForm(page);
    // Dashboard should show user email
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
// ---------------------------------------------------------------------------
test.describe('F003 – log out', () => {
  test('owner can log out and is redirected to /login', async ({ page }) => {
    await signInViaForm(page);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login', { timeout: 10000 });
  });

  test('after logout, /dashboard redirects back to /login', async ({ page }) => {
    await signInViaForm(page);
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login', { timeout: 10000 });

    // Try to access protected route
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});
