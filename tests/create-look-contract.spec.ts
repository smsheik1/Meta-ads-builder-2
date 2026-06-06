import { expect, test } from '@playwright/test';

const DESKTOP_VIEWPORT = { width: 1440, height: 1000 };

const seedCleanBrowserState = () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem('wiggly_interactive_tutorial_seen_v1', '1');
};

const seedGeneratedOgToolState = () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem('wiggly_interactive_tutorial_seen_v1', '1');

  const archetype = {
    id: 'qa-legacy-freeze',
    name: 'QA Legacy Freeze',
    variantFingerprint: 'qa-legacy-freeze',
    backgroundColor: '#fafaf7',
    headlineColor: '#082f49',
    subheadlineColor: '#475569',
    visualizerColor: '#93c5fd',
    speaker1CaptionColor: '#475569',
    speaker2CaptionColor: '#c026d3',
    ctaBackgroundColor: '#020617',
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

  const brandBrain = {
    businessName: 'OGTool',
    websiteUrl: 'https://ogtool.com/',
    offer: 'Fully managed Reddit and ChatGPT visibility campaigns.',
    audience: 'D2C operators trying to show up when buyers ask AI tools for recommendations.',
    pain: 'Your competitor shows up in ChatGPT and you do not.',
    promisedResult: 'First ChatGPT mention in 14 days.',
    differentiator: 'Reddit marketing campaigns tied to AI search visibility.',
    tone: 'direct',
    adAngles: ['AI recommends your competitors'],
    proof: ['First ChatGPT mention in 14 days'],
    colors: ['#082f49', '#93c5fd', '#020617'],
    bannedGenericPhrases: [],
    brandLogoUrl: 'https://ogtool.com/favicon.ico',
    brandAssets: {
      images: {
        favicon: 'https://ogtool.com/favicon.ico',
        logo: 'https://ogtool.com/favicon.ico',
      },
      colors: {},
      fonts: [],
      componentStyles: {},
      metadata: {},
      socialLinks: [],
      pages: [],
    },
  };

  window.sessionStorage.setItem('wiggly_create_flow_session_v1', JSON.stringify({
    websiteUrl: brandBrain.websiteUrl,
    brandBrain,
    activeIndex: 0,
    selectedFormat: 'all',
    savedAt: Date.now(),
    variations: [{
      id: 'ogtool-freeze-visualizer-1',
      angle: 'AI recommends your competitors',
      headline: 'Why AI recommends your competitors',
      format: 'visualizer',
      index: 0,
      archetype,
      visualizerColor: '#93c5fd',
      accentColor: '#082f49',
      headlineColor: '#082f49',
    }],
  }));
};

test.describe('legacy /create look contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
  });

  test('keeps the old desktop first impression on /create', async ({ page }) => {
    await page.addInitScript(seedCleanBrowserState);

    await page.goto('/create');

    await expect(page.getByText('AUDIO THAT LOOKS EXPENSIVE')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open builder' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Make video ads without learning video editing.' })).toBeVisible();
    await expect(page.getByText('Wiggly reads the site, finds the selling angle')).toBeVisible();
    await expect(page.getByLabel('Website')).toBeVisible();
    await expect(page.getByLabel('Ad writing model')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate ads' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show All formats' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show Audio visualizer' })).toBeVisible();
    await expect(page.getByText('Generated ads', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download video' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play this ad' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add audio for this ad' })).toBeVisible();
    await expect(page.getByText('Add audio for this ad')).toHaveCount(1);
    await expect(page.locator('[data-tour="canvas"]')).toBeVisible();
    await expect(page.locator('.wiggly-idle-bar')).toHaveCount(24);

    const layout = await page.evaluate(() => {
      const hero = Array.from(document.querySelectorAll('h1'))
        .find((element) => element.textContent?.includes('Make video ads without learning video editing.'));
      const canvas = document.querySelector('[data-tour="canvas"]');
      const heroBox = hero?.getBoundingClientRect();
      const canvasBox = canvas?.getBoundingClientRect();
      const heroStyle = hero ? window.getComputedStyle(hero) : null;
      const pageShell = document.querySelector('.min-h-screen') || document.body;

      return {
        background: window.getComputedStyle(pageShell).backgroundColor,
        heroFontSize: heroStyle ? Number.parseFloat(heroStyle.fontSize) : 0,
        heroX: heroBox?.x ?? 0,
        canvasX: canvasBox?.x ?? 0,
        canvasWidth: canvasBox?.width ?? 0,
        canvasHeight: canvasBox?.height ?? 0,
      };
    });

    expect(layout.background).toBe('rgb(247, 244, 234)');
    expect(layout.heroFontSize).toBeGreaterThanOrEqual(72);
    expect(layout.canvasX).toBeGreaterThan(layout.heroX + 250);
    expect(layout.canvasWidth).toBeGreaterThan(300);
    expect(layout.canvasHeight).toBeGreaterThan(390);
  });

  test('shows the computer-only gate on phone-sized create view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(seedCleanBrowserState);

    await page.goto('/create');

    await expect(page.getByRole('heading', { name: 'Open Wiggly on your computer.' })).toBeVisible();
    await expect(page.getByText('desktop and laptop screens')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate ads' })).toHaveCount(0);
  });

  test('keeps the old generated review layout on /create', async ({ page }) => {
    await page.addInitScript(seedGeneratedOgToolState);

    await page.goto('/create');

    await expect(page.getByText('Ads ready to review')).toBeVisible();
    await expect(page.getByText('OGTool').first()).toBeVisible();
    await expect(page.getByText('Why AI recommends your competitors').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Press Spacebar make a wish/i })).toBeVisible();
    await expect(page.getByText('Generation')).toBeVisible();
    await expect(page.getByText('Was this one useful?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bad' })).toBeVisible();
    await expect(page.getByText('Creative brief')).toBeVisible();
    await expect(page.getByText('Full brand dump')).toHaveCount(0);
    await expect(page.locator('.wiggly-idle-bar')).toHaveCount(24);
    await expect(page.locator('[data-tour="canvas"]')).toHaveCSS('background-color', 'rgb(240, 246, 249)');

    await page.getByRole('button', { name: 'More', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Brand research details' })).toBeVisible();
    await expect(page.getByText('Full brand dump')).toBeVisible();
  });

  test('uses the legacy Remotion snapshot path when downloading from old /create', async ({ page }) => {
    await page.addInitScript(seedGeneratedOgToolState);

    let sawRemotionRequest = false;
    let sawRenderTicketRequest = false;
    await page.route('**/api/render-scene-ticket', async (route) => {
      sawRenderTicketRequest = true;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Old AdScene render path should not be used by legacy /create downloads.' }),
      });
    });

    await page.route('**/api/render-remotion', async (route) => {
      sawRemotionRequest = true;
      expect(route.request().method()).toBe('POST');

      const bytes = new Uint8Array(1200);
      bytes.set([0, 0, 0, 20, 102, 116, 121, 112], 0);
      await route.fulfill({
        status: 200,
        contentType: 'video/mp4',
        body: Buffer.from(bytes),
      });
    });

    await page.goto('/create');
    await page.getByRole('button', { name: 'Download video' }).first().click();

    await expect(page.getByText('Video ready')).toBeVisible();
    expect(sawRemotionRequest).toBe(true);
    expect(sawRenderTicketRequest).toBe(false);
  });
});
