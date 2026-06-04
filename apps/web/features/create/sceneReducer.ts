import { cloneAdScene, type AdScene, type AdSceneAudio, type AdSceneCreative } from './scene';
import { ogToolScene } from './fixtures';

type RerollCreativePayload = Partial<Pick<
  AdSceneCreative,
  'angleId' | 'headline' | 'subheadline' | 'ctaText' | 'ctaUrl' | 'backgroundColor' | 'accentColor'
>> & {
  visualizer?: Partial<AdSceneCreative['visualizer']>;
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

export type AdSceneAction =
  | { type: 'rerollCreative'; creative: RerollCreativePayload; now?: number }
  | { type: 'setLock'; field: keyof AdScene['locks']; locked: boolean; now?: number }
  | { type: 'updateAudio'; audio: Partial<AdSceneAudio>; now?: number }
  | { type: 'loadScene'; scene: AdScene }
  | { type: 'resetScene'; scene?: AdScene };

const getNow = (now?: number) => now ?? Date.now();

export const reduceAdScene = (scene: AdScene, action: AdSceneAction): AdScene => {
  if (action.type === 'loadScene') return cloneAdScene(action.scene);
  if (action.type === 'resetScene') return cloneAdScene(action.scene ?? ogToolScene);

  if (action.type === 'setLock') {
    return {
      ...scene,
      locks: {
        ...scene.locks,
        [action.field]: action.locked,
      },
      updatedAt: getNow(action.now),
    };
  }

  if (action.type === 'updateAudio') {
    if (scene.locks.audio) return scene;
    if (action.audio.sourceSceneId && action.audio.sourceSceneId !== scene.id) return scene;
    return {
      ...scene,
      audio: {
        ...scene.audio,
        ...action.audio,
      },
      updatedAt: getNow(action.now),
    };
  }

  if (action.type === 'rerollCreative') {
    const nextCreative: AdSceneCreative = { ...scene.creative };
    const incoming = action.creative;

    if (!scene.locks.headline && incoming.headline !== undefined) {
      nextCreative.headline = incoming.headline;
    }

    if (!scene.locks.subheadline && incoming.subheadline !== undefined) {
      nextCreative.subheadline = incoming.subheadline;
    }

    if (incoming.angleId !== undefined) nextCreative.angleId = incoming.angleId;
    if (incoming.ctaText !== undefined) nextCreative.ctaText = incoming.ctaText;
    if (incoming.ctaUrl !== undefined) nextCreative.ctaUrl = incoming.ctaUrl;
    if (incoming.backgroundColor !== undefined) nextCreative.backgroundColor = incoming.backgroundColor;
    if (incoming.accentColor !== undefined) nextCreative.accentColor = incoming.accentColor;

    if (!scene.locks.visualizer && incoming.visualizer) {
      nextCreative.visualizer = {
        ...nextCreative.visualizer,
        ...incoming.visualizer,
      };
    }

    return {
      ...scene,
      brand: scene.locks.logo
        ? scene.brand
        : {
          ...scene.brand,
          logoUrl: incoming.logoUrl === undefined ? scene.brand.logoUrl : incoming.logoUrl,
          faviconUrl: incoming.faviconUrl === undefined ? scene.brand.faviconUrl : incoming.faviconUrl,
        },
      creative: nextCreative,
      updatedAt: getNow(action.now),
    };
  }

  return scene;
};
