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
  styleId?: string;
  headlineColor?: string;
  headlineSize?: 'compact' | 'balanced' | 'hero';
  headlineAlign?: 'left' | 'center' | 'right';
  headlineLineHeight?: number;
  captionColor?: string;
  subheadline: string;
  ctaText: string;
  ctaUrl: string;
  backgroundColor: string;
  accentColor: string;
  visualizer: {
    color: string;
    idlePreset: string;
    playbackPreset: string;
    barCount?: number;
    motion?: 'smooth' | 'balanced' | 'snappy';
    heightScale?: number;
    baseline?: number;
  };
};

export type AdSceneCreativePatch = Omit<Partial<AdSceneCreative>, 'visualizer'> & {
  visualizer?: Partial<AdSceneCreative['visualizer']>;
};

export type AdSceneAudio = {
  status: 'none' | 'uploaded' | 'script-ready' | 'generated';
  url: string | null;
  storageId?: string | null;
  mimeType?: string | null;
  transcript: string;
  captions: AdSceneCaption[];
  brandKey: string | null;
  sourceSceneId: string | null;
  scriptId: string | null;
  durationMs: number | null;
};

export type AdSceneLocks = {
  headline: boolean;
  subheadline: boolean;
  logo: boolean;
  visualizer: boolean;
  audio: boolean;
};

export type AdSceneLayoutElement = 'brand' | 'headline' | 'visualizer' | 'caption';

export type AdSceneLayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AdSceneLayout = Record<AdSceneLayoutElement, AdSceneLayoutBox>;

export type AdScene = {
  id: string;
  version: typeof AD_SCENE_VERSION;
  brand: AdSceneBrand;
  platform: AdPlatform;
  creative: AdSceneCreative;
  audio: AdSceneAudio;
  layout: AdSceneLayout;
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

export const DEFAULT_SCENE_LAYOUT: AdSceneLayout = {
  brand: { x: 0.5, y: 0.18, width: 0.78, height: 0.08 },
  headline: { x: 0.5, y: 0.35, width: 0.86, height: 0.22 },
  visualizer: { x: 0.5, y: 0.57, width: 0.96, height: 0.18 },
  caption: { x: 0.5, y: 0.75, width: 0.82, height: 0.14 },
};

const clamp = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

export const normalizeLayoutBox = (box: AdSceneLayoutBox): AdSceneLayoutBox => {
  const width = clamp(box.width, 0.12, 1);
  const height = clamp(box.height, 0.05, 1);

  return {
    width,
    height,
    x: clamp(box.x, 0.08, 0.92),
    y: clamp(box.y, 0.06, 0.94),
  };
};

export const getAdSceneLayout = (scene: Pick<AdScene, 'layout'> | { layout?: Partial<AdSceneLayout> }): AdSceneLayout => ({
  brand: normalizeLayoutBox({ ...DEFAULT_SCENE_LAYOUT.brand, ...scene.layout?.brand }),
  headline: normalizeLayoutBox({ ...DEFAULT_SCENE_LAYOUT.headline, ...scene.layout?.headline }),
  visualizer: normalizeLayoutBox({ ...DEFAULT_SCENE_LAYOUT.visualizer, ...scene.layout?.visualizer }),
  caption: normalizeLayoutBox({ ...DEFAULT_SCENE_LAYOUT.caption, ...scene.layout?.caption }),
});

export const cloneAdScene = (scene: AdScene): AdScene => (
  {
    ...(JSON.parse(JSON.stringify(scene)) as AdScene),
    layout: getAdSceneLayout(scene),
  }
);

export const serializeAdScene = (scene: AdScene) => JSON.stringify(scene);

export const deserializeAdScene = (value: string): AdScene => (
  cloneAdScene(JSON.parse(value) as AdScene)
);

export const getAdSceneBrandKey = (scene: AdScene) => (
  `${scene.brand.websiteUrl}|${scene.brand.name}`.toLowerCase()
);
