import type { AdElement } from '../store';

export const FIXED_AD_BACKGROUND_COLOR = '#fafaf7';
const SOFT_TINT_BASE_COLOR = '#fffef8';
const SOFT_TINT_BASE_WEIGHT = 0.86;

export type VisualizerStyleSettings = {
  visualizerTypes: NonNullable<AdElement['visualizerType']>[];
  barCounts: number[];
  sensitivities: number[];
  heights: number[];
};

export type VisualizerStyleVariant = {
  visualizerType: NonNullable<AdElement['visualizerType']>;
  barCount: number;
  sensitivity: number;
  height: number;
};

export type HeadlineStyleTreatment = {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  width: number;
};

export type AdStyleArchetype = {
  id: string;
  name: string;
  variantFingerprint: string;
  backgroundColor: string;
  headlineColor: string;
  subheadlineColor: string;
  visualizerColor: string;
  speaker1CaptionColor: string;
  speaker2CaptionColor: string;
  ctaBackgroundColor: string;
  ctaTextColor: string;
  visualizer: VisualizerStyleSettings;
  visualizerVariant: VisualizerStyleVariant;
  headlineTreatment: HeadlineStyleTreatment;
};

type HslRange = {
  hue: [number, number];
  saturation: [number, number];
  lightness: [number, number];
};

type CtaPair = {
  background: string;
  text: string;
};

type AdStyleFamily = {
  id: string;
  name: string;
  headlines: string[];
  subheadlines: string[];
  visualizer: HslRange | string[];
  speaker1: HslRange | string[];
  speaker2: HslRange | string[];
  ctas: CtaPair[];
  visualizerSettings: VisualizerStyleSettings;
  headlineTreatments: HeadlineStyleTreatment[];
};

