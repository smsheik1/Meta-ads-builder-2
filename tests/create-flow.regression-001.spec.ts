import { test, expect } from '@playwright/test';

test('create brand dump does not fetch blocked external images', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    const isTranscriptionNoise = text.includes('Transcription API error') ||
      text.includes('Transcription failed') ||
      text.includes('429') ||
      text.includes('Too Many Requests') ||
      text.includes('500 (Internal Server Error)');
    if (message.type() === 'error' && !isTranscriptionNoise) consoleErrors.push(text);
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

test('create format rail hides paused Conversation Card ads', async ({ page }) => {
  await page.addInitScript(() => {
    const archetype = {
      id: 'qa-clean',
      name: 'QA Clean',
      variantFingerprint: 'qa',
      backgroundColor: '#fafaf7',
      headlineColor: '#0f172a',
      subheadlineColor: '#334155',
      visualizerColor: '#00d6b8',
      speaker1CaptionColor: '#008f7d',
      speaker2CaptionColor: '#4f46e5',
      ctaBackgroundColor: '#0f172a',
      ctaTextColor: '#ffffff',
      visualizer: {
        visualizerTypes: ['waveform-strip'],
        barCounts: [24],
        sensitivities: [1.5],
        heights: [0.9],
      },
      visualizerVariant: {
        visualizerType: 'waveform-strip',
        barCount: 24,
        sensitivity: 1.5,
        height: 0.9,
      },
      headlineTreatment: {
        fontSize: 48,
        fontWeight: '900',
        lineHeight: 1.04,
        width: 320,
      },
    };
    const variations = Array.from({ length: 50 }, (_, index) => {
      const format = index % 3 === 1 ? 'conversation' : 'visualizer';
      return {
        id: `qa-${index}`,
        index,
        format,
        angle: format === 'conversation' ? `Conversation angle ${index}` : `Visualizer angle ${index}`,
        headline: format === 'conversation' ? `Conversation concept ${index}` : `Visualizer concept ${index}`,
        conversationLines: format === 'conversation'
          ? [
            { speaker: 'Alex', text: `This should feel like a real text thread ${index}.` },
            { speaker: 'Jordan', text: `Right, the product shows up inside the conversation ${index}.` },
            { speaker: 'Alex', text: `That is easier to understand than another generic ad ${index}.` },
            { speaker: 'Jordan', text: `Exactly, make the format do the explaining ${index}.` },
          ]
          : undefined,
        archetype,
        visualizerColor: '#00d6b8',
        accentColor: '#4f46e5',
      };
    });

    window.sessionStorage.setItem('wiggly_create_flow_session_v1', JSON.stringify({
      websiteUrl: 'https://example.com',
      activeIndex: 0,
      selectedFormat: 'all',
      savedAt: Date.now(),
      variations,
      brandBrain: {
        businessName: 'Example Brand',
        websiteUrl: 'https://example.com',
        offer: 'A faster way to make ads from a brand page and voice clip.',
        audience: 'Founders testing creative angles.',
        pain: '',
        promisedResult: 'Preview more usable ads without learning editing software.',
        differentiator: 'Mixed ad formats from one brief.',
        tone: 'direct',
        colors: ['#0f172a', '#00d6b8', '#4f46e5'],
        proof: ['Ready to test without editing software'],
        brandLogoUrl: null,
        brandAssets: {
          images: {},
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

  await expect(page.getByRole('button', { name: 'Show All formats' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show Audio visualizer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show Conversation Card' })).toHaveCount(0);
  await expect(page.getByText(/Ad \d+ of 50/)).toHaveCount(0);
  await expect(page.getByText('Current ad')).toHaveCount(0);
  await expect(page.getByText(/Visualizer ·/)).toHaveCount(0);
  await expect(page.getByText('Press spacebar to generate more')).toBeVisible();

  await page.keyboard.press('Space');
  await expect(page.getByText('Conversation concept 1')).toHaveCount(0);
  await expect(page.getByText('This should feel like a real text thread 1.')).toHaveCount(0);

  await page.getByRole('button', { name: 'Show Audio visualizer' }).click();
  await expect(page.getByText(/Visualizer ·/)).toHaveCount(0);
  await expect(page.getByText('Visualizer concept 2')).toBeVisible();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Saved/ })).toBeVisible();
  await page.mouse.move(10, 10);
  await expect(page.getByText('Saved ads')).toHaveCount(0);
  await page.getByRole('button', { name: /^Saved/ }).hover();
  await expect(page.getByText('Saved ads')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Visualizer concept 2' })).toBeVisible();
  const savedTemplates = await page.evaluate(() => JSON.parse(localStorage.getItem('visualizer_ad_templates_v1') || '[]'));
  expect(savedTemplates[0]?.name).toBe('Visualizer concept 2');
  expect(savedTemplates[0]?.elements.some((element: { content?: string }) => element.content === 'Visualizer concept 2')).toBe(true);
  expect(savedTemplates[0]?.elements.some((element: { content?: string; fontFamily?: string }) => (
    element.content === 'Visualizer concept 2' && !element.fontFamily
  ))).toBe(true);

  await page.getByRole('button', { name: 'Visualizer concept 2' }).click();
  await expect(page).toHaveURL(/\/builder$/);
  await expect(page.getByText('Edit Parts', { exact: true })).toBeVisible();
});

test('create visualizer rail opens the existing voice maker flow on hover', async ({ page }) => {
  await page.goto('/create');

  await page.getByRole('button', { name: 'Show Audio visualizer' }).hover();
  await expect(page.getByText('Change voice')).toBeVisible();
  await expect(page.getByText('Make me a voice')).toBeVisible();
  await expect(page.getByText('Use a voice I have')).toBeVisible();

  await page.getByText('Make me a voice').click();
  await expect(page.getByRole('heading', { name: 'Make Voice Audio' })).toBeVisible();
});
