import { AD_SCENE_VERSION, DEFAULT_SCENE_LAYOUT, DEFAULT_SCENE_LOCKS, type AdScene } from '@/features/engine/scene';
import { hashStyleSeed, pickSceneStyleFamily, sceneStyleFamilyToCreativePatch } from '@/features/engine/styleFamilies';
import type { AdCopy } from './adCopy';
import type { WebsiteResearch } from './websiteResearch';

const slugify = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 48) || 'scene';

const cleanSentence = (value: string, maxLength = 150) => value
  .replace(/\s+/g, ' ')
  .replace(/\s+([,.!?])/g, '$1')
  .trim()
  .slice(0, maxLength)
  .trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const firstUseful = (items: string[], predicate: (value: string) => boolean) => (
  items.find((item) => predicate(item.trim()))?.trim() || ''
);

const stripBrandFromHeadline = (value: string, brandName: string) => {
  const cleaned = cleanSentence(value, 80);
  const brand = brandName.toLowerCase();
  const parts = cleaned
    .split(/\s+[|–—-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const nonBrandPart = parts.find((part) => {
    const lower = part.toLowerCase();
    return lower !== brand && !lower.startsWith(`${brand} `);
  });

  if (nonBrandPart) return nonBrandPart;
  return cleaned.replace(new RegExp(`^${escapeRegExp(brandName)}\\s*[:|–—-]\\s*`, 'i'), '').trim() || cleaned;
};

const hasSignal = (research: WebsiteResearch, pattern: RegExp) => (
  pattern.test([
    research.brandName,
    research.title,
    research.description,
    ...research.headings,
    ...research.paragraphs.slice(0, 8),
  ].join(' ').toLowerCase())
);

const chooseAudience = (research: WebsiteResearch) => {
  if (hasSignal(research, /\b(chatgpt|reddit|ai visibility|seo|rankings?|mentions?|citations?)\b/i)) {
    return 'Growth teams and operators trying to show up where buyers search and ask AI tools.';
  }
  if (hasSignal(research, /\b(real estate|homes? for sale|listing|listings|mortgage|realtor|mls)\b/i)) {
    return 'Home buyers and sellers comparing listings, prices, tours, and neighborhoods.';
  }
  if (hasSignal(research, /\b(skin|beauty|facial|laser|aesthetic|medspa|serum|cream)\b/i)) {
    return 'People comparing premium beauty, skin, and aesthetic options before booking or buying.';
  }
  if (hasSignal(research, /\b(shop|store|shipping|cart|product|products|collection|sale)\b/i)) {
    return 'Shoppers comparing products and looking for a reason to choose this brand.';
  }
  return `People comparing ${research.brandName} before they decide.`;
};

const choosePain = (research: WebsiteResearch, audience: string) => {
  const receiptMoment = research.receipts.buyerMoments[0];
  if (receiptMoment) return cleanSentence(receiptMoment, 180);
  if (audience.includes('AI tools')) return 'Competitors are showing up in trusted answers before their brand does.';
  if (audience.includes('Home buyers')) return 'Homes move fast, and it is hard to know what is worth acting on.';
  if (audience.includes('beauty')) return 'They want visible results but do not know which option to trust.';
  if (audience.includes('Shoppers')) return 'They need proof that the product is worth choosing over another option.';
  return `They need a concrete reason to choose ${research.brandName} instead of the obvious alternative.`;
};

const chooseHeadline = (research: WebsiteResearch) => {
  const exactWithNumber = firstUseful(research.receipts.exactSiteLanguage, (line) => (
    /\d/.test(line) && line.length >= 12 && line.length <= 58
  ));
  if (exactWithNumber) return stripBrandFromHeadline(exactWithNumber, research.brandName);

  if (hasSignal(research, /\b(chatgpt|ai visibility|reddit|rankings?|mentions?)\b/i)) {
    return 'Show up where buyers ask';
  }
  if (hasSignal(research, /\b(real estate|homes? for sale|listing|listings|mls)\b/i)) {
    return 'Stay ahead of the market';
  }

  const heading = firstUseful(research.headings, (line) => (
    line.length >= 12 &&
    line.length <= 58 &&
    !/^(home|about|contact|learn more|shop now)$/i.test(line)
  ));
  if (heading) return stripBrandFromHeadline(heading, research.brandName);

  const title = stripBrandFromHeadline(research.title, research.brandName);
  if (title.length >= 8) return title;

  return `${research.brandName} made easier`;
};

const chooseSubheadline = (research: WebsiteResearch, audience: string) => {
  const claim = research.receipts.specificClaims[0];
  const description = cleanSentence(research.description, 152);
  if (description.length >= 24) return description;
  if (claim) return cleanSentence(claim, 152);
  return `A clearer way for ${audience.toLowerCase()}`;
};

const pickAccentColor = (research: WebsiteResearch) => {
  const color = research.colors.find((candidate) => !/^#(?:000000|FFFFFF|F{6})$/i.test(candidate));
  return color || '#7dd3fc';
};

export const buildAdSceneFromWebsiteResearch = (
  research: WebsiteResearch,
  optionsOrNow: number | { now?: number; copy?: AdCopy } = Date.now(),
): AdScene => {
  const now = typeof optionsOrNow === 'number' ? optionsOrNow : optionsOrNow.now ?? Date.now();
  const copy = typeof optionsOrNow === 'number' ? undefined : optionsOrNow.copy;
  const audience = chooseAudience(research);
  const pain = choosePain(research, audience);
  const headline = copy?.headline || chooseHeadline(research);
  const subheadline = copy?.subheadline || chooseSubheadline(research, audience);
  const accentColor = pickAccentColor(research);
  const style = sceneStyleFamilyToCreativePatch(
    pickSceneStyleFamily(hashStyleSeed(`${research.websiteUrl}:${headline}:${now}`), undefined, accentColor),
  );
  const visualizerStyle = style.visualizer || {
    color: accentColor,
    idlePreset: 'wide-soft-bars',
    playbackPreset: 'voice-reactive-bars',
  };

  return {
    id: `scene-${slugify(research.brandName)}-${now}`,
    version: AD_SCENE_VERSION,
    brand: {
      name: research.brandName,
      websiteUrl: research.websiteUrl,
      logoUrl: research.logoUrl || null,
      faviconUrl: research.faviconUrl,
      offer: cleanSentence(research.description || research.title || `${research.brandName} website`, 170),
      audience,
      receipts: research.receipts,
    },
    platform: 'instagram-feed',
    creative: {
      ...style,
      angleId: copy?.angleId || slugify(headline),
      headline,
      subheadline,
      ctaText: copy?.ctaText || (hasSignal(research, /\b(shop|store|product|products|collection|sale)\b/i) ? 'Shop now' : 'Learn More'),
      ctaUrl: research.websiteUrl,
      backgroundColor: style.backgroundColor || '#fbfaf6',
      accentColor,
      visualizer: {
        ...visualizerStyle,
        idlePreset: visualizerStyle.idlePreset || 'wide-soft-bars',
        playbackPreset: visualizerStyle.playbackPreset || 'voice-reactive-bars',
        color: accentColor,
      },
    },
    audio: {
      status: 'none',
      url: null,
      transcript: '',
      captions: [],
      brandKey: null,
      sourceSceneId: null,
      scriptId: null,
      durationMs: null,
    },
    layout: { ...DEFAULT_SCENE_LAYOUT },
    locks: { ...DEFAULT_SCENE_LOCKS },
    createdAt: now,
    updatedAt: now,
  };
};
