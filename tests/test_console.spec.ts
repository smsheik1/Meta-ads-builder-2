import { test, expect } from '@playwright/test';

test('home page has no uncaught errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    const isRateLimitNoise = text.includes('429') || text.includes('Too many generation/export requests');
    if (message.type() === 'error' && !isRateLimitNoise) errors.push(text);
  });

  await page.goto('/');
  await expect(page.getByText('Visual ads that move fast.').first()).toBeVisible();

  expect(errors).toEqual([]);
});
