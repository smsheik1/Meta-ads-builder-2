import { AD_SCENE_VERSION, DEFAULT_SCENE_LOCKS, type AdScene } from './scene';

const NOW = 1_717_200_000_000;

export const ogToolScene: AdScene = {
  id: 'scene-ogtool-fixture',
  version: AD_SCENE_VERSION,
  brand: {
    name: 'OGTool',
    websiteUrl: 'https://ogtool.com/',
    logoUrl: null,
    faviconUrl: 'https://ogtool.com/favicon.ico',
    offer: 'Fully managed Reddit and ChatGPT visibility campaigns.',
    audience: 'D2C operators trying to show up when buyers ask AI tools for recommendations.',
    receipts: {
      specificClaims: ['First ChatGPT mention in 14 days'],
      buyerMoments: ['A founder checks why competitors appear in AI answers before their brand does'],
      exactSiteLanguage: ['ChatGPT Mentions in 14 Days'],
      namedProof: [],
      reviews: [],
    },
  },
  platform: 'instagram-feed',
  creative: {
    angleId: 'ai-visibility-gap',
    headline: 'Why AI recommends your competitors',
    subheadline: 'Fully managed Reddit and ChatGPT visibility campaigns that secure front-page rankings.',
    ctaText: 'Learn More',
    ctaUrl: 'https://ogtool.com/',
    backgroundColor: '#fbfaf6',
    accentColor: '#7dd3fc',
    visualizer: {
      color: '#93c5fd',
      idlePreset: 'wide-soft-bars',
      playbackPreset: 'voice-reactive-bars',
    },
  },
  audio: {
    status: 'none',
    url: null,
    transcript: '',
    captions: [],
    brandKey: null,
  },
  locks: { ...DEFAULT_SCENE_LOCKS },
  createdAt: NOW,
  updatedAt: NOW,
};

export const redfinScene: AdScene = {
  id: 'scene-redfin-fixture',
  version: AD_SCENE_VERSION,
  brand: {
    name: 'Redfin',
    websiteUrl: 'https://redfin.com/',
    logoUrl: null,
    faviconUrl: 'https://redfin.com/favicon.ico',
    offer: 'Real estate search, market data, and agent support for home buyers and sellers.',
    audience: 'People tracking listings, prices, tours, and neighborhood changes before making a move.',
    receipts: {
      specificClaims: ['Updated home listings and market data'],
      buyerMoments: ['A buyer sees a listing move fast and wants to know whether the price is fair'],
      exactSiteLanguage: ['Real estate, homes for sale, MLS listings, agents'],
      namedProof: [],
      reviews: [],
    },
  },
  platform: 'reels',
  creative: {
    angleId: 'market-speed',
    headline: 'Stay ahead of the market',
    subheadline: 'Find homes, compare prices, and move before the listing gets crowded.',
    ctaText: 'Search homes',
    ctaUrl: 'https://redfin.com/',
    backgroundColor: '#fffaf7',
    accentColor: '#dc2626',
    visualizer: {
      color: '#10b981',
      idlePreset: 'wide-soft-bars',
      playbackPreset: 'voice-reactive-bars',
    },
  },
  audio: {
    status: 'none',
    url: null,
    transcript: '',
    captions: [],
    brandKey: null,
  },
  locks: { ...DEFAULT_SCENE_LOCKS },
  createdAt: NOW,
  updatedAt: NOW,
};

export const createSceneFixture = (kind: 'ogtool' | 'redfin' = 'ogtool') => (
  kind === 'redfin' ? redfinScene : ogToolScene
);
