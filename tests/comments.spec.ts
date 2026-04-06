import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'fs';

// Auth state is pre-loaded via global setup — no per-test sign-in needed.

/**
 * Creates an image project via API (skips the browser UI) and returns the
 * full /review/[token] URL.
 * Requires `page` to be authenticated (signed in).
 * ~3-5s versus ~20s for the full browser UI flow.
 */
async function createProjectViaApi(page: Page, name: string): Promise<string> {
  const imageBuffer = readFileSync('tests/fixtures/test-image.png');

  const uploadRes = await page.request.post('/api/projects/upload', {
    multipart: {
      file: { name: 'test-image.png', mimeType: 'image/png', buffer: imageBuffer },
    },
  });
  expect(uploadRes.ok()).toBe(true);
  const { publicUrl, path } = await uploadRes.json();

  const createRes = await page.request.post('/api/projects', {
    data: { name, type: 'image', screenshot_url: publicUrl, source_url: path },
  });
  expect(createRes.ok()).toBe(true);
  const { project } = await createRes.json();

  const shareRes = await page.request.post(`/api/projects/${project.id}/share`);
  expect(shareRes.ok()).toBe(true);
  const { token } = await shareRes.json();

  return `http://localhost:3000/review/${token}`;
}

/** Opens a share URL in a fresh (unauthenticated) browser context. */
async function openAsReviewer(context: BrowserContext, shareUrl: string): Promise<Page> {
  const reviewCtx = await context.browser()!.newContext();
  const reviewPage = await reviewCtx.newPage();
  await reviewPage.goto(shareUrl);
  await reviewPage.waitForLoadState('networkidle');
  return reviewPage;
}

// ---------------------------------------------------------------------------
// F011 — Reviewer can see the project screenshot on the canvas
// ---------------------------------------------------------------------------
test.describe('F011 – reviewer sees screenshot', () => {
  test('review page shows the project screenshot without login', async ({ page, context }) => {
    const shareUrl = await createProjectViaApi(page, `F011 Screenshot ${Date.now()}`);

    const reviewPage = await openAsReviewer(context, shareUrl);

    expect(reviewPage.url()).not.toContain('/login');
    await expect(reviewPage.getByTestId('review-screenshot')).toBeVisible({ timeout: 10000 });
    const src = await reviewPage.getByTestId('review-screenshot').getAttribute('src');
    expect(src).toBeTruthy();

    await reviewPage.context().close();
  });

  test('review page shows project name in header', async ({ page, context }) => {
    const name = `F011 Header ${Date.now()}`;
    const shareUrl = await createProjectViaApi(page, name);

    const reviewPage = await openAsReviewer(context, shareUrl);
    await expect(reviewPage.getByTestId('review-project-name')).toHaveText(name, {
      timeout: 10000,
    });

    await reviewPage.context().close();
  });
});

// ---------------------------------------------------------------------------
// F012 — Reviewer can click on the canvas to place a comment pin
// ---------------------------------------------------------------------------
test.describe('F012 – click-to-pin on canvas', () => {
  test('clicking the canvas opens a comment form', async ({ page, context }) => {
    const shareUrl = await createProjectViaApi(page, `F012 Form ${Date.now()}`);

    const reviewPage = await openAsReviewer(context, shareUrl);
    await expect(reviewPage.getByTestId('canvas')).toBeVisible({ timeout: 10000 });

    await reviewPage.getByTestId('canvas').click({ position: { x: 200, y: 150 } });

    await expect(reviewPage.getByTestId('author-name-input')).toBeVisible({ timeout: 5000 });
    await expect(reviewPage.getByTestId('comment-body-input')).toBeVisible();
    await expect(reviewPage.getByTestId('submit-comment-button')).toBeVisible();

    await reviewPage.context().close();
  });

  test('submit button is disabled until name and comment are filled', async ({ page, context }) => {
    const shareUrl = await createProjectViaApi(page, `F012 Disabled ${Date.now()}`);

    const reviewPage = await openAsReviewer(context, shareUrl);
    await expect(reviewPage.getByTestId('canvas')).toBeVisible({ timeout: 10000 });

    await reviewPage.getByTestId('canvas').click({ position: { x: 150, y: 100 } });
    await expect(reviewPage.getByTestId('submit-comment-button')).toBeDisabled();

    await reviewPage.getByTestId('author-name-input').fill('Alice');
    await expect(reviewPage.getByTestId('submit-comment-button')).toBeDisabled();

    await reviewPage.getByTestId('comment-body-input').fill('Looks great!');
    await expect(reviewPage.getByTestId('submit-comment-button')).toBeEnabled();

    await reviewPage.context().close();
  });

  test('clicking Cancel closes the form without adding a pin', async ({ page, context }) => {
    const shareUrl = await createProjectViaApi(page, `F012 Cancel ${Date.now()}`);

    const reviewPage = await openAsReviewer(context, shareUrl);
    await expect(reviewPage.getByTestId('canvas')).toBeVisible({ timeout: 10000 });

    await reviewPage.getByTestId('canvas').click({ position: { x: 200, y: 150 } });
    await expect(reviewPage.getByTestId('author-name-input')).toBeVisible();

    await reviewPage.getByRole('button', { name: 'Cancel' }).click();

    await expect(reviewPage.getByTestId('author-name-input')).not.toBeVisible({ timeout: 5000 });
    await expect(reviewPage.getByTestId('comment-pin-1')).not.toBeVisible();

    await reviewPage.context().close();
  });
});