const STYLE_FAMILIES: AdStyleFamily[] = [
  {
    id: 'clean-mint',
    name: 'Clean Mint',
    headlines: ['#0f172a', '#111827', '#0c1322', '#1a1f2e'],
    subheadlines: ['#334155', '#475569', '#3f4b5f'],
    visualizer: { hue: [162, 176], saturation: [72, 95], lightness: [42, 56] },
    speaker1: { hue: [170, 190], saturation: [58, 78], lightness: [30, 43] },
    speaker2: { hue: [238, 258], saturation: [62, 82], lightness: [48, 62] },
    ctas: [
      { background: '#111827', text: '#ffffff' },
      { background: '#0f172a', text: '#99f6e4' },
      { background: '#042f2e', text: '#ccfbf1' },
    ],
    visualizerSettings: {
      visualizerTypes: ['bars-center', 'waveform-strip'],
      barCounts: [14, 16, 20, 24, 28, 32],
      sensitivities: [1.25, 1.4, 1.55, 1.7, 1.85],
      heights: [0.74, 0.82, 0.9, 1, 1.08],
    },
    headlineTreatments: [
      { fontSize: 50, fontWeight: '900', lineHeight: 1.02, width: 320 },
      { fontSize: 46, fontWeight: '800', lineHeight: 1.06, width: 348 },
      { fontSize: 54, fontWeight: '900', lineHeight: 0.98, width: 300 },
    ],
  },
  {
    id: 'warm-minimal',
    name: 'Warm Minimal',
    headlines: ['#1f2937', '#111827', '#2b2118'],
    subheadlines: ['#475569', '#5b6472', '#6b4f35'],
    visualizer: { hue: [30, 43], saturation: [78, 94], lightness: [48, 58] },
    speaker1: { hue: [168, 184], saturation: [54, 72], lightness: [28, 40] },
    speaker2: { hue: [268, 286], saturation: [58, 78], lightness: [42, 58] },
    ctas: [
      { background: '#111827', text: '#ffffff' },
      { background: '#431407', text: '#fed7aa' },
      { background: '#292524', text: '#fde68a' },
    ],
    visualizerSettings: {
      visualizerTypes: ['bars-center', 'bars-bottom'],
      barCounts: [12, 14, 16, 20, 24, 30],
      sensitivities: [1.12, 1.24, 1.38, 1.52, 1.66],
      heights: [0.66, 0.74, 0.82, 0.9, 0.98],
    },
    headlineTreatments: [
      { fontSize: 48, fontWeight: '900', lineHeight: 1.04, width: 330 },
      { fontSize: 44, fontWeight: '800', lineHeight: 1.1, width: 362 },
      { fontSize: 52, fontWeight: '900', lineHeight: 1, width: 306 },
    ],
  },
  {
    id: 'premium-cream',
    name: 'Premium Cream',
    headlines: ['#111827', '#1c1917', '#231f20'],
    subheadlines: ['#4b5563', '#57534e', '#5f5146'],
    visualizer: ['#64748b', '#7c6f64', '#475569', '#8b7355', '#6b7280'],
    speaker1: { hue: [198, 212], saturation: [68, 82], lightness: [30, 42] },
    speaker2: { hue: [342, 354], saturation: [64, 82], lightness: [36, 48] },
    ctas: [
      { background: '#312e81', text: '#ffffff' },
      { background: '#111827', text: '#fef3c7' },
      { background: '#3f2f26', text: '#fff7ed' },
    ],
    visualizerSettings: {
      visualizerTypes: ['waveform-strip', 'bars-center'],
      barCounts: [18, 20, 24, 28, 32, 36],
      sensitivities: [1.22, 1.36, 1.5, 1.64, 1.78],
      heights: [0.7, 0.78, 0.86, 0.94, 1.02],
    },
    headlineTreatments: [
      { fontSize: 46, fontWeight: '900', lineHeight: 1.06, width: 340 },
      { fontSize: 42, fontWeight: '800', lineHeight: 1.12, width: 370 },
      { fontSize: 50, fontWeight: '900', lineHeight: 1.02, width: 314 },
    ],
  },
  {
    id: 'bright-trust',
    name: 'Bright Trust',
    headlines: ['#0f172a', '#082f49', '#10233f'],
    subheadlines: ['#1e3a8a', '#1d4ed8', '#334155'],
    visualizer: { hue: [194, 207], saturation: [78, 94], lightness: [52, 64] },
    speaker1: { hue: [198, 208], saturation: [72, 88], lightness: [36, 46] },
    speaker2: { hue: [272, 292], saturation: [62, 82], lightness: [46, 60] },
    ctas: [
      { background: '#0f766e', text: '#ffffff' },
      { background: '#0f172a', text: '#bae6fd' },
      { background: '#1e3a8a', text: '#ffffff' },
    ],
    visualizerSettings: {
      visualizerTypes: ['bars-center', 'bars-bottom', 'waveform-strip'],
      barCounts: [16, 20, 24, 28, 32, 36],
      sensitivities: [1.35, 1.5, 1.68, 1.84, 2],
      heights: [0.76, 0.84, 0.92, 1, 1.08],
    },
    headlineTreatments: [
      { fontSize: 50, fontWeight: '900', lineHeight: 1, width: 318 },
      { fontSize: 46, fontWeight: '800', lineHeight: 1.08, width: 352 },
      { fontSize: 54, fontWeight: '900', lineHeight: 0.98, width: 302 },
    ],
  },
  {
    id: 'editorial-black',
    name: 'Editorial Black',
    headlines: ['#030712', '#111111', '#18181b'],
    subheadlines: ['#374151', '#3f3f46', '#52525b'],
    visualizer: ['#030712', '#18181b', '#27272a', '#0f172a'],
    speaker1: { hue: [178, 196], saturation: [62, 86], lightness: [34, 48] },
    speaker2: { hue: [344, 18], saturation: [72, 92], lightness: [48, 58] },
    ctas: [
      { background: '#030712', text: '#ffffff' },
      { background: '#111827', text: '#f9fafb' },
      { background: '#18181b', text: '#fef08a' },
    ],
    visualizerSettings: {
      visualizerTypes: ['bars-center', 'bars-bottom'],
      barCounts: [14, 18, 22, 26, 32, 40],
      sensitivities: [1.22, 1.38, 1.56, 1.74, 1.92],
      heights: [0.7, 0.8, 0.9, 1, 1.1],
    },
    headlineTreatments: [
      { fontSize: 52, fontWeight: '900', lineHeight: 0.98, width: 306 },
      { fontSize: 44, fontWeight: '800', lineHeight: 1.1, width: 360 },
      { fontSize: 48, fontWeight: '900', lineHeight: 1.04, width: 332 },
    ],
  },
  {
    id: 'soft-pastel',
    name: 'Soft Pastel',
    headlines: ['#111827', '#1f2937', '#27272a'],
    subheadlines: ['#475569', '#6b7280', '#4b5563'],
    visualizer: ['#86efac', '#f0abfc', '#93c5fd', '#f9a8d4', '#a7f3d0'],
    speaker1: ['#0f766e', '#2563eb', '#047857', '#0369a1'],
    speaker2: ['#be185d', '#7c3aed', '#c2410c', '#a21caf'],
    ctas: [
      { background: '#111827', text: '#ffffff' },
      { background: '#7c3aed', text: '#ffffff' },
      { background: '#be185d', text: '#ffffff' },
    ],
    visualizerSettings: {
      visualizerTypes: ['waveform-strip', 'bars-center'],
      barCounts: [16, 20, 24, 28, 36, 44],
      sensitivities: [1.14, 1.28, 1.45, 1.62, 1.78],
      heights: [0.68, 0.76, 0.84, 0.92, 1],
    },
    headlineTreatments: [
      { fontSize: 48, fontWeight: '900', lineHeight: 1.04, width: 326 },
      { fontSize: 42, fontWeight: '800', lineHeight: 1.12, width: 372 },
      { fontSize: 52, fontWeight: '900', lineHeight: 1, width: 308 },
    ],
  },
];

