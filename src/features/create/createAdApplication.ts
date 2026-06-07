import type { GeneratedAdVariation } from '../../components/CreateFlow';
import type { BrandBrain, BrandReceipts } from '../../lib/prompts/brand-brain';
import { pickVisibleColorOnLight } from '../../lib/color-contrast';
import type { AdElement } from '../../store';
import type { AudioIntent } from './createSavedDesigns';
import type { CreativeBrief } from './createVoiceScripts';
import { getCreateAdTemplateForVariation } from './templates/registry';

const isDataImage = (value: string | null | undefined) => Boolean(value?.startsWith('data:image/'));

const isLikelyFaviconAsset = (value: string | null | undefined) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || isDataImage(raw)) return false;
  return /(?:^|\/)(?:favicon|apple-touch-icon|mstile|site-icon|android-chrome|icon[-_]\d|icon\.)/i.test(raw)
    || /\.(?:ico)(?:$|[?#])/i.test(raw);
};

const isLikelyLogoAsset = (value: string | null | undefined) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || isDataImage(raw) || isLikelyFaviconAsset(raw)) return false;
  if (/(?:avatar|author|headshot|portrait|profile|team|founder|person|people|user|testimonial|speaker|staff)/i.test(raw)) return false;
  return /(?:logo|brand|wordmark|logomark|mark|horizontal|lockup)/i.test(raw);
};

const pickCanvasBrandLogo = (brandBrain: BrandBrain) => {
  const candidates = [
    brandBrain.brandLogoUrl,
    brandBrain.brandAssets?.images.logo,
  ];
  return candidates.find(isLikelyLogoAsset) || null;
};

const escapeSvgText = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const buildTextLogoDataUrl = (label: string) => {
  const cleanLabel = label
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 34) || 'Brand';
  const fontSize = cleanLabel.length > 24 ? 52 : cleanLabel.length > 16 ? 64 : 78;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="192" viewBox="0 0 480 192"><text x="240" y="102" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="1.5" fill="#020617">${escapeSvgText(cleanLabel.toUpperCase())}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const normalizeCreativeBriefReceipts = (receipts?: Partial<BrandReceipts>): BrandReceipts => ({
  specificClaims: Array.isArray(receipts?.specificClaims) ? receipts.specificClaims.slice(0, 8) : [],
  buyerMoments: Array.isArray(receipts?.buyerMoments) ? receipts.buyerMoments.slice(0, 8) : [],
  exactSiteLanguage: Array.isArray(receipts?.exactSiteLanguage) ? receipts.exactSiteLanguage.slice(0, 8) : [],
  namedProof: Array.isArray(receipts?.namedProof) ? receipts.namedProof.slice(0, 8) : [],
});

const formatBriefReference = (brandBrain: BrandBrain) => [
  brandBrain.websiteUrl,
  ...(brandBrain.proof?.length ? ['', 'Proof from research:', ...brandBrain.proof.map((point) => `- ${point}`)] : []),
].join('\n');

const inferFailedAlternatives = (brandBrain: BrandBrain) => {
  const pain = brandBrain.pain.trim();
  const offer = brandBrain.offer.trim() || 'the right option';
  if (pain) {
    return `Comparing generic alternatives, reading reviews, and trying to guess which option actually solves: ${pain.toLowerCase()}`;
  }
  return `Comparing generic alternatives, reading reviews, and trying to guess whether ${offer.toLowerCase()} is the right fit.`;
};

const inferCreativeBriefCta = (brandBrain: BrandBrain) => {
  const haystack = `${brandBrain.offer} ${brandBrain.audience} ${brandBrain.promisedResult} ${brandBrain.websiteUrl}`.toLowerCase();
  if (/\b(shop|apparel|clothing|gear|product|products|buy|store|cart)\b/.test(haystack)) return 'Shop now.';
  if (/\b(appointment|treatment|medspa|laser|skin|clinic|consultation|service)\b/.test(haystack)) return 'Book a consultation.';
  if (/\b(demo|software|platform|saas|automation|ai)\b/.test(haystack)) return 'Book a demo.';
  return 'Learn more.';
};

