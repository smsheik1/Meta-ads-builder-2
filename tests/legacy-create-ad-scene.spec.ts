import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_ELEMENTS, type AdElement } from '../src/store';
import { createLegacyCreateAdScene, normalizeLegacyPlatformForAdScene } from '../src/lib/legacy-create-ad-scene';
import type { BrandBrain } from '../src/lib/prompts/brand-brain';

const NOW = 1_717_200_000_000;

const brandBrain: BrandBrain = {
  businessName: 'OGTool',
  websiteUrl: 'https://ogtool.com/',
  brandLogoUrl: 'https://ogtool.com/logo.png',
  brandAssets: {
    images: {
      logo: 'https://ogtool.com/logo.png',
      favicon: 'https://ogtool.com/favicon.ico',
      heroImages: [],
      allImages: [],
    },
    colors: {},
    fonts: [],
    componentStyles: {},
    metadata: {},
    socialLinks: [],
    reviews: ['First ranking in 14 days from a named customer.'],
    pages: [],
  },
  offer: 'Fully managed Reddit and ChatGPT visibility campaigns.',
  audience: 'D2C operators trying to show up when buyers ask AI tools for recommendations.',
  pain: 'Your competitor shows up in ChatGPT and you do not.',
  promisedResult: 'First ChatGPT mention in 14 days.',
  differentiator: 'Reddit campaigns tied to AI search visibility.',
  tone: 'direct and sharp',
  colors: ['#082f49', '#93c5fd', '#020617'],
  proof: ['First ChatGPT mention in 14 days'],
  receipts: {
    specificClaims: ['Fully managed Reddit campaigns'],
    buyerMoments: ['A founder sees competitors appear in ChatGPT first'],
    exactSiteLanguage: ['ChatGPT Mentions in 14 Days'],
    namedProof: ['Named D2C brand saw first ranking in 14 days'],
  },
  bannedGenericPhrases: ['unlock'],
  adAngles: ['AI recommends your competitors'],
};

const variation = {
  id: 'ogtool-1',
  angle: 'AI recommends your competitors',
  headline: 'Why AI recommends your competitors',
  visualizerColor: '#93c5fd',
  accentColor: '#082f49',
  headlineColor: '#082f49',
  archetype: {
    id: 'clean-blue',
    headlineColor: '#082f49',
    backgroundColor: '#fafaf7',
    headlineTreatment: {
      fontSize: 52,
      fontWeight: '900',
      lineHeight: 1.04,
      width: 320,
    },
    visualizerVariant: {
      visualizerType: 'waveform-strip' as const,
      barCount: 24,
      height: 0.9,
    },
  },
};

const legacyElements = () => (
  DEFAULT_ELEMENTS.map((element): AdElement => {
    if (element.componentRole === 'headline') {
      return {
        ...element,
        content: 'Why AI recommends your competitors',
        color: '#082f49',
        fontSize: 52,
        locked: true,
      };
    }
    if (element.componentRole === 'visualizer') {
      return {
        ...element,
        barColor: '#93c5fd',
        barCount: 24,
        visualizerHeight: 0.9,
      };
    }
    if (element.componentRole === 'captions') {
      return {
        ...element,
        color: '#475569',
      };
    }
    return element;
  })
);

