import type { AdScene, AdSceneCreative } from './scene';

export type CreativeRerollPayload = Partial<Pick<
  AdSceneCreative,
  'angleId' | 'headline' | 'headlineColor' | 'subheadline' | 'ctaText' | 'ctaUrl' | 'backgroundColor' | 'accentColor'
>> & {
  visualizer?: Partial<AdSceneCreative['visualizer']>;
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

const backgrounds = ['#fbfaf6', '#f8fafc', '#fef2f2', '#ecfeff', '#f7fee7', '#fdf4ff'];
const accents = ['#7dd3fc', '#34d399', '#f472b6', '#facc15', '#a78bfa', '#fb7185'];
const headlineColors = ['#07111f', '#083452', '#7f1d1d', '#312e81', '#14532d', '#581c87'];
const barCounts = [17, 21, 25, 29];
const idlePresets = ['wide-soft-bars', 'center-pulse-bars', 'tight-bounce-bars', 'calm-stack-bars'];
const playbackPresets = ['voice-reactive-bars', 'center-wave-bars', 'stacked-surge-bars'];

const hashText = (value: string) => (
  Array.from(value).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 0)
);

const pick = <Value,>(values: Value[], seed: number, offset = 0) => (
  values[(Math.abs(seed + offset) % values.length)]
);

const clean = (value: string) => (
  value
    .replace(/\s+/g, ' ')
    .replace(/^[^\w$]+|[^\w.!?%$]+$/g, '')
    .trim()
);

const shorten = (value: string, maxWords: number) => {
  const words = clean(value).split(' ').filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  const shortened = words.slice(0, maxWords);
  while (shortened.length > 3 && /^(and|before|for|from|in|of|on|the|to|when|with)$/i.test(shortened[shortened.length - 1])) {
    shortened.pop();
  }
  return shortened.join(' ');
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toHeadline = (value: string, brandName: string) => {
  const brandless = value.replace(new RegExp(`\\b${escapeRegExp(brandName)}\\b`, 'gi'), '');
  const whyIndex = brandless.toLowerCase().indexOf('why ');
  const source = whyIndex >= 0 ? brandless.slice(whyIndex) : brandless;
  const text = shorten(source, 7);
  if (!text) return `${brandName} Gets Seen`;
  return text
    .replace(/[.!?]+$/g, '')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const unique = (values: string[]) => (
  Array.from(new Set(values.map(clean).filter((value) => value.length >= 8)))
);

export const createCreativeReroll = (scene: AdScene, now = Date.now()): CreativeRerollPayload => {
  const receipts = scene.brand.receipts;
  const headlineEvidence = unique([
    ...receipts.specificClaims,
    ...receipts.exactSiteLanguage,
    ...receipts.namedProof,
    ...receipts.reviews,
    scene.brand.offer,
  ]);
  const evidence = unique([
    ...headlineEvidence,
    ...receipts.buyerMoments,
    scene.brand.audience,
  ]);
  const seed = hashText(`${scene.id}:${scene.updatedAt}:${now}:${scene.creative.headline}`);
  const headlineSource = pick(headlineEvidence.length ? headlineEvidence : evidence, seed, 3);
  const subheadlineSource = pick(evidence.length ? evidence : [scene.creative.subheadline], seed, 11);
  const accentColor = pick(accents, seed, 19);

  return {
    angleId: `reroll-${seed.toString(36)}`,
    headline: toHeadline(headlineSource, scene.brand.name),
    headlineColor: pick(headlineColors, seed, 7),
    subheadline: shorten(subheadlineSource, 18),
    backgroundColor: pick(backgrounds, seed, 29),
    accentColor,
    visualizer: {
      color: accentColor,
      idlePreset: pick(idlePresets, seed, 37),
      playbackPreset: pick(playbackPresets, seed, 43),
      barCount: pick(barCounts, seed, 47),
    },
    logoUrl: scene.brand.faviconUrl && scene.brand.logoUrl !== scene.brand.faviconUrl
      ? scene.brand.faviconUrl
      : scene.brand.logoUrl,
    faviconUrl: scene.brand.logoUrl || scene.brand.faviconUrl,
  };
};
