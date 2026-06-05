import {
  cloneAdScene,
  getAdSceneLayout,
  normalizeLayoutBox,
  type AdScene,
  type AdSceneAudio,
  type AdSceneCreative,
  type AdSceneCreativePatch,
  type AdPlatform,
  type AdSceneLayoutElement,
} from './scene';
import { ogToolScene } from './fixtures';

type RerollCreativePayload = AdSceneCreativePatch & {
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

export type AdSceneAction =
  | { type: 'rerollCreative'; creative: RerollCreativePayload; now?: number }
  | { type: 'editCreative'; creative: AdSceneCreativePatch; visualizer?: Partial<AdSceneCreative['visualizer']>; now?: number }
  | { type: 'replaceLogo'; logoUrl: string | null; now?: number }
  | { type: 'moveLayoutElement'; element: AdSceneLayoutElement; x: number; y: number; now?: number }
  | { type: 'setPlatform'; platform: AdPlatform; now?: number }
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

  if (action.type === 'setPlatform') {
    if (scene.platform === action.platform) return scene;
    return {
      ...scene,
      platform: action.platform,
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

    if (!scene.locks.headline && action.creative.headlineSize !== undefined) {
      nextCreative.headlineSize = action.creative.headlineSize;
    }

    if (!scene.locks.headline && action.creative.headlineAlign !== undefined) {
      nextCreative.headlineAlign = action.creative.headlineAlign;
    }

    if (!scene.locks.headline && action.creative.headlineLineHeight !== undefined) {
      nextCreative.headlineLineHeight = action.creative.headlineLineHeight;
    }

    if (!scene.locks.audio && action.creative.captionColor !== undefined) {
      nextCreative.captionColor = action.creative.captionColor;
    }

    if (action.creative.accentColor !== undefined) {
      nextCreative.accentColor = action.creative.accentColor;
    }

    const incomingVisualizer = action.visualizer || action.creative.visualizer;
    if (!scene.locks.visualizer && incomingVisualizer) {
      nextCreative.visualizer = {
        ...nextCreative.visualizer,
        ...incomingVisualizer,
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

    if (!scene.locks.headline && incoming.headlineSize !== undefined) {
      nextCreative.headlineSize = incoming.headlineSize;
    }

    if (!scene.locks.headline && incoming.headlineAlign !== undefined) {
      nextCreative.headlineAlign = incoming.headlineAlign;
    }

    if (!scene.locks.headline && incoming.headlineLineHeight !== undefined) {
      nextCreative.headlineLineHeight = incoming.headlineLineHeight;
    }

    if (!scene.locks.subheadline && incoming.subheadline !== undefined) {
      nextCreative.subheadline = incoming.subheadline;
    }

    if (!scene.locks.audio && incoming.captionColor !== undefined) {
      nextCreative.captionColor = incoming.captionColor;
    }

    if (incoming.angleId !== undefined) nextCreative.angleId = incoming.angleId;
    if (incoming.styleId !== undefined) nextCreative.styleId = incoming.styleId;
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
