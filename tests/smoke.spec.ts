import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {

  test('App loads with no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Listen for uncaught exceptions within the page
    page.on('pageerror', exception => {
      consoleErrors.push(exception.message);
    });

    await page.goto('/');
    
    // Wait for the app to settle
    await page.waitForTimeout(3000);

    expect(consoleErrors.length).toBe(0);
  });

  test('Canvas renders with default elements', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForTimeout(1000);

    // The canvas should contain the default elements, such as the headline
    const headline = page.locator('text=YOUR HEADLINE HERE');
    await expect(headline).toBeVisible();

    // Verify PlatformFrame container by looking for the simulated status bar "9:41"
    const statusBar = page.locator('text=9:41');
    await expect(statusBar).toBeVisible();
  });

  test('Tab switch changes UI from Composition to Batch View', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForTimeout(1000);

    // Initial assumption is that Batch Engine should NOT be visible initially
    await expect(page.locator('text=Batch Engine')).not.toBeVisible();

    // Find and click the 'Batch View' button
    await page.click('button:has-text("Batch View")');

    // Wait 500ms
    await page.waitForTimeout(500);

    // Assert that 'Batch Engine' text is now visible
    await expect(page.locator('text=Batch Engine')).toBeVisible();
  });

});
