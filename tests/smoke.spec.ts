import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('wiggly_interactive_tutorial_seen_v1', '1');
    });
  });

  test('app loads without browser errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      const text = message.text();
      const isRateLimitNoise = text.includes('429') || text.includes('Too many generation/export requests');
      if (message.type() === 'error' && !isRateLimitNoise) errors.push(text);
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await expect(page.getByText('Wiggly').first()).toBeVisible();
    await expect(page.getByRole('banner').getByRole('button', { name: /open studio/i })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('studio shows the core editor panels', async ({ page }) => {
    await page.goto('/builder');

    await expect(page.getByText('Edit Parts', { exact: true })).toBeVisible();
    await expect(page.getByText('Advanced', { exact: true })).toBeVisible();
    await expect(page.getByText('Post Settings', { exact: true })).toBeVisible();
    await expect(page.getByText('Visualizer Tuning', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /download video/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save design/i })).toBeVisible();
    await expect(page.getByLabel('Choose preview')).toBeVisible();
  });

  test('empty design library collapses without hiding the builder', async ({ page }) => {
    await page.goto('/builder');

    await expect(page.getByRole('button', { name: 'No saved templates yet' })).toBeVisible();
    await expect(page.getByText('Space')).toBeVisible();
    await expect(page.getByText('remix the ad')).toBeVisible();
  });

  test('create page exposes website, audio, preview, and actions', async ({ page }) => {
    await page.goto('/create');

    await expect(page.getByRole('textbox').first()).toBeVisible();
    await expect(page.getByText('Upload voice clip')).toBeVisible();
    await expect(page.getByRole('button', { name: /show me my ads/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /play this ad/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /open builder/i })).toBeVisible();
  });
});