test('legacy create adapter maps generated /create state into the AdScene contract', () => {
  const scene = createLegacyCreateAdScene({
    brandBrain,
    variation,
    elements: legacyElements(),
    platform: 'instagram-feed',
    backgroundColor: '#fafaf7',
    ctaText: 'Learn More',
    ctaUrl: 'https://ogtool.com/demo',
    now: NOW,
  });

  expect(scene.version).toBe(1);
  expect(scene.id).toContain('legacy-create-ogtool-why-ai-recommends-your-competitors');
  expect(scene.platform).toBe('instagram-feed');
  expect(scene.brand.name).toBe('OGTool');
  expect(scene.brand.logoUrl).toBe('https://ogtool.com/logo.png');
  expect(scene.brand.faviconUrl).toBe('https://ogtool.com/favicon.ico');
  expect(scene.brand.receipts.specificClaims).toEqual([
    'Fully managed Reddit campaigns',
    'First ChatGPT mention in 14 days',
  ]);
  expect(scene.brand.receipts.reviews).toEqual(['First ranking in 14 days from a named customer.']);
  expect(scene.creative.headline).toBe('Why AI recommends your competitors');
  expect(scene.creative.subheadline).toBe('Fully managed Reddit and ChatGPT visibility campaigns.');
  expect(scene.creative.ctaText).toBe('Learn More');
  expect(scene.creative.ctaUrl).toBe('https://ogtool.com/demo');
  expect(scene.creative.backgroundColor).toBe('#fafaf7');
  expect(scene.creative.visualizer.color).toBe('#93c5fd');
  expect(scene.creative.visualizer.barCount).toBe(24);
  expect(scene.creative.headlineSize).toBe('hero');
  expect(scene.locks.headline).toBe(true);
  expect(scene.locks.visualizer).toBe(false);
  expect(scene.audio.status).toBe('none');
  expect(scene.layout.headline.x).toBeCloseTo(0.5, 2);
  expect(scene.layout.headline.y).toBeCloseTo(0.4, 1);
  expect(scene.layout.visualizer.width).toBeCloseTo(1, 2);
});

test('legacy create adapter preserves selected platform and intentional stored audio', () => {
  const scene = createLegacyCreateAdScene({
    brandBrain,
    variation,
    elements: legacyElements(),
    captions: [
      { text: 'I just checked the numbers.', start: 0, end: 1.4, speaker: 1 },
      { text: 'The first mention landed in 14 days.', start: 1.5, end: 3.2, speaker: 2 },
    ],
    platform: 'reels',
    backgroundColor: '#fafaf7',
    audioStatus: 'generated',
    audioUrl: 'https://intent-capybara-375.convex.cloud/api/storage/mock-audio',
    audioStorageId: 'kg2audioassetmock',
    audioMimeType: 'audio/wav',
    audioScriptId: 'script-1',
    audioBrandKey: 'https://ogtool.com/|ogtool',
    now: NOW,
  });

  expect(scene.platform).toBe('reels');
  expect(scene.audio.status).toBe('generated');
  expect(scene.audio.url).toBe('https://intent-capybara-375.convex.cloud/api/storage/mock-audio');
  expect(scene.audio.storageId).toBe('kg2audioassetmock');
  expect(scene.audio.sourceSceneId).toBe(scene.id);
  expect(scene.audio.durationMs).toBe(3200);
  expect(scene.audio.captions).toEqual([
    { text: 'I just checked the numbers.', startMs: 0, endMs: 1400, speaker: 'a' },
    { text: 'The first mention landed in 14 days.', startMs: 1500, endMs: 3200, speaker: 'b' },
  ]);
  expect(scene.audio.transcript).toBe('I just checked the numbers. The first mention landed in 14 days.');
  expect(scene.locks.audio).toBe(true);
});

test('legacy create adapter normalizes old platform aliases and refuses default audio leakage', () => {
  expect(normalizeLegacyPlatformForAdScene('facebook-feed')).toBe('instagram-feed');
  expect(normalizeLegacyPlatformForAdScene('feed')).toBe('instagram-feed');
  expect(normalizeLegacyPlatformForAdScene('vertical')).toBe('reels');

  const scene = createLegacyCreateAdScene({
    brandBrain,
    variation,
    elements: legacyElements(),
    platform: 'facebook-feed',
    backgroundColor: '#fafaf7',
    audioStatus: 'none',
    audioUrl: '/ai-dental-receptionist-audio.mp3',
    now: NOW,
  });

  expect(scene.platform).toBe('instagram-feed');
  expect(scene.audio.status).toBe('none');
  expect(scene.audio.url).toBeNull();
  expect(scene.audio.captions).toEqual([]);
});

test('legacy create adapter stays a data bridge, not a second renderer', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/legacy-create-ad-scene.ts'), 'utf8');

  expect(source).toContain('createLegacyCreateAdScene');
  expect(source).not.toContain('AdSceneCanvas');
  expect(source).not.toContain('AdSceneRemotion');
  expect(source).not.toContain('CreateFoundation');
  expect(source).not.toContain('createRenderSnapshot');
});
