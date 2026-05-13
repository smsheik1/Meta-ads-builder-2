import { test, expect } from '@playwright/test';
test('check console for fetch error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  console.log("Errors found:", errors);
});
