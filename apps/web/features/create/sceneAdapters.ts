import { cloneAdScene, type AdScene } from './scene';

export type SavedDesign = {
  id: string;
  title: string;
  scene: AdScene;
  createdAt: number;
};

export const createSavedDesign = (scene: AdScene, title = scene.creative.headline): SavedDesign => ({
  id: `saved-${scene.id}`,
  title,
  scene: cloneAdScene(scene),
  createdAt: Date.now(),
});

export const loadSavedDesign = (design: SavedDesign): AdScene => cloneAdScene(design.scene);

export type RenderScene = AdScene;

export const toRenderScene = (scene: AdScene): RenderScene => cloneAdScene(scene);

export type ShareScene = Pick<AdScene, 'id' | 'brand' | 'platform' | 'creative' | 'audio'>;

export const toShareScene = (scene: AdScene): ShareScene => ({
  id: scene.id,
  brand: { ...scene.brand, receipts: { ...scene.brand.receipts } },
  platform: scene.platform,
  creative: { ...scene.creative, visualizer: { ...scene.creative.visualizer } },
  audio: { ...scene.audio, captions: [...scene.audio.captions] },
});
