export const AD_SCENE_VERSION = 1 as const;

export type AdPlatform = 'instagram-feed' | 'reels' | 'stories' | 'youtube';

export type AdSceneCaption = {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: 'a' | 'b';
};

export type AdSceneReceipts = {
  specificClaims: string[];
  buyerMoments: string[];
  exactSiteLanguage: string[];
  namedProof: string[];
  reviews: string[];
};

export type AdSceneBrand = {
  name: string;
  websiteUrl: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  offer: string;
  audience: string;
  receipts: AdSceneReceipts;
};

export type AdSceneCreative = {
  angleId: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaUrl: string;
  backgroundColor: string;
  accentColor: string;
  visualizer: {
    color: string;
    idlePreset: string;
    playbackPreset: string;
  };
};

export type AdSceneAudio = {
  status: 'none' | 'uploaded' | 'script-ready' | 'generated';
  url: string | null;
  transcript: string;
  captions: AdSceneCaption[];
  brandKey: string | null;
};

export type AdSceneLocks = {
  headline: boolean;
  subheadline: boolean;
  logo: boolean;
  visualizer: boolean;
  audio: boolean;
};

export type AdScene = {
  id: string;
  version: typeof AD_SCENE_VERSION;
  brand: AdSceneBrand;
  platform: AdPlatform;
  creative: AdSceneCreative;
  audio: AdSceneAudio;
  locks: AdSceneLocks;
  createdAt: number;
  updatedAt: number;
};

export const DEFAULT_SCENE_LOCKS: AdSceneLocks = {
  headline: false,
  subheadline: false,
  logo: false,
  visualizer: false,
  audio: false,
};

export const cloneAdScene = (scene: AdScene): AdScene => (
  JSON.parse(JSON.stringify(scene)) as AdScene
);

export const serializeAdScene = (scene: AdScene) => JSON.stringify(scene);

export const deserializeAdScene = (value: string): AdScene => (
  JSON.parse(value) as AdScene
);

export const getAdSceneBrandKey = (scene: AdScene) => (
  `${scene.brand.websiteUrl}|${scene.brand.name}`.toLowerCase()
);
