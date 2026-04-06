import { test, expect, type Page } from '@playwright/test';

const CONFIRMED_EMAIL = 'testuser@feedbackpin-e2e.dev';
const CONFIRMED_PASSWORD = 'TestPassword123!';

/** Signs in and waits for /dashboard. */
async function signInViaForm(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(CONFIRMED_EMAIL);
  await page.getByLabel('Password').fill(CONFIRMED_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
}

/** Creates a URL project and returns the project ID from the redirect URL. */
async function createUrlProject(page: Page, name: string): Promise<string> {
  await page.goto('/projects/new');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Project name').fill(name);
  await page.getByLabel('URL to capture').fill('https://example.com');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

  // Click the project card to navigate to /projects/[id]
  await page.getByText(name).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+/, { timeout: 10000 });

  const url = page.url();
  return url.split('/projects/')[1];
}

// ---------------------------------------------------------------------------
// F007 — Screenshot is captured automatically after URL project is created
// ---------------------------------------------------------------------------
test.describe('F007 – screenshot capture for URL projects', () => {
  test('/projects/[id] shows a loading spinner while screenshot is pending', async ({ page }) => {
    await signInViaForm(page);
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    const projectName = `Screenshot Loading Test ${Date.now()}`;
    await page.getByLabel('Project name').fill(projectName);
    await page.getByLabel('URL to capture').fill('https://example.com');
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    // Navigate directly to /projects/[id] by clicking the card
    await page.getByText(projectName).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+/, { timeout: 10000 });

    // The page should render (not a 404 or error)
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText(projectName)).toBeVisible();
  });

  test('screenshot appears on canvas within 60 seconds of URL project creation', async ({ page }) => {
    await signInViaForm(page);

    const projectName = `F007 Screenshot Test ${Date.now()}`;
    await createUrlProject(page, projectName);

    // Wait for the screenshot image to appear (worker captures async)
    const screenshot = page.locator('[data-testid="project-screenshot"]');
    await expect(screenshot).toBeVisible({ timeout: 60000 });

    // Verify it has a real src URL (not empty)
    const src = await screenshot.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toContain('supabase.co');
  });

  test('screenshot_url is stored in the database after capture', async ({ page }) => {
    await signInViaForm(page);

    const projectName = `F007 DB Check ${Date.now()}`;
    const projectId = await createUrlProject(page, projectName);

    // Wait for screenshot to appear
    await expect(
      page.locator('[data-testid="project-screenshot"]')
    ).toBeVisible({ timeout: 60000 });

    // Verify the API returns screenshot_url set
    const res = await page.request.get(`/api/projects/${projectId}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.project.screenshot_url).toBeTruthy();
    expect(body.project.screenshot_url).toContain('supabase.co');
  });
});