const buildCreativeBriefFromBrandBrain = (brandBrain: BrandBrain): CreativeBrief => ({
  offer: brandBrain.offer,
  buyer: brandBrain.audience,
  pain: brandBrain.pain,
  failedAlternatives: inferFailedAlternatives(brandBrain),
  promisedResult: brandBrain.promisedResult,
  differentiator: brandBrain.differentiator,
  cta: inferCreativeBriefCta(brandBrain),
  reference: formatBriefReference(brandBrain),
  receipts: normalizeCreativeBriefReceipts(brandBrain.receipts),
});

type GeneratedAdApplicationOptions = {
  variation: GeneratedAdVariation;
  brandBrain: BrandBrain;
  activeCreateBrandKey: string | null;
  audioIntent: AudioIntent;
  audioBrandKey: string | null;
  resetPlatform: boolean;
};

export type GeneratedAdApplication = {
  businessName: string;
  nextBrandKey: string | null;
  shouldClearAudio: boolean;
  platform: 'instagram-feed' | null;
  platformTheme: 'dark';
  brandLogo: string | null;
  simulatedCaption: string;
  autoCta: string;
  ctaUrl: string;
  backgroundColor: string;
  visualizerColor: string;
  accentColor: string;
  creativeBrief: CreativeBrief;
  businessContext: string;
  resolveElements: (currentElements: AdElement[]) => AdElement[];
};

export const buildGeneratedAdApplication = ({
  variation,
  brandBrain,
  activeCreateBrandKey,
  audioIntent,
  audioBrandKey,
  resetPlatform,
}: GeneratedAdApplicationOptions): GeneratedAdApplication => {
  const businessName = brandBrain.businessName || 'Wiggly';
  const nextBrandKey = brandBrain.websiteUrl || null;
  const isNewCreateBrand = Boolean(nextBrandKey && nextBrandKey !== activeCreateBrandKey);
  const realCanvasLogo = pickCanvasBrandLogo(brandBrain);
  const appliedCanvasLogo = realCanvasLogo || buildTextLogoDataUrl(businessName);
  const appliedProfileLogo = isDataImage(brandBrain.brandAssets?.images.logo)
    ? brandBrain.brandAssets?.images.logo || null
    : brandBrain.brandAssets?.images.favicon || realCanvasLogo || null;
  const appliedVisualizerColor = pickVisibleColorOnLight(
    [variation.visualizerColor],
    variation.archetype.visualizerColor,
    { minContrast: 1.5, maxLuminance: 0.78 }
  );
  const appliedAccentColor = pickVisibleColorOnLight(
    [variation.accentColor],
    variation.archetype.speaker2CaptionColor,
    { minContrast: 2.4, maxLuminance: 0.58 }
  );
  const template = getCreateAdTemplateForVariation(variation);
  const templateContext = {
    variation,
    brandBrain,
    businessName,
    canvasLogoUrl: appliedCanvasLogo,
    isNewBrand: isNewCreateBrand,
    visualizerColor: appliedVisualizerColor,
    accentColor: appliedAccentColor,
  };
  const appliedBackgroundColor = template.resolveBackgroundColor?.(templateContext)
    || variation.archetype.backgroundColor
    || '#ffffff';
  const businessContext = `[Name] ${businessName}
[Website] ${brandBrain.websiteUrl}
[Offer] ${brandBrain.offer}
[Audience] ${brandBrain.audience}
[Pain] ${brandBrain.pain}
[Result] ${brandBrain.promisedResult}
[Differentiator] ${brandBrain.differentiator}
[Logo] ${realCanvasLogo || 'Generated text mark'}
[Tone] ${brandBrain.tone}

This ad headline is: ${variation.headline}`;

  const resolveElements = (currentElements: AdElement[]) => template.buildElements(currentElements, templateContext);

  return {
    businessName,
    nextBrandKey,
    shouldClearAudio: audioIntent === 'default' || (audioIntent === 'generated' && audioBrandKey !== nextBrandKey),
    platform: resetPlatform ? 'instagram-feed' : null,
    platformTheme: 'dark',
    brandLogo: appliedProfileLogo,
    simulatedCaption: brandBrain.offer || variation.headline,
    autoCta: 'Learn More',
    ctaUrl: brandBrain.websiteUrl || '',
    backgroundColor: appliedBackgroundColor,
    visualizerColor: appliedVisualizerColor,
    accentColor: appliedAccentColor,
    creativeBrief: buildCreativeBriefFromBrandBrain(brandBrain),
    businessContext,
    resolveElements,
  };
};
