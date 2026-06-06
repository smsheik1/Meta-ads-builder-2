import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, AudioLines, BookmarkPlus, Captions, CheckCircle2, Download, ExternalLink, Loader2, Play, Shuffle, Sparkles, Square, ThumbsDown, ThumbsUp, Wand2, X } from 'lucide-react';
import { getRandomAdStyleArchetype, type AdStyleArchetype } from '../lib/style-archetypes';
import { PlatformFrame, type PlatformType } from './PlatformFrame';
import { CanvasEditor } from './CanvasEditor';
import { CreateCanvasFormatRail, type CreateFormatMode } from './CreateCanvasFormatRail';
import type { AudioAnalysisData } from '../lib/audio-analysis';
import { getRelativeLuminance, pickVisibleColorOnLight } from '../lib/color-contrast';
import { BRAND_FALLBACK_QUESTIONS, type BrandBrain } from '../lib/prompts/brand-brain';
import type { ConversationAdLine, GeneratedAdFormat, HeadlineVariation } from '../lib/prompts/headline-variations';
import { useEditorStore, type Caption } from '../store';

export type GeneratedAdVariation = HeadlineVariation & {
  format: GeneratedAdFormat;
  conversationLines?: ConversationAdLine[];
  index: number;
  archetype: AdStyleArchetype;
  visualizerColor: string;
  accentColor: string;
  headlineColor: string;
};

type CreateAdFormat = CreateFormatMode;
type AdModelChoice =
  | 'auto'
  | 'groq:llama-3.1-8b-instant'
  | 'groq:qwen/qwen3-32b'
  | 'groq:meta-llama/llama-4-scout-17b-16e-instruct'
  | 'groq:llama-3.3-70b-versatile'
  | 'openrouter:liquid/lfm-2.5-1.2b-instruct:free'
  | 'openrouter:openai/gpt-oss-20b:free'
  | 'openrouter:openrouter/auto:free'
  | 'gemini:gemini-3.1-flash-lite'
  | 'local';
export type RerollFlashRole = 'headline' | 'subheadline' | 'visualizer' | 'captions' | 'cta' | 'logo';
export type RerollFlashPayload = {
  key: string;
  roles: RerollFlashRole[];
};

type SavedCreateDesign = {
  id: string;
  name: string;
  previewTitle: string;
  backgroundColor: string;
  accentColor: string;
};

type SavedVoiceOption = {
  id: string;
  name: string;
  label: string;
  current: boolean;
};

type CreateFlowProps = {
  audioFileName: string;
  hasUserAudio: boolean;
  hasPlayableAudio: boolean;
  onAudioUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenVoiceMaker: () => void;
  savedVoiceOptions: SavedVoiceOption[];
  onUseSavedVoice: (voiceId: string) => void;
  captions: Caption[];
  onUpdateCaptions: (captions: Caption[]) => void;
  audioUrl: string | null;
  audioAnalysis: AudioAnalysisData | null;
  captionsLoading?: boolean;
  platform: PlatformType;
  backgroundColor: string;
  bgMedia: { url: string; type: string } | null;
  bgShadow: boolean;
  bgShadowOpacity: number;
  introImage: string | null;
  introDuration: 0 | 1 | 2 | 3;
  introFeedCropY: number;
  introImageAspect: number | null;
  previewDurationCap: number | null;
  playing: boolean;
  onTogglePlayback: () => void;
  onPlaybackComplete: () => void;
  onDownloadVideo: (variation?: GeneratedAdVariation | null, brandBrain?: BrandBrain | null) => void;
  onSaveDesign: (variation: GeneratedAdVariation, brandBrain: BrandBrain) => void;
  savedDesigns: SavedCreateDesign[];
  onOpenSavedDesign: (designId: string) => void;
  onPlatformChange: (platform: PlatformType) => void;
  onRefreshBackgroundColor: () => void;
  onApplyStyleArchetype: (archetype: AdStyleArchetype) => void;
  onPreviewVariation: (variation: GeneratedAdVariation, brandBrain: BrandBrain) => void;
  onOpenBuilder: (variation: GeneratedAdVariation, brandBrain: BrandBrain) => void;
  onResetCanvasForNewWebsite: () => void;
  onOpenStudio: () => void;
  rendering: boolean;
};

type ResearchResponse = {
  needsFallback: boolean;
  questions?: string[];
  reason?: string;
  brandBrain?: BrandBrain;
};

type AdStreamResponse = {
  brandBrain: BrandBrain;
  variations: HeadlineVariation[];
  provider?: string;
  model?: string;
  fallback?: boolean;
};

