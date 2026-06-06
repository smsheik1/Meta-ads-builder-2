import type { PlatformType } from '../components/PlatformFrame';
import type { BrandBrain } from './prompts/brand-brain';
import type { AdElement, Caption } from '../store';
import {
  AD_SCENE_VERSION,
  DEFAULT_SCENE_LOCKS,
  getAdSceneLayout,
  type AdPlatform,
  type AdScene,
  type AdSceneAudio,
  type AdSceneCaption,
  type AdSceneLayoutElement,
  type AdSceneReceipts,
} from '../engine/ad-scene/scene';
import { getEditorDimensions, getPlatformElementFrame } from './export-snapshot';

type LegacyGeneratedVariation = {
  id: string;
  angle: string;
  headline: string;
  visualizerColor?: string;
  accentColor?: string;
  headlineColor?: string;
  archetype?: {
    id: string;
    backgroundColor?: string;
    headlineColor?: string;
    subheadlineColor?: string;
    ctaBackgroundColor?: string;
    ctaTextColor?: string;
    headlineTreatment?: {
      fontSize?: number;
      fontWeight?: string;
      lineHeight?: number;
      width?: number;
    };
    visualizerVariant?: {
      visualizerType?: AdElement['visualizerType'];
      barCount?: number;
      height?: number;
    };
  };
};

export type LegacyCreateAudioStatus = 'none' | 'uploaded' | 'generated';

export type LegacyCreateAdSceneInput = {
  brandBrain: BrandBrain;
  variation: LegacyGeneratedVariation;
  elements: AdElement[];
  captions?: Caption[];
  platform: PlatformType;
  backgroundColor: string;
  visualizerColor?: string;
  accentColor?: string;
  ctaText?: string;
  ctaUrl?: string;
  brandLogoUrl?: string | null;
  audioStatus?: LegacyCreateAudioStatus;
  audioUrl?: string | null;
  audioStorageId?: string | null;
  audioMimeType?: string | null;
  audioTranscript?: string;
  audioDurationMs?: number | null;
  audioBrandKey?: string | null;
  audioScriptId?: string | null;
  now?: number;
};

const slugify = (value: string, fallback = 'legacy-create') => (
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || fallback
);

const cleanText = (value: string | null | undefined, fallback = '') => (
  String(value || fallback)
    .replace(/\s+/g, ' ')
    .trim()
);

const firstElement = (
  elements: AdElement[],
  role: AdElement['componentRole'] | AdElement['type'],
) => (
  elements.find((element) => element.componentRole === role || element.type === role) || null
);

const numericDimension = (value: number | string | undefined, fallback: number) => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value || ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeLegacyPlatformForAdScene = (platform: PlatformType): AdPlatform => {
  if (platform === 'reels' || platform === 'stories' || platform === 'youtube') return platform;
  if (platform === 'vertical') return 'reels';
  return 'instagram-feed';
};

const mapLegacyReceipts = (brandBrain: BrandBrain): AdSceneReceipts => {
  const receipts = brandBrain.receipts || {
    specificClaims: [],
    buyerMoments: [],
    exactSiteLanguage: [],
    namedProof: [],
  };

  return {
    specificClaims: [...(receipts.specificClaims || []), ...(brandBrain.proof || [])]
      .map((item) => cleanText(item))
      .filter(Boolean)
      .slice(0, 8),
    buyerMoments: (receipts.buyerMoments || []).map((item) => cleanText(item)).filter(Boolean).slice(0, 8),
    exactSiteLanguage: (receipts.exactSiteLanguage || []).map((item) => cleanText(item)).filter(Boolean).slice(0, 8),
    namedProof: (receipts.namedProof || []).map((item) => cleanText(item)).filter(Boolean).slice(0, 8),
    reviews: (brandBrain.brandAssets?.reviews || []).map((item) => cleanText(item)).filter(Boolean).slice(0, 8),
  };
};

