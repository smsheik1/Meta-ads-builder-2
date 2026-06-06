import type { AdSceneCreative, AdSceneCreativePatch } from './scene';

export type SceneStyleFamily = Required<Pick<
  AdSceneCreative,
  | 'styleId'
  | 'headlineColor'
  | 'headlineSize'
  | 'headlineAlign'
  | 'headlineLineHeight'
  | 'captionColor'
  | 'backgroundColor'
  | 'accentColor'
>> & {
  name: string;
  visualizer: Required<Pick<
    AdSceneCreative['visualizer'],
    'color' | 'idlePreset' | 'playbackPreset' | 'barCount' | 'motion' | 'heightScale' | 'baseline'
  >>;
};

export const SCENE_STYLE_FAMILIES: SceneStyleFamily[] = [
  {
    styleId: 'clean-mint',
    name: 'Clean Mint',
    backgroundColor: '#f8fffb',
    headlineColor: '#0f172a',
    headlineSize: 'balanced',
    headlineAlign: 'center',
    headlineLineHeight: 1.02,
    captionColor: '#334155',
    accentColor: '#2dd4bf',
    visualizer: {
      color: '#34d399',
      idlePreset: 'wide-soft-bars',
      playbackPreset: 'voice-reactive-bars',
      barCount: 23,
      motion: 'balanced',
      heightScale: 1,
      baseline: 0.26,
    },
  },
  {
    styleId: 'bright-trust',
    name: 'Bright Trust',
    backgroundColor: '#f8fafc',
    headlineColor: '#082f49',
    headlineSize: 'hero',
    headlineAlign: 'center',
    headlineLineHeight: 0.98,
    captionColor: '#475569',
    accentColor: '#38bdf8',
    visualizer: {
      color: '#93c5fd',
      idlePreset: 'center-pulse-bars',
      playbackPreset: 'center-wave-bars',
      barCount: 25,
      motion: 'smooth',
      heightScale: 1.06,
      baseline: 0.24,
    },
  },
  {
    styleId: 'soft-pastel',
    name: 'Soft Pastel',
    backgroundColor: '#fff7fb',
    headlineColor: '#111827',
    headlineSize: 'balanced',
    headlineAlign: 'center',
    headlineLineHeight: 1.04,
    captionColor: '#6b4665',
    accentColor: '#f472b6',
    visualizer: {
      color: '#f9a8d4',
      idlePreset: 'calm-stack-bars',
      playbackPreset: 'stacked-surge-bars',
      barCount: 21,
      motion: 'balanced',
      heightScale: 0.94,
      baseline: 0.3,
    },
  },
  {
    styleId: 'editorial-ink',
    name: 'Editorial Ink',
    backgroundColor: '#ffffff',
    headlineColor: '#030712',
    headlineSize: 'hero',
    headlineAlign: 'center',
    headlineLineHeight: 1,
    captionColor: '#374151',
    accentColor: '#111827',
    visualizer: {
      color: '#111827',
      idlePreset: 'tight-bounce-bars',
      playbackPreset: 'voice-reactive-bars',
      barCount: 27,
      motion: 'snappy',
      heightScale: 1,
      baseline: 0.22,
    },
  },
  {
    styleId: 'signal-green',
    name: 'Signal Green',
    backgroundColor: '#fbfff5',
    headlineColor: '#14532d',
    headlineSize: 'compact',
    headlineAlign: 'center',
    headlineLineHeight: 1.08,
    captionColor: '#3f4f46',
    accentColor: '#22c55e',
    visualizer: {
      color: '#86efac',
      idlePreset: 'wide-soft-bars',
      playbackPreset: 'center-wave-bars',
      barCount: 29,
      motion: 'smooth',
      heightScale: 0.9,
      baseline: 0.32,
    },
  },
  {
    styleId: 'electric-coral',
    name: 'Electric Coral',
    backgroundColor: '#fff8f5',
    headlineColor: '#3b1d16',
    headlineSize: 'balanced',
    headlineAlign: 'center',
    headlineLineHeight: 1,
    captionColor: '#5b463f',
    accentColor: '#fb7185',
    visualizer: {
      color: '#fb7185',
      idlePreset: 'center-pulse-bars',
      playbackPreset: 'stacked-surge-bars',
      barCount: 19,
      motion: 'snappy',
      heightScale: 1.08,
      baseline: 0.2,
    },
  },
];

export const hashStyleSeed = (value: string) => (
  Array.from(value).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 0)
);

export const pickSceneStyleFamily = (
  seed: number,
  currentStyleId?: string,
  brandAccent?: string,
) => {
  const families = SCENE_STYLE_FAMILIES;
  let index = Math.abs(seed) % families.length;

  if (families.length > 1 && families[index]?.styleId === currentStyleId) {
    index = (index + 1) % families.length;
  }

  const family = families[index] ?? families[0];
  const accentColor = brandAccent || family.accentColor;

  return {
    ...family,
    accentColor,
    visualizer: {
      ...family.visualizer,
      color: brandAccent || family.visualizer.color,
    },
  };
};

export const sceneStyleFamilyToCreativePatch = (family: SceneStyleFamily): AdSceneCreativePatch => ({
  styleId: family.styleId,
  headlineColor: family.headlineColor,
  headlineSize: family.headlineSize,
  headlineAlign: family.headlineAlign,
  headlineLineHeight: family.headlineLineHeight,
  captionColor: family.captionColor,
  backgroundColor: family.backgroundColor,
  accentColor: family.accentColor,
  visualizer: { ...family.visualizer },
});
