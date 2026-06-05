import type { AdScene, AdSceneCreativePatch } from './scene';
import { hashStyleSeed, pickSceneStyleFamily, sceneStyleFamilyToCreativePatch } from './styleFamilies';

export type CreativeRerollPayload = AdSceneCreativePatch & {
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

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
  const seed = hashStyleSeed(`${scene.id}:${scene.updatedAt}:${now}:${scene.creative.headline}`);
  const headlineSource = pick(headlineEvidence.length ? headlineEvidence : evidence, seed, 3);
  const subheadlineSource = pick(evidence.length ? evidence : [scene.creative.subheadline], seed, 11);
  const styleFamily = pickSceneStyleFamily(seed, scene.creative.styleId);
  const stylePatch = sceneStyleFamilyToCreativePatch(styleFamily);

  return {
    ...stylePatch,
    angleId: `reroll-${seed.toString(36)}`,
    headline: toHeadline(headlineSource, scene.brand.name),
    subheadline: shorten(subheadlineSource, 18),
    logoUrl: scene.brand.faviconUrl && scene.brand.logoUrl !== scene.brand.faviconUrl
      ? scene.brand.faviconUrl
      : scene.brand.logoUrl,
    faviconUrl: scene.brand.logoUrl || scene.brand.faviconUrl,
  };
};
