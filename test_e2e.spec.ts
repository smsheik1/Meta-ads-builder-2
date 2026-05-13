import { test, expect } from '@playwright/test';
import fs from 'fs';

test('download video', async ({ page }) => {
  await page.goto('http://localhost:3000');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text="Test Hyperframes Render"', { timeout: 5000 }).catch(() => page.click('text="Composition"').then(() => page.click('button:has-text("Play")')))
  ]);
  const path = await download.path();
  const stat = fs.statSync(path);
  console.log("Downloaded file size: " + stat.size);
});
