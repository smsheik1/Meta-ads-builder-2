import type { GeneratedAdVariation } from '../../components/CreateFlow';
import type { BrandBrain, BrandReceipts } from '../../lib/prompts/brand-brain';
import { FIXED_AD_BACKGROUND_COLOR, createTintedAdBackground } from '../../lib/style-archetypes';
import { pickVisibleColorOnLight } from '../../lib/color-contrast';
import { VOICE_VISUALIZER_PRESET } from '../../lib/visualizer-presets';
import { DEFAULT_ELEMENTS, type AdElement } from '../../store';
import type { AudioIntent } from './createSavedDesigns';
import type { CreativeBrief } from './createVoiceScripts';

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

const cleanConversationLine = (value: string) => value
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 96);

const buildConversationFallbackLines = (variation: GeneratedAdVariation, brandBrain: BrandBrain) => {
  const pain = cleanConversationLine(brandBrain.pain || 'the hard part is getting ignored');
  const offer = cleanConversationLine(brandBrain.offer || 'the offer is easier to understand this way');
  const result = cleanConversationLine(brandBrain.promisedResult || 'people understand the value faster');
  return [
    { speaker: 'Alex', text: `I keep seeing ${pain}.` },
    { speaker: 'Jordan', text: `${offer} makes that much clearer.` },
    { speaker: 'Alex', text: `So the ad should say, ${variation.headline.toLowerCase()}?` },
    { speaker: 'Jordan', text: `Exactly. Show ${result} before they scroll.` },
  ];
};

const buildConversationAdElements = (
  variation: GeneratedAdVariation,
  brandBrain: BrandBrain,
  logoUrl: string
): AdElement[] => {
  const businessName = cleanConversationLine(brandBrain.businessName || 'Your brand').slice(0, 28);
  const lines = (variation.conversationLines?.length ? variation.conversationLines : buildConversationFallbackLines(variation, brandBrain))
    .map((line) => ({
      speaker: cleanConversationLine(line.speaker || ''),
      text: cleanConversationLine(line.text || ''),
    }))
    .filter((line) => line.text)
    .slice(0, 4);

  return [
    {
      id: 'logo-1',
      type: 'image',
      componentRole: 'logo',
      imageUrl: logoUrl,
      x: 26,
      y: 24,
      width: 42,
      height: 42,
      rotation: 0,
      zIndex: 10,
      removeWhite: false,
      borderRadius: 12,
    },
    {
      id: 'conversation-brand-1',
      type: 'text',
      content: businessName,
      x: 76,
      y: 24,
      width: 250,
      height: 42,
      rotation: 0,
      zIndex: 11,
      fontSize: 19,
      fontWeight: '900',
      color: '#0f172a',
      textAlign: 'left',
      lineHeight: 1.05,
    },
    {
      id: 'headline-1',
      type: 'text',
      componentRole: 'headline',
      content: variation.headline,
      x: 26,
      y: 74,
      width: 308,
      height: 62,
      rotation: 0,
      zIndex: 1,
      fontSize: 31,
      fontWeight: '900',
      color: '#0f172a',
      textAlign: 'center',
      lineHeight: 1.02,
      styleArchetypeId: variation.archetype.id,
    },
    ...lines.map((line, index): AdElement => {
      const sentByBrand = index % 2 === 1;
      return {
        id: `conversation-line-${index + 1}`,
        type: 'text',
        content: line.text,
        x: sentByBrand ? 70 : 20,
        y: 152 + index * 66,
        width: 270,
        height: 62,
        rotation: 0,
        zIndex: 20 + index,
        fontSize: 19,
        fontWeight: '800',
        fontFamily: 'Inter, sans-serif',
        color: sentByBrand ? variation.archetype.ctaTextColor : variation.archetype.headlineColor,
        textAlign: 'left',
        lineHeight: 1.12,
        backgroundColor: sentByBrand ? variation.archetype.ctaBackgroundColor : '#e2e8f0',
        borderRadius: 18,
        styleArchetypeId: variation.archetype.id,
      };
    }),
  ];
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
  const appliedBackgroundColor = variation.format === 'conversation'
    ? '#f8fafc'
    : createTintedAdBackground(
      appliedVisualizerColor,
      variation.archetype.backgroundColor || FIXED_AD_BACKGROUND_COLOR
    );
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

  const resolveElements = (currentElements: AdElement[]) => {
    if (variation.format === 'conversation') {
      const lockedById = new Map(
        isNewCreateBrand
          ? []
          : currentElements.filter((element) => element.locked).map((element) => [element.id, element])
      );
      return buildConversationAdElements(variation, brandBrain, appliedCanvasLogo)
        .map((element) => lockedById.get(element.id) || element);
    }

    const applyVariationToElement = (element: AdElement): AdElement => {
      if (element.componentRole === 'logo') {
        return {
          ...element,
          imageUrl: appliedCanvasLogo,
          removeWhite: false,
          styleArchetypeId: variation.archetype.id,
        };
      }
      if (element.locked && !isNewCreateBrand) return element;
      if (element.componentRole === 'headline') {
        const headlineWidth = Math.min(320, variation.archetype.headlineTreatment.width);
        return {
          ...element,
          content: variation.headline,
          fontFamily: undefined,
          color: variation.headlineColor || variation.archetype.headlineColor,
          fontSize: variation.archetype.headlineTreatment.fontSize,
          fontWeight: variation.archetype.headlineTreatment.fontWeight,
          lineHeight: Math.max(1.08, variation.archetype.headlineTreatment.lineHeight),
          x: (360 - headlineWidth) / 2,
          width: headlineWidth,
          styleArchetypeId: variation.archetype.id,
        };
      }
      if (element.componentRole === 'subheadline') {
        return {
          ...element,
          fontFamily: undefined,
          color: variation.archetype.subheadlineColor,
          styleArchetypeId: variation.archetype.id,
        };
      }
      if (element.type === 'visualizer') {
        return {
          ...element,
          styleArchetypeId: variation.archetype.id,
          visualizerType: variation.archetype.visualizerVariant.visualizerType,
          barColor: appliedVisualizerColor,
          barCount: variation.archetype.visualizerVariant.barCount,
          visualizerSensitivity: variation.archetype.visualizerVariant.sensitivity,
          visualizerHeight: variation.archetype.visualizerVariant.height,
          ...VOICE_VISUALIZER_PRESET,
        };
      }
      if (element.componentRole === 'captions') {
        return {
          ...element,
          styleArchetypeId: variation.archetype.id,
          color: appliedAccentColor,
          captionSpeaker1Color: appliedVisualizerColor,
          captionSpeaker2Color: appliedAccentColor,
        };
      }
      if (element.componentRole === 'cta') {
        return {
          ...element,
          fontFamily: undefined,
          color: variation.archetype.ctaTextColor,
          backgroundColor: variation.archetype.ctaBackgroundColor,
          styleArchetypeId: variation.archetype.id,
        };
      }
      return {
        ...element,
        styleArchetypeId: variation.archetype.id,
      };
    };

    const sourceElements = currentElements.length ? currentElements : DEFAULT_ELEMENTS;
    return sourceElements.map(applyVariationToElement);
  };

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