const DEFAULT_BRAND_COLORS = ['#00D6B8', '#4F46E5', '#0F172A'];
const TARGET_GENERATED_AD_COUNT = 50;
const CREATE_FLOW_STORAGE_KEY = 'wiggly_create_flow_session_v1';
const CREATE_FEEDBACK_STORAGE_KEY = 'wiggly_generation_feedback_v1';
const CREATE_FLOW_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const PAUSED_CREATE_FORMATS = new Set<GeneratedAdFormat>(['conversation']);
const ACTIVE_GENERATED_FORMATS: GeneratedAdFormat[] = ['visualizer'];
const AD_MODEL_CHOICES: Array<{ value: AdModelChoice; label: string }> = [
  { value: 'auto', label: 'Auto best available (Auto)' },
  { value: 'groq:llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Groq)' },
  { value: 'groq:qwen/qwen3-32b', label: 'Qwen 3 32B (Groq)' },
  { value: 'groq:meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout (Groq)' },
  { value: 'groq:llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
  { value: 'openrouter:liquid/lfm-2.5-1.2b-instruct:free', label: 'Liquid LFM 2.5 1.2B (OpenRouter)' },
  { value: 'openrouter:openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (OpenRouter)' },
  { value: 'openrouter:openrouter/auto:free', label: 'Auto free model (OpenRouter)' },
  { value: 'gemini:gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Gemini)' },
  { value: 'local', label: 'Local fallback headlines (Local)' },
];
const CREATE_FORMAT_LABELS: Record<CreateAdFormat, string> = {
  visualizer: 'audio visualizer',
  conversation: 'conversation card',
};

type PersistedCreateFlow = {
  websiteUrl: string;
  brandBrain: BrandBrain | null;
  variations: GeneratedAdVariation[];
  activeIndex: number;
  selectedFormat?: CreateAdFormat;
  savedAt: number;
};

type GenerationFeedbackRating = 'up' | 'down';
type StoredGenerationFeedback = {
  id: string;
  createdAt: string;
  rating: GenerationFeedbackRating;
  websiteUrl: string;
  brandName: string;
  variation: Pick<GeneratedAdVariation, 'id' | 'format' | 'angle' | 'headline' | 'index' | 'visualizerColor' | 'accentColor'>;
  brandBrief: Pick<BrandBrain, 'offer' | 'audience' | 'pain' | 'promisedResult' | 'differentiator' | 'tone' | 'adAngles'>;
};

const getCreateFlowStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const normalizeCreateAdFormat = (value: unknown): CreateAdFormat => {
  if (value === 'visualizer' || value === 'conversation') {
    return PAUSED_CREATE_FORMATS.has(value) ? 'visualizer' : value;
  }
  return 'visualizer';
};

const normalizePersistedVariation = (variation: GeneratedAdVariation): GeneratedAdVariation => ({
  ...variation,
  archetype: variation.archetype || getRandomAdStyleArchetype(),
  format: variation.format === 'conversation' ? 'conversation' : 'visualizer',
  conversationLines: Array.isArray(variation.conversationLines) ? variation.conversationLines : undefined,
});

const loadPersistedCreateFlow = (): PersistedCreateFlow | null => {
  const storage = getCreateFlowStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(CREATE_FLOW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCreateFlow;
    if (!parsed || Date.now() - Number(parsed.savedAt || 0) > CREATE_FLOW_SESSION_TTL_MS) {
      storage.removeItem(CREATE_FLOW_STORAGE_KEY);
      return null;
    }
    const parsedVariations = Array.isArray(parsed.variations)
      ? parsed.variations
        .map((variation) => normalizePersistedVariation(variation))
        .filter((variation) => !PAUSED_CREATE_FORMATS.has(variation.format))
      : [];
    const usableVariations = parsedVariations.length > 0 ? parsedVariations : [];
    return {
      websiteUrl: typeof parsed.websiteUrl === 'string' ? parsed.websiteUrl : '',
      brandBrain: parsed.brandBrain || null,
      variations: usableVariations,
      activeIndex: Number.isFinite(parsed.activeIndex) ? parsed.activeIndex : 0,
      selectedFormat: normalizeCreateAdFormat(parsed.selectedFormat),
      savedAt: Number(parsed.savedAt || Date.now()),
    };
  } catch {
    storage.removeItem(CREATE_FLOW_STORAGE_KEY);
    return null;
  }
};

const saveGenerationFeedback = (feedback: StoredGenerationFeedback) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(CREATE_FEEDBACK_STORAGE_KEY);
    const previous = raw ? JSON.parse(raw) : [];
    const feedbackItems = Array.isArray(previous) ? previous : [];
    window.localStorage.setItem(
      CREATE_FEEDBACK_STORAGE_KEY,
      JSON.stringify([feedback, ...feedbackItems.filter((item) => item?.variation?.id !== feedback.variation.id)].slice(0, 500)),
    );
  } catch {
    // Feedback should never break ad generation or previewing.
  }
};

const isEditableTarget = (target: EventTarget | null) => (
  target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
);

const fetchJsonWithTimeout = async <T,>(url: string, init: RequestInit, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Something broke while making the ads.');
    }
    return response.json() as Promise<T>;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const pickBrandColor = (brandBrain: BrandBrain | null, index: number, fallback: string) => {
  const colors = brandBrain?.colors?.length ? brandBrain.colors : DEFAULT_BRAND_COLORS;
  return colors[index % colors.length] || fallback;
};

const pickVisibleBrandColor = (
  brandBrain: BrandBrain,
  index: number,
  fallback: string,
  options?: Parameters<typeof pickVisibleColorOnLight>[2]
) => {
  const colors = brandBrain.colors?.length ? brandBrain.colors : DEFAULT_BRAND_COLORS;
  const ordered = colors.map((_, offset) => colors[(index + offset) % colors.length]);
  return pickVisibleColorOnLight(ordered, fallback, options);
};

const pickHeadlineColor = (brandBrain: BrandBrain, archetype: AdStyleArchetype, index: number) => {
  const brandCandidates = brandBrain.colors || [];
  const accentCandidates = [
    pickBrandColor(brandBrain, index + 2, archetype.headlineColor),
    archetype.visualizerColor,
    archetype.speaker2CaptionColor,
    ...brandCandidates,
  ].filter((color) => getRelativeLuminance(color) > 0.035);

  if (index % 3 === 1 || index % 5 === 2) {
    return pickVisibleColorOnLight(accentCandidates, archetype.headlineColor, {
      minContrast: 5,
      maxLuminance: 0.34,
    });
  }

  return pickVisibleColorOnLight([archetype.headlineColor], archetype.headlineColor, {
    minContrast: 7,
    maxLuminance: 0.22,
  });
};

