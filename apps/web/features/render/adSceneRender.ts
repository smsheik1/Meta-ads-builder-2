import { cloneAdScene, type AdPlatform, type AdScene, type AdSceneAudio } from '@/features/create/scene';

export const AD_SCENE_FPS = 30;
export const DEFAULT_SCENE_DURATION_MS = 6000;
export const MAX_SCENE_DURATION_MS = 45_000;

export type AdSceneRenderSpec = {
  compositionId: string;
  width: number;
  height: number;
  label: string;
};

export const AD_SCENE_RENDER_SPECS: Record<AdPlatform, AdSceneRenderSpec> = {
  'instagram-feed': {
    compositionId: 'AdSceneFeed',
    width: 1080,
    height: 1350,
    label: 'Instagram feed',
  },
  reels: {
    compositionId: 'AdSceneVertical',
    width: 1080,
    height: 1920,
    label: 'Reels',
  },
  stories: {
    compositionId: 'AdSceneVertical',
    width: 1080,
    height: 1920,
    label: 'Stories',
  },
  youtube: {
    compositionId: 'AdSceneYouTube',
    width: 1920,
    height: 1080,
    label: 'YouTube',
  },
};

export type AdSceneRenderSnapshot = {
  scene: AdScene;
  durationMs: number;
  spec: AdSceneRenderSpec;
};

const audioUrlIsStoredFile = (url: string | null) => (
  Boolean(url && !/^(data|blob):/i.test(url))
);

export const isStoredSceneAudio = (scene: AdScene) => (
  (scene.audio.status === 'generated' || scene.audio.status === 'uploaded') &&
  audioUrlIsStoredFile(scene.audio.url) &&
  scene.audio.sourceSceneId === scene.id
);

export const isGeneratedSceneAudio = (scene: AdScene) => (
  scene.audio.status === 'generated' && isStoredSceneAudio(scene)
);

export const getSceneDurationMs = (scene: AdScene) => {
  if (!isStoredSceneAudio(scene)) return DEFAULT_SCENE_DURATION_MS;
  return Math.max(
    1_000,
    Math.min(MAX_SCENE_DURATION_MS, Number(scene.audio.durationMs || DEFAULT_SCENE_DURATION_MS)),
  );
};

export const getAdSceneRenderSpec = (platform: AdPlatform) => (
  AD_SCENE_RENDER_SPECS[platform] || AD_SCENE_RENDER_SPECS['instagram-feed']
);

export const createRenderSnapshot = (scene: AdScene): AdSceneRenderSnapshot => {
  const nextScene = cloneAdScene(scene);

  if (!isStoredSceneAudio(nextScene)) {
    nextScene.audio = {
      ...nextScene.audio,
      status: 'none',
      url: null,
      storageId: null,
      mimeType: null,
      transcript: '',
      captions: [],
      sourceSceneId: null,
      scriptId: null,
      durationMs: null,
    };
  }

  return {
    scene: nextScene,
    durationMs: getSceneDurationMs(nextScene),
    spec: getAdSceneRenderSpec(nextScene.platform),
  };
};

export const getActiveCaptionText = (audio: AdSceneAudio, currentTimeMs: number) => {
  if (audio.status !== 'generated' && audio.status !== 'uploaded') return '';
  const caption = audio.captions.find((item) => (
    currentTimeMs >= item.startMs && currentTimeMs <= item.endMs
  ));
  return caption?.text || audio.captions[0]?.text || audio.transcript;
};

export const getHeadlineScale = (headline: string) => {
  const cleanHeadline = headline.trim().replace(/\s+/g, ' ');
  const words = cleanHeadline.split(' ').filter(Boolean).length;
  const characters = cleanHeadline.length;

  if (characters >= 58 || words >= 8) return 0.72;
  if (characters >= 42 || words >= 6) return 0.82;
  return 1;
};

export const getVisualizerBarHeight = (
  index: number,
  count: number,
  currentTimeMs: number,
  maxHeight = 86,
) => {
  const centerIndex = (count - 1) / 2;
  const distance = Math.abs(index - centerIndex);
  const centerWeight = Math.max(0, 1 - distance / Math.max(1, centerIndex));
  const wave = (Math.sin(currentTimeMs / 260 + index * 0.52) + 1) / 2;
  const base = 0.28 + centerWeight * 0.58;
  const motion = 0.78 + wave * 0.32;

  return Math.round(maxHeight * base * motion);
};

export const createSceneSlug = (scene: AdScene, now = Date.now()) => {
  const headline = scene.creative.headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42) || 'wiggly-ad';
  const suffix = now.toString(36).slice(-5);

  return `${headline}-${suffix}`;
};

export const createDownloadFilename = (scene: AdScene) => {
  const brand = scene.brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'wiggly';
  const headline = scene.creative.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || 'ad';

  return `${brand}-${headline}.mp4`;
};