const recentFamilyIds: string[] = [];
const recentVariantFingerprints: string[] = [];

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const rollHue = ([min, max]: [number, number]) => {
  if (min <= max) return randomBetween(min, max);
  const span = (360 - min) + max;
  return (min + Math.random() * span) % 360;
};

const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const sat = saturation / 100;
  const light = lightness / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
  const match = light - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (normalizedHue < 60) [r, g, b] = [chroma, x, 0];
  else if (normalizedHue < 120) [r, g, b] = [x, chroma, 0];
  else if (normalizedHue < 180) [r, g, b] = [0, chroma, x];
  else if (normalizedHue < 240) [r, g, b] = [0, x, chroma];
  else if (normalizedHue < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  const toHex = (value: number) => Math.round((value + match) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const rollColor = (source: HslRange | string[]) => {
  if (Array.isArray(source)) return pickRandom(source);
  return hslToHex(
    rollHue(source.hue),
    randomBetween(source.saturation[0], source.saturation[1]),
    randomBetween(source.lightness[0], source.lightness[1])
  );
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const toHexChannel = (value: number) => Math.round(value).toString(16).padStart(2, '0');

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) => (
  `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`
);

const mixHexColors = (color: string, baseColor: string, baseWeight: number) => {
  const source = hexToRgb(color);
  const base = hexToRgb(baseColor);
  if (!source || !base) return null;
  const sourceWeight = 1 - baseWeight;

  return rgbToHex({
    r: source.r * sourceWeight + base.r * baseWeight,
    g: source.g * sourceWeight + base.g * baseWeight,
    b: source.b * sourceWeight + base.b * baseWeight,
  });
};

export const createTintedAdBackground = (
  sourceColor: string | null | undefined,
  fallback = FIXED_AD_BACKGROUND_COLOR,
) => (
  mixHexColors(sourceColor || '', SOFT_TINT_BASE_COLOR, SOFT_TINT_BASE_WEIGHT) || fallback
);

const luminanceChannel = (channel: number) => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

export const getContrastRatio = (foreground: string, background: string) => {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return 21;
  const fgLum = 0.2126 * luminanceChannel(fg.r) + 0.7152 * luminanceChannel(fg.g) + 0.0722 * luminanceChannel(fg.b);
  const bgLum = 0.2126 * luminanceChannel(bg.r) + 0.7152 * luminanceChannel(bg.g) + 0.0722 * luminanceChannel(bg.b);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
};

export const isReadableOnBackground = (foreground: string, background: string) =>
  getContrastRatio(foreground, background) >= 4.5;

export const isValidAdStyleArchetype = (archetype: AdStyleArchetype) =>
  isReadableOnBackground(archetype.headlineColor, archetype.backgroundColor) &&
  isReadableOnBackground(archetype.subheadlineColor, archetype.backgroundColor) &&
  isReadableOnBackground(archetype.speaker1CaptionColor, archetype.backgroundColor) &&
  isReadableOnBackground(archetype.speaker2CaptionColor, archetype.backgroundColor) &&
  isReadableOnBackground(archetype.ctaTextColor, archetype.ctaBackgroundColor);

export const pickRandom = <T,>(items: T[], current?: T) => {
  const options = items.filter(item => item !== current);
  const source = options.length > 0 ? options : items;
  return source[Math.floor(Math.random() * source.length)];
};

const colorBucket = (color: string) => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const intensity = max < 80 ? 'dark' : max > 210 ? 'bright' : 'mid';
  const warmth = rgb.r >= rgb.b + 20 ? 'warm' : rgb.b >= rgb.r + 20 ? 'cool' : 'neutral';
  const saturation = max - min > 110 ? 'high' : max - min > 55 ? 'medium' : 'low';
  return `${warmth}-${saturation}-${intensity}`;
};

const rollVisualizerVariant = (settings: VisualizerStyleSettings): VisualizerStyleVariant => ({
  visualizerType: pickRandom(settings.visualizerTypes),
  barCount: pickRandom(settings.barCounts),
  sensitivity: pickRandom(settings.sensitivities),
  height: pickRandom(settings.heights),
});

const buildVariantFingerprint = (
  family: AdStyleFamily,
  visualizerColor: string,
  speaker2Color: string,
  cta: CtaPair,
  visualizerVariant: VisualizerStyleVariant,
  headlineTreatment: HeadlineStyleTreatment
) => {
  const density = visualizerVariant.barCount <= 18 ? 'sparse' : visualizerVariant.barCount >= 32 ? 'dense' : 'balanced';
  const motion = visualizerVariant.sensitivity < 1.35 ? 'calm' : visualizerVariant.sensitivity > 1.7 ? 'active' : 'steady';
  const headline = headlineTreatment.fontSize >= 52 ? 'big' : headlineTreatment.width >= 350 ? 'wide' : 'standard';
  return [
    family.id,
    visualizerVariant.visualizerType,
    colorBucket(visualizerColor),
    colorBucket(speaker2Color),
    cta.background,
    density,
    motion,
    headline,
  ].join('|');
};

const rollFamily = (family: AdStyleFamily): AdStyleArchetype => {
  const cta = pickRandom(family.ctas);
  const visualizerVariant = rollVisualizerVariant(family.visualizerSettings);
  const headlineTreatment = pickRandom(family.headlineTreatments);
  const visualizerColor = rollColor(family.visualizer);
  const speaker2CaptionColor = rollColor(family.speaker2);
  const variantFingerprint = buildVariantFingerprint(
    family,
    visualizerColor,
    speaker2CaptionColor,
    cta,
    visualizerVariant,
    headlineTreatment
  );

  return {
    id: family.id,
    name: family.name,
    variantFingerprint,
    backgroundColor: createTintedAdBackground(visualizerColor),
    headlineColor: pickRandom(family.headlines),
    subheadlineColor: pickRandom(family.subheadlines),
    visualizerColor,
    speaker1CaptionColor: rollColor(family.speaker1),
    speaker2CaptionColor,
    ctaBackgroundColor: cta.background,
    ctaTextColor: cta.text,
    visualizer: family.visualizerSettings,
    visualizerVariant,
    headlineTreatment,
  };
};

export const AD_STYLE_ARCHETYPES: AdStyleArchetype[] = STYLE_FAMILIES.map(rollFamily);

const rememberFamily = (familyId: string) => {
  recentFamilyIds.unshift(familyId);
  recentFamilyIds.splice(2);
};

const rememberVariant = (variantFingerprint: string) => {
  recentVariantFingerprints.unshift(variantFingerprint);
  recentVariantFingerprints.splice(5);
};

export const getRandomAdStyleArchetype = (currentId?: string) => {
  const availableFamilies = STYLE_FAMILIES.filter(family => family.id !== currentId && !recentFamilyIds.includes(family.id));
  const source = availableFamilies.length > 0
    ? availableFamilies
    : STYLE_FAMILIES.filter(family => family.id !== currentId);
  const family = pickRandom(source.length > 0 ? source : STYLE_FAMILIES);

  for (let attempt = 0; attempt < 24; attempt++) {
    const archetype = rollFamily(family);
    if (isValidAdStyleArchetype(archetype) && !recentVariantFingerprints.includes(archetype.variantFingerprint)) {
      rememberFamily(family.id);
      rememberVariant(archetype.variantFingerprint);
      return archetype;
    }
  }

  const fallback = rollFamily(STYLE_FAMILIES[0]);
  rememberFamily(fallback.id);
  rememberVariant(fallback.variantFingerprint);
  return fallback;
};
