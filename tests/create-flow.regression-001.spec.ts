import { test, expect } from '@playwright/test';

test('create brand dump does not fetch blocked external images', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.addInitScript(() => {
    const logoSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><text x="12" y="38" font-size="24" font-family="Arial">Brand</text></svg>';

    // Regression: ISSUE-001 — external brand image URLs in More caused CORP console errors.
    // Found by /qa on 2026-06-01.
    // Report: .gstack/qa-reports/qa-report-localhost-2026-06-01.md
    window.sessionStorage.setItem('wiggly_create_flow_session_v1', JSON.stringify({
      websiteUrl: 'https://example.com',
      activeIndex: 0,
      savedAt: Date.now(),
      variations: [],
      brandBrain: {
        businessName: 'Example Brand',
        websiteUrl: 'https://example.com',
        offer: 'A useful offer for testing.',
        audience: 'Busy marketers testing generated ads.',
        pain: 'External images can be blocked by response policy.',
        promisedResult: 'The brand dump stays readable without console noise.',
        differentiator: 'Safe external image cards.',
        tone: 'direct',
        colors: ['#0f172a', '#00d6b8'],
        proof: ['No blocked image fetches'],
        brandLogoUrl: null,
        brandAssets: {
          images: {
            logo: `data:image/svg+xml;utf8,${encodeURIComponent(logoSvg)}`,
            favicon: 'https://example.com/favicon.ico',
            ogImage: 'https://example.com/blocked-og-image.png',
            heroImages: [],
            allImages: ['https://example.com/blocked-extra-image.png'],
          },
          colors: {},
          fonts: [],
          buttonStyles: [],
          componentStyles: [],
          socialLinks: [],
          metadata: {},
          repeatedClaims: [],
        },
      },
    }));
  });

  await page.goto('/create');
  await page.getByRole('button', { name: 'More' }).click();

  await expect(page.getByRole('dialog', { name: 'Brand research details' })).toBeVisible();
  await expect(page.getByText('External image').first()).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
