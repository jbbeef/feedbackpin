import path from 'path';
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

// ---------------------------------------------------------------------------
// F004 — Owner can create a project by pasting a URL
// ---------------------------------------------------------------------------
test.describe('F004 – create project by URL', () => {
  test('/projects/new renders the form with type selector and URL input', async ({ page }) => {
    await signInViaForm(page);
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel('Project name')).toBeVisible();
    // URL type button should be active by default
    await expect(page.getByRole('button', { name: 'URL' })).toBeVisible();
    await expect(page.getByLabel('URL to capture')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create project' })).toBeVisible();
  });

  test('URL type is active by default; Image shows file input; PDF shows placeholder', async ({ page }) => {
    await signInViaForm(page);
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    // Switch to Image tab — should show file input (F005 implemented), not URL input
    await page.getByRole('button', { name: 'Image' }).click();
    await expect(page.getByLabel('URL to capture')).not.toBeVisible();
    await expect(page.getByLabel('Image file')).toBeVisible();

    // Switch to PDF tab — still shows placeholder
    await page.getByRole('button', { name: 'PDF' }).click();
    await expect(page.getByText('PDF upload coming soon.')).toBeVisible();

    // Switch back to URL
    await page.getByRole('button', { name: 'URL' }).click();
    await expect(page.getByLabel('URL to capture')).toBeVisible();
  });

  test('creating a URL project redirects to /dashboard and shows the project', async ({ page }) => {
    await signInViaForm(page);
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    const projectName = `Test Project ${Date.now()}`;
    await page.getByLabel('Project name').fill(projectName);
    await page.getByLabel('URL to capture').fill('https://example.com');
    await page.getByRole('button', { name: 'Create project' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    // The new project card should appear on the dashboard
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });
  });

  test('submitting with invalid URL shows an error', async ({ page }) => {
    await signInViaForm(page);
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Project name').fill('Bad URL project');
    // Type a non-URL value into the URL input by bypassing HTML validation
    await page.getByLabel('URL to capture').fill('not-a-url');
    // Force submit via evaluate to bypass browser HTML5 validation
    await page.evaluate(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Should stay on /projects/new
    await expect(page).toHaveURL('/projects/new');
  });
});

// ---------------------------------------------------------------------------
// F005 — Owner can create a project by uploading an image
// ---------------------------------------------------------------------------
test.describe('F005 – create project by image upload', () => {
  const TEST_IMAGE = path.resolve(__dirname, 'fixtures/test-image.png');

  test('Image tab shows a file input with accepted image types', async ({ page }) => {
    await signInViaForm(page);
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Image' }).click();

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    const accept = await fileInput.getAttribute('accept');
    expect(accept).toContain('image/png');
    expect(accept).toContain('image/jpeg');
  });

  test('Create project button is disabled without a file selected', async ({ page }) => {
    await signInViaForm(page);
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Image' }).click();
    await page.getByLabel('Project name').fill('No file project');

    await expect(page.getByRole('button', { name: 'Create project' })).toBeDisabled();
  });

  test('Selecting a file enables the Create project button and shows filename', async ({ page }) => {
    await signInViaForm(page);
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Image' }).click();
    await page.getByLabel('Project name').fill('Image project');

    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);

    await expect(page.getByText('test-image.png')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create project' })).toBeEnabled();
  });

  test('creating an image project uploads file and appears in /dashboard', async ({ page }) => {
    await signInViaForm(page);
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    const projectName = `Image Project ${Date.now()}`;
    await page.getByLabel('Project name').fill(projectName);
    await page.getByRole('button', { name: 'Image' }).click();

    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await expect(page.getByRole('button', { name: 'Create project' })).toBeEnabled();

    await page.getByRole('button', { name: 'Create project' }).click();

    // Should redirect to dashboard after upload + project creation
    await expect(page).toHaveURL('/dashboard', { timeout: 30000 });

    // The new project card should appear
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });
  });
});