// ---------------------------------------------------------------------------
// F013 — Reviewer can submit a comment with their name
// ---------------------------------------------------------------------------
test.describe('F013 – submit comment with name', () => {
  test('submitting a comment shows a numbered pin on the canvas', async ({ page, context }) => {
    const shareUrl = await createProjectViaApi(page, `F013 Pin ${Date.now()}`);

    const reviewPage = await openAsReviewer(context, shareUrl);
    await expect(reviewPage.getByTestId('canvas')).toBeVisible({ timeout: 10000 });

    await reviewPage.getByTestId('canvas').click({ position: { x: 200, y: 150 } });
    await reviewPage.getByTestId('author-name-input').fill('Alice');
    await reviewPage.getByTestId('comment-body-input').fill('This section needs work');
    await reviewPage.getByTestId('submit-comment-button').click();

    await expect(reviewPage.getByTestId('author-name-input')).not.toBeVisible({ timeout: 10000 });
    await expect(reviewPage.getByTestId('comment-pin-1')).toBeVisible({ timeout: 10000 });

    await reviewPage.context().close();
  });

  test('submitted comment appears in the sidebar', async ({ page, context }) => {
    const shareUrl = await createProjectViaApi(page, `F013 Sidebar ${Date.now()}`);

    const reviewPage = await openAsReviewer(context, shareUrl);
    await expect(reviewPage.getByTestId('canvas')).toBeVisible({ timeout: 10000 });

    await reviewPage.getByTestId('canvas').click({ position: { x: 250, y: 120 } });
    await reviewPage.getByTestId('author-name-input').fill('Bob');
    await reviewPage.getByTestId('comment-body-input').fill('Great colours!');
    await reviewPage.getByTestId('submit-comment-button').click();

    await expect(reviewPage.getByTestId('comment-item-1')).toBeVisible({ timeout: 10000 });
    await expect(reviewPage.getByTestId('comment-item-1')).toContainText('Bob');
    await expect(reviewPage.getByTestId('comment-item-1')).toContainText('Great colours!');

    await reviewPage.context().close();
  });

  test('pin position is stored as percentages in the database', async ({ page, context, request }) => {
    const shareUrl = await createProjectViaApi(page, `F013 Pct ${Date.now()}`);
    const token = shareUrl.split('/review/')[1];

    const reviewPage = await openAsReviewer(context, shareUrl);
    await expect(reviewPage.getByTestId('canvas')).toBeVisible({ timeout: 10000 });

    await reviewPage.getByTestId('canvas').click({ position: { x: 200, y: 150 } });
    await reviewPage.getByTestId('author-name-input').fill('Carol');
    await reviewPage.getByTestId('comment-body-input').fill('Check the alignment');
    await reviewPage.getByTestId('submit-comment-button').click();
    await expect(reviewPage.getByTestId('comment-pin-1')).toBeVisible({ timeout: 10000 });

    const res = await request.get(`/api/review/${token}/comments`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.comments).toHaveLength(1);
    const comment = body.comments[0];
    expect(comment.x_percent).toBeGreaterThan(0);
    expect(comment.x_percent).toBeLessThan(100);
    expect(comment.y_percent).toBeGreaterThan(0);
    expect(comment.y_percent).toBeLessThan(100);
    expect(comment.author_name).toBe('Carol');
    expect(comment.body).toBe('Check the alignment');

    await reviewPage.context().close();
  });

  test('multiple comments get sequential pin numbers', async ({ page, context }) => {
    const shareUrl = await createProjectViaApi(page, `F013 Multi ${Date.now()}`);

    const reviewPage = await openAsReviewer(context, shareUrl);
    await expect(reviewPage.getByTestId('canvas')).toBeVisible({ timeout: 10000 });

    await reviewPage.getByTestId('canvas').click({ position: { x: 100, y: 100 } });
    await reviewPage.getByTestId('author-name-input').fill('Dave');
    await reviewPage.getByTestId('comment-body-input').fill('First comment');
    await reviewPage.getByTestId('submit-comment-button').click();
    // Wait for form to close first (confirms API response received) then check pin
    await expect(reviewPage.getByTestId('author-name-input')).not.toBeVisible({ timeout: 20000 });
    await expect(reviewPage.getByTestId('comment-pin-1')).toBeVisible({ timeout: 5000 });

    await reviewPage.getByTestId('canvas').click({ position: { x: 300, y: 200 } });
    await reviewPage.getByTestId('author-name-input').fill('Dave');
    await reviewPage.getByTestId('comment-body-input').fill('Second comment');
    await reviewPage.getByTestId('submit-comment-button').click();
    await expect(reviewPage.getByTestId('author-name-input')).not.toBeVisible({ timeout: 20000 });
    await expect(reviewPage.getByTestId('comment-pin-2')).toBeVisible({ timeout: 5000 });

    await reviewPage.context().close();
  });
});
