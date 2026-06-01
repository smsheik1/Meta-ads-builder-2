import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, AudioLines, BookmarkPlus, CheckCircle2, Download, ExternalLink, LayoutGrid, Loader2, MessageCircle, Play, Shuffle, Square, Upload, Wand2, X } from 'lucide-react';
import { getRandomAdStyleArchetype, type AdStyleArchetype } from '../lib/style-archetypes';
import { PlatformFrame, type PlatformType } from './PlatformFrame';
import { CanvasEditor } from './CanvasEditor';
import type { AudioAnalysisData } from '../lib/audio-analysis';
import { pickVisibleColorOnLight } from '../lib/color-contrast';
import { BRAND_FALLBACK_QUESTIONS, type BrandBrain } from '../lib/prompts/brand-brain';
import type { ConversationAdLine, GeneratedAdFormat, HeadlineVariation } from '../lib/prompts/headline-variations';
import { useEditorStore } from '../store';

export type GeneratedAdVariation = HeadlineVariation & {
  format: GeneratedAdFormat;
  conversationLines?: ConversationAdLine[];
  index: number;
  archetype: AdStyleArchetype;
  visualizerColor: string;
  accentColor: string;
};

type CreateAdFormat = 'all' | GeneratedAdFormat;
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

type CreateFlowProps = {
  audioFileName: string;
  hasUserAudio: boolean;
  onAudioUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
  onDownloadVideo: () => void;
  onSaveDesign: (variation: GeneratedAdVariation, brandBrain: BrandBrain) => void;
  savedDesigns: SavedCreateDesign[];
  onOpenSavedDesign: (designId: string) => void;
  onPlatformChange: (platform: PlatformType) => void;
  onRefreshBackgroundColor: () => void;
  onApplyStyleArchetype: (archetype: AdStyleArchetype) => void;
  onPreviewVariation: (variation: GeneratedAdVariation, brandBrain: BrandBrain) => void;
  onOpenBuilder: (variation: GeneratedAdVariation, brandBrain: BrandBrain) => void;
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
};

const DEFAULT_BRAND_COLORS = ['#00D6B8', '#4F46E5', '#0F172A'];
const TARGET_GENERATED_AD_COUNT = 50;
const CREATE_FLOW_STORAGE_KEY = 'wiggly_create_flow_session_v1';
const CREATE_FLOW_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const PAUSED_CREATE_FORMAT_NAMES: Record<GeneratedAdFormat, string> = {
  visualizer: '',
  conversation: 'Conversation Card',
};
const PAUSED_CREATE_FORMATS = new Set<GeneratedAdFormat>(['conversation']);
const ACTIVE_GENERATED_FORMATS: GeneratedAdFormat[] = ['visualizer'];
const ALL_FORMAT_MODES: Array<{ id: CreateAdFormat; label: string; icon: typeof LayoutGrid }> = [
  { id: 'all', label: 'All formats', icon: LayoutGrid },
  { id: 'visualizer', label: 'Audio visualizer', icon: AudioLines },
  { id: 'conversation', label: PAUSED_CREATE_FORMAT_NAMES.conversation || 'Conversation', icon: MessageCircle },
];
const FORMAT_MODES = ALL_FORMAT_MODES.filter((mode) => (
  mode.id === 'all' || !PAUSED_CREATE_FORMATS.has(mode.id)
));

type PersistedCreateFlow = {
  websiteUrl: string;
  brandBrain: BrandBrain | null;
  variations: GeneratedAdVariation[];
  activeIndex: number;
  selectedFormat?: CreateAdFormat;
  savedAt: number;
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
    return PAUSED_CREATE_FORMATS.has(value) ? 'all' : value;
  }
  return value === 'all' ? value : 'all';
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
    };
  });
};

const summarizeJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const uniqueStrings = (values: Array<string | undefined>) => values
  .filter((value): value is string => Boolean(value))
  .filter((value, index, allValues) => allValues.indexOf(value) === index);

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
  if (previousVariation.headline !== nextVariation.headline) roles.add('headline');
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
  audioFileName,
  hasUserAudio,
  onAudioUpload,
  audioUrl,
  audioAnalysis,
  captionsLoading = false,
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
  const [selectedFormat, setSelectedFormat] = useState<CreateAdFormat>(persistedCreateFlow?.selectedFormat || 'all');
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
  const lastPreviewKeyRef = useRef('');

  const visibleVariations = useMemo(() => (
    selectedFormat === 'all'
      ? variations
      : variations.filter((variation) => variation.format === selectedFormat)
  ), [selectedFormat, variations]);
  const activeGlobalVariation = variations[activeIndex] || null;
  const activeVariation = activeGlobalVariation && visibleVariations.some((variation) => variation.id === activeGlobalVariation.id)
    ? activeGlobalVariation
    : visibleVariations[0] || null;
  const brandAssets = brandBrain?.brandAssets;
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
  const canGenerate = websiteUrl.trim().length > 3 && hasUserAudio && status !== 'researching' && status !== 'writing';
  const isGenerating = status === 'researching' || status === 'writing';
  const generateButtonUnavailable = !canGenerate && !isGenerating;
  const siteLabel = websiteUrl
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0] || 'your site';
  const selectedFormatLabel = FORMAT_MODES.find((mode) => mode.id === selectedFormat)?.label || 'Generated';
  const activeVariationSaved = Boolean(activeVariation && savedVariationIds.includes(activeVariation.id));
  const activeVariationHelper = activeVariation
    ? ''
    : variations.length
      ? `No ${selectedFormatLabel.toLowerCase()} ads in this set yet.`
      : 'Your generated ads appear on the canvas';

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
      body: JSON.stringify({ brandBrain: nextBrandBrain, count: TARGET_GENERATED_AD_COUNT, formatMix: ACTIVE_GENERATED_FORMATS }),
    }, 30000, 'Writing is taking too long. Try again in a moment.');
  };

  const generateAds = async (answers?: string[]) => {
    setError('');
    setFallbackQuestions([]);
    setSavedVariationIds([]);
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
    <main className="min-h-screen bg-[#F7F4EA] px-6 py-6 font-sans text-slate-950 md:px-10">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4">
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
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Open builder
        </button>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 py-10 lg:min-h-[calc(100vh-5.5rem)] lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
        <div className="max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-500 shadow-sm">
            <Wand2 className="h-4 w-4 text-[#4F46E5]" />
            {statusCopy}
          </p>
          <h1 className="text-5xl font-black leading-[0.9] tracking-normal text-slate-950 md:text-7xl">
            Make video ads without learning video editing.
          </h1>
          <p className="mt-6 max-w-lg text-lg font-semibold leading-8 text-slate-600">
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

            {!hasUserAudio && (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:bg-white">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
                    <Upload className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-900">Upload voice clip</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">Used for timing and captions</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs font-black uppercase tracking-wide text-slate-400">Choose</span>
                <input type="file" accept="audio/*,video/mp4" onChange={onAudioUpload} className="sr-only" />
              </label>
            )}

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

        <div className="grid items-center gap-6 lg:grid-cols-[minmax(260px,420px)_minmax(260px,1fr)]">
          <div className="relative flex flex-col items-center gap-3 lg:block">
            <div className="flex rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg shadow-slate-950/10 lg:absolute lg:-left-14 lg:top-1/2 lg:z-50 lg:-translate-y-1/2 lg:flex-col">
              {FORMAT_MODES.map((mode) => {
                const Icon = mode.icon;
                const active = selectedFormat === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSelectedFormat(mode.id)}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                      active
                        ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                    aria-label={`Show ${mode.label}`}
                    title={mode.label}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <PlatformFrame
                platform={platform}
                theme="dark"
                brandName={brandBrain?.businessName || 'Your brand'}
                brandLogo={socialAvatarLogo}
                caption={brandBrain?.offer || 'Drop in a voice clip. Wiggly makes it look expensive.'}
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
                  accentColor={activeVariation?.accentColor || '#4F46E5'}
                  playing={playing}
                  onPlaybackComplete={onPlaybackComplete}
                  onRefreshBackgroundColor={onRefreshBackgroundColor}
                  onApplyStyleArchetype={onApplyStyleArchetype}
                  rerollFlash={rerollFlash}
                  disableEmptySelectionSpaceReroll
                />
              </PlatformFrame>
              <button
                type="button"
                onClick={onTogglePlayback}
                disabled={!audioUrl}
                className="absolute bottom-7 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-2xl shadow-slate-950/25 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {playing ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                {playing ? 'Stop preview' : 'Play this ad'}
              </button>
            </div>
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
                onClick={onDownloadVideo}
                disabled={!activeVariation || !brandBrain || !audioUrl || rendering}
                className={`${activeVariation ? '' : 'mt-4'} flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {rendering ? 'Making video' : 'Download video'}
              </button>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onTogglePlayback}
                  disabled={!audioUrl}
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
                    <div className="absolute right-0 top-full z-[60] w-72 pt-2">
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
