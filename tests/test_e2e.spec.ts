import { test, expect } from '@playwright/test';
import fs from 'fs';

test('download video', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Wait for the UI 
  await page.waitForTimeout(2000);
  
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 45000 }),
    page.click('text="Download Video"')
  ]);
  const path = await download.path();
  const stat = fs.statSync(path);
  console.log("Downloaded file length: " + stat.size);
});
