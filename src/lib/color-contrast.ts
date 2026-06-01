const HEX_COLOR_RE = /^#([0-9a-f]{6})$/i;

const MOTION_FALLBACK_COLORS = ['#00D6B8', '#4F46E5', '#0F172A'];

export const normalizeHexColor = (color: string | null | undefined) => {
  if (!color) return null;
  const trimmed = color.trim();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
  }
  return HEX_COLOR_RE.test(trimmed) ? trimmed.toUpperCase() : null;
};

const hexToRgb = (color: string) => {
  const normalized = normalizeHexColor(color);
  if (!normalized) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
};

const toLinearChannel = (channel: number) => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

export const getRelativeLuminance = (color: string) => {
  const rgb = hexToRgb(color);
  if (!rgb) return 1;
  return (
    0.2126 * toLinearChannel(rgb.r) +
    0.7152 * toLinearChannel(rgb.g) +
    0.0722 * toLinearChannel(rgb.b)
  );
};

export const getContrastRatio = (foreground: string, background = '#FAFAF7') => {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

export const pickVisibleColorOnLight = (
  candidates: Array<string | null | undefined>,
  fallback: string,
  options: { background?: string; minContrast?: number; maxLuminance?: number } = {}
) => {
  const background = options.background || '#FAFAF7';
  const minContrast = options.minContrast ?? 1.5;
  const maxLuminance = options.maxLuminance ?? 0.78;
  const ordered = [...candidates, fallback, ...MOTION_FALLBACK_COLORS]
    .map(normalizeHexColor)
    .filter((color): color is string => Boolean(color));

  return ordered.find((color) => (
    getRelativeLuminance(color) <= maxLuminance &&
    getContrastRatio(color, background) >= minContrast
  )) || '#0F172A';
};
