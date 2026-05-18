import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
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
    await page.goto('/');
    await page.getByRole('banner').getByRole('button', { name: /open studio/i }).click();

    await expect(page.getByText('Components')).toBeVisible();
    await expect(page.getByText('Style & Assets')).toBeVisible();
    await expect(page.getByText('Platform Simulator')).toBeVisible();
    await expect(page.getByRole('button', { name: /export mp4/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /play preview/i })).toBeVisible();
  });

  test('template panel exposes templates and history', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('button', { name: /open studio/i }).click();

    await expect(page.getByRole('button', { name: 'Templates' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'My History' })).toBeVisible();

    await page.getByRole('button', { name: 'My History' }).click();
    await expect(page.getByText(/downloaded ads will appear here/i)).toBeVisible();
  });
});
