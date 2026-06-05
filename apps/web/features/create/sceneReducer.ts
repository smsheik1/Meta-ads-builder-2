import {
  cloneAdScene,
  getAdSceneLayout,
  normalizeLayoutBox,
  type AdScene,
  type AdSceneAudio,
  type AdSceneCreative,
  type AdSceneLayoutElement,
} from './scene';
import { ogToolScene } from './fixtures';

type RerollCreativePayload = Partial<Pick<
  AdSceneCreative,
  'angleId' | 'headline' | 'headlineColor' | 'subheadline' | 'ctaText' | 'ctaUrl' | 'backgroundColor' | 'accentColor'
>> & {
  visualizer?: Partial<AdSceneCreative['visualizer']>;
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

export type AdSceneAction =
  | { type: 'rerollCreative'; creative: RerollCreativePayload; now?: number }
  | { type: 'editCreative'; creative: Partial<Pick<AdSceneCreative, 'headline' | 'headlineColor' | 'accentColor'>>; visualizer?: Partial<AdSceneCreative['visualizer']>; now?: number }
  | { type: 'replaceLogo'; logoUrl: string | null; now?: number }
  | { type: 'moveLayoutElement'; element: AdSceneLayoutElement; x: number; y: number; now?: number }
  | { type: 'setLock'; field: keyof AdScene['locks']; locked: boolean; now?: number }
  | { type: 'updateAudio'; audio: Partial<AdSceneAudio>; now?: number }
  | { type: 'loadScene'; scene: AdScene }
  | { type: 'resetScene'; scene?: AdScene };

const getNow = (now?: number) => now ?? Date.now();

const layoutElementIsLocked = (scene: AdScene, element: AdSceneLayoutElement) => {
  if (element === 'brand') return scene.locks.logo;
  if (element === 'headline') return scene.locks.headline;
  if (element === 'visualizer') return scene.locks.visualizer;
  return scene.locks.audio;
};

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

  if (action.type === 'replaceLogo') {
    if (scene.locks.logo) return scene;
    return {
      ...scene,
      brand: {
        ...scene.brand,
        logoUrl: action.logoUrl,
      },
      updatedAt: getNow(action.now),
    };
  }

  if (action.type === 'editCreative') {
    const nextCreative: AdSceneCreative = { ...scene.creative };

    if (!scene.locks.headline && action.creative.headline !== undefined) {
      nextCreative.headline = action.creative.headline;
    }

    if (!scene.locks.headline && action.creative.headlineColor !== undefined) {
      nextCreative.headlineColor = action.creative.headlineColor;
    }

    if (action.creative.accentColor !== undefined) {
      nextCreative.accentColor = action.creative.accentColor;
    }

    if (!scene.locks.visualizer && action.visualizer) {
      nextCreative.visualizer = {
        ...nextCreative.visualizer,
        ...action.visualizer,
      };
    }

    return {
      ...scene,
      creative: nextCreative,
      updatedAt: getNow(action.now),
    };
  }

  if (action.type === 'moveLayoutElement') {
    if (layoutElementIsLocked(scene, action.element)) return scene;
    const layout = getAdSceneLayout(scene);

    return {
      ...scene,
      layout: {
        ...layout,
        [action.element]: normalizeLayoutBox({
          ...layout[action.element],
          x: action.x,
          y: action.y,
        }),
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

    if (!scene.locks.headline && incoming.headlineColor !== undefined) {
      nextCreative.headlineColor = incoming.headlineColor;
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
