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
    window.localStorage.setItem('wiggly_interactive_tutorial_seen_v1', '1');
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
  await expect(page.getByRole('button', { name: /Press Spacebar make a wish/i })).toBeVisible();

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

  await expect(page.getByText('Generation')).toBeVisible();
  await expect(page.getByText('Was this one useful?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bad' })).toBeVisible();
  await page.getByRole('button', { name: 'Good' }).click();
  const feedback = await page.evaluate(() => JSON.parse(localStorage.getItem('wiggly_generation_feedback_v1') || '[]'));
  expect(feedback[0]?.rating).toBe('up');
  expect(feedback[0]?.variation?.headline).toBe('Visualizer concept 2');
  expect(feedback[0]?.brandBrief?.offer).toBe('A faster way to make ads from a brand page and voice clip.');

  await page.getByRole('button', { name: /^Saved/ }).hover();
  await expect(page.getByRole('button', { name: 'Visualizer concept 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Visualizer concept 2' }).click();
  await expect(page).toHaveURL(/\/create$/);
  await expect(page.locator('#el-headline-1')).toContainText('Visualizer concept 2');
  await expect(page.locator('.element-node')).toHaveCount(4);
});

test('create canvas stays editable and keeps the idle visualizer placeholder', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('wiggly_interactive_tutorial_seen_v1', '1');
  });

  await page.goto('/create');
  await expect(page.locator('[data-tour="canvas"]')).toBeVisible();
  await expect(page.locator('.element-node')).toHaveCount(4);
  await expect(page.locator('.wiggly-idle-bar')).toHaveCount(24);

  await page.locator('#el-headline-1').click({ force: true });
  await expect(page.locator('.moveable-control-box')).toBeVisible();
  await expect(page.locator('.moveable-control')).toHaveCount(10);
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

test('create ad with no intentional audio shows audio CTA and keeps silent download available', async ({ page }) => {
  await page.route('**/api/research-brand', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        needsFallback: false,
        brandBrain: {
          businessName: 'Brilliance Skin and Laser',
          websiteUrl: 'https://www.brillianceskin.us/',
          offer: 'Premium medspa services for skin and laser treatments',
          audience: 'people considering premium skin and laser treatments',
          pain: 'They want visible skin results but do not know which treatment to trust',
          promisedResult: 'Feel confident choosing a treatment for smoother healthier looking skin',
          differentiator: 'guided premium care',
          tone: 'clear and reassuring',
          adAngles: ['clearer skin plan', 'premium guided treatment', 'visible skin results'],
          proof: ['Real client reviews mention caring service'],
          colors: ['#111827', '#E74B8A', '#F6C453'],
          bannedGenericPhrases: [],
          brandAssets: { images: {}, externalResearch: [] },
        },
      }),
    });
  });

  await page.route('**/api/generate-ad-stream', async (route) => {
    const payload = route.request().postDataJSON();
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        brandBrain: payload.brandBrain,
        provider: 'local',
        model: 'local',
        fallback: true,
        variations: [
          {
            id: 'variation-1',
            angle: 'clearer plan',
            headline: 'Skin goals deserve a clearer plan',
            format: 'visualizer',
          },
        ],
      }),
    });
  });

  await page.goto('/create');
  await page.getByRole('textbox').first().fill('https://www.brillianceskin.us/');
  await page.getByRole('button', { name: /generate ads/i }).click();

  await expect(page.getByRole('button', { name: 'Add audio for this ad' })).toBeVisible();
  await expect(page.getByText('Upload audio for captions')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /play this ad/i })).toBeDisabled();
  await expect(page.getByRole('button', { name: /download video/i })).toBeEnabled();

  await page.getByRole('button', { name: 'Add audio for this ad' }).click();
  await expect(page.getByRole('heading', { name: 'Make Voice Audio' })).toBeVisible();
  await expect(page.locator('button').filter({ hasText: '2. Choose Words' })).toHaveClass(/bg-slate-950/);
  await expect(page.getByText('Write voice options for this ad')).toBeVisible();
  await expect(page.getByText('Wiggly will use the business info from the website')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Write options$/ })).toBeVisible();
  await expect(page.getByText('Choose a script to edit.')).toHaveCount(0);
});

test('create refresh ignores stale generated audio from another brand', async ({ page }) => {
  await page.goto('/create');

  await page.evaluate(async () => {
    const brandBrain = {
      businessName: "David's Cookies: Cookie Delivery",
      websiteUrl: 'https://www.davidscookies.com/',
      offer: "We're known for our cookies, but we make so much more, including our fabulous cheesecakes and specialty desserts.",
      audience: "People considering David's Cookies: Cookie Delivery or similar options",
      pain: "People need a concrete reason to choose David's Cookies over another option",
      promisedResult: 'Satisfy sweet cravings with cookie delivery.',
      differentiator: 'Fresh-baked cookie delivery and desserts.',
      tone: 'warm and direct',
      adAngles: ['sweet cravings'],
      proof: [],
      colors: ['#ef4444', '#0f172a', '#6ee7d8'],
      bannedGenericPhrases: [],
      brandAssets: { images: {}, colors: {}, fonts: [], componentStyles: {}, metadata: {}, socialLinks: [], pages: [] },
    };

    window.sessionStorage.setItem('wiggly_create_flow_session_v1', JSON.stringify({
      websiteUrl: brandBrain.websiteUrl,
      brandBrain,
      activeIndex: 0,
      selectedFormat: 'all',
      savedAt: Date.now(),
      variations: [{
        id: 'cookies-visualizer-1',
        angle: 'sweet cravings',
        headline: 'Satisfy Your Sweet Cravings',
        format: 'visualizer',
        index: 0,
        visualizerColor: '#6ee7d8',
        accentColor: '#0f172a',
        headlineColor: '#0f172a',
      }],
    }));

    window.localStorage.setItem('wiggly_current_audio_v1', JSON.stringify({
      id: 'stale-generated-audio',
      builtIn: false,
    }));

    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.open('wiggly_audio_library');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('audios')) {
          db.close();
          reject(new Error('Audio library store was not initialized'));
          return;
        }
        const transaction = db.transaction('audios', 'readwrite');
        transaction.objectStore('audios').put({
          id: 'stale-generated-audio',
          name: 'Dental generated audio.wav',
          createdAt: Date.now(),
          blob: new Blob(['stale generated audio'], { type: 'audio/wav' }),
          mimeType: 'audio/wav',
          kind: 'generated',
          source: 'voice-wizard',
          status: 'ready',
        });
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });

  await page.reload();

  await expect(page.getByText('Satisfy Your Sweet Cravings')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add audio for this ad' })).toBeVisible();
  await expect(page.getByRole('button', { name: /play this ad/i })).toBeDisabled();
  await expect(page.getByText(/Dental generated audio/i)).toHaveCount(0);
});