const buildGeneratedVariations = (brandBrain: BrandBrain, variations: HeadlineVariation[]): GeneratedAdVariation[] => {
  let currentArchetypeId = '';
  return variations
    .filter((variation) => !PAUSED_CREATE_FORMATS.has(variation.format === 'conversation' ? 'conversation' : 'visualizer'))
    .map((variation, index) => {
    const archetype = getRandomAdStyleArchetype(currentArchetypeId);
    currentArchetypeId = archetype.id;
    return {
      ...variation,
      format: variation.format === 'conversation' ? 'conversation' : 'visualizer',
      conversationLines: Array.isArray(variation.conversationLines) ? variation.conversationLines : undefined,
      index,
      archetype,
      visualizerColor: index % 3 === 0
        ? pickVisibleBrandColor(brandBrain, index, archetype.visualizerColor, { minContrast: 1.5, maxLuminance: 0.78 })
        : pickVisibleColorOnLight([archetype.visualizerColor], '#00D6B8', { minContrast: 1.5, maxLuminance: 0.78 }),
      accentColor: pickVisibleColorOnLight(
        [pickBrandColor(brandBrain, index + 1, archetype.speaker2CaptionColor)],
        archetype.speaker2CaptionColor,
        { minContrast: 2.4, maxLuminance: 0.58 }
      ),
      headlineColor: pickHeadlineColor(brandBrain, archetype, index),
    };
  });
};

const summarizeJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const uniqueStrings = (values: Array<string | undefined>) => values
  .filter((value): value is string => Boolean(value))
  .filter((value, index, allValues) => allValues.indexOf(value) === index);

const isRecordObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
);

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value)
    && value.every((item) => typeof item === 'string')
);

const normalizeBrandBrainAssets = (value: BrandBrain['brandAssets'] | null | undefined) => {
  const assets: Record<string, unknown> = isRecordObject(value) ? value : {};
  const images = isRecordObject(assets)
    ? (isRecordObject(assets.images) ? assets.images : {})
    : {};

  return {
    images: {
      logo: typeof images.logo === 'string' ? images.logo : undefined,
      favicon: typeof images.favicon === 'string' ? images.favicon : undefined,
      ogImage: typeof images.ogImage === 'string' ? images.ogImage : undefined,
      heroImages: isStringArray(images.heroImages) ? images.heroImages : [],
      allImages: isStringArray(images.allImages) ? images.allImages : [],
    },
    colors: isRecordObject(assets.colors) ? assets.colors as Record<string, string> : {},
    fonts: Array.isArray(assets.fonts)
      ? assets.fonts.filter((entry) => isRecordObject(entry) && typeof entry.family === 'string' && Boolean(entry.family.trim())) as { family: string; role?: string }[]
      : [],
    componentStyles: isRecordObject(assets.componentStyles) ? assets.componentStyles : {},
    personality: isRecordObject(assets.personality) ? assets.personality : assets.personality,
    designSystem: isRecordObject(assets.designSystem) ? assets.designSystem : assets.designSystem,
    metadata: isRecordObject(assets.metadata) ? assets.metadata as Record<string, string> : {},
    socialLinks: isStringArray(assets.socialLinks) ? assets.socialLinks : [],
    reviews: isStringArray(assets.reviews) ? assets.reviews : [],
    pages: Array.isArray(assets.pages) ? assets.pages : [],
    externalResearch: isRecordObject(assets.externalResearch) ? assets.externalResearch as BrandBrain['brandAssets']['externalResearch'] : undefined,
    rawBranding: isRecordObject(assets.rawBranding) ? assets.rawBranding : {},
  };
};

const isDataImage = (value: string | null | undefined) => Boolean(value?.startsWith('data:image/'));