const mapLegacyCaption = (caption: Caption): AdSceneCaption | null => {
  const startMs = Math.max(0, Math.round(Number(caption.start || 0) * 1000));
  const endMs = Math.max(startMs + 1, Math.round(Number(caption.end || 0) * 1000));
  const text = cleanText(caption.text);
  if (!text) return null;

  return {
    text,
    startMs,
    endMs,
    speaker: caption.speaker === 2 ? 'b' : 'a',
  };
};

const mapLegacyLayout = (elements: AdElement[], platform: PlatformType) => {
  const dimensions = getEditorDimensions(platform);
  const layoutRoles: Array<[AdSceneLayoutElement, AdElement | null]> = [
    ['brand', firstElement(elements, 'logo')],
    ['headline', firstElement(elements, 'headline') || firstElement(elements, 'text')],
    ['visualizer', firstElement(elements, 'visualizer')],
    ['caption', firstElement(elements, 'captions') || firstElement(elements, 'caption')],
  ];

  return getAdSceneLayout({
    layout: Object.fromEntries(
      layoutRoles
        .filter(([, element]) => Boolean(element))
        .map(([role, element]) => {
          const frame = getPlatformElementFrame(element as AdElement, platform);
          const width = numericDimension(frame.width, 120);
          const height = numericDimension(frame.height, 40);

          return [role, {
            x: (frame.x + width / 2) / dimensions.width,
            y: (frame.y + height / 2) / dimensions.height,
            width: width / dimensions.width,
            height: height / dimensions.height,
          }];
        }),
    ),
  });
};

const mapLegacyAudio = (
  sceneId: string,
  input: LegacyCreateAdSceneInput,
): AdSceneAudio => {
  const captions = (input.captions || [])
    .map(mapLegacyCaption)
    .filter((caption): caption is AdSceneCaption => Boolean(caption));
  const status = input.audioStatus || 'none';
  const url = input.audioUrl || null;

  if (status === 'none' || !url) {
    return {
      status: 'none',
      url: null,
      transcript: '',
      captions: [],
      brandKey: null,
      sourceSceneId: null,
      scriptId: null,
      durationMs: null,
    };
  }

  const maxCaptionEndMs = captions.reduce((max, caption) => Math.max(max, caption.endMs), 0);
  const durationMs = Number.isFinite(input.audioDurationMs || NaN)
    ? Math.max(1000, Math.round(input.audioDurationMs as number))
    : maxCaptionEndMs || null;

  return {
    status,
    url,
    storageId: input.audioStorageId || null,
    mimeType: input.audioMimeType || null,
    transcript: cleanText(input.audioTranscript) || captions.map((caption) => caption.text).join(' '),
    captions,
    brandKey: input.audioBrandKey || `${input.brandBrain.websiteUrl}|${input.brandBrain.businessName}`.toLowerCase(),
    sourceSceneId: sceneId,
    scriptId: input.audioScriptId || (status === 'generated' ? 'legacy-generated-audio' : 'legacy-uploaded-audio'),
    durationMs,
  };
};

