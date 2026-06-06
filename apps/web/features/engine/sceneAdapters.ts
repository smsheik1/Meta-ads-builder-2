import { cloneAdScene, type AdScene } from './scene';

export type SavedDesign = {
  id: string;
  title: string;
  scene: AdScene;
  createdAt: number;
  updatedAt: number;
};

export const audioUrlIsInlineBlob = (url: string | null) => (
  Boolean(url && /^(data|blob):/i.test(url))
);

export const stripInlineAudioForPersistence = (scene: AdScene): AdScene => {
  const nextScene = cloneAdScene(scene);

  if (audioUrlIsInlineBlob(nextScene.audio.url)) {
    nextScene.audio = {
      status: 'none',
      url: null,
      storageId: null,
      mimeType: null,
      transcript: '',
      captions: [],
      brandKey: null,
      sourceSceneId: null,
      scriptId: null,
      durationMs: null,
    };
  }

  return nextScene;
};

export const createSavedDesign = (
  scene: AdScene,
  title = scene.creative.headline,
  now = Date.now(),
  id = `saved-${scene.id}-${scene.updatedAt}-${now}`,
): SavedDesign => ({
  id,
  title,
  scene: stripInlineAudioForPersistence(scene),
  createdAt: now,
  updatedAt: now,
});

export const loadSavedDesign = (design: SavedDesign): AdScene => cloneAdScene(design.scene);

export type RenderScene = AdScene;

export const toRenderScene = (scene: AdScene): RenderScene => cloneAdScene(scene);

export type ShareScene = Pick<AdScene, 'id' | 'brand' | 'platform' | 'creative' | 'audio' | 'layout'>;

export const toShareScene = (scene: AdScene): ShareScene => ({
  id: scene.id,
  brand: { ...scene.brand, receipts: { ...scene.brand.receipts } },
  platform: scene.platform,
  creative: { ...scene.creative, visualizer: { ...scene.creative.visualizer } },
  audio: { ...scene.audio, captions: [...scene.audio.captions] },
  layout: cloneAdScene(scene).layout,
});