const canPreviewBrandImage = (value: string) => {
  if (isDataImage(value)) return true;
  if (value.startsWith('/')) return true;
  if (typeof window === 'undefined') return false;
  try {
    return new URL(value, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
};

const getRerollFlashRoles = (
  previousVariation: GeneratedAdVariation | null,
  nextVariation: GeneratedAdVariation
): RerollFlashRole[] => {
  if (!previousVariation) return ['headline', 'visualizer', 'captions', 'cta'];
  if (previousVariation.id === nextVariation.id) return [];
  if (previousVariation.format !== nextVariation.format) return ['headline', 'visualizer', 'captions', 'cta', 'logo'];

  const roles = new Set<RerollFlashRole>();
  if (
    previousVariation.headline !== nextVariation.headline ||
    previousVariation.headlineColor !== nextVariation.headlineColor ||
    previousVariation.archetype.headlineTreatment.fontSize !== nextVariation.archetype.headlineTreatment.fontSize ||
    previousVariation.archetype.headlineTreatment.fontWeight !== nextVariation.archetype.headlineTreatment.fontWeight ||
    previousVariation.archetype.headlineTreatment.width !== nextVariation.archetype.headlineTreatment.width
  ) {
    roles.add('headline');
  }
  if (previousVariation.archetype.subheadlineColor !== nextVariation.archetype.subheadlineColor) roles.add('subheadline');
  if (
    previousVariation.visualizerColor !== nextVariation.visualizerColor ||
    previousVariation.archetype.visualizerVariant.visualizerType !== nextVariation.archetype.visualizerVariant.visualizerType ||
    previousVariation.archetype.visualizerVariant.barCount !== nextVariation.archetype.visualizerVariant.barCount
  ) {
    roles.add('visualizer');
  }
  if (
    previousVariation.accentColor !== nextVariation.accentColor ||
    previousVariation.archetype.speaker1CaptionColor !== nextVariation.archetype.speaker1CaptionColor ||
    previousVariation.archetype.speaker2CaptionColor !== nextVariation.archetype.speaker2CaptionColor
  ) {
    roles.add('captions');
  }
  if (
    previousVariation.archetype.ctaBackgroundColor !== nextVariation.archetype.ctaBackgroundColor ||
    previousVariation.archetype.ctaTextColor !== nextVariation.archetype.ctaTextColor
  ) {
    roles.add('cta');
  }

  return Array.from(roles);
};

export function CreateFlow({
  hasUserAudio,
  hasPlayableAudio,
  onAudioUpload,
  onOpenVoiceMaker,
  captions,
  onUpdateCaptions,
  audioUrl,
  audioAnalysis,
  captionsLoading,
  platform,
  backgroundColor,
  bgMedia,
  bgShadow,
  bgShadowOpacity,
  introImage,
  introDuration,
  introFeedCropY,
  introImageAspect,
  previewDurationCap,
  playing,
  onTogglePlayback,
  onPlaybackComplete,
  onDownloadVideo,
  onSaveDesign,
  savedDesigns,
  onOpenSavedDesign,
  onPlatformChange,
  onRefreshBackgroundColor,
  onApplyStyleArchetype,
  onPreviewVariation,
  onOpenBuilder,
  onResetCanvasForNewWebsite,
  onOpenStudio,
  rendering,
}: CreateFlowProps) {
  const persistedCreateFlow = useMemo(() => loadPersistedCreateFlow(), []);
  const [websiteUrl, setWebsiteUrl] = useState(persistedCreateFlow?.websiteUrl || '');
  const [brandBrain, setBrandBrain] = useState<BrandBrain | null>(persistedCreateFlow?.brandBrain || null);
  const [variations, setVariations] = useState<GeneratedAdVariation[]>(persistedCreateFlow?.variations || []);
  const [activeIndex, setActiveIndex] = useState(() => (
    persistedCreateFlow?.variations?.length
      ? Math.min(Math.max(0, persistedCreateFlow.activeIndex || 0), persistedCreateFlow.variations.length - 1)
      : 0
  ));
  const [selectedFormat, setSelectedFormat] = useState<CreateAdFormat>(persistedCreateFlow?.selectedFormat || 'visualizer');
  const [fallbackQuestions, setFallbackQuestions] = useState<string[]>([]);
  const [fallbackAnswers, setFallbackAnswers] = useState<string[]>(['', '', '']);
  const [status, setStatus] = useState<'idle' | 'researching' | 'writing' | 'ready' | 'error'>(
    persistedCreateFlow?.variations?.length ? 'ready' : 'idle'
  );
  const [error, setError] = useState('');
  const [brandDetailsOpen, setBrandDetailsOpen] = useState(false);
  const [savedVariationIds, setSavedVariationIds] = useState<string[]>([]);
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false);
  const [rerollFlash, setRerollFlash] = useState<RerollFlashPayload | null>(null);
  const [captionEditorOpen, setCaptionEditorOpen] = useState(false);
  const [captionDrafts, setCaptionDrafts] = useState<string[]>([]);
  const [feedbackByVariationId, setFeedbackByVariationId] = useState<Record<string, GenerationFeedbackRating>>({});
  const [selectedAdModel, setSelectedAdModel] = useState<AdModelChoice>('auto');
  const [lastAdProvider, setLastAdProvider] = useState('');
  const lastPreviewKeyRef = useRef('');

  const visibleVariations = useMemo(() => (
    variations.filter((variation) => variation.format === selectedFormat)
  ), [selectedFormat, variations]);
  const activeGlobalVariation = variations[activeIndex] || null;
  const activeVariation = activeGlobalVariation && visibleVariations.some((variation) => variation.id === activeGlobalVariation.id)
    ? activeGlobalVariation
    : visibleVariations[0] || null;
  const brandAssets = brandBrain?.brandAssets ? normalizeBrandBrainAssets(brandBrain.brandAssets) : null;
  const externalResearch = brandAssets?.externalResearch;
  const creativeBriefHighlights = brandBrain ? [
    { label: 'Offer', value: brandBrain.offer },
    { label: 'Audience', value: brandBrain.audience },
    { label: 'Hook', value: brandBrain.pain || brandBrain.differentiator },
  ].filter((item) => item.value?.trim()) : [];
  const socialAvatarLogo = isDataImage(brandAssets?.images.logo)
    ? brandAssets?.images.logo || null
    : brandAssets?.images.favicon || brandAssets?.images.logo || brandBrain?.brandLogoUrl || null;
  const brandImages = uniqueStrings([
    brandAssets?.images.logo,
    brandAssets?.images.favicon,
    brandAssets?.images.ogImage,
    ...(brandAssets?.images.heroImages || []),
    ...(brandAssets?.images.allImages || []),
  ]).slice(0, 12);
  const brandColorEntries = Object.entries(brandAssets?.colors || {});
  const canGenerate = websiteUrl.trim().length > 3 && status !== 'researching' && status !== 'writing';
  const isGenerating = status === 'researching' || status === 'writing';
  const generateButtonUnavailable = !canGenerate && !isGenerating;
  const siteLabel = websiteUrl
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0] || 'your site';
  const selectedFormatLabel = CREATE_FORMAT_LABELS[selectedFormat] || 'generated';
  const activeVariationSaved = Boolean(activeVariation && savedVariationIds.includes(activeVariation.id));
  const activeVariationHelper = activeVariation
    ? ''
    : variations.length
      ? `No ${selectedFormatLabel.toLowerCase()} ads in this set yet.`
      : 'Your generated ads appear on the canvas';
  const previewReady = hasPlayableAudio && Boolean(audioAnalysis?.levels?.length);

  const openCaptionEditor = () => {
    setCaptionDrafts(captions.map((caption) => caption.text));
    setCaptionEditorOpen(true);
  };

  const saveCaptionEdits = () => {
    onUpdateCaptions(captions.map((caption, index) => ({
      ...caption,
      text: (captionDrafts[index] ?? caption.text).trim() || caption.text,
    })));
    setCaptionEditorOpen(false);
  };

  const statusCopy = useMemo(() => {
    if (status === 'researching') return 'Finding the angle';
    if (status === 'writing') return 'Making your ads';
    if (status === 'ready') return 'Ads ready to review';
    if (!hasUserAudio) return 'Add a voice clip first';
    return 'Website plus voice clip';
  }, [hasUserAudio, status]);

  const setActiveVariation = (variation: GeneratedAdVariation) => {
    const flashRoles = getRerollFlashRoles(activeVariation, variation);
    if (flashRoles.length) {
      setRerollFlash({
        key: `${variation.id}-${Date.now()}`,
        roles: flashRoles,
      });
    }
    const nextIndex = variations.findIndex((candidate) => candidate.id === variation.id);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  };

  const rateActiveVariation = (rating: GenerationFeedbackRating) => {
    if (!activeVariation || !brandBrain) return;
    setFeedbackByVariationId((current) => ({ ...current, [activeVariation.id]: rating }));
    saveGenerationFeedback({
      id: `${activeVariation.id}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      rating,
      websiteUrl,
      brandName: brandBrain.businessName,
      variation: {
        id: activeVariation.id,
        format: activeVariation.format,
        angle: activeVariation.angle,
        headline: activeVariation.headline,
        index: activeVariation.index,
        visualizerColor: activeVariation.visualizerColor,
        accentColor: activeVariation.accentColor,
      },
      brandBrief: {
        offer: brandBrain.offer,
        audience: brandBrain.audience,
        pain: brandBrain.pain,
        promisedResult: brandBrain.promisedResult,
        differentiator: brandBrain.differentiator,
        tone: brandBrain.tone,
        adAngles: brandBrain.adAngles,
      },
    });
  };

  useEffect(() => {
    if (!brandDetailsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBrandDetailsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [brandDetailsOpen]);

  useEffect(() => {
    const storage = getCreateFlowStorage();
    if (!storage) return;
    if (!websiteUrl && !brandBrain && variations.length === 0) {
      storage.removeItem(CREATE_FLOW_STORAGE_KEY);
      return;
    }
    storage.setItem(CREATE_FLOW_STORAGE_KEY, JSON.stringify({
      websiteUrl,
      brandBrain,
      variations,
      activeIndex,
      selectedFormat,
      savedAt: Date.now(),
    }));
  }, [activeIndex, brandBrain, selectedFormat, variations, websiteUrl]);

  useEffect(() => {
    if (!visibleVariations.length || !activeVariation) return;
    if (variations[activeIndex]?.id === activeVariation.id) return;
    setActiveVariation(activeVariation);
  }, [activeIndex, activeVariation, variations, visibleVariations.length]);

  useEffect(() => {
    if (!visibleVariations.length) return;
    const handleSpace = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isEditableTarget(event.target) || isEditableTarget(document.activeElement)) return;
      if (useEditorStore.getState().selectedIds.length > 0) return;
      event.preventDefault();
      const activeVisibleIndex = Math.max(0, visibleVariations.findIndex((variation) => variation.id === activeVariation?.id));
      setActiveVariation(visibleVariations[(activeVisibleIndex + 1) % visibleVariations.length]);
    };
    window.addEventListener('keydown', handleSpace);
    return () => window.removeEventListener('keydown', handleSpace);
  }, [activeVariation, visibleVariations, variations]);

  useEffect(() => {
    if (!activeVariation || !brandBrain) return;
    const previewKey = `${activeVariation.id}:${brandBrain.websiteUrl}`;
    if (lastPreviewKeyRef.current === previewKey) return;
    lastPreviewKeyRef.current = previewKey;
    onPreviewVariation(activeVariation, brandBrain);
  }, [activeVariation, brandBrain, onPreviewVariation]);

  const requestResearch = async (answers?: string[]) => {
    return fetchJsonWithTimeout<ResearchResponse>('/api/research-brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websiteUrl, fallbackAnswers: answers }),
    }, 25000, 'That site is taking too long to read. Answer three quick questions and Wiggly can keep going.');
  };

  const requestAdStream = async (nextBrandBrain: BrandBrain) => {
    return fetchJsonWithTimeout<AdStreamResponse>('/api/generate-ad-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandBrain: nextBrandBrain,
        count: TARGET_GENERATED_AD_COUNT,
        formatMix: ACTIVE_GENERATED_FORMATS,
        model: selectedAdModel,
      }),
    }, 30000, 'Writing is taking too long. Try again in a moment.');
  };

  const generateAds = async (answers?: string[]) => {
    setError('');
    setFallbackQuestions([]);
    setSavedVariationIds([]);
    const nextWebsiteUrl = websiteUrl.trim();
    const isDifferentWebsite = Boolean(brandBrain?.websiteUrl && nextWebsiteUrl && brandBrain.websiteUrl !== nextWebsiteUrl);
    if (isDifferentWebsite || variations.length > 0) {
      setVariations([]);
      setActiveIndex(0);
      onResetCanvasForNewWebsite();
    }
    setStatus('researching');
    try {
      const research = await requestResearch(answers);
      if (research.needsFallback || !research.brandBrain) {
        setFallbackQuestions(research.questions || []);
        setStatus('idle');
        return;
      }

      setBrandBrain(research.brandBrain);
      setStatus('writing');
      const stream = await requestAdStream(research.brandBrain);
      const nextVariations = buildGeneratedVariations(stream.brandBrain, stream.variations);
      setLastAdProvider(stream.model && stream.provider ? `${stream.model} (${stream.provider})` : stream.provider || '');
      setBrandBrain(stream.brandBrain);
      setVariations(nextVariations);
      setActiveIndex(0);
      setStatus('ready');
    } catch (nextError: any) {
      const nextMessage = nextError?.message || 'Something broke while making the ads.';
      if (nextMessage.includes('Answer three quick questions')) {
        setFallbackQuestions(BRAND_FALLBACK_QUESTIONS);
        setError(nextMessage);
        setStatus('idle');
        return;
      }
      setError(nextMessage);
      setStatus('error');
    }
  };

  const submitFallback = () => {
    const answers = fallbackAnswers.map((answer) => answer.trim());
    if (answers.some((answer) => answer.length < 3)) {
      setError('Answer the three quick questions first.');
      return;
    }
    void generateAds(answers);
  };

  const goNext = () => {
    if (!visibleVariations.length) return;
    const activeVisibleIndex = Math.max(0, visibleVariations.findIndex((variation) => variation.id === activeVariation?.id));
    setActiveVariation(visibleVariations[(activeVisibleIndex + 1) % visibleVariations.length]);
  };

  const saveActiveVariation = () => {
    if (!activeVariation || !brandBrain || activeVariationSaved) return;
    onSaveDesign(activeVariation, brandBrain);
    setSavedVariationIds((currentIds) => (
      currentIds.includes(activeVariation.id) ? currentIds : [...currentIds, activeVariation.id]
    ));
  };

  const closeSavedDesignsOnBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setSavedDesignsOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#F7F4EA] px-3 py-4 font-sans text-slate-950 sm:px-6 md:px-10">
      <header className="mx-auto flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onOpenStudio} className="flex items-center gap-3 text-left">
          <img src="/wiggly-logo.svg" alt="Wiggly" className="h-10 w-10 rounded-2xl object-cover shadow-sm shadow-slate-950/10" />
          <span>
            <span className="block text-xl font-black leading-none">Wiggly</span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">audio that looks expensive</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenStudio}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
        >
          Open builder
        </button>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-8 py-6 sm:gap-10 sm:py-8 lg:min-h-[calc(100vh-5.5rem)] lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 lg:py-10">
        <div className="max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-500 shadow-sm">
            <Wand2 className="h-4 w-4 text-[#4F46E5]" />
            {statusCopy}
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-7xl">
            Make video ads without learning video editing.
          </h1>
          <p className="mt-4 max-w-full text-base font-semibold leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8 md:max-w-lg">
            Wiggly reads the site, finds the selling angle, and fills the canvas with polished ads you can preview, save, download, or edit.
          </p>

          <div className="mt-8 space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-800">Website</span>
              <input
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://yourbrand.com"
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-800">Ad writing model</span>
              <select
                value={selectedAdModel}
                onChange={(event) => setSelectedAdModel(event.target.value as AdModelChoice)}
                disabled={isGenerating}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {AD_MODEL_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>{choice.label}</option>
                ))}
              </select>
              <span className="mt-1.5 block min-h-4 text-xs font-semibold text-slate-400">
                {lastAdProvider ? `Last used: ${lastAdProvider}` : 'Auto is best for users. Pick a model when testing headline quality.'}
              </span>
            </label>

            <button
              type="button"
              onClick={() => void generateAds()}
              disabled={!canGenerate}
              className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800 ${isGenerating ? 'cursor-progress' : ''} ${generateButtonUnavailable ? 'cursor-not-allowed opacity-45' : ''}`}
            >
              {status === 'researching' || status === 'writing' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
              {status === 'researching' ? 'Finding the angle' : status === 'writing' ? 'Making your ads' : 'Generate ads'}
            </button>

            {isGenerating && (
              <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white">
                  <div className={`h-full rounded-full bg-[#4F46E5] transition-all duration-500 ${status === 'writing' ? 'w-[78%]' : 'w-[36%]'}`} />
                </div>
                <div className="grid gap-2 text-sm font-bold text-slate-700">
                  {[
                    { label: `Checking ${siteLabel}`, done: status === 'writing', active: status === 'researching' },
                    { label: 'Finding the angle', done: status === 'writing', active: false },
                    { label: 'Writing your ads', done: false, active: status === 'writing' },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-emerald-500 text-white' : step.active ? 'bg-white text-indigo-600' : 'bg-white/70 text-slate-300'}`}>
                        {step.done ? <CheckCircle2 className="h-4 w-4" /> : step.active ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                      </span>
                      <span>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fallbackQuestions.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-black text-amber-950">Three quick answers and Wiggly can keep going.</p>
                {fallbackQuestions.map((question, index) => (
                  <label key={question} className="block">
                    <span className="mb-1 block text-xs font-black text-amber-900">{question}</span>
                    <input
                      value={fallbackAnswers[index] || ''}
                      onChange={(event) => {
                        const nextAnswers = [...fallbackAnswers];
                        nextAnswers[index] = event.target.value;
                        setFallbackAnswers(nextAnswers);
                      }}
                      className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-amber-400"
                    />
                  </label>
                ))}
                <button
                  type="button"
                  onClick={submitFallback}
                  className="w-full rounded-xl bg-amber-950 px-4 py-3 text-sm font-black text-white"
                >
                  Continue
                </button>
              </div>
            )}

            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
          </div>
        </div>

        <div className="grid items-center gap-5 sm:gap-6 lg:grid-cols-[minmax(360px,500px)_minmax(260px,1fr)]">
          <div
            className="relative mx-auto flex w-full flex-col items-center gap-3 pl-20 lg:block"
            data-testid="canvas-format-shell"
          >
            <CreateCanvasFormatRail
              activeFormatId={selectedFormat}
              onSelectFormat={setSelectedFormat}
              onMakeVoiceAudio={onOpenVoiceMaker}
              onUploadVoiceAudio={onAudioUpload}
            />
            <div className="relative">
              <PlatformFrame
                platform={platform}
                theme="dark"
                brandName={brandBrain?.businessName || 'Your brand'}
                brandLogo={socialAvatarLogo}
                caption={brandBrain?.offer || activeVariation?.headline || activeVariationHelper}
                metaCta="Learn More"
              >
                <CanvasEditor
                  platform={platform}
                  backgroundColor={backgroundColor}
                  bgMedia={bgMedia}
                  bgShadow={bgShadow}
                  bgShadowOpacity={bgShadowOpacity}
                  introImage={introImage}
                  introDuration={introDuration}
                  introFeedCropY={introFeedCropY}
                  introImageAspect={introImageAspect}
                  previewDurationCap={previewDurationCap}
                  audioUrl={audioUrl}
                  audioAnalysis={audioAnalysis}
                  captionsLoading={captionsLoading}
                  emptyCaptionFallback=""
                  emptyCaptionAction={!hasPlayableAudio || !activeVariation ? (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white/95 px-5 py-3 text-sm font-black text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950"
                      onClick={() => onOpenVoiceMaker()}
                    >
                      <AudioLines className="h-4 w-4 shrink-0" />
                      Add audio for this ad
                    </button>
                  ) : null}
                  accentColor={activeVariation?.accentColor || '#4F46E5'}
                  playing={playing}
                  onPlaybackComplete={onPlaybackComplete}
                  onRefreshBackgroundColor={onRefreshBackgroundColor}
                  onApplyStyleArchetype={onApplyStyleArchetype}
                  rerollFlash={rerollFlash}
                />
              </PlatformFrame>
              <div className="absolute bottom-7 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
                <button
                  type="button"
                  onClick={onTogglePlayback}
                  disabled={!previewReady}
                  className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-2xl shadow-slate-950/25 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {playing ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                  {playing ? 'Stop preview' : previewReady ? 'Play this ad' : hasPlayableAudio ? 'Preparing preview' : 'Play this ad'}
                </button>
                {captions.length > 0 && (
                  <button
                    type="button"
                    onClick={openCaptionEditor}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-2xl shadow-slate-950/12 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950"
                    title="Edit captions"
                    aria-label="Edit captions"
                  >
                    <Captions className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            {(activeVariation || variations.length > 0) && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {activeVariation && brandBrain && (
                  <section
                    className="mx-auto flex w-full max-w-[390px] flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_16px_44px_rgba(15,23,42,0.08)]"
                    data-testid="generation-feedback"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Generation
                      </p>
                      <p className="text-sm font-black text-slate-950">
                        Was this one useful?
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {([
                        { rating: 'up' as const, label: 'Good', icon: ThumbsUp },
                        { rating: 'down' as const, label: 'Bad', icon: ThumbsDown },
                      ]).map((item) => {
                        const Icon = item.icon;
                        const active = feedbackByVariationId[activeVariation.id] === item.rating;
                        return (
                          <button
                            key={item.rating}
                            type="button"
                            onClick={() => rateActiveVariation(item.rating)}
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 ${
                              active
                                ? 'border-slate-950 bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.20)] hover:bg-slate-900 hover:text-white'
                                : 'border-slate-200 bg-white'
                            }`}
                            aria-pressed={active}
                            title={item.label}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="sr-only">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
                <section
                  className="mx-auto w-full max-w-[390px] rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-[0_20px_54px_rgba(15,23,42,0.12)]"
                  data-testid="spacebar-reroll-coach"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!visibleVariations.length) return;
                      goNext();
                    }}
                    className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(15,23,42,0.20)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_22px_52px_rgba(15,23,42,0.18)]"
                    data-testid="spacebar-reroll-button"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Press</span>
                    <span className="rounded-lg border border-white/20 bg-white px-5 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-950 shadow-[inset_0_-2px_0_rgba(15,23,42,0.10)] transition group-hover:bg-slate-100">
                      Spacebar
                    </span>
                    <span>make a wish</span>
                  </button>
                </section>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8">
              {!activeVariation && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">Generated ads</p>
                    {activeVariationHelper && (
                      <p className="mt-1 text-xs font-semibold text-slate-500">{activeVariationHelper}</p>
                    )}
                  </div>
                  <Shuffle className="h-5 w-5 text-slate-400" />
                </div>
              )}

              <button
                type="button"
                onClick={() => onDownloadVideo(activeVariation, brandBrain)}
                disabled={!activeVariation || !brandBrain || rendering}
                className={`${activeVariation ? '' : 'mt-4'} flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {rendering ? 'Making video' : 'Download video'}
              </button>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onTogglePlayback}
                  disabled={!hasPlayableAudio}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {playing ? 'Stop' : 'Play'}
                </button>
                <div
                  className="relative"
                  onMouseEnter={() => setSavedDesignsOpen(true)}
                  onMouseLeave={() => setSavedDesignsOpen(false)}
                  onFocus={() => setSavedDesignsOpen(true)}
                  onBlur={closeSavedDesignsOnBlur}
                >
                  <button
                    type="button"
                    onClick={saveActiveVariation}
                    disabled={!activeVariation || !brandBrain}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title={activeVariationSaved ? 'Saved to designs' : 'Save this ad to designs'}
                  >
                    {activeVariationSaved ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <BookmarkPlus className="h-4 w-4" />}
                    {activeVariationSaved ? 'Saved' : 'Save'}
                    {savedDesigns.length > 0 && (
                      <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">
                        {Math.min(savedDesigns.length, 9)}
                      </span>
                    )}
                  </button>
                  {savedDesignsOpen && savedDesigns.length > 0 && (
                    <div className="absolute right-0 top-full z-[60] w-[min(18rem,calc(100vw-2rem))] pt-2 lg:w-72">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/15">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Saved ads</p>
                          <span className="text-[10px] font-black text-slate-400">{savedDesigns.length}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {savedDesigns.slice(0, 4).map((design) => (
                            <button
                              key={design.id}
                              type="button"
                              onClick={() => onOpenSavedDesign(design.id)}
                              title={`Open ${design.name}`}
                              className="min-w-0 rounded-xl border border-slate-200 bg-white p-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <span
                                className="block h-12 rounded-lg border border-slate-200"
                                style={{ backgroundColor: design.backgroundColor }}
                              >
                                <span
                                  className="mt-8 block h-1.5 w-2/3 rounded-full"
                                  style={{ backgroundColor: design.accentColor }}
                                />
                              </span>
                              <span className="mt-2 block truncate text-[11px] font-black text-slate-700">
                                {design.name}
                              </span>
                              {design.previewTitle && design.previewTitle !== design.name && (
                                <span className="mt-0.5 block truncate text-[10px] font-bold text-slate-400">
                                  {design.previewTitle}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <label className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
                <span>Preview</span>
                <select
                  value={platform}
                  onChange={(event) => onPlatformChange(event.target.value as PlatformType)}
                  className="bg-transparent text-sm font-black text-slate-950 outline-none"
                  aria-label="Choose preview"
                >
                  <option value="facebook-feed">FB Feed</option>
                  <option value="instagram-feed">IG Feed</option>
                  <option value="reels">Reels</option>
                  <option value="stories">Stories</option>
                  <option value="youtube">YouTube</option>
                </select>
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!visibleVariations.length}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Try another
                </button>
                <button
                  type="button"
                  onClick={() => activeVariation && brandBrain && onOpenBuilder(activeVariation, brandBrain)}
                  disabled={!activeVariation || !brandBrain}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Open in builder
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {brandBrain && (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Creative brief</p>
                <div className="mt-3 space-y-3">
                  {creativeBriefHighlights.map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{item.label}</p>
                      <p className="mt-1 text-sm font-black leading-5 text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setBrandDetailsOpen(true)}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
                  >
                    More
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {captionEditorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-black text-slate-950">Edit captions</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Fix the words. Timing stays the same.</p>
              </div>
              <button
                type="button"
                onClick={() => setCaptionEditorOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close caption editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              {captions.map((caption, index) => (
                <label key={`${caption.start}-${index}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="mb-2 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    <span>Line {index + 1}</span>
                    <span>{caption.start.toFixed(1)}s - {caption.end.toFixed(1)}s</span>
                  </span>
                  <textarea
                    value={captionDrafts[index] ?? caption.text}
                    onChange={(event) => {
                      const nextDrafts = [...captionDrafts];
                      nextDrafts[index] = event.target.value;
                      setCaptionDrafts(nextDrafts);
                    }}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold leading-6 text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </label>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setCaptionEditorOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCaptionEdits}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Save captions
              </button>
            </div>
          </div>
        </div>
      )}

      {brandBrain && brandDetailsOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-label="Brand research details">
          <div className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-2xl shadow-slate-950/30">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Full brand dump</p>
                <h2 className="mt-1 text-3xl font-black leading-tight text-slate-950">{brandBrain.businessName}</h2>
                <p className="mt-1 max-w-2xl text-base font-bold text-slate-600">{brandBrain.websiteUrl}</p>
              </div>
              <button
                type="button"
                onClick={() => setBrandDetailsOpen(false)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50"
                aria-label="Close brand dump"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[0.92fr_1.08fr]">
              <div className="min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-6">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Images Firecrawl found</h3>
                    {brandImages.length ? (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {brandImages.map((image) => (
                          <a
                            key={image}
                            href={image}
                            target="_blank"
                            rel="noreferrer"
                            className="group overflow-hidden rounded-2xl border border-slate-300 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="flex aspect-[1.5] items-center justify-center rounded-xl bg-slate-50 p-3">
                              {canPreviewBrandImage(image) ? (
                                <img src={image} alt="" className="max-h-full max-w-full object-contain" />
                              ) : (
                                <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                  External image
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                            <p className="mt-2 line-clamp-2 break-all text-xs font-bold leading-4 text-slate-600 group-hover:text-slate-900">{image}</p>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-slate-600">No images came back yet.</p>
                    )}
                  </section>

                  <section>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Colors</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(brandColorEntries.length ? brandColorEntries : brandBrain.colors.map((color, index) => [`color ${index + 1}`, color])).map(([name, color]) => (
                        <div key={`${name}-${color}`} className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white p-2.5">
                          <span className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 shadow-inner" style={{ backgroundColor: color }} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-slate-900">{name}</span>
                            <span className="block text-xs font-bold text-slate-600">{color}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Fonts</h3>
                    {brandAssets?.fonts?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {brandAssets.fonts.map((font) => (
                          <span key={`${font.family}-${font.role || 'font'}`} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-800">
                            {font.family}{font.role ? ` · ${font.role}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-slate-600">No fonts came back yet.</p>
                    )}
                  </section>

                  <section>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Social links</h3>
                    {brandAssets?.socialLinks?.length ? (
                      <div className="mt-3 space-y-2">
                        {brandAssets.socialLinks.map((link) => (
                          <a key={link} href={link} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-black text-slate-800 transition hover:bg-slate-50">
                            <span className="truncate">{link}</span>
                            <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-slate-600">No social links found on the homepage.</p>
                    )}
                  </section>

                  <section>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Outside Web</h3>
                    {externalResearch?.sources?.length || externalResearch?.answers?.length ? (
                      <div className="mt-3 space-y-3">
                        {externalResearch.answers?.map((answer) => (
                          <p key={answer} className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold leading-5 text-slate-800">
                            {answer}
                          </p>
                        ))}
                        {externalResearch.sources?.map((source) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-2xl border border-slate-300 bg-white p-3 transition hover:bg-slate-50"
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span className="min-w-0">
                                <span className="block line-clamp-2 text-sm font-black leading-5 text-slate-900">{source.title}</span>
                                <span className="mt-1 block truncate text-xs font-bold text-slate-500">{source.url}</span>
                              </span>
                              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            </span>
                            {source.content && <span className="mt-2 block line-clamp-3 text-xs font-semibold leading-5 text-slate-600">{source.content}</span>}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-slate-600">No outside-web research came back yet.</p>
                    )}
                  </section>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto bg-white p-6">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Useful claims</h3>
                    <div className="mt-3 space-y-2">
                      {[brandBrain.offer, brandBrain.pain, brandBrain.promisedResult, brandBrain.differentiator, ...(brandBrain.proof || [])].filter(Boolean).map((claim) => (
                        <p key={claim} className="rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-black leading-5 text-slate-900">{claim}</p>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Metadata</h3>
                    <pre className="mt-3 max-h-56 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm font-bold leading-6 text-white">{summarizeJson(brandAssets?.metadata || {})}</pre>
                  </section>

                  <section>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Design language</h3>
                    <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm font-bold leading-6 text-white">{summarizeJson({
                      personality: brandAssets?.personality,
                      designSystem: brandAssets?.designSystem,
                      componentStyles: brandAssets?.componentStyles,
                    })}</pre>
                  </section>

                  <section>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Pages and raw branding</h3>
                    <pre className="mt-3 max-h-80 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm font-bold leading-6 text-white">{summarizeJson({
                      pages: brandAssets?.pages || [],
                      rawBranding: brandAssets?.rawBranding || {},
                      externalResearch: brandAssets?.externalResearch || {},
                    })}</pre>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