export const createLegacyCreateAdScene = (input: LegacyCreateAdSceneInput): AdScene => {
  const now = input.now ?? Date.now();
  const headlineElement = firstElement(input.elements, 'headline') || firstElement(input.elements, 'text');
  const subheadlineElement = firstElement(input.elements, 'subheadline');
  const visualizerElement = firstElement(input.elements, 'visualizer');
  const captionElement = firstElement(input.elements, 'captions') || firstElement(input.elements, 'caption');
  const ctaElement = firstElement(input.elements, 'cta') || firstElement(input.elements, 'button');
  const logoElement = firstElement(input.elements, 'logo');
  const headline = cleanText(headlineElement?.content, input.variation.headline);
  const subheadline = cleanText(
    subheadlineElement?.content,
    input.brandBrain.offer || input.brandBrain.promisedResult || input.variation.angle,
  );
  const sceneId = `legacy-create-${slugify(input.brandBrain.businessName)}-${slugify(headline)}-${now}`;
  const logoUrl = logoElement?.imageUrl || input.brandLogoUrl || input.brandBrain.brandLogoUrl || input.brandBrain.brandAssets?.images.logo || null;
  const faviconUrl = input.brandBrain.brandAssets?.images.favicon || input.brandBrain.brandLogoUrl || logoUrl || null;
  const visualizerColor = visualizerElement?.barColor
    || input.visualizerColor
    || input.variation.visualizerColor
    || input.variation.archetype?.headlineColor
    || '#7dd3fc';
  const accentColor = input.accentColor || input.variation.accentColor || visualizerColor;
  const headlineFontSize = Number(headlineElement?.fontSize || input.variation.archetype?.headlineTreatment?.fontSize || 48);
  const visualizerHeight = Number(visualizerElement?.visualizerHeight || input.variation.archetype?.visualizerVariant?.height || 1);

  const scene: AdScene = {
    id: sceneId,
    version: AD_SCENE_VERSION,
    brand: {
      name: cleanText(input.brandBrain.businessName, 'Your brand'),
      websiteUrl: cleanText(input.brandBrain.websiteUrl),
      logoUrl,
      faviconUrl,
      offer: cleanText(input.brandBrain.offer, subheadline),
      audience: cleanText(input.brandBrain.audience, `People comparing ${input.brandBrain.businessName}`),
      receipts: mapLegacyReceipts(input.brandBrain),
    },
    platform: normalizeLegacyPlatformForAdScene(input.platform),
    creative: {
      angleId: slugify(input.variation.angle || headline),
      headline,
      styleId: input.variation.archetype?.id || visualizerElement?.styleArchetypeId || headlineElement?.styleArchetypeId,
      headlineColor: headlineElement?.color || input.variation.headlineColor || input.variation.archetype?.headlineColor,
      headlineSize: headlineFontSize >= 52 ? 'hero' : headlineFontSize <= 42 ? 'compact' : 'balanced',
      headlineAlign: headlineElement?.textAlign || 'center',
      headlineLineHeight: Number(headlineElement?.lineHeight || 1.04),
      captionColor: captionElement?.color || captionElement?.captionSpeaker1Color || accentColor,
      subheadline,
      ctaText: cleanText(ctaElement?.content, input.ctaText || 'Learn More'),
      ctaUrl: cleanText(input.ctaUrl, input.brandBrain.websiteUrl),
      backgroundColor: input.backgroundColor || input.variation.archetype?.backgroundColor || '#fafaf7',
      accentColor,
      visualizer: {
        color: visualizerColor,
        idlePreset: 'wide-soft-bars',
        playbackPreset: 'voice-reactive-bars',
        barCount: visualizerElement?.barCount || input.variation.archetype?.visualizerVariant?.barCount || 24,
        motion: Number(visualizerElement?.visualizerSmoothing || 0.85) >= 0.85 ? 'smooth' : 'balanced',
        heightScale: visualizerHeight,
        baseline: Number(visualizerElement?.visualizerBaseline || 0) > 0 && Number(visualizerElement?.visualizerBaseline || 0) <= 1
          ? Number(visualizerElement?.visualizerBaseline)
          : undefined,
      },
    },
    audio: mapLegacyAudio(sceneId, input),
    layout: mapLegacyLayout(input.elements, input.platform),
    locks: {
      ...DEFAULT_SCENE_LOCKS,
      headline: Boolean(headlineElement?.locked),
      logo: Boolean(logoElement?.locked),
      visualizer: Boolean(visualizerElement?.locked),
      audio: input.audioStatus === 'uploaded' || input.audioStatus === 'generated',
    },
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...scene,
    audio: {
      ...scene.audio,
      sourceSceneId: scene.audio.status === 'none' ? null : scene.id,
    },
  };
};
