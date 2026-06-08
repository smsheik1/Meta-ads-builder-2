import type { AdSceneVisualizerStyle } from "./types";
import { legacyCreateVisualizerStyle } from "./visualizerStyle";

export type VisualizerSceneVariant = {
  id: string;
  visualizer: AdSceneVisualizerStyle;
};

export const visualizerSceneVariants: VisualizerSceneVariant[] = [
  {
    id: "legacy-waveform-balanced",
    visualizer: legacyCreateVisualizerStyle,
  },
  {
    id: "legacy-waveform-dense",
    visualizer: {
      ...legacyCreateVisualizerStyle,
      barCount: 32,
      sensitivity: 1.7,
      heightScale: 1,
      gain: 1.85,
      compression: 2.7,
    },
  },
  {
    id: "legacy-waveform-soft",
    visualizer: {
      ...legacyCreateVisualizerStyle,
      barCount: 20,
      sensitivity: 1.28,
      heightScale: 0.78,
      gain: 1.45,
      compression: 3.4,
      floor: 0.1,
    },
  },
  {
    id: "center-bars-punchy",
    visualizer: {
      ...legacyCreateVisualizerStyle,
      type: "bars-center",
      barCount: 16,
      sensitivity: 1.85,
      heightScale: 1.08,
      gain: 1.75,
      compression: 2.6,
      curve: "sqrt",
      mirror: true,
    },
  },
  {
    id: "center-bars-tight",
    visualizer: {
      ...legacyCreateVisualizerStyle,
      type: "bars-center",
      barCount: 28,
      sensitivity: 1.45,
      heightScale: 0.86,
      gain: 1.55,
      compression: 3.2,
      mirror: true,
    },
  },
  {
    id: "bottom-bars-calm",
    visualizer: {
      ...legacyCreateVisualizerStyle,
      type: "bars-bottom",
      barCount: 18,
      sensitivity: 1.25,
      heightScale: 0.78,
      gain: 1.35,
      compression: 3.8,
      floor: 0.06,
    },
  },
  {
    id: "bottom-bars-dense",
    visualizer: {
      ...legacyCreateVisualizerStyle,
      type: "bars-bottom",
      barCount: 34,
      sensitivity: 1.65,
      heightScale: 0.94,
      gain: 1.7,
      compression: 3,
      floor: 0.08,
    },
  },
];

const fallbackVisualizerColors = [
  "#25D8C4",
  "#82DFFF",
  "#F9A8D4",
  "#EF4444",
  "#8B5CF6",
  "#F97316",
  "#22C55E",
  "#0F172A",
];

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const toHexChannel = (value: number) => Math.round(value).toString(16).padStart(2, "0");

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

const isUsefulColor = (value: string) => {
  if (!/^#[0-9A-F]{6}$/i.test(value)) return false;
  if (/^#(?:000000|111111|FFFFFF|F9FAFB|F8FAFC)$/i.test(value)) return false;
  const rgb = hexToRgb(value);
  if (!rgb) return false;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max >= 42 && min <= 245;
};

const uniqueColors = (colors: string[]) => colors.filter((color, index, all) => (
  all.findIndex((item) => item.toLowerCase() === color.toLowerCase()) === index
));

export const getVisualizerVariantForCandidate = (candidateIndex: number) => (
  visualizerSceneVariants[Math.abs(candidateIndex) % visualizerSceneVariants.length] || visualizerSceneVariants[0]!
);

export const pickVisualizerColorForCandidate = (brandColors: string[], candidateIndex: number) => {
  const usefulBrandColors = uniqueColors(brandColors.filter(isUsefulColor));
  const palette = usefulBrandColors.length >= 2
    ? usefulBrandColors
    : uniqueColors([...usefulBrandColors, ...fallbackVisualizerColors]);

  return palette[Math.abs(candidateIndex) % palette.length] || fallbackVisualizerColors[0]!;
};

export const createTintedVisualizerBackground = (visualizerColor: string) => (
  mixHexColors(visualizerColor, "#FFFEF8", 0.86) || "#FBFAF5"
);
