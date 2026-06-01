import React, { useState, useRef, useEffect } from 'react';
import { PlatformFrame, isFeedPlatform, isVerticalPlatform, type PlatformType } from './components/PlatformFrame';
import { CanvasEditor } from './components/CanvasEditor';
import { DevTuningPanel } from './components/DevTuningPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { CreateFlow, type GeneratedAdVariation } from './components/CreateFlow';
import { Upload, Play, Square, Database, CheckCircle2, Download, Layers, Loader2, X, Moon, Sun, Type, AudioLines, Captions, MousePointerClick, Image as ImageIcon, BookmarkPlus, ClipboardList, ArrowRight, Wand2, PhoneCall, Link2, ExternalLink, Copy, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import Papa from 'papaparse';
import { DEFAULT_ELEMENTS, useEditorStore, type AdElement } from './store';
import { compressVisualizerValue, drawAdvancedVisualizer } from './lib/visualizer';
import { stripRichText } from './lib/rich-text';
import { getRandomSeededHook } from './lib/headline-pool';
import { deleteAdHistoryItem, listAdHistory, saveAdHistoryItem, type StoredAdSnapshot } from './lib/ad-history';
import { deleteAudioItem, listAudioItems, saveAudioItem, type StoredAudioItem } from './lib/audio-library';
import { precomputeAudioAnalysisFromUrl, type AudioAnalysisData } from './lib/audio-analysis';
import { getActiveCaption, getDefaultLayoutOffsetX, getDefaultLayoutScaleY, getEditorDimensions, getExportDimensions, getPlatformElementFrame, type ExportSnapshot, type PhoneCallSnapshot } from './lib/export-snapshot';
import { PhoneCallSimulator } from './components/PhoneCallSimulator';
import { formatUsPhoneNumber } from './lib/phone-call';
import { FIXED_AD_BACKGROUND_COLOR } from './lib/style-archetypes';
import { InteractiveTutorial, WIGGLY_TUTORIAL_EVENT, WIGGLY_TUTORIAL_SEEN_KEY, emitTutorialEvent } from './components/InteractiveTutorial';
import { createShareSlug, getHostedSharePageBySlug, saveHostedSharePage, type SharePageRecord } from './lib/share-pages';
import { explainVoiceVisualizerPreset, getVoiceVisualizerPreset, VOICE_VISUALIZER_PRESET, type VoiceVisualizerPresetDecision } from './lib/visualizer-presets';
import { pickVisibleColorOnLight } from './lib/color-contrast';
import type { BrandBrain } from './lib/prompts/brand-brain';

const TEMPLATE_STORAGE_KEY = 'visualizer_ad_templates_v1';
const CREATIVE_BRIEF_STORAGE_KEY = 'visualizer_creative_brief_v1';
const STUDIO_SEEN_STORAGE_KEY = 'agent_enamel_studio_seen_v1';
const CURRENT_AUDIO_STORAGE_KEY = 'wiggly_current_audio_v1';
const DEFAULT_INTRO_IMAGE = '/default-intro-image.png';
const DEFAULT_INTRO_IMAGE_NAME = 'Default intro image';
const DEFAULT_AUDIO_URL = '/ai-dental-receptionist-audio.mp3';
const DEFAULT_AUDIO_NAME = 'AI Dental Receptionist';
const DEFAULT_PHONE_CALL_AUDIO_URL = '/default-phone-call-audio.m4a';
const DEFAULT_PHONE_CALL_AUDIO_NAME = 'Call Recording';
const SOCIAL_POSTING_ENABLED = false;
const BACKGROUND_COLOR_FAMILIES = [
  { hue: 158, saturation: [70, 95], lightness: [45, 96] },
  { hue: 190, saturation: [55, 90], lightness: [42, 94] },
  { hue: 230, saturation: [45, 75], lightness: [44, 96] },
  { hue: 255, saturation: [45, 78], lightness: [45, 94] },
  { hue: 315, saturation: [35, 70], lightness: [48, 94] },
  { hue: 25, saturation: [35, 70], lightness: [50, 94] },
  { hue: 0, saturation: [0, 0], lightness: [8, 98] },
];

const randomInRange = ([min, max]: number[]) => Math.round(min + Math.random() * (max - min));

const toHexChannel = (value: number) => Math.round(value).toString(16).padStart(2, '0');

const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const s = saturation / 100;
  const l = lightness / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${toHexChannel(255 * f(0))}${toHexChannel(255 * f(8))}${toHexChannel(255 * f(4))}`;
};

const getFreshBackgroundColor = (currentColor: string) => {
  let nextColor = currentColor;
  let attempts = 0;

  while (nextColor.toLowerCase() === currentColor.toLowerCase() && attempts < 8) {
    const family = BACKGROUND_COLOR_FAMILIES[Math.floor(Math.random() * BACKGROUND_COLOR_FAMILIES.length)];
    const hue = family.hue + randomInRange([-8, 8]);
    const saturation = randomInRange(family.saturation);
    const lightness = randomInRange(family.lightness);
    nextColor = hslToHex(hue, saturation, lightness);
    attempts += 1;
  }

  return nextColor;
};

const isDataImage = (value: string | null | undefined) => Boolean(value?.startsWith('data:image/'));

const isLikelyFaviconAsset = (value: string | null | undefined) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || isDataImage(raw)) return false;
  return /(?:^|\/)(?:favicon|apple-touch-icon|mstile|site-icon|android-chrome|icon[-_]\d|icon\.)/i.test(raw)
    || /\.(?:ico)(?:$|[?#])/i.test(raw);
};

const pickCanvasBrandLogo = (brandBrain: BrandBrain) => {
  const candidates = [
    brandBrain.brandLogoUrl,
    brandBrain.brandAssets?.images.logo,
  ];
  return candidates.find((candidate) => candidate && !isLikelyFaviconAsset(candidate)) || null;
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

const MOCK_CAPTIONS = [
  { text: "Are you missing calls?", start: 0, end: 2, speaker: 1 },
  { text: "Our AI receptionist can help.", start: 2.5, end: 4.5, speaker: 2 },
  { text: "Available 24/7.", start: 5, end: 6.5, speaker: 1 },
  { text: "Never miss a lead again.", start: 7, end: 9, speaker: 2 },
];

const CAPTION_SPEAKER_COLORS: Record<number, string> = {
  1: '#00D6B8',
  2: '#6554FF',
};

type RenderDurationCap = 30 | 60 | 'full';
type ExportPhase = 'recording' | 'converting' | 'complete' | 'error';
type IntroDuration = 0 | 1 | 2 | 3;
type RingDuration = 0 | 1 | 2 | 3;
type CreativeMode = 'visualizer' | 'phone-call';
type AppRoute = 'home' | 'builder' | 'share' | 'create';
type ReadyExport = {
  url: string;
  blob: Blob;
  filename: string;
  snapshot: SavedTemplate | null;
  renderVersion: number;
};

const CURRENT_RENDER_VERSION = 2;
const TRANSCRIPTION_BACKOFF_KEY = 'wiggly_transcription_429_until';
const TRANSCRIPTION_ERROR_BACKOFF_KEY = 'wiggly_transcription_error_until';
const SPACE_REMIX_CUE_DISMISSED_KEY = 'wiggly_space_remix_cue_dismissed_v1';

type CreativeBrief = {
  offer: string;
  buyer: string;
  pain: string;
  failedAlternatives: string;
  promisedResult: string;
  differentiator: string;
  cta: string;
  reference: string;
};

type DialogueLine = {
  speaker: 'Ava' | 'Sam' | string;
  tone: string;
  text: string;
};

type DialogueScript = {
  title: string;
  angle: string;
  lines: DialogueLine[];
};

type ConversationWizardStep = 'brief' | 'scripts' | 'edit';
type PostizStatus = 'idle' | 'loading' | 'uploading' | 'drafting' | 'done' | 'error';

type PostizIntegration = {
  id: string;
  name: string;
  identifier: string;
  picture?: string;
  disabled?: boolean;
  profile?: string;
};

const POSTIZ_CHANNEL_LABELS: Record<string, string> = {
  facebook: 'FB',
  instagram: 'IG',
  'instagram-standalone': 'IG',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
  linkedin: 'LinkedIn',
  'linkedin-page': 'LinkedIn',
  threads: 'Threads',
};

const cloneDialogueScript = (script: DialogueScript): DialogueScript => ({
  title: script.title,
  angle: script.angle,
  lines: script.lines.map((line) => ({ ...line })),
});

const cleanDialogueTextForVoiceover = (value: string) => value
  .replace(/[—–]/g, ', ')
  .replace(/\s+/g, ' ')
  .trim();

const cleanDialogueScriptForVoiceover = (script: DialogueScript): DialogueScript => ({
  ...script,
  title: cleanDialogueTextForVoiceover(script.title),
  angle: cleanDialogueTextForVoiceover(script.angle),
  lines: script.lines.map((line) => ({
    ...line,
    tone: cleanDialogueTextForVoiceover(line.tone),
    text: cleanDialogueTextForVoiceover(line.text),
  })),
});

const normalizeShareUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).href;
  } catch {
    return trimmed;
  }
};

const EMPTY_CREATIVE_BRIEF: CreativeBrief = {
  offer: 'AI front-desk employees that answer calls, recover missed calls, and book dental patients automatically.',
  buyer: 'Dental practice owners with 1-5 locations who want more appointments without hiring more front desk staff.',
  pain: 'They are losing new patients because calls go unanswered during busy hours, lunch, and after-hours.',
  failedAlternatives: 'Hiring receptionists, outsourced call centers, more ads, reminder software, and generic automation tools.',
  promisedResult: '20+ extra appointments per month without hiring additional front desk staff.',
  differentiator: 'Our AI sounds human, handles follow-up automatically, and is built specifically for dental workflows and patient booking.',
  cta: 'Book a demo.',
  reference: `Most practices don't need more leads.

They need to stop losing the ones already calling.

3 missed calls a day could equal thousands in lost treatment revenue every month.`,
};

const CREATIVE_BRIEF_FIELDS: Array<{
  key: keyof CreativeBrief;
  question: string;
  placeholder: string;
  optional?: boolean;
}> = [
  {
    key: 'offer',
    question: 'What do you sell?',
    placeholder: 'AI receptionist that answers and books dental patient calls.',
  },
  {
    key: 'buyer',
    question: 'Who buys it?',
    placeholder: 'Dental practice owners with 1-5 locations.',
  },
  {
    key: 'pain',
    question: "What's the #1 pain?",
    placeholder: 'They are losing new patients because calls go unanswered.',
  },
  {
    key: 'failedAlternatives',
    question: "What have they tried that didn't work?",
    placeholder: 'Hiring receptionists, call centers, more ads, reminder software.',
  },
  {
    key: 'promisedResult',
    question: 'What result do you promise?',
    placeholder: 'Book more patients 24/7 without hiring more front desk staff.',
  },
  {
    key: 'differentiator',
    question: 'Why you instead of competitors?',
    placeholder: 'Sounds human, handles follow-up, and is built for dental workflows.',
  },
  {
    key: 'cta',
    question: 'What should people do next?',
    placeholder: 'Book a demo.',
  },
  {
    key: 'reference',
    question: 'Helpful link or winning ad',
    placeholder: 'Landing page URL, ad link, or notes from a top performer.',
    optional: true,
  },
];

type SavedTemplate = {
  id: string;
  name: string;
  builtIn?: boolean;
  createdAt: number;
  audioAnalysis?: AudioAnalysisData | null;
  elements: ReturnType<typeof useEditorStore.getState>['elements'];
  settings: {
    visualizerColor: string;
    accentColor: string;
    bgColor: string;
    platform: PlatformType;
    platformTheme: 'light' | 'dark';
    brandName: string;
    brandLogo: string | null;
    simulatedCaption: string;
    autoCta: string;
    ctaUrl?: string;
    bgMedia: { url: string; type: string } | null;
    bgShadow: boolean;
    bgShadowOpacity: number;
    introImage: string | null;
    introFileName: string;
    introDuration?: IntroDuration;
    introFeedCropY?: number;
    introImageAspect?: number | null;
    audioUrl: string | null;
    audioFileName: string;
    audioAssetId?: string | null;
  };
};

const BUILT_IN_TEMPLATES: SavedTemplate[] = [];

type AudioLibraryItem = {
  id: string;
  name: string;
  url: string;
  builtIn?: boolean;
  stored?: StoredAudioItem;
};

type AudioFlyoutView = 'choices' | 'make' | 'library';

type AdHistoryItem = SavedTemplate & StoredAdSnapshot;

const getAppRoute = (): { route: AppRoute; shareSlug: string | null } => {
  const match = window.location.pathname.match(/^\/s\/([^/?#]+)/);
  if (match) return { route: 'share', shareSlug: decodeURIComponent(match[1]) };
  if (window.location.pathname === '/create') return { route: 'create', shareSlug: null };
  if (window.location.pathname === '/builder') return { route: 'builder', shareSlug: null };
  return { route: 'home', shareSlug: null };
};

const useIsMobileViewport = () => {
  const getIsMobile = () => typeof window !== 'undefined'
    && window.matchMedia('(max-width: 767px)').matches;
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const widthQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(widthQuery.matches);
    update();
    widthQuery.addEventListener('change', update);
    return () => {
      widthQuery.removeEventListener('change', update);
    };
  }, []);

  return isMobile;
};

function MobileBuilderPlaceholder({ onHome }: { onHome: () => void }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F4EC] px-5 py-8 font-sans text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-between">
        <header className="flex items-center gap-3">
          <img src="/wiggly-logo.svg" alt="Wiggly" className="h-11 w-11 rounded-2xl shadow-sm shadow-slate-950/10" />
          <span>
            <span className="block text-xl font-black leading-none">Wiggly</span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Visual ads that move fast</span>
          </span>
        </header>

        <section className="py-10 text-center">
          <div className="relative mx-auto mb-8 aspect-[9/16] w-[min(68vw,270px)] rounded-[2.2rem] border-[10px] border-white bg-slate-950 shadow-2xl shadow-slate-950/15">
            <div className="absolute inset-0 overflow-hidden rounded-[1.55rem] bg-[#FAF9F4]">
              <div className="h-[13%] bg-slate-950" />
              <div className="flex h-[51%] flex-col items-center justify-center px-5 py-6">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 shadow-lg shadow-slate-950/20">
                  <img src="/wiggly-logo.svg" alt="" className="h-10 w-10 rounded-xl" />
                </div>
                <p className="max-w-[12rem] text-3xl font-black leading-[0.95] tracking-normal text-slate-950">
                  Make ads from voice recordings.
                </p>
                <div className="mt-7 flex items-center justify-center gap-2">
                  <span className="h-3 w-12 rounded-full bg-[#00D6B8]" />
                  <span className="h-3 w-7 rounded-full bg-[#4F46E5]" />
                  <span className="h-3 w-16 rounded-full bg-[#00D6B8]" />
                  <span className="h-3 w-9 rounded-full bg-[#4F46E5]" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 min-h-[30%] bg-slate-950 px-5 py-5 text-left">
                <div className="mb-4 flex gap-4 text-white">
                  <Heart className="h-6 w-6" />
                  <MessageCircle className="h-6 w-6" />
                  <Send className="h-6 w-6" />
                </div>
                <p className="text-[13px] font-black leading-5 text-white">Drop a call recording. Hit space until your ad looks unreal.</p>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-black leading-[0.95] tracking-normal">
            Wiggly works best on a computer.
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base font-semibold leading-7 text-slate-500">
            The builder uses a real canvas, keyboard rerolls, locks, dragging, and video export. Open it on desktop to make the ad.
          </p>
        </section>

        <footer className="space-y-3 pb-2">
          <button
            type="button"
            onClick={onHome}
            className="h-13 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-950/15 transition active:scale-[0.99]"
          >
            See what Wiggly does
          </button>
          <p className="text-center text-xs font-bold leading-5 text-slate-400">
            You are not missing a form. You are missing the fun part.
          </p>
        </footer>
      </div>
    </main>
  );
}

const HomeAdCard = ({
  headline,
  accent = '#4F46E5',
  background = '#10F5B1',
  dark = false,
}: {
  headline: string;
  accent?: string;
  background?: string;
  dark?: boolean;
}) => (
  <div
    className={`relative aspect-[9/16] overflow-hidden rounded-2xl border p-5 shadow-sm ${dark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-950'}`}
    style={{ background }}
  >
    <div className="mx-auto mb-8 h-2 w-10 rounded-full opacity-70" style={{ backgroundColor: accent }} />
    <p className="mx-auto max-w-[190px] text-center text-2xl font-black leading-[0.9] tracking-normal">{headline}</p>
    <div className="absolute inset-x-6 top-[52%] flex h-12 items-center justify-center gap-1">
      {Array.from({ length: 18 }).map((_, index) => (
        <span
          key={index}
          className="w-2 rounded-full"
          style={{
            height: `${18 + ((index * 13) % 48)}px`,
            backgroundColor: index % 5 === 0 ? accent : '#00FFCC',
          }}
        />
      ))}
    </div>
    <div className="absolute bottom-[24%] left-1/2 h-2 w-24 -translate-x-1/2 rounded-full" style={{ backgroundColor: accent }} />
    <div className="absolute bottom-5 left-5 right-5 h-10 rounded-full bg-white/90" />
  </div>
);

const ShareAdPage = ({
  record,
  loading,
  onOpenBuilder,
}: {
  record: SharePageRecord | null;
  loading: boolean;
  onOpenBuilder: () => void;
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const [videoHasSound, setVideoHasSound] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setVideoReady(false);
    setVideoHasSound(false);
    if (!record) {
      setVideoUrl('');
      return;
    }
    if (record.videoUrl) {
      setVideoUrl(record.videoUrl);
      return;
    }
    if (!record.videoBlob || record.videoBlob.size === 0) {
      setVideoUrl('');
      return;
    }
    const nextUrl = URL.createObjectURL(record.videoBlob);
    setVideoUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [record]);

  const playWithSound = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setVideoHasSound(true);
    try {
      await video.play();
    } catch {
      // Browser policies may still block playback; the native click target remains.
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F4EA] px-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm font-black text-slate-700 shadow-xl">Loading Wiggly ad...</div>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F4EA] px-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl">
          <p className="text-2xl font-black text-slate-950">This ad link is not on this device.</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">This first share-page prototype stores videos locally. Cloud links come next.</p>
          <button type="button" onClick={onOpenBuilder} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Open Wiggly
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F4EA] px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(280px,420px)_minmax(320px,1fr)] lg:items-center lg:justify-center">
        <section className="mx-auto w-full max-w-[420px] rounded-[2rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/10">
          <div className="overflow-hidden rounded-[1.45rem] border border-slate-900/10 bg-slate-950">
            <div className="flex h-14 items-center justify-between bg-slate-950 px-4 text-white">
              <div className="flex items-center gap-2.5">
                <img src="/wiggly-logo.png" alt="" className="h-8 w-8 rounded-full bg-black object-contain p-1.5 ring-1 ring-white/20" />
                <div>
                  <p className="text-sm font-black leading-none">{record.businessName || record.brandName || 'Wiggly'}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-none text-white/60">Sponsored</p>
                </div>
              </div>
              <span className="text-xl font-black leading-none text-white/80">...</span>
            </div>

            <div className="relative aspect-[4/5] bg-[#FAFAF7]">
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    autoPlay
                    muted={!videoHasSound}
                    loop
                    playsInline
                    preload="metadata"
                    onLoadedData={() => setVideoReady(true)}
                    className={`h-full w-full bg-[#FAFAF7] object-contain transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {!videoReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAF7] text-sm font-black text-slate-500">Loading video...</div>
                  )}
                  {!videoHasSound && videoReady && (
                    <button
                      type="button"
                      onClick={playWithSound}
                      className="absolute inset-x-5 bottom-5 flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800"
                    >
                      Play with sound
                    </button>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-black text-slate-500">Video unavailable</div>
              )}
            </div>

            <div className="border-t border-white/10 bg-slate-950 px-4 py-3 text-white">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <Heart className="h-5 w-5" />
                  <MessageCircle className="h-5 w-5" />
                  <Send className="h-5 w-5" />
                </span>
                <Bookmark className="h-5 w-5" />
              </div>
              <p className="line-clamp-2 text-xs font-semibold leading-5 text-white/85">{record.subhead || record.headline}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[440px] space-y-5">
          <div
            className="overflow-hidden rounded-[2rem] border border-slate-200 p-6 shadow-xl shadow-slate-950/10"
            style={{ backgroundColor: record.backgroundColor || '#FAFAF7' }}
          >
            <div className="mb-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src="/wiggly-logo.png" alt="" className="h-9 w-9 rounded-xl bg-slate-950 object-contain p-1.5" />
                <div>
                  <p className="text-sm font-black text-slate-950">{record.businessName || record.brandName}</p>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Wiggly Ad Page</p>
                </div>
              </div>
              <span className="h-3 w-16 rounded-full" style={{ backgroundColor: record.accentColor || '#00D6B8' }} />
            </div>
            <h1 className="text-3xl font-black leading-[0.98] tracking-normal text-slate-950 sm:text-4xl">{record.headline}</h1>
            {record.subhead && <p className="mt-5 text-base font-semibold leading-7 text-slate-600">{record.subhead}</p>}
          </div>

          {record.ctaUrl ? (
            <a
              href={record.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-base font-black text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800"
            >
              {record.ctaText || 'Learn More'}
              <ExternalLink className="h-5 w-5" />
            </a>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center text-sm font-black text-slate-500">
              {record.ctaText || 'Learn More'}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenBuilder}
            className="text-sm font-black text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950"
          >
            Made with Wiggly
          </button>
        </section>
      </div>
    </main>
  );
};

const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const shortHex = withHash.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHex) {
    return `#${shortHex[1].split('').map((char) => `${char}${char}`).join('')}`.toUpperCase();
  }
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
};

const HexColorInput = ({
  label,
  value,
  onChange,
}: {
  key?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const normalizedValue = normalizeHexColor(value) || '#000000';
  const commit = (nextDraft: string) => {
    const normalized = normalizeHexColor(nextDraft);
    if (normalized) {
      onChange(normalized);
      setDraft(normalized);
    } else {
      setDraft(value);
    }
  };

  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="flex items-center gap-2">
        <span className="relative h-7 w-7 overflow-hidden rounded border border-slate-200 shadow-inner" style={{ backgroundColor: normalizedValue }}>
          <input
            type="color"
            value={normalizedValue}
            onChange={(event) => {
              onChange(event.target.value.toUpperCase());
              setDraft(event.target.value.toUpperCase());
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} color picker`}
          />
        </span>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          spellCheck={false}
          className="h-8 w-[92px] rounded-md border border-slate-200 bg-white px-2 text-right font-mono text-xs uppercase text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
          aria-label={`${label} hex color`}
          placeholder="#00FFCC"
        />
      </span>
    </label>
  );
};

export default function App() {
  const initialRoute = getAppRoute();
  const [appRoute, setAppRoute] = useState<AppRoute>(initialRoute.route);
  const [shareSlug, setShareSlug] = useState<string | null>(initialRoute.shareSlug);
  const showHomepage = appRoute === 'home';
  const isMobileViewport = useIsMobileViewport();
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [creativeMode, setCreativeMode] = useState<CreativeMode>('visualizer');
  
  // Single Template State
  const [visualizerColor, setVisualizerColor] = useState("#00d6b8");
  const [accentColor, setAccentColor] = useState("#4f46e5");
  const [bgColor, setBgColor] = useState(FIXED_AD_BACKGROUND_COLOR);

  // Platform Frame State
  const [platform, setPlatform] = useState<PlatformType>('instagram-feed');
  const [platformTheme, setPlatformTheme] = useState<'light' | 'dark'>('dark');
  const [brandName, setBrandName] = useState('Wiggly');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [simulatedCaption, setSimulatedCaption] = useState('Check out our new AI receptionist feature! Never miss a lead and keep your customers happy.');
  const [autoCta, setAutoCta] = useState('Learn More');
  const [ctaUrl, setCtaUrl] = useState('https://agentenamel.com');
  
  // Media State
  const [bgMedia, setBgMedia] = useState<{url: string, type: string} | null>(null);
  const [bgShadow, setBgShadow] = useState(true);
  const [bgShadowOpacity, setBgShadowOpacity] = useState(0.38);
  const [introImage, setIntroImage] = useState<string | null>(DEFAULT_INTRO_IMAGE);
  const [introFileName, setIntroFileName] = useState<string>(DEFAULT_INTRO_IMAGE_NAME);
  const [introDuration, setIntroDuration] = useState<IntroDuration>(0);
  const [introFeedCropY, setIntroFeedCropY] = useState(50);
  const [introImageAspect, setIntroImageAspect] = useState<number | null>(1132 / 1389);
  const [introCropOpen, setIntroCropOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(DEFAULT_AUDIO_URL);
  const [audioFileName, setAudioFileName] = useState<string>(DEFAULT_AUDIO_NAME);
  const [currentAudioAssetId, setCurrentAudioAssetId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('5551234567');
  const [phoneRingDuration, setPhoneRingDuration] = useState<RingDuration>(0);

  const refreshBackgroundColor = () => {
    setBgColor((currentColor) => getFreshBackgroundColor(currentColor));
  };

  const applyStyleArchetype = () => {
    setBgColor(FIXED_AD_BACKGROUND_COLOR);
  };
  
  // Playback/Render State
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState<ExportPhase>('recording');
  const [exportDownload, setExportDownload] = useState<ReadyExport | null>(null);
  const [exportLaunchAnimation, setExportLaunchAnimation] = useState(false);
  const [renderDurationCap, setRenderDurationCap] = useState<RenderDurationCap>('full');
  const exportCancelRef = useRef<(() => void) | null>(null);
  const audioPresetSourceRef = useRef<string | null>(null);
  const savedExportHistoryIdRef = useRef<string | null>(null);
  const audioAnalysisCacheRef = useRef<Map<string, AudioAnalysisData>>(new Map());
  const [previewAudioAnalysis, setPreviewAudioAnalysis] = useState<AudioAnalysisData | null>(null);
  const [postizOpen, setPostizOpen] = useState(false);
  const [postizStatus, setPostizStatus] = useState<PostizStatus>('idle');
  const [postizIntegrations, setPostizIntegrations] = useState<PostizIntegration[]>([]);
  const [selectedPostizIntegrationId, setSelectedPostizIntegrationId] = useState('');
  const [postizError, setPostizError] = useState('');
  const [postizAppUrl, setPostizAppUrl] = useState<string | null>(null);
  const [postizAutoOpenAfterExport, setPostizAutoOpenAfterExport] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'saving' | 'ready' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareIsLocalPreview, setShareIsLocalPreview] = useState(false);
  const [spaceRemixCueVisible, setSpaceRemixCueVisible] = useState(() => (
    typeof window !== 'undefined' && localStorage.getItem(SPACE_REMIX_CUE_DISMISSED_KEY) !== '1'
  ));
  const [sharePageRecord, setSharePageRecord] = useState<SharePageRecord | null>(null);
  const [sharePageLoading, setSharePageLoading] = useState(false);

  useEffect(() => {
    if (!exportDownload || exportDownload.renderVersion === CURRENT_RENDER_VERSION) return;
    URL.revokeObjectURL(exportDownload.url);
    setExportDownload(null);
    setExportPhase('recording');
    setShareStatus('idle');
    setShareUrl('');
    setShareError('');
  }, [exportDownload]);

  useEffect(() => {
    const handleTutorialEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.type !== 'space-reroll') return;
      localStorage.setItem(SPACE_REMIX_CUE_DISMISSED_KEY, '1');
      setSpaceRemixCueVisible(false);
    };

    window.addEventListener(WIGGLY_TUTORIAL_EVENT, handleTutorialEvent);
    return () => window.removeEventListener(WIGGLY_TUTORIAL_EVENT, handleTutorialEvent);
  }, []);

  // Batch State
  const [csvData, setCsvData] = useState<any[]>([]);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [historyItems, setHistoryItems] = useState<AdHistoryItem[]>([]);
  const [storedAudioItems, setStoredAudioItems] = useState<StoredAudioItem[]>([]);
  const [templateLibraryTab, setTemplateLibraryTab] = useState<'templates' | 'history'>('templates');
  const [historySaveWarning, setHistorySaveWarning] = useState<string | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateDraftName, setTemplateDraftName] = useState('');
  const [creativeBrief, setCreativeBrief] = useState<CreativeBrief>(EMPTY_CREATIVE_BRIEF);
  const [creativeBriefOpen, setCreativeBriefOpen] = useState(false);
  const [appTitle] = useState('Wiggly');
  const [activePersonaDeckIndex, setActivePersonaDeckIndex] = useState(0);
  const [dialogueScripts, setDialogueScripts] = useState<DialogueScript[]>([]);
  const [conversationWizardOpen, setConversationWizardOpen] = useState(false);
  const [conversationWizardStep, setConversationWizardStep] = useState<ConversationWizardStep>('brief');
  const [selectedDialogueScriptIndex, setSelectedDialogueScriptIndex] = useState(0);
  const [draftDialogueScript, setDraftDialogueScript] = useState<DialogueScript | null>(null);
  const [previewingDialogueKey, setPreviewingDialogueKey] = useState<string | null>(null);
  const [isGeneratingDialogueScripts, setIsGeneratingDialogueScripts] = useState(false);
  const [isGeneratingDialogueAudio, setIsGeneratingDialogueAudio] = useState(false);
  const [generatedDialogueAudioUrl, setGeneratedDialogueAudioUrl] = useState<string | null>(null);
  const [tutorialReplayKey, setTutorialReplayKey] = useState(0);
  const [audioFlyoutOpen, setAudioFlyoutOpen] = useState(false);
  const [audioFlyoutView, setAudioFlyoutView] = useState<AudioFlyoutView>('choices');

  const { showSafeZones, setShowSafeZones, showRedGuides, setShowRedGuides, addElement, setElements, deselectAll, commitHistory, setBusinessContext, elements } = useEditorStore();
  const hasComponent = (role: NonNullable<typeof elements[number]['componentRole']>) => elements.some((element) => element.componentRole === role);
  const headlineCount = elements.filter((element) => element.componentRole === 'headline').length;
  const subheadlineCount = elements.filter((element) => element.componentRole === 'subheadline').length;
  const visualizerCount = elements.filter((element) => element.type === 'visualizer').length;
  const primaryVisualizerElement = elements.find((element) => element.type === 'visualizer');
  const captionCount = elements.filter((element) => element.componentRole === 'captions').length;
  const ctaCount = elements.filter((element) => element.componentRole === 'cta').length;
  const logoCount = elements.filter((element) => element.componentRole === 'logo').length;
  const duplicateOffset = (count: number) => Math.min(count * 12, 48);

  const handleVisualizerColorChange = (color: string) => {
    setVisualizerColor(color);
    setElements((currentElements) => currentElements.map((element) => {
      if (element.type === 'visualizer') {
        return { ...element, barColor: color };
      }
      return element;
    }));
  };

  const handleAccentColorChange = (color: string) => {
    setAccentColor(color);
    setElements((currentElements) => currentElements.map((element) => {
      if (element.componentRole === 'subheadline') {
        return { ...element, color };
      }
      if (element.componentRole === 'captions') {
        return {
          ...element,
          color,
          captionSpeaker1Color: color,
          captionSpeaker2Color: color,
        };
      }
      if (element.componentRole === 'cta') {
        return {
          ...element,
          backgroundColor: color,
        };
      }
      return element;
    }));
  };

  const [isTranscribing, setIsTranscribing] = useState(false);

  const rememberCurrentAudio = (item: Pick<AudioLibraryItem, 'id' | 'builtIn'>) => {
    try {
      localStorage.setItem(CURRENT_AUDIO_STORAGE_KEY, JSON.stringify({
        id: item.id,
        builtIn: Boolean(item.builtIn),
      }));
    } catch {
      // Ignore private browsing storage failures.
    }
  };

  const replayGuidedJourney = () => {
    localStorage.removeItem(WIGGLY_TUTORIAL_SEEN_KEY);
    setTutorialReplayKey((key) => key + 1);
  };

  const downloadCurrentAudio = async () => {
    if (!audioUrl) return;
    const response = await fetch(audioUrl);
    const blob = await response.blob();
    const extension = blob.type.includes('mpeg')
      ? 'mp3'
      : blob.type.includes('wav')
        ? 'wav'
        : blob.type.includes('mp4') || blob.type.includes('m4a')
          ? 'm4a'
          : 'mp3';
    const safeName = (audioFileName || 'wiggly-audio').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'wiggly-audio';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const switchCreativeMode = (nextMode: CreativeMode) => {
    setCreativeMode(nextMode);
    setPlaying(false);
    if (nextMode === 'phone-call' && (!audioUrl || audioUrl === DEFAULT_AUDIO_URL)) {
      setGeneratedDialogueAudioUrl(null);
      setAudioUrl(DEFAULT_PHONE_CALL_AUDIO_URL);
      setAudioFileName(DEFAULT_PHONE_CALL_AUDIO_NAME);
      rememberCurrentAudio({ id: 'built-in-phone-call-recording-audio', builtIn: true });
      setPhoneRingDuration(0);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (saved) setTemplates(JSON.parse(saved));
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  useEffect(() => () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    listAdHistory()
      .then((items) => setHistoryItems(items as AdHistoryItem[]))
      .catch((error) => console.error('Failed to load ad history:', error));
  }, []);

  useEffect(() => {
    listAudioItems()
      .then((items) => {
        setStoredAudioItems(items);
        try {
          const saved = localStorage.getItem(CURRENT_AUDIO_STORAGE_KEY);
          if (!saved) return;
          const parsed = JSON.parse(saved) as { id?: string; builtIn?: boolean };
          if (parsed.id === 'built-in-ai-dental-receptionist-audio') {
            setGeneratedDialogueAudioUrl(null);
            setAudioUrl(DEFAULT_AUDIO_URL);
            setAudioFileName(DEFAULT_AUDIO_NAME);
            setCurrentAudioAssetId(null);
            return;
          }
          if (parsed.id === 'built-in-phone-call-recording-audio') {
            setGeneratedDialogueAudioUrl(null);
            setAudioUrl(DEFAULT_PHONE_CALL_AUDIO_URL);
            setAudioFileName(DEFAULT_PHONE_CALL_AUDIO_NAME);
            setCurrentAudioAssetId(null);
            return;
          }
          const stored = items.find((item) => item.id === parsed.id && item.status !== 'needs-reupload' && item.blob?.size > 0);
          if (!stored) return;
          setGeneratedDialogueAudioUrl(null);
          setAudioUrl(URL.createObjectURL(stored.blob));
          setAudioFileName(stored.name);
          setCurrentAudioAssetId(stored.id);
        } catch (error) {
          console.error('Failed to restore current audio:', error);
        }
      })
      .catch((error) => console.error('Failed to load audio library:', error));
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CREATIVE_BRIEF_STORAGE_KEY);
      if (saved) {
        const parsedBrief = { ...EMPTY_CREATIVE_BRIEF, ...JSON.parse(saved) };
        setCreativeBrief(parsedBrief);
        setBusinessContext(serializeCreativeBrief(parsedBrief));
      }
    } catch (error) {
      console.error('Failed to load creative brief:', error);
    }
  }, []);

  const briefCompletion = CREATIVE_BRIEF_FIELDS.filter(field => !field.optional && creativeBrief[field.key].trim()).length;
  const requiredBriefFields = CREATIVE_BRIEF_FIELDS.filter(field => !field.optional).length;

  const serializeCreativeBrief = (brief: CreativeBrief) => [
    `[Offer] ${brief.offer}`,
    `[Buyer] ${brief.buyer}`,
    `[Pain] ${brief.pain}`,
    `[Failed Alternatives] ${brief.failedAlternatives}`,
    `[Promised Result] ${brief.promisedResult}`,
    `[Differentiator] ${brief.differentiator}`,
    `[Action] ${brief.cta}`,
    brief.reference ? `[Reference] ${brief.reference}` : '',
  ].filter(Boolean).join('\n');

  const updateCreativeBrief = (key: keyof CreativeBrief, value: string) => {
    const nextBrief = { ...creativeBrief, [key]: value };
    setCreativeBrief(nextBrief);
    setBusinessContext(serializeCreativeBrief(nextBrief));
    try {
      localStorage.setItem(CREATIVE_BRIEF_STORAGE_KEY, JSON.stringify(nextBrief));
    } catch (error) {
      console.error('Failed to save creative brief:', error);
    }
  };

  const persistTemplates = (nextTemplates: SavedTemplate[]) => {
    setTemplates(nextTemplates);
    try {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates));
    } catch (error) {
      console.error('Failed to save templates:', error);
      alert('Template could not be saved. Browser storage may be full.');
    }
  };

  const getCurrentDesignTitle = () => {
    const currentElements = useEditorStore.getState().elements;
    const headline = currentElements.find(element => element.componentRole === 'headline' || element.type === 'text');
    const subheadline = currentElements.find(element => element.componentRole === 'subheadline');
    const button = currentElements.find(element => element.type === 'button');
    return (
      stripRichText(headline?.content || '').trim() ||
      stripRichText(subheadline?.content || '').trim() ||
      stripRichText(button?.content || '').trim() ||
      `Template ${templates.length + 1}`
    );
  };

  const createCurrentSnapshot = (nameOverride?: string): SavedTemplate => {
    const name = (nameOverride || templateDraftName || getCurrentDesignTitle()).trim();

    return {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `template-${Date.now()}`,
      name,
      createdAt: Date.now(),
      audioAnalysis: previewAudioAnalysis,
      elements: JSON.parse(JSON.stringify(useEditorStore.getState().elements)),
      settings: {
        visualizerColor,
        accentColor,
        bgColor,
        platform,
        platformTheme,
        brandName,
        brandLogo,
        simulatedCaption,
        autoCta,
        ctaUrl,
        bgMedia,
        bgShadow,
        bgShadowOpacity,
        introImage,
        introFileName,
        introDuration,
        introFeedCropY,
        introImageAspect,
        audioUrl,
        audioFileName,
        audioAssetId: currentAudioAssetId,
      },
    };
  };

  const saveCurrentTemplate = (nameOverride?: string) => {
    const template = createCurrentSnapshot(nameOverride);

    persistTemplates([template, ...templates]);
    setTemplateDraftName('');
    setSaveTemplateOpen(false);
  };

  const hydrateStoredMedia = (template: SavedTemplate | AdHistoryItem): SavedTemplate => {
    const historyTemplate = template as AdHistoryItem;
    const settings = { ...template.settings };

    if (historyTemplate.media?.introImage) settings.introImage = URL.createObjectURL(historyTemplate.media.introImage);
    if (historyTemplate.media?.audio) settings.audioUrl = URL.createObjectURL(historyTemplate.media.audio);
    if (historyTemplate.media?.brandLogo) settings.brandLogo = URL.createObjectURL(historyTemplate.media.brandLogo);
    if (historyTemplate.media?.bgMedia && settings.bgMedia) {
      settings.bgMedia = { ...settings.bgMedia, url: URL.createObjectURL(historyTemplate.media.bgMedia) };
    }

    return { ...template, settings };
  };

  const loadTemplate = (template: SavedTemplate | AdHistoryItem) => {
    const hydratedTemplate = hydrateStoredMedia(template);
    setElements(JSON.parse(JSON.stringify(hydratedTemplate.elements)));
    deselectAll();
    setVisualizerColor(hydratedTemplate.settings.visualizerColor);
    setAccentColor(hydratedTemplate.settings.accentColor);
    setBgColor(hydratedTemplate.settings.bgColor);
    setPlatform(hydratedTemplate.settings.platform);
    setPlatformTheme(hydratedTemplate.settings.platformTheme);
    setBrandName(hydratedTemplate.settings.brandName);
    setBrandLogo(hydratedTemplate.settings.brandLogo);
    setSimulatedCaption(hydratedTemplate.settings.simulatedCaption);
    setAutoCta(hydratedTemplate.settings.autoCta);
    setCtaUrl(hydratedTemplate.settings.ctaUrl || 'https://agentenamel.com');
    setBgMedia(hydratedTemplate.settings.bgMedia);
    setBgShadow(hydratedTemplate.settings.bgShadow);
    setBgShadowOpacity(hydratedTemplate.settings.bgShadowOpacity);
    setIntroImage(hydratedTemplate.settings.introImage);
    setIntroFileName(hydratedTemplate.settings.introFileName);
    setIntroDuration(hydratedTemplate.settings.introDuration ?? 0);
    setIntroFeedCropY(hydratedTemplate.settings.introFeedCropY ?? 50);
    setIntroImageAspect(hydratedTemplate.settings.introImageAspect ?? null);
    setAudioUrl(hydratedTemplate.settings.audioUrl);
    setAudioFileName(hydratedTemplate.settings.audioFileName);
    setCurrentAudioAssetId(hydratedTemplate.settings.audioAssetId ?? null);
    requestAnimationFrame(() => commitHistory());
  };

  const deleteTemplate = (templateId: string) => {
    persistTemplates(templates.filter((template) => template.id !== templateId));
  };

  const captureMediaBlob = async (url: string | null | undefined, label: string, warnings: string[]) => {
    if (!url) return undefined;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      if (blob.size > 25 * 1024 * 1024) {
        warnings.push(`${label} was too large to save locally.`);
        return undefined;
      }
      return blob;
    } catch (error) {
      console.warn(`Could not save ${label} in history:`, error);
      warnings.push(`${label} could not be saved locally.`);
      return undefined;
    }
  };

  const saveDownloadedAdToHistory = async (snapshot: SavedTemplate) => {
    const warnings: string[] = [];
    const media: AdHistoryItem['media'] = {};

    media.introImage = await captureMediaBlob(snapshot.settings.introImage, 'Intro image', warnings);
    media.audio = await captureMediaBlob(snapshot.settings.audioUrl, 'Audio', warnings);
    media.brandLogo = await captureMediaBlob(snapshot.settings.brandLogo, 'Brand logo', warnings);
    media.bgMedia = await captureMediaBlob(snapshot.settings.bgMedia?.url, 'Background media', warnings);

    const historyItem: AdHistoryItem = {
      ...snapshot,
      id: `history-${snapshot.id}`,
      createdAt: Date.now(),
      media,
      mediaWarnings: warnings,
    };

    try {
      const nextItems = await saveAdHistoryItem(historyItem);
      setHistoryItems(nextItems as AdHistoryItem[]);
      setTemplateLibraryTab('history');
      setHistorySaveWarning(warnings.length ? warnings.join(' ') : null);
    } catch (error) {
      console.error('Failed to save ad history:', error);
      setHistorySaveWarning('Downloaded video, but browser history could not save this design.');
    }
  };

  const saveExportToHistoryOnce = (snapshot: SavedTemplate | null) => {
    if (!snapshot) return;
    if (savedExportHistoryIdRef.current === snapshot.id) return;
    savedExportHistoryIdRef.current = snapshot.id;
    void saveDownloadedAdToHistory(snapshot);
  };

  const getMediaDurationSeconds = (url: string | null | undefined, type: 'audio' | 'video') => new Promise<number | null>((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const element = type === 'audio' ? document.createElement('audio') : document.createElement('video');
    element.preload = 'metadata';
    element.src = url;
    element.onloadedmetadata = () => {
      resolve(Number.isFinite(element.duration) ? element.duration : null);
      element.removeAttribute('src');
      element.load();
    };
    element.onerror = () => resolve(null);
  });

  const getAudioSignalStats = async (url: string) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioCtx();
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      let sum = 0;
      let firstFiveSum = 0;
      let firstFiveCount = 0;
      let count = 0;
      let peak = 0;
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
        const data = audioBuffer.getChannelData(channel);
        const step = Math.max(1, Math.floor(data.length / 48000));
        const firstFiveLimit = Math.min(data.length, Math.floor(audioBuffer.sampleRate * 5));
        for (let index = 0; index < data.length; index += step) {
          const sample = data[index] || 0;
          const squared = sample * sample;
          sum += squared;
          count += 1;
          if (index < firstFiveLimit) {
            firstFiveSum += squared;
            firstFiveCount += 1;
          }
          peak = Math.max(peak, Math.abs(sample));
        }
      }
      return {
        duration: audioBuffer.duration,
        rms: Math.sqrt(sum / Math.max(1, count)),
        firstFiveRms: Math.sqrt(firstFiveSum / Math.max(1, firstFiveCount)),
        peak,
      };
    } finally {
      if (audioContext.state !== 'closed') {
        await audioContext.close();
      }
    }
  };

  const getAudioAnalysisSourceKey = (
    url: string | null | undefined,
    assetId?: string | null,
    fileName?: string | null,
  ) => {
    if (!url) return null;
    return assetId || fileName || url;
  };

  const applyAutoVisualizerPreset = (preset: Partial<AdElement>) => {
    setElements((currentElements) => currentElements.map((element) => (
      element.type === 'visualizer' && !element.locked
        ? { ...element, ...preset }
        : element
    )));
  };

  const logAutoVisualizerPreset = (
    sourceKey: string,
    stats: Awaited<ReturnType<typeof getAudioSignalStats>>,
    decision: VoiceVisualizerPresetDecision,
  ) => {
    const rms = stats.rms || 0;
    const firstFiveRms = stats.firstFiveRms || 0;
    const peak = stats.peak || 0;
    const crest = peak / Math.max(0.0001, Math.max(rms, firstFiveRms));
    console.info('[Wiggly visualizer auto-preset]', {
      source: sourceKey,
      preset: decision.presetId,
      reason: decision.reason,
      duration: Number(stats.duration.toFixed(2)),
      rms: Number(rms.toFixed(5)),
      firstFiveRms: Number(firstFiveRms.toFixed(5)),
      peak: Number(peak.toFixed(5)),
      crest: Number(crest.toFixed(2)),
    });
  };

  useEffect(() => {
    if (!audioUrl || creativeMode !== 'visualizer') return;

    const sourceKey = getAudioAnalysisSourceKey(audioUrl, currentAudioAssetId, audioFileName);
    if (!sourceKey || audioPresetSourceRef.current === sourceKey) return;

    let cancelled = false;
    const run = async () => {
      try {
        const stats = await getAudioSignalStats(audioUrl);
        if (cancelled) return;
        const decision = explainVoiceVisualizerPreset(stats);
        audioPresetSourceRef.current = sourceKey;
        logAutoVisualizerPreset(sourceKey, stats, decision);
        applyAutoVisualizerPreset(getVoiceVisualizerPreset(decision.presetId));
      } catch (error) {
        console.warn('Could not auto-tune visualizer for this audio; using balanced voice preset:', error);
        if (!cancelled) applyAutoVisualizerPreset(getVoiceVisualizerPreset('balanced-voice'));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [audioUrl, audioFileName, currentAudioAssetId, creativeMode]);

  const getCachedAudioAnalysis = async (
    url: string | null | undefined,
    durationSeconds: number,
    smoothing: number,
    attack?: number,
    release?: number,
    existing?: AudioAnalysisData | null,
    sourceIdentity?: { assetId?: string | null; fileName?: string | null },
  ) => {
    const sourceKey = getAudioAnalysisSourceKey(url, sourceIdentity?.assetId, sourceIdentity?.fileName);
    if (!url || !sourceKey) return null;

    const roundedDuration = Number(durationSeconds.toFixed(3));
    const roundedSmoothing = Number(smoothing.toFixed(3));
    const roundedAttack = typeof attack === 'number' ? Number(attack.toFixed(3)) : 'auto';
    const roundedRelease = typeof release === 'number' ? Number(release.toFixed(3)) : 'auto';
    const cacheKey = `${sourceKey}|${roundedDuration}|${roundedSmoothing}|${roundedAttack}|${roundedRelease}`;
    const cached = audioAnalysisCacheRef.current.get(cacheKey);
    if (cached) return cached;

    if (
      existing &&
      existing.sourceKey === sourceKey &&
      existing.durationSeconds >= roundedDuration - 0.01 &&
      existing.fps === 60 &&
      Math.abs(existing.smoothing - roundedSmoothing) < 0.001
    ) {
      audioAnalysisCacheRef.current.set(cacheKey, existing);
      return existing;
    }

    const analysis = await precomputeAudioAnalysisFromUrl(url, {
      durationSeconds: roundedDuration,
      smoothing: roundedSmoothing,
      attack,
      release,
      sourceKey,
    });
    audioAnalysisCacheRef.current.set(cacheKey, analysis);
    return analysis;
  };

  useEffect(() => {
    if (!audioUrl || creativeMode !== 'visualizer') {
      setPreviewAudioAnalysis(null);
      return;
    }

    let cancelled = false;
    const smoothing = primaryVisualizerElement?.visualizerSmoothing ?? 0.8;
    const attack = primaryVisualizerElement?.visualizerAttack;
    const release = primaryVisualizerElement?.visualizerRelease;

    const run = async () => {
      try {
        const audioDuration = await getMediaDurationSeconds(audioUrl, 'audio');
        const cappedDuration = renderDurationCap === 'full'
          ? Math.min(Math.max(1, audioDuration || 60), 180)
          : Math.min(Math.max(1, audioDuration || renderDurationCap), renderDurationCap);
        const analysis = await getCachedAudioAnalysis(
          audioUrl,
          cappedDuration,
          smoothing,
          attack,
          release,
          previewAudioAnalysis,
          {
            assetId: currentAudioAssetId,
            fileName: audioFileName,
          },
        );
        if (!cancelled) setPreviewAudioAnalysis(analysis);
      } catch (error) {
        console.warn('Could not precompute preview audio analysis; preview will use live analyser fallback:', error);
        if (!cancelled) setPreviewAudioAnalysis(null);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [audioUrl, audioFileName, currentAudioAssetId, creativeMode, primaryVisualizerElement?.visualizerSmoothing, primaryVisualizerElement?.visualizerAttack, primaryVisualizerElement?.visualizerRelease, renderDurationCap]);

  const appendMediaForRemotion = async (
    formData: FormData,
    field: string,
    url: string | null | undefined,
    applyUrl: (nextUrl: string) => void,
    options?: { forceUpload?: boolean; removeWhite?: boolean },
  ) => {
    if (!url) return;

    if (!options?.forceUpload && !url.startsWith('blob:') && !url.startsWith('data:')) {
      applyUrl(new URL(url, window.location.origin).href);
      return;
    }

    const response = await fetch(url);
    let blob = await response.blob();
    if (options?.removeWhite && blob.type.startsWith('image/')) {
      blob = await removeWhiteFromImageBlob(blob);
    }
    const extension = blob.type.includes('png') ? 'png'
      : blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg'
      : blob.type.includes('mp4') ? 'mp4'
      : blob.type.includes('mpeg') ? 'mp3'
      : 'bin';
    formData.append(field, blob, `${field.replace(/[^a-zA-Z0-9_-]/g, '-')}.${extension}`);
    applyUrl('');
  };

  const removeWhiteFromImageBlob = async (blob: Blob) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const objectUrl = URL.createObjectURL(blob);
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Failed to load image for transparency processing.'));
        image.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return blob;

      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] > 240 && data[index + 1] > 240 && data[index + 2] > 240) {
          data[index + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      return await new Promise<Blob>((resolve) => {
        canvas.toBlob(processed => resolve(processed || blob), 'image/png');
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const createRemotionSnapshot = async (snapshot: SavedTemplate): Promise<FormData> => {
    const audioDuration = await getMediaDurationSeconds(snapshot.settings.audioUrl, 'audio');
    const bgVideoDuration = snapshot.settings.bgMedia?.type === 'video'
      ? await getMediaDurationSeconds(snapshot.settings.bgMedia.url, 'video')
      : null;
    const uncappedDuration = Math.max(3, audioDuration || 0, bgVideoDuration || 0);
    const durationSeconds = renderDurationCap === 'full' ? uncappedDuration : Math.min(uncappedDuration, renderDurationCap);

    const visualizerElement = snapshot.elements.find(element => element.type === 'visualizer');
    const audioAnalysis = await getCachedAudioAnalysis(
      snapshot.settings.audioUrl,
      durationSeconds,
      visualizerElement?.visualizerSmoothing ?? 0.8,
      visualizerElement?.visualizerAttack,
      visualizerElement?.visualizerRelease,
      snapshot.audioAnalysis,
      {
        assetId: snapshot.settings.audioAssetId,
        fileName: snapshot.settings.audioFileName,
      },
    ).catch((error) => {
      console.warn('Could not precompute audio analysis for export; server will try fallback analysis:', error);
      return null;
    });
    if (audioAnalysis) {
      snapshot.audioAnalysis = audioAnalysis;
    }

    const remotionSnapshot: ExportSnapshot = {
      id: snapshot.id,
      name: snapshot.name,
      durationSeconds,
      audioAnalysis,
      elements: JSON.parse(JSON.stringify(snapshot.elements)),
      captions: JSON.parse(JSON.stringify(useEditorStore.getState().captions)),
      settings: {
        visualizerColor: snapshot.settings.visualizerColor,
        accentColor: snapshot.settings.accentColor,
        bgColor: snapshot.settings.bgColor,
        platform: snapshot.settings.platform,
        bgMedia: snapshot.settings.bgMedia ? { ...snapshot.settings.bgMedia } : null,
        bgShadow: snapshot.settings.bgShadow,
        bgShadowOpacity: snapshot.settings.bgShadowOpacity,
        introImage: snapshot.settings.introImage,
        introDuration: snapshot.settings.introDuration ?? 0,
        introFeedCropY: snapshot.settings.introFeedCropY ?? 50,
        audioUrl: snapshot.settings.audioUrl,
        renderDurationCap,
      },
    };

    const formData = new FormData();
    await appendMediaForRemotion(formData, 'audio', remotionSnapshot.settings.audioUrl, url => { remotionSnapshot.settings.audioUrl = url; });
    await appendMediaForRemotion(
      formData,
      'introImage',
      remotionSnapshot.settings.introImage,
      url => { remotionSnapshot.settings.introImage = url; },
      { forceUpload: Boolean(remotionSnapshot.settings.introImage) },
    );
    if (remotionSnapshot.settings.bgMedia) {
      await appendMediaForRemotion(formData, 'bgMedia', remotionSnapshot.settings.bgMedia.url, url => {
        if (remotionSnapshot.settings.bgMedia) remotionSnapshot.settings.bgMedia.url = url;
      });
    }
    for (const element of remotionSnapshot.elements) {
      if (element.type === 'image' && element.imageUrl) {
        await appendMediaForRemotion(
          formData,
          `elementImage:${element.id}`,
          element.imageUrl,
          url => { element.imageUrl = url; },
          { forceUpload: Boolean(element.removeWhite), removeWhite: Boolean(element.removeWhite) },
        );
      }
    }

    formData.append('snapshot', JSON.stringify(remotionSnapshot));
    return formData;
  };

  const createPhoneCallRemotionSnapshot = async (): Promise<FormData> => {
    if (!audioUrl) {
      throw new Error('Upload voicemail audio before exporting the phone call.');
    }

    let audioStats: Awaited<ReturnType<typeof getAudioSignalStats>>;
    try {
      audioStats = await getAudioSignalStats(audioUrl);
    } catch {
      throw new Error('This audio file did not work. Try another MP3, WAV, M4A, or video file.');
    }

    if (!Number.isFinite(audioStats.duration) || audioStats.duration < 0.5) {
      throw new Error('This audio is too short to use as voicemail proof.');
    }

    if (audioStats.rms < 0.0008) {
      throw new Error('This audio looks silent. Try another voicemail recording.');
    }

    const phoneSnapshot: PhoneCallSnapshot = {
      kind: 'phone-call',
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `phone-call-${Date.now()}`,
      name: `Phone call ${formatUsPhoneNumber(phoneNumber) || 'preview'}`,
      durationSeconds: Math.min(180, phoneRingDuration + audioStats.duration),
      settings: {
        phoneNumber,
        audioUrl,
        ringAudioUrl: null,
        ringDurationSeconds: phoneRingDuration,
        backgroundColor: '#f8fafc',
      },
    };

    const formData = new FormData();
    await appendMediaForRemotion(formData, 'audio', phoneSnapshot.settings.audioUrl, url => { phoneSnapshot.settings.audioUrl = url; });
    formData.append('snapshot', JSON.stringify(phoneSnapshot));
    return formData;
  };

  const MIN_VALID_MP4_BYTES = 1024;

  const isValidMp4Blob = async (blob: Blob) => {
    if (blob.size < MIN_VALID_MP4_BYTES) return false;

    const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const signature = String.fromCharCode(...header.slice(4, 8));
    return signature === 'ftyp';
  };

  const ensureValidMp4Blob = async (blob: Blob, label: string) => {
    if (await isValidMp4Blob(blob)) return;
    throw new Error(`${label} returned an invalid MP4 (${blob.size} bytes).`);
  };

  const getValidMp4Bytes = async (blob: Blob, label: string) => {
    await ensureValidMp4Blob(blob, label);
    return new Uint8Array(await blob.arrayBuffer());
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const tryRemotionExport = async (exportSnapshot: SavedTemplate, abortController: AbortController) => {
    setExportPhase('converting');
    setRenderProgress(10);
    const formData = await createRemotionSnapshot(exportSnapshot);
    setRenderProgress(25);

    const response = await fetch('/api/render-remotion', {
      method: 'POST',
      body: formData,
      signal: abortController.signal,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Remotion export failed');
    }

    setRenderProgress(92);
    const mp4Blob = await response.blob();
    await ensureValidMp4Blob(mp4Blob, 'Remotion export');

    const url = URL.createObjectURL(mp4Blob);
    const filename = `agent-enamel-${Date.now()}.mp4`;
    setExportDownload({ url, blob: mp4Blob, filename, snapshot: exportSnapshot, renderVersion: CURRENT_RENDER_VERSION });
    setExportPhase('complete');
    setRenderProgress(100);
  };

  const tryPhoneCallRemotionExport = async (abortController: AbortController) => {
    setExportPhase('converting');
    setRenderProgress(10);
    const formData = await createPhoneCallRemotionSnapshot();
    setRenderProgress(25);

    const response = await fetch('/api/render-remotion', {
      method: 'POST',
      body: formData,
      signal: abortController.signal,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Phone call export failed');
    }

    setRenderProgress(92);
    const mp4Blob = await response.blob();
    await ensureValidMp4Blob(mp4Blob, 'Phone call export');

    const url = URL.createObjectURL(mp4Blob);
    const filename = `wiggly-phone-call-${Date.now()}.mp4`;
    setExportDownload({ url, blob: mp4Blob, filename, snapshot: null, renderVersion: CURRENT_RENDER_VERSION });
    setExportPhase('complete');
    setRenderProgress(100);
  };

  const downloadPhoneCallVideo = async () => {
    setExportLaunchAnimation(true);
    window.setTimeout(() => setExportLaunchAnimation(false), 650);
    setRendering(true);
    setRenderProgress(0);
    setExportPhase('recording');
    savedExportHistoryIdRef.current = null;
    setShareStatus('idle');
    setShareUrl('');
    setShareError('');
    setExportDownload((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });

    const remotionAbortController = new AbortController();
    exportCancelRef.current = () => {
      remotionAbortController.abort();
      setRendering(false);
      setRenderProgress(0);
      setExportPhase('recording');
      exportCancelRef.current = null;
    };

    try {
      await tryPhoneCallRemotionExport(remotionAbortController);
      setRendering(false);
      exportCancelRef.current = null;
    } catch (error: any) {
      if (remotionAbortController.signal.aborted) return;
      console.error('Phone call export failed:', error);
      setExportPhase('error');
      setRendering(false);
      exportCancelRef.current = null;
      alert(error?.message || 'Phone call export failed. Please try again.');
    }
  };

  const downloadReadyExport = async () => {
    if (!exportDownload) return;

    let mp4Bytes: Uint8Array;
    try {
      mp4Bytes = await getValidMp4Bytes(exportDownload.blob, 'Ready export');
    } catch (error) {
      console.error('Blocked invalid MP4 download:', error);
      setExportPhase('error');
      alert('This video file had a problem. Please make the video again.');
      return;
    }

    const showSaveFilePicker = (window as any).showSaveFilePicker;

    if (typeof showSaveFilePicker === 'function') {
      try {
        const fileHandle = await showSaveFilePicker({
          suggestedName: exportDownload.filename,
          types: [
            {
              description: 'Video file',
              accept: { 'video/mp4': ['.mp4'] },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(mp4Bytes);
        await writable.close();
        saveExportToHistoryOnce(exportDownload.snapshot);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.warn('Native MP4 save failed, falling back to browser download:', error);
      }
    }

    try {
      const downloadUrl = URL.createObjectURL(new Blob([mp4Bytes], { type: 'video/mp4' }));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = exportDownload.filename;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
    } catch (error) {
      console.warn('Browser MP4 download failed:', error);
      window.open(exportDownload.url, '_blank', 'noopener,noreferrer');
    }

    saveExportToHistoryOnce(exportDownload.snapshot);
  };

  const openReadyExport = async () => {
    if (!exportDownload) return;
    try {
      await ensureValidMp4Blob(exportDownload.blob, 'Ready export');
    } catch (error) {
      console.error('Blocked invalid MP4 open:', error);
      setExportPhase('error');
      alert('This video file had a problem. Please make the video again.');
      return;
    }
    window.open(exportDownload.url, '_blank', 'noopener,noreferrer');
    saveExportToHistoryOnce(exportDownload.snapshot);
  };

  const getShareMetadataFromSnapshot = (snapshot: SavedTemplate | null) => {
    const snapshotElements = snapshot?.elements || useEditorStore.getState().elements;
    const headlineElement = snapshotElements.find(element => element.componentRole === 'headline' || element.type === 'text');
    const subheadElement = snapshotElements.find(element => element.componentRole === 'subheadline');
    const ctaElement = snapshotElements.find(element => element.componentRole === 'cta' || element.type === 'button');
    const headline = stripRichText(headlineElement?.content || snapshot?.name || getCurrentDesignTitle()).trim() || 'Wiggly ad';
    const subhead = stripRichText(subheadElement?.content || snapshot?.settings.simulatedCaption || simulatedCaption).trim();
    const normalizedCtaUrl = normalizeShareUrl(snapshot?.settings.ctaUrl || ctaUrl);

    return {
      headline,
      subhead,
      ctaText: stripRichText(ctaElement?.content || snapshot?.settings.autoCta || autoCta).trim() || 'Learn More',
      ctaUrl: normalizedCtaUrl,
      businessName: snapshot?.settings.brandName || brandName || 'Wiggly',
      brandName: snapshot?.settings.brandName || brandName || 'Wiggly',
      accentColor: snapshot?.settings.accentColor || accentColor,
      backgroundColor: snapshot?.settings.bgColor || bgColor,
    };
  };

  const createShareLink = async () => {
    if (!exportDownload) return;
    if (exportDownload.renderVersion !== CURRENT_RENDER_VERSION) {
      setShareStatus('error');
      setShareError('This video was made with an older renderer. Make the video again, then create the share link.');
      return;
    }
    setShareStatus('saving');
    setShareError('');
    setShareIsLocalPreview(false);
    try {
      await ensureValidMp4Blob(exportDownload.blob, 'Ready export');
      const metadata = getShareMetadataFromSnapshot(exportDownload.snapshot);
      const record = await saveHostedSharePage({
        slug: createShareSlug(metadata.headline),
        videoBlob: exportDownload.blob,
        videoMimeType: exportDownload.blob.type || 'video/mp4',
        ...metadata,
      });
      const nextUrl = `${window.location.origin}/s/${record.slug}`;
      setShareUrl(nextUrl);
      setShareIsLocalPreview(!record.videoUrl);
      setShareStatus('ready');
      saveExportToHistoryOnce(exportDownload.snapshot);
      try {
        await navigator.clipboard?.writeText(nextUrl);
      } catch {
        // Clipboard is a convenience; the link still shows in the UI.
      }
    } catch (error: any) {
      setShareStatus('error');
      setShareError(error.message || 'Could not create share link.');
    }
  };

  const getPostizDraftContent = () => (
    exportDownload?.snapshot?.settings.simulatedCaption?.trim() ||
    simulatedCaption.trim() ||
    'Created with Wiggly.'
  );

  const getSelectedPostizChannelLabel = () => {
    const selectedIntegration = postizIntegrations.find((integration) => integration.id === selectedPostizIntegrationId);
    if (!selectedIntegration) return 'Postiz';
    return POSTIZ_CHANNEL_LABELS[selectedIntegration.identifier] || selectedIntegration.name || selectedIntegration.identifier;
  };

  const loadPostizIntegrations = async () => {
    setPostizStatus('loading');
    setPostizError('');
    setPostizAppUrl(null);
    try {
      const response = await fetch('/api/postiz/integrations', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not load Postiz channels.');
      const integrations = (Array.isArray(payload.integrations) ? payload.integrations : []).filter((integration: PostizIntegration) => !integration.disabled);
      setPostizIntegrations(integrations);
      setSelectedPostizIntegrationId((current) => current || integrations[0]?.id || '');
      setPostizStatus('idle');
    } catch (error: any) {
      setPostizStatus('error');
      setPostizError(error.message || 'Could not load Postiz channels.');
    }
  };

  const openPostizHandoff = async () => {
    if (!exportDownload) return;
    setPostizOpen(true);
    if (postizIntegrations.length === 0) {
      await loadPostizIntegrations();
    }
  };

  const handlePostToSocials = () => {
    if (exportDownload) {
      void openPostizHandoff();
      return;
    }

    setPostizAutoOpenAfterExport(true);
    void downloadSimulatedVideo();
  };

  useEffect(() => {
    if (!postizAutoOpenAfterExport || !exportDownload || rendering) return;
    setPostizAutoOpenAfterExport(false);
    void openPostizHandoff();
  }, [postizAutoOpenAfterExport, exportDownload, rendering]);

  const sendExportToPostiz = async () => {
    if (!exportDownload || !selectedPostizIntegrationId) return;
    const selectedIntegration = postizIntegrations.find((integration) => integration.id === selectedPostizIntegrationId);
    if (!selectedIntegration) return;

    try {
      const mp4Bytes = await getValidMp4Bytes(exportDownload.blob, 'Ready export');
      setPostizStatus('uploading');
      setPostizError('');

      const formData = new FormData();
      formData.append('file', new Blob([mp4Bytes], { type: 'video/mp4' }), exportDownload.filename);
      const uploadResponse = await fetch('/api/postiz/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadPayload = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(uploadPayload.error || 'Could not upload MP4 to Postiz.');

      setPostizStatus('drafting');
      const draftResponse = await fetch('/api/postiz/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: selectedIntegration.id,
          integrationIdentifier: selectedIntegration.identifier,
          content: getPostizDraftContent(),
          media: uploadPayload.upload,
          title: exportDownload.filename.replace(/\.mp4$/i, ''),
          platform: exportDownload.snapshot?.settings.platform || platform,
        }),
      });
      const draftPayload = await draftResponse.json().catch(() => ({}));
      if (!draftResponse.ok) throw new Error(draftPayload.error || 'Could not create Postiz draft.');

      setPostizAppUrl(draftPayload.appUrl || null);
      setPostizStatus('done');
      saveExportToHistoryOnce(exportDownload.snapshot);
    } catch (error: any) {
      setPostizStatus('error');
      setPostizError(error.message || 'Could not send this ad to Postiz.');
    }
  };

  const deleteHistoryItem = async (historyId: string) => {
    const nextItems = await deleteAdHistoryItem(historyId);
    setHistoryItems(nextItems as AdHistoryItem[]);
  };

  const rememberAudioBlob = async (name: string, blob: Blob, source: StoredAudioItem['source'] = 'user-upload') => {
    try {
      const item: StoredAudioItem = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `audio-${Date.now()}`,
        name,
        createdAt: Date.now(),
        blob,
        mimeType: blob.type || 'audio/mpeg',
        kind: source === 'voice-wizard' ? 'generated' : 'uploaded',
        source,
        status: 'ready',
      };
      const nextItems = await saveAudioItem(item);
      setStoredAudioItems(nextItems);
      const savedItem = nextItems[0] || null;
      setCurrentAudioAssetId(savedItem?.id ?? null);
      if (savedItem) {
        rememberCurrentAudio({ id: savedItem.id, builtIn: false });
      }
      return savedItem;
    } catch (error) {
      console.error('Failed to save audio item:', error);
      return null;
    }
  };

  const useAudioItem = (item: AudioLibraryItem) => {
    setGeneratedDialogueAudioUrl(null);
    const nextUrl = item.stored ? URL.createObjectURL(item.stored.blob) : item.url;
    useEditorStore.getState().setCaptions([]);
    setAudioUrl(nextUrl);
    setAudioFileName(item.name);
    setCurrentAudioAssetId(item.stored?.id ?? null);
    rememberCurrentAudio(item);
    setAudioFlyoutOpen(false);
    setAudioFlyoutView('choices');
  };

  const deleteStoredAudio = async (audioId: string) => {
    const nextItems = await deleteAudioItem(audioId);
    setStoredAudioItems(nextItems);
    if (currentAudioAssetId === audioId) {
      setGeneratedDialogueAudioUrl(null);
      setAudioUrl(DEFAULT_AUDIO_URL);
      setAudioFileName(DEFAULT_AUDIO_NAME);
      setCurrentAudioAssetId(null);
      rememberCurrentAudio({ id: 'built-in-ai-dental-receptionist-audio', builtIn: true });
    }
  };

  useEffect(() => {
    if (!rendering) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [rendering]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgMedia({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      });
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setGeneratedDialogueAudioUrl(null);
      useEditorStore.getState().setCaptions([]);
      setAudioUrl(url);
      setAudioFileName(file.name);
      await rememberAudioBlob(file.name, file, 'user-upload');
    }
  };

  const handleIntroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setIntroImage(objectUrl);
    setIntroFileName(file.name);
    setIntroFeedCropY(50);
    const img = new Image();
    img.onload = () => setIntroImageAspect(img.naturalWidth / img.naturalHeight);
    img.src = objectUrl;
    setIntroCropOpen(true);
  };

  const captionsFromDialogueScript = (script: DialogueScript, totalDuration?: number) => {
    let cursor = 0;
    const gap = 0.18;
    const speakers = Array.from(new Set(script.lines.map((line) => line.speaker).filter(Boolean))).slice(0, 2);
    const wordCounts = script.lines.map((line) => Math.max(1, line.text.trim().split(/\s+/).filter(Boolean).length));
    const totalWords = wordCounts.reduce((sum, count) => sum + count, 0) || 1;
    const usableDuration = totalDuration && totalDuration > 0
      ? Math.max(script.lines.length * 1.25, totalDuration - gap * Math.max(0, script.lines.length - 1))
      : 0;

    return script.lines.map((line, index) => {
      const duration = usableDuration
        ? Math.max(1.25, usableDuration * (wordCounts[index] / totalWords))
        : Math.max(1.4, Math.min(4.5, wordCounts[index] * 0.38));
      const caption = {
        text: line.text,
        start: cursor,
        end: cursor + duration,
        speaker: speakers.indexOf(line.speaker) === 1 ? 2 : 1,
      };
      cursor += duration + gap;
      return caption;
    });
  };

  const getObjectAudioDuration = (url: string) => new Promise<number>((resolve) => {
    const audio = new Audio(url);
    const timeout = window.setTimeout(() => resolve(0), 1500);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onerror = () => {
      window.clearTimeout(timeout);
      resolve(0);
    };
    audio.src = url;
  });

  const stopDialoguePreview = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPreviewingDialogueKey(null);
  };

  const playDialoguePreview = (script: DialogueScript, key: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Voice preview is not available in this browser.');
      return;
    }

    if (previewingDialogueKey === key) {
      stopDialoguePreview();
      return;
    }

    const lines = script.lines.filter((line) => line.text.trim());
    if (!lines.length) return;

    window.speechSynthesis.cancel();
    setPreviewingDialogueKey(key);

    const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('en'));
    const speakers = Array.from(new Set(lines.map((line) => line.speaker).filter(Boolean))).slice(0, 2);
    let remainingLines = lines.length;

    lines.forEach((line) => {
      const utterance = new SpeechSynthesisUtterance(line.text.trim());
      const speakerIndex = speakers.indexOf(line.speaker);
      utterance.rate = 1.02;
      utterance.pitch = speakerIndex === 1 ? 0.92 : 1.08;
      utterance.voice = voices[speakerIndex === 1 ? 1 : 0] || voices[0] || null;
      utterance.onend = () => {
        remainingLines -= 1;
        if (remainingLines <= 0) setPreviewingDialogueKey(null);
      };
      utterance.onerror = () => {
        remainingLines -= 1;
        if (remainingLines <= 0) setPreviewingDialogueKey(null);
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  const handleOpenConversationWizard = () => {
    const firstScript = dialogueScripts[selectedDialogueScriptIndex] || dialogueScripts[0];
    if (firstScript && !draftDialogueScript) {
      setDraftDialogueScript(cloneDialogueScript(firstScript));
      setSelectedDialogueScriptIndex(Math.max(0, dialogueScripts.indexOf(firstScript)));
    }
    setConversationWizardStep(dialogueScripts.length > 0 ? 'scripts' : 'brief');
    setConversationWizardOpen(true);
  };

  const handleSelectDialogueScript = (script: DialogueScript, index: number) => {
    setSelectedDialogueScriptIndex(index);
    setDraftDialogueScript(cloneDialogueScript(script));
    setConversationWizardStep('edit');
  };

  const updateDraftDialogueLine = (index: number, patch: Partial<DialogueLine>) => {
    setDraftDialogueScript((current) => {
      if (!current) return current;
      return {
        ...current,
        lines: current.lines.map((line, lineIndex) => (
          lineIndex === index ? { ...line, ...patch } : line
        )),
      };
    });
  };

  const addDraftDialogueLine = () => {
    setDraftDialogueScript((current) => {
      if (!current) return current;
      const lastSpeaker = current.lines[current.lines.length - 1]?.speaker;
      const nextSpeaker = lastSpeaker === 'Ava' ? 'Sam' : 'Ava';
      return {
        ...current,
        lines: [
          ...current.lines,
          {
            speaker: nextSpeaker,
            tone: 'natural',
            text: '',
          },
        ],
      };
    });
  };

  const removeDraftDialogueLine = (index: number) => {
    setDraftDialogueScript((current) => {
      if (!current || current.lines.length <= 2) return current;
      return {
        ...current,
        lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
      };
    });
  };

  const handleGenerateDialogueScripts = async (openEditorAfterGenerate = false) => {
    try {
      setIsGeneratingDialogueScripts(true);
      const res = await fetch('/api/generate-dialogue-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeBrief,
          persona: activePersonaDeck?.customer || 'Dental practice owner',
          count: 5,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      const data = await res.json();
      const scripts = Array.isArray(data.scripts) ? data.scripts : [];
      setDialogueScripts(scripts);
      if (scripts[0]) {
        setSelectedDialogueScriptIndex(0);
        setDraftDialogueScript(cloneDialogueScript(scripts[0]));
        setConversationWizardStep(openEditorAfterGenerate ? 'edit' : 'scripts');
      }
      return scripts;
    } catch (error: any) {
      console.error('Dialogue script generation failed:', error);
      alert(`Dialogue generation failed: ${error.message || 'Unknown error'}`.slice(0, 180));
      return [];
    } finally {
      setIsGeneratingDialogueScripts(false);
    }
  };

  const handleGenerateDialogueAudio = async (script: DialogueScript) => {
    try {
      stopDialoguePreview();
      const voiceoverScript = cleanDialogueScriptForVoiceover(script);
      setIsGeneratingDialogueAudio(true);
      const res = await fetch('/api/generate-dialogue-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: voiceoverScript }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      const data = await res.json();
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audioDuration = await getObjectAudioDuration(url);
      const captions = captionsFromDialogueScript(voiceoverScript, audioDuration);
      useEditorStore.getState().setCaptions(captions);
      setGeneratedDialogueAudioUrl(url);
      setAudioUrl(url);
      const filename = data.filename || `${voiceoverScript.title || 'conversation-ad'}.wav`;
      setAudioFileName(filename);
      await rememberAudioBlob(filename, blob, 'voice-wizard');
      if (captionCount === 0) handleAddCaptions();
      if (visualizerCount === 0) handleAddVisualizer();
      setConversationWizardOpen(false);
    } catch (error: any) {
      console.error('Dialogue audio generation failed:', error);
      alert(`Audio generation failed: ${error.message || 'Unknown error'}`.slice(0, 180));
    } finally {
      setIsGeneratingDialogueAudio(false);
    }
  };

  useEffect(() => {
    // Intentionally skipped auto generation via `/api/generate-copy` 
    // Users can generate Ad Copy using the API key panel
  }, []);

  useEffect(() => {
    if (creativeMode === 'phone-call') {
      return;
    }

    if (!audioUrl) {
      useEditorStore.getState().setCaptions([]);
      return;
    }

    if (audioUrl === generatedDialogueAudioUrl) {
      return;
    }

    const cacheKey = `transcription_${audioUrl}`;
    const cachedCaptions = localStorage.getItem(cacheKey);
    if (cachedCaptions) {
      try {
        useEditorStore.getState().setCaptions(JSON.parse(cachedCaptions));
        return;
      } catch(e) {}
    }

    const backoffUntil = Number(localStorage.getItem(TRANSCRIPTION_BACKOFF_KEY) || 0);
    if (backoffUntil && Date.now() < backoffUntil) {
      console.warn('AI temporarily at capacity, try again in 1 min.');
      return;
    }

    const errorBackoffUntil = Number(localStorage.getItem(TRANSCRIPTION_ERROR_BACKOFF_KEY) || 0);
    if (errorBackoffUntil && Date.now() < errorBackoffUntil) {
      console.warn('Skipping transcription during temporary error backoff.');
      return;
    }

    const transcribeUrl = async () => {
      try {
        setIsTranscribing(true);
        const audioRes = await fetch(audioUrl);
        const audioBlob = await audioRes.blob();
        if (audioBlob.size < 100) return;
        
        const file = new File([audioBlob], 'audio.mp3', { type: audioBlob.type || 'audio/mpeg' });
        const formData = new FormData();
        formData.append('audio', file);
        
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Transcription API error:', res.status, errorText);
          if (res.status === 429) {
            localStorage.setItem(TRANSCRIPTION_BACKOFF_KEY, String(Date.now() + 60 * 1000));
            return;
          }
          localStorage.setItem(TRANSCRIPTION_ERROR_BACKOFF_KEY, String(Date.now() + 60 * 1000));
          return;
        }

        const data = await res.json();
        const { setCaptions } = useEditorStore.getState();
        let newCaptions: any[] = [];
        
        if (data.results && data.results.utterances) {
          data.results.utterances.forEach((u: any) => {
            if (u.words && u.words.length > 0) {
              let currentStart = u.words[0].start;
              let text = '';
              for (let i = 0; i < u.words.length; i++) {
                const w = u.words[i];
                text += (w.punctuated_word || w.word) + ' ';
                // Check if this word ends in punctuation and thus finishes a sentence
                if ((w.punctuated_word || w.word).match(/[.!?]$/)) {
                  newCaptions.push({
                    text: text.trim(),
                    start: currentStart,
                    end: w.end,
                    speaker: (u.speaker || 0) + 1
                  });
                  text = '';
                  // Update start to next word if there is one
                  if (i + 1 < u.words.length) {
                    currentStart = u.words[i + 1].start;
                  }
                }
              }
              if (text.trim().length > 0) {
                newCaptions.push({
                  text: text.trim(),
                  start: currentStart,
                  end: u.words[u.words.length - 1].end,
                  speaker: (u.speaker || 0) + 1
                });
              }
            } else {
              newCaptions.push({
                text: u.transcript || u.text || '',
                start: Number(u.start) || 0,
                end: Number(u.end) || 0,
                speaker: (Number(u.speaker) || 0) + 1
              });
            }
          });
        } else if (data.results?.channels?.[0]?.alternatives?.[0]?.words) {
          const words = data.results.channels[0].alternatives[0].words;
          if (words.length > 0) {
            let currentStart = words[0].start;
            let text = '';
            for(let i = 0; i < words.length; i++) {
              const w = words[i];
              text += (w.punctuated_word || w.word) + ' ';
              if ((w.punctuated_word || w.word)?.match(/[.!?]$/)) {
                newCaptions.push({ text: text.trim(), start: currentStart, end: w.end, speaker: 1 });
                text = '';
                if (i + 1 < words.length) {
                  currentStart = words[i + 1].start;
                }
              }
            }
            if (text.trim()) newCaptions.push({ text: text.trim(), start: currentStart, end: words[words.length-1].end, speaker: 1 });
          }
        }
        
        setCaptions(newCaptions);
        try {
           localStorage.setItem(cacheKey, JSON.stringify(newCaptions));
        } catch (e) {
           console.error("Local storage error:", e);
        }
      } catch (err) {
        console.error('Transcription failed:', err);
      } finally {
        setIsTranscribing(false);
      }
    };

    transcribeUrl();
  }, [audioUrl, generatedDialogueAudioUrl, creativeMode]);

  const handleAddImageElement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      addElement({
        type: 'image',
        componentRole: 'image',
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        rotation: 0,
        zIndex: 10,
        imageUrl: url,
        imageShadow: false,
        imageShadowOpacity: 0.42,
      });
    }
  };

  const handleAddSubheadline = () => {
    const offset = duplicateOffset(subheadlineCount);
    addElement({
      type: 'text',
      componentRole: 'subheadline',
      content: 'Your secondary message goes here',
      x: 20,
      y: 198 + offset,
      width: 320,
      height: 72,
      rotation: 0,
      zIndex: 2 + subheadlineCount,
      fontSize: 18,
      fontWeight: '600',
      color: accentColor,
      textAlign: 'center',
      lineHeight: 1.12,
    });
  };

  const handleAddHeadline = () => {
    const offset = duplicateOffset(headlineCount);
    addElement({
      type: 'text',
      componentRole: 'headline',
      content: getRandomSeededHook(),
      x: 20,
      y: 118 + offset,
      width: 320,
      height: 120,
      rotation: 0,
      zIndex: 1 + headlineCount,
      fontSize: 52,
      fontWeight: '900',
      color: '#000000',
      textAlign: 'center',
      lineHeight: 1.04,
    });
  };

  const handleAddVisualizer = () => {
    const offset = duplicateOffset(visualizerCount);
    addElement({
      type: 'visualizer',
      componentRole: 'visualizer',
      x: 0,
      y: 255 + offset,
      width: 360,
      height: 90,
      rotation: 0,
      zIndex: 3 + visualizerCount,
      visualizerType: 'bars-center',
      barColor: visualizerColor,
      barCount: 16,
      visualizerSensitivity: 1.5,
      visualizerSmoothing: 0.85,
      visualizerHeight: 0.9,
      visualizerBaseline: 4,
      ...VOICE_VISUALIZER_PRESET,
      visualizerSplitSpeakers: false,
    });
  };

  const handleAddCaptions = () => {
    const offset = duplicateOffset(captionCount);
    addElement({
      type: 'caption',
      componentRole: 'captions',
      x: 20,
      y: 350 + offset,
      width: 320,
      height: 48,
      rotation: 0,
      zIndex: 4 + captionCount,
    });
  };

  const handleAddCta = () => {
    const offset = duplicateOffset(ctaCount);
    const editorDimensions = getEditorDimensions(platform);
    const width = 184;
    const height = 48;
    addElement({
      type: 'button',
      componentRole: 'cta',
      content: 'BOOK A DEMO',
      x: (editorDimensions.width - width) / 2,
      y: Math.max(16, editorDimensions.height - height - 20 - offset),
      width,
      height,
      rotation: 0,
      zIndex: 5 + ctaCount,
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
      backgroundColor: accentColor,
      borderRadius: 8,
    });
  };

  const handleAddLogo = () => {
    const offset = duplicateOffset(logoCount);
    addElement({
      type: 'image',
      componentRole: 'logo',
      imageUrl: '/wiggly-logo.png',
      x: 120 + offset,
      y: 70 + offset,
      width: 120,
      height: 48,
      rotation: 0,
      zIndex: 10 + logoCount,
      removeWhite: true,
      imageShadow: false,
      imageShadowOpacity: 0.42,
    });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
      }
    });
  };

  const togglePlayback = () => {
    if (!audioUrl) {
      alert(creativeMode === 'phone-call' ? 'Upload voicemail audio first.' : 'Please upload an audio file first.');
      return;
    }
    if (!playing) {
      emitTutorialEvent({ type: 'play-clicked' });
    }
    setPlaying(!playing);
  };

  const cancelExport = () => {
    exportCancelRef.current?.();
  };

  const downloadSimulatedVideo = async () => {
    if (creativeMode === 'phone-call') {
      await downloadPhoneCallVideo();
      return;
    }

    const exportSnapshot = createCurrentSnapshot(getCurrentDesignTitle());
    setExportLaunchAnimation(true);
    window.setTimeout(() => setExportLaunchAnimation(false), 650);
    setRendering(true);
    setRenderProgress(0);
    setExportPhase('recording');
    savedExportHistoryIdRef.current = null;
    setShareStatus('idle');
    setShareUrl('');
    setShareError('');
    setExportDownload((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });

    const remotionAbortController = new AbortController();
    exportCancelRef.current = () => {
      remotionAbortController.abort();
      setRendering(false);
      setRenderProgress(0);
      setExportPhase('recording');
      exportCancelRef.current = null;
    };

    try {
      await tryRemotionExport(exportSnapshot, remotionAbortController);
      setRendering(false);
      exportCancelRef.current = null;
      return;
    } catch (error) {
      if (remotionAbortController.signal.aborted) {
        return;
      }
      const message = error instanceof Error ? error.message : '';
      if (/too many/i.test(message)) {
        console.warn('Remotion export rate-limited:', error);
        setExportPhase('error');
        setRendering(false);
        setRenderProgress(0);
        exportCancelRef.current = null;
        return;
      }
      console.warn('Remotion export failed, falling back to browser recorder:', error);
      setExportPhase('recording');
      setRenderProgress(0);
    }

    const { width: targetWidth, height: targetHeight } = getExportDimensions(platform);
    const editorDimensions = getEditorDimensions(platform);
    const layoutOffsetX = getDefaultLayoutOffsetX(platform);
    const layoutScaleY = getDefaultLayoutScaleY(platform);
    
    const scale = targetWidth / editorDimensions.width;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Pre-load images to avoid flickering during recording
    const imageCache: Record<string, HTMLImageElement> = {};
    let bgVideoEl: HTMLVideoElement | null = null;
    let renderDuration = 3000; // default 3s if no audio/video

    if (bgMedia && bgMedia.type.startsWith('image')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = bgMedia.url;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      imageCache[bgMedia.url] = img;
    } else if (bgMedia && bgMedia.type === 'video') {
      bgVideoEl = document.createElement('video');
      bgVideoEl.crossOrigin = 'anonymous';
      bgVideoEl.src = bgMedia.url;
      bgVideoEl.volume = 0; // mute the video element so it doesn't play out loud to the user during render
      bgVideoEl.playsInline = true;
      await new Promise(r => { bgVideoEl!.onloadeddata = r; bgVideoEl!.onerror = r; });
      if (bgVideoEl.duration && isFinite(bgVideoEl.duration)) {
        renderDuration = Math.max(renderDuration, bgVideoEl.duration * 1000);
      }
    }

    let introImgEl: HTMLImageElement | null = null;
    if (introImage) {
      introImgEl = new Image();
      introImgEl.crossOrigin = 'anonymous';
      introImgEl.src = introImage;
      await new Promise(r => { introImgEl!.onload = r; introImgEl!.onerror = r; });
    }

    const elements = JSON.parse(JSON.stringify(useEditorStore.getState().elements));
    const captions = JSON.parse(JSON.stringify(useEditorStore.getState().captions));
    for (const el of elements) {
      if (el.type === 'image' && el.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = el.imageUrl;
        await new Promise(r => { img.onload = r; img.onerror = r; });
        
        if (el.removeWhite) {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const cCtx = c.getContext('2d');
          if (cCtx) {
            cCtx.drawImage(img, 0, 0);
            const imgData = cCtx.getImageData(0, 0, c.width, c.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
                data[i+3] = 0;
              }
            }
            cCtx.putImageData(imgData, 0, 0);
            const transparentImg = new Image();
            transparentImg.src = c.toDataURL('image/png');
            await new Promise(r => { transparentImg.onload = r; });
            imageCache[el.imageUrl] = transparentImg;
            continue;
          }
        }
        
        imageCache[el.imageUrl] = img;
      }
    }

    // Draw background initially
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas.style.position = 'fixed';
    canvas.style.top = '-9999px';
    canvas.style.left = '-9999px';
    canvas.style.opacity = '1'; 
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';
    document.body.appendChild(canvas);

    const stream = canvas.captureStream(60);

    let audioContext: AudioContext | null = null;
    let audioSource: AudioBufferSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;
    let destStream: MediaStream | null = null;

    if (audioUrl) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioCtx();
        const dest = audioContext.createMediaStreamDestination();
        destStream = dest.stream;
        
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; 
        
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        renderDuration = Math.max(renderDuration, audioBuffer.duration * 1000);
        
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        
        audioSource.connect(analyser);
        analyser.connect(dest);
        
        // Critical: inject the audio track into the main video stream
        destStream.getAudioTracks().forEach(track => stream.addTrack(track));
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) {
        console.error("Error setting up audio:", e);
      }
    }

    if (renderDurationCap !== 'full') {
      renderDuration = Math.min(renderDuration, renderDurationCap * 1000);
    }

    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: BlobPart[] = [];
    const abortController = new AbortController();
    let exportCancelled = false;
    let hasStopped = false;

    const cleanupExportResources = () => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      stream.getTracks().forEach((track) => track.stop());
      if (audioSource) {
        try { audioSource.stop(); } catch(e){}
      }
      if (bgVideoEl) {
        bgVideoEl.pause();
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };

    exportCancelRef.current = () => {
      exportCancelled = true;
      hasStopped = true;
      abortController.abort();
      if (mediaRecorder.state !== 'inactive') {
        try { mediaRecorder.stop(); } catch(e){}
      } else {
        cleanupExportResources();
      }
      setRendering(false);
      setRenderProgress(0);
      setExportPhase('recording');
      exportCancelRef.current = null;
    };
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      if (exportCancelled) {
        cleanupExportResources();
        return;
      }

      await new Promise(r => setTimeout(r, 100)); // drain remaining chunks
      const blob = new Blob(chunks, { type: 'video/webm' });
      cleanupExportResources();
      setExportPhase('converting');
      setRenderProgress(92);
      
      const formData = new FormData();
      formData.append('video', blob, 'video.webm');
      
      try {
        const res = await fetch('/api/convert-to-mp4', {
          method: 'POST',
          body: formData,
          signal: abortController.signal,
        });
        
        if (!res.ok) throw new Error('Failed to convert');
        
        const mp4Blob = await res.blob();
        await ensureValidMp4Blob(mp4Blob, 'Browser recorder fallback');
        
        const url = URL.createObjectURL(mp4Blob);
        const filename = `agent-enamel-${Date.now()}.mp4`;
        setExportDownload({ url, blob: mp4Blob, filename, snapshot: exportSnapshot, renderVersion: CURRENT_RENDER_VERSION });
        setExportPhase('complete');
        setRenderProgress(100);
      } catch (err) {
        if (exportCancelled || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }
        console.error("Error creating MP4:", err);
        setExportPhase('error');
        alert('The video failed. Please try again.');
      }
      setRendering(false);
      exportCancelRef.current = null;
    };

    const exportFps = 60;
    const frameDurationMs = 1000 / exportFps;

    mediaRecorder.start(1000);
    if (audioSource) {
      audioSource.start();
    }
    if (bgVideoEl) {
      bgVideoEl.currentTime = 0;
      bgVideoEl.play();
    }
    
    const renderStartTime = performance.now();
    let frame = 0;
    const visualizerValueMemory: Record<string, number[]> = {};
    
    const draw = () => {
      if (hasStopped) return;
      const elapsed = Math.min(performance.now() - renderStartTime, renderDuration);
      
      if (elapsed >= renderDuration) {
         hasStopped = true;
         
         if (mediaRecorder.state !== 'inactive') {
            try { mediaRecorder.requestData(); } catch(e){}
            mediaRecorder.stop();
         } else {
            setRendering(false);
            setRenderProgress(100);
         }
         return;
      }

      setRenderProgress(Math.min((elapsed / renderDuration) * 90, 90));
      
      // Draw background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (bgMedia && bgMedia.type === 'video' && bgVideoEl) {
        // cover mode video
        const canvasRatio = canvas.width / canvas.height;
        const vidRatio = bgVideoEl.videoWidth / Math.max(1, bgVideoEl.videoHeight);
        let dWidth = canvas.width;
        let dHeight = canvas.height;
        if (vidRatio > canvasRatio) {
           dWidth = canvas.height * vidRatio;
        } else {
           dHeight = canvas.width / vidRatio;
        }
        const dx = (canvas.width - dWidth) / 2;
        const dy = (canvas.height - dHeight) / 2;
        ctx.drawImage(bgVideoEl, dx, dy, dWidth, dHeight);
      } else if (bgMedia && imageCache[bgMedia.url]) {
        // cover mode image
        const img = imageCache[bgMedia.url];
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;
        let dWidth = canvas.width;
        let dHeight = canvas.height;
        if (imgRatio > canvasRatio) {
           dWidth = canvas.height * imgRatio;
        } else {
           dHeight = canvas.width / imgRatio;
        }
        const dx = (canvas.width - dWidth) / 2;
        const dy = (canvas.height - dHeight) / 2;
        ctx.drawImage(img, dx, dy, dWidth, dHeight);
      }

      if (bgMedia && bgShadow) {
        ctx.fillStyle = `rgba(0, 0, 0, ${bgShadowOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      const currentElements = elements;
      const sortedElements = [...currentElements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      
      const currentTimeSec = elapsed / 1000;
      const storeCaptions = captions;
      const renderCaptions = storeCaptions.length > 0 ? storeCaptions : MOCK_CAPTIONS;
      const activeCaptionIndexGlobal = renderCaptions.findIndex(c => currentTimeSec >= c.start && currentTimeSec <= c.end);
      const activeCaptionGlobal = activeCaptionIndexGlobal >= 0 ? renderCaptions[activeCaptionIndexGlobal] : undefined;
      const hasTwoSpeakers = renderCaptions.some(c => c.speaker === 2);
      
      const loopSpeaker = activeCaptionGlobal
        ? (hasTwoSpeakers ? activeCaptionGlobal.speaker : (activeCaptionIndexGlobal % 2) + 1)
        : (Math.floor(currentTimeSec / 1.5) % 2 === 0 ? 1 : 2);
      
      if (analyser && dataArray) {
        const visEl = currentElements.find(e => e.type === 'visualizer');
        if (visEl) {
          analyser.smoothingTimeConstant = visEl.visualizerSmoothing ?? 0.8;
        }
        analyser.getByteFrequencyData(dataArray);
      }

      const canvasWidth = canvas.width / scale;
      const canvasHeight = canvas.height / scale;

      sortedElements.forEach(el => {
         ctx.save();
         const elementFrame = getPlatformElementFrame(el, platform);
         const rawElW = elementFrame.width;
         const rawElH = elementFrame.height;
         const feedSafeSquareTop = isFeedPlatform(platform) ? Math.max(0, (canvasHeight - canvasWidth) / 2) : 0;
         const feedSafeSquareBottom = feedSafeSquareTop + canvasWidth;
         const rawElY = isFeedPlatform(platform) && el.type === 'caption'
           ? Math.min(elementFrame.y, feedSafeSquareBottom - rawElH - 8)
           : elementFrame.y;
         const elX = (elementFrame.x + layoutOffsetX) * scale;
         const elY = rawElY * layoutScaleY * scale;
         const elW = rawElW * scale;
         const elH = rawElH * layoutScaleY * scale;
         
         ctx.translate(elX, elY);
         if (el.rotation) {
             ctx.translate(elW / 2, elH / 2);
             ctx.rotate(el.rotation * Math.PI / 180);
             ctx.translate(-elW / 2, -elH / 2);
         }
         
         if (el.type === 'image' && el.imageUrl && imageCache[el.imageUrl]) {
            if (el.mixBlendMode) {
                ctx.globalCompositeOperation = el.mixBlendMode as any;
            }
            const img = imageCache[el.imageUrl];
            const imgRatio = img.width / img.height;
            const boxRatio = elW / elH;
            
            let drawW = elW;
            let drawH = elH;
            
            if (imgRatio > boxRatio) {
                drawH = drawW / imgRatio;
            } else {
                drawW = drawH * imgRatio;
            }
            
            const drawX = (elW - drawW) / 2;
            const drawY = (elH - drawH) / 2;
            
            ctx.drawImage(img, drawX, drawY, drawW, drawH);

            if (el.imageShadow) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = `rgba(0, 0, 0, ${el.imageShadowOpacity ?? 0.42})`;
                ctx.fillRect(0, 0, elW, elH);
            }
            
            if (el.mixBlendMode) {
                ctx.globalCompositeOperation = 'source-over';
            }
         } else if (el.type === 'text') {
             ctx.fillStyle = el.color || '#fff';
             let fontSize = (el.fontSize || 16) * scale;
             const fontFamily = el.fontFamily || 'Inter, sans-serif';
             const fontWeight = el.fontWeight || 'normal';
             const fontStyle = el.fontStyle || 'normal';
             const textDecoration = el.textDecoration;
             ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'center';
             ctx.textBaseline = 'top';
             const plainContent = stripRichText(el.content || '');

             const wrapText = (size: number) => {
               ctx.font = `${fontStyle} ${fontWeight} ${size}px ${fontFamily}`;
               const wrapped: string[] = [];
               const explicitLines = plainContent.split('\n');
               explicitLines.forEach(expLine => {
                 if (!expLine) {
                   wrapped.push('');
                   return;
                 }
                 const words = expLine.split(/\s+/);
                 let currentLine = words[0] || '';
                 for (let i = 1; i < words.length; i++) {
                   const word = words[i];
                   const width = ctx.measureText(currentLine + " " + word).width;
                   if (width <= elW) {
                     currentLine += " " + word;
                   } else {
                     wrapped.push(currentLine);
                     currentLine = word;
                   }
                 }
                 if (currentLine) wrapped.push(currentLine);
               });
               return wrapped;
             };

             let lines = wrapText(fontSize);
             let lineHeight = fontSize * (el.lineHeight || 1.12);
             if (el.type === 'text') {
               let low = 8 * scale;
               let high = 96 * scale;
               let bestSize = low;
               let bestLines = lines;
               while (low <= high) {
                 const mid = Math.floor((low + high) / 2);
                 const candidateLines = wrapText(mid);
                 const candidateHeight = candidateLines.length * mid * (el.lineHeight || 1.12);
                 const candidateWidest = candidateLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
                 if (candidateWidest <= elW - (8 * scale) && candidateHeight <= elH - (4 * scale)) {
                   bestSize = mid;
                   bestLines = candidateLines;
                   low = mid + 1;
                 } else {
                   high = mid - 1;
                 }
               }
               fontSize = bestSize;
               lines = bestLines;
               lineHeight = fontSize * (el.lineHeight || 1.12);
               ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
             } else {
               ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
             }

             const totalHeight = lines.length * lineHeight;
             
             let textX = 0;
             if (ctx.textAlign === 'center') textX = elW / 2;
             else if (ctx.textAlign === 'right') textX = elW;
             
             // Vertically center using top baseline, shifted down slightly to match HTML visual center
             const startY = (elH - totalHeight) / 2 + (fontSize * 0.1);

             lines.forEach((line, i) => {
               const lineY = startY + (i * lineHeight);
               ctx.fillText(line, textX, lineY, elW);
               if (textDecoration === 'underline') {
                 const metrics = ctx.measureText(line);
                 let underlineX = textX;
                 if (ctx.textAlign === 'center') underlineX = textX - (metrics.width / 2);
                 else if (ctx.textAlign === 'right') underlineX = textX - metrics.width;
                 const underlineY = lineY + fontSize * 0.9;
                 ctx.save();
                 ctx.strokeStyle = el.color || '#fff';
                 ctx.lineWidth = Math.max(1.5 * scale, fontSize * 0.06);
                 ctx.beginPath();
                 ctx.moveTo(underlineX, underlineY);
                 ctx.lineTo(underlineX + metrics.width, underlineY);
                 ctx.stroke();
                 ctx.restore();
               }
             });
         } else if (el.type === 'caption') {
             const currentTimeSec = elapsed / 1000;
             const storeCaptions = captions;
             const renderCaptions = storeCaptions.length > 0 ? storeCaptions : MOCK_CAPTIONS;
             const { caption: activeCaption, index: activeCaptionIndex } = getActiveCaption(renderCaptions, currentTimeSec);
             
             if (activeCaption) {
                const maxTextWidth = elW - (18 * scale);
                const maxTextHeight = elH - (16 * scale);
                const captionText = `${activeCaption.text}`;
                const hasTwoSpeakers = renderCaptions.some(caption => caption.speaker === 2);
                const captionSpeaker = hasTwoSpeakers ? activeCaption.speaker : (activeCaptionIndex % 2) + 1;
                const captionColor = (captionSpeaker === 2 ? el.captionSpeaker2Color : el.captionSpeaker1Color) || CAPTION_SPEAKER_COLORS[captionSpeaker] || el.color || accentColor;
                const fontFamily = el.fontFamily || 'Inter, sans-serif';
                const fontWeight = el.fontWeight || 'bold';
                const wrapCaptionLines = (fontSize: number) => {
                  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                  const lines: string[] = [];
                  captionText.split('\n').forEach((explicitLine) => {
                    const words = explicitLine.trim().split(/\s+/).filter(Boolean);
                    if (words.length === 0) {
                      lines.push('');
                      return;
                    }

                    let line = words[0];
                    for (let i = 1; i < words.length; i++) {
                      const testLine = `${line} ${words[i]}`;
                      if (ctx.measureText(testLine).width <= maxTextWidth) {
                        line = testLine;
                      } else {
                        lines.push(line);
                        line = words[i];
                      }
                    }
                    lines.push(line);
                  });
                  return lines;
                };

                let low = 8 * scale;
                let high = (platform === 'youtube' ? 92 : 72) * scale;
                let captionFontSize = low;
                let renderLines = wrapCaptionLines(captionFontSize);
                while (low <= high) {
                  const mid = Math.floor((low + high) / 2);
                  const candidateLines = wrapCaptionLines(mid);
                  const candidateLineHeight = mid * 1.22;
                  const widest = candidateLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
                  const totalHeight = candidateLines.length * candidateLineHeight;

                  if (widest <= maxTextWidth && totalHeight <= maxTextHeight) {
                    captionFontSize = mid;
                    renderLines = candidateLines;
                    low = mid + 1;
                  } else {
                    high = mid - 1;
                  }
                }

                ctx.font = `${fontWeight} ${captionFontSize}px ${fontFamily}`;
                const lineHeight = captionFontSize * 1.22;
                
                const totalTextHeight = renderLines.length * lineHeight;
                const startY = (elH - totalTextHeight) / 2;

                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = captionColor;
                
                // Add drop shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowBlur = 4 * scale;
                ctx.shadowOffsetX = 1 * scale;
                ctx.shadowOffsetY = 1 * scale;
                
                renderLines.forEach((l, i) => {
                  ctx.fillText(l.trim(), elW / 2, startY + (i * lineHeight));
                });
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
             }
         } else if (el.type === 'button') {
             ctx.fillStyle = el.backgroundColor || '#4f46e5';
             const r = (el.borderRadius || 8) * scale;
             ctx.beginPath();
             ctx.roundRect(0, 0, elW, elH, r);
             ctx.fill();
             
             if (el.content) {
                 ctx.fillStyle = el.color || '#fff';
                 const fontSize = (el.fontSize || 18) * scale;
                 ctx.font = `${el.fontWeight || 'bold'} ${fontSize}px sans-serif`;
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(el.content, elW / 2, elH / 2);
             }
         } else if (el.type === 'visualizer') {
             ctx.fillStyle = el.barColor || '#fff';
             ctx.strokeStyle = el.barColor || '#fff';
             ctx.lineWidth = 4 * scale;
             ctx.lineCap = 'round';
             ctx.lineJoin = 'round';
             
             const type = ['bars-bottom', 'bars-center', 'waveform-strip'].includes(el.visualizerType || '') ? (el.visualizerType as 'bars-bottom' | 'bars-center' | 'waveform-strip') : 'bars-center';
             const count = el.barCount || (type === 'waveform-strip' ? 72 : 16);
             const mirror = el.visualizerMirror || false;
             const sensitivityMultiplier = el.visualizerSensitivity ?? 1.5;

             const getValue = (idx: number, total: number, isLeftSpeakerSide?: boolean) => {
                 let val = 0;
                 if (analyser && dataArray) {
                     const dataBins = Math.floor(dataArray.length * 0.4);
                     const halfCount = Math.floor(count / 2);
                     const sideIndex = isLeftSpeakerSide ? idx : idx - halfCount;
                     const sideTotal = isLeftSpeakerSide ? halfCount : count - halfCount;
                     const center = (count - 1) / 2;
                     const centerDistance = Math.abs(idx - center);
                     const normalizedIndex = el.visualizerSplitSpeakers
                       ? sideIndex / Math.max(1, sideTotal - 1)
                       : type === 'bars-center'
                         ? centerDistance / Math.max(1, center)
                         : idx / Math.max(1, total - 1);
                     const dataIdx = 1 + Math.floor(normalizedIndex * dataBins);
                     val = compressVisualizerValue((dataArray[Math.min(dataIdx, dataArray.length-1)] / 255.0) * sensitivityMultiplier);
                     val = Math.pow(val, 1.5); // non-linear scaling for better visuals
                 } else {
                     val = compressVisualizerValue(((Math.sin(frame * 0.2 + idx) * 0.5 + 0.5) * 0.5) * sensitivityMultiplier);
                 }
                 return val;
             };

             const values: number[] = [];
             if (mirror) {
                 const half = Math.ceil(count / 2);
                 for(let i=0; i<half; i++) values.push(getValue(i, half, i < Math.floor(count / 2)));
                 for(let i=half; i<count; i++) values.push(values[count - 1 - i]);
             } else {
                 const halfCount = Math.floor(count / 2);
                 for(let i=0; i<count; i++) values.push(getValue(i, count, i < halfCount));
             }
             
             if (el.visualizerSplitSpeakers) {
                 const halfCount = Math.floor(count / 2);
                 for (let i = 0; i < count; i++) {
                     const isLeftSpeakerSide = i < halfCount;
                     const isActiveSpeakerSide = !loopSpeaker || (loopSpeaker === 1 ? isLeftSpeakerSide : !isLeftSpeakerSide);
                     if (!isActiveSpeakerSide) values[i] = 0.04;
                 }
             }

             const previousValues = visualizerValueMemory[el.id] || new Array(count).fill(0.04);
             const blend = Math.min(0.65, Math.max(0.05, 1 - (el.visualizerSmoothing ?? 0.65)));
             const smoothedValues = values.map((value, index) => {
               const previous = previousValues[index] ?? 0.04;
               return previous + (value - previous) * blend;
             });
             visualizerValueMemory[el.id] = smoothedValues;

             if (type === 'bars-bottom' || type === 'bars-center') {
                 const gap = 4 * scale;
                 const barW = (elW - gap * (count - 1)) / count;
                 const halfCount = Math.floor(count / 2);
                 for (let i = 0; i < count; i++) {
                     const v = smoothedValues[i];
                     const minBarH = (el.visualizerBaseline ?? 4) * scale;
                     const heightScale = el.visualizerHeight ?? 0.9;
                     const barH = Math.min(minBarH + v * (elH * heightScale), elH);
                     const barX = i * (barW + gap);
                     const barY = type === 'bars-center' ? (elH - barH) / 2 : elH - barH;
                     const isLeftSpeakerSide = i < halfCount;
                     const isActiveSpeakerSide = !el.visualizerSplitSpeakers || !loopSpeaker || (loopSpeaker === 1 ? isLeftSpeakerSide : !isLeftSpeakerSide);
                     ctx.fillStyle = el.visualizerSplitSpeakers && !isLeftSpeakerSide ? '#8b5cf6' : (el.barColor || '#fff');
                     ctx.globalAlpha = isActiveSpeakerSide ? 1 : 0.28;
                     
                     ctx.beginPath();
                     ctx.roundRect(barX, barY, barW, barH, barW / 2);
                     ctx.fill();
                     ctx.globalAlpha = 1;
                 }
             } else if (type === 'waveform-strip') {
                 let v = 0;
                 if (analyser && dataArray) {
                     const binsCount = Math.floor(dataArray.length * 0.5);
                     if (el.visualizerSplitSpeakers) {
                         const halfCount = Math.floor(binsCount / 2);
                         for (let i = 0; i < binsCount; i++) {
                             if (!loopSpeaker || (loopSpeaker === 1 && i < halfCount) || (loopSpeaker === 2 && i >= halfCount)) v += dataArray[i];
                         }
                         v = v / halfCount;
                     } else {
                         for (let i = 0; i < binsCount; i++) v += dataArray[i];
                         v = v / binsCount;
                     }
                     v = compressVisualizerValue((v / 255.0) * sensitivityMultiplier);
                 } else {
                     v = compressVisualizerValue(((Math.sin(frame * 0.2) * 0.5 + 0.5) * 0.5) * sensitivityMultiplier);
                 }
                 
                 drawAdvancedVisualizer(ctx, type, elW, elH, v, frame, el.barColor || '#00ffcc', scale, {
                   barCount: el.barCount,
                   heightScale: el.visualizerHeight,
                   baseline: el.visualizerBaseline,
                 });
             }
         }
         ctx.restore();
      });

      if (introImgEl && introDuration > 0) {
        const introFadeDuration = 0.65;
        let introOpacity = 0;
        if (currentTimeSec < introDuration) {
          introOpacity = 1;
        } else if (currentTimeSec < introDuration + introFadeDuration) {
          introOpacity = 1 - ((currentTimeSec - introDuration) / introFadeDuration);
        }

        if (introOpacity > 0) {
          const imgRatio = introImgEl.width / introImgEl.height;
          const canvasRatio = canvas.width / canvas.height;
          let coverWidth = canvas.width;
          let coverHeight = canvas.height;
          if (imgRatio > canvasRatio) {
            coverWidth = canvas.height * imgRatio;
          } else {
            coverHeight = canvas.width / imgRatio;
          }
          const coverX = (canvas.width - coverWidth) / 2;
          const coverY = (canvas.height - coverHeight) / 2;

          let dWidth = canvas.width;
          let dHeight = canvas.height;
          if (isFeedPlatform(platform) && !introIsSquareish) {
            if (imgRatio > canvasRatio) {
              dWidth = canvas.height * imgRatio;
            } else {
              dHeight = canvas.width / imgRatio;
            }
          } else {
            if (imgRatio > canvasRatio) {
              dHeight = canvas.width / imgRatio;
            } else {
              dWidth = canvas.height * imgRatio;
            }
          }
          const dx = (canvas.width - dWidth) / 2;
          const dy = isFeedPlatform(platform) && !introIsSquareish ? (canvas.height - dHeight) * (introFeedCropY / 100) : (canvas.height - dHeight) / 2;
          ctx.save();
          ctx.globalAlpha = introOpacity;
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = introOpacity * 0.65;
          ctx.drawImage(introImgEl, coverX, coverY, coverWidth, coverHeight);
          ctx.globalAlpha = introOpacity;
          ctx.drawImage(introImgEl, dx, dy, dWidth, dHeight);
          ctx.restore();
        }
      }

      const videoTrack = stream.getVideoTracks()[0] as any;
      if (videoTrack && typeof videoTrack.requestFrame === 'function') {
        videoTrack.requestFrame();
      }

      frame++;
      
      if (!hasStopped) {
         window.setTimeout(draw, frameDurationMs);
      }
    };
    
    draw();
  };

  const runBatch = () => {
    if (csvData.length === 0) {
    alert('Please upload a spreadsheet first.');
      return;
    }
    setBatchStatus('processing');
    setRenderProgress(0);
    
    const totalItems = csvData.length;
    let currentItem = 0;

    const processNext = () => {
      if (currentItem >= totalItems) {
        setBatchStatus('done');
        return;
      }

      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setRenderProgress(((currentItem * 100) + progress) / totalItems);
        
        if (progress >= 100) {
          clearInterval(interval);
          currentItem++;
          processNext();
        }
      }, 50); // fast simulation
    };

    processNext();
  };

  const TemplatePreview = ({ template }: { template: SavedTemplate }) => {
    const headline = template.elements.find(element => element.componentRole === 'headline' || element.type === 'text');
    const subheadline = template.elements.find(element => element.componentRole === 'subheadline');
    const visualizer = template.elements.find(element => element.type === 'visualizer');
    const cta = template.elements.find(element => element.type === 'button');
    const hasCaptions = template.elements.some(element => element.type === 'caption');
    const hasLogo = template.elements.some(element => element.componentRole === 'logo');
    const headlineText = stripRichText(headline?.content || 'Headline');
    return (
      <div
        className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner"
        style={{ backgroundColor: template.settings.bgColor }}
      >
        {template.settings.bgMedia?.type === 'video' && (
          <video
            src={template.settings.bgMedia.url}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            loop
            playsInline
            autoPlay
          />
        )}
        {template.settings.bgMedia?.type === 'image' && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${template.settings.bgMedia.url})` }}
          />
        )}
        {template.settings.bgMedia && template.settings.bgShadow && (
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: template.settings.bgShadowOpacity }}
          />
        )}
        <div className="absolute inset-x-0 top-[10%] flex justify-center">
          {hasLogo ? (
            <span className="h-2 w-8 rounded-full bg-emerald-500/80" />
          ) : (
            <span className="h-2 w-8 rounded-full bg-slate-200" />
          )}
        </div>

        <div className="absolute inset-x-2 top-[20%] flex min-h-[42px] items-center justify-center">
          <p
            className="line-clamp-3 text-center text-[11px] font-black leading-[0.95]"
            style={{ color: headline?.color || '#0f172a' }}
          >
            {headlineText}
          </p>
        </div>

        {subheadline && (
          <div className="absolute inset-x-4 top-[40%] flex justify-center">
            <span className="h-2 w-14 rounded-full" style={{ backgroundColor: subheadline.color || template.settings.accentColor }} />
          </div>
        )}

        {visualizer && (
          <div className="absolute inset-x-2 top-[52%] flex h-7 items-center gap-[2px]">
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={index}
                className="flex-1 rounded-full"
                style={{
                  height: `${22 + ((index * 9) % 46)}%`,
                  backgroundColor: visualizer.barColor || template.settings.visualizerColor,
                }}
              />
            ))}
          </div>
        )}

        {hasCaptions && (
          <div className="absolute inset-x-5 top-[69%] flex justify-center">
            <span className="h-2 w-20 rounded-full" style={{ backgroundColor: template.settings.accentColor }} />
          </div>
        )}

        {cta && (
          <div className="absolute inset-x-4 bottom-[9%] h-4 rounded-full" style={{ backgroundColor: cta.backgroundColor || template.settings.accentColor }} />
        )}
      </div>
    );
  };

  const selectedTimelineDuration = renderDurationCap === 'full' ? 30 : renderDurationCap;
  const introTimelineSeconds = introImage ? introDuration : 0;
  const mainTimelineSeconds = Math.max(1, selectedTimelineDuration - introTimelineSeconds);
  const introTimelineWidth = introTimelineSeconds > 0 ? `${Math.max(10, (introTimelineSeconds / selectedTimelineDuration) * 100)}%` : '0%';
  const introIsSquareish = introImageAspect !== null && introImageAspect >= 0.9 && introImageAspect <= 1.1;

  const getTemplateTitle = (template: SavedTemplate) => {
    const headline = template.elements.find(element => element.componentRole === 'headline' || element.type === 'text');
    const subheadline = template.elements.find(element => element.componentRole === 'subheadline');
    const button = template.elements.find(element => element.type === 'button');
    return (
      stripRichText(headline?.content || '').trim() ||
      stripRichText(subheadline?.content || '').trim() ||
      stripRichText(button?.content || '').trim() ||
      template.name
    );
  };

  const templateItems = [...BUILT_IN_TEMPLATES, ...templates];
  const activeTemplateItems = templateLibraryTab === 'templates' ? templateItems : historyItems;
  const activeTemplateCount = templateLibraryTab === 'templates' ? templateItems.length : historyItems.length;
  const showCompactDesignLibrary = activeTemplateItems.length === 0;
  const audioLibraryItems: AudioLibraryItem[] = [
    { id: 'built-in-ai-dental-receptionist-audio', name: DEFAULT_AUDIO_NAME, url: DEFAULT_AUDIO_URL, builtIn: true },
    { id: 'built-in-phone-call-recording-audio', name: DEFAULT_PHONE_CALL_AUDIO_NAME, url: DEFAULT_PHONE_CALL_AUDIO_URL, builtIn: true },
    ...storedAudioItems.map((item) => ({
      id: item.id,
      name: item.name,
      url: '',
      stored: item,
    })),
  ];
  const readyAudioLibraryItems = audioLibraryItems.filter((item) => item.builtIn || (item.stored?.status !== 'needs-reupload' && (item.stored?.blob?.size ?? 0) > 0));
  const currentAudioItem = readyAudioLibraryItems.find((item) => (
    item.stored ? item.id === currentAudioAssetId : !currentAudioAssetId && item.name === audioFileName
  ));

  const formatVoiceName = (name: string) => {
    const withoutExtension = name.replace(/\.[a-z0-9]+$/i, '');
    if (withoutExtension === DEFAULT_AUDIO_NAME || withoutExtension === DEFAULT_PHONE_CALL_AUDIO_NAME) return withoutExtension;
    return withoutExtension
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Voice';
  };

  const getAudioItemLabel = (item: AudioLibraryItem) => {
    if (item.stored?.source === 'voice-wizard') return 'Made by Wiggly';
    if (item.builtIn) return 'Example';
    return 'Uploaded by you';
  };

  const isCurrentAudioItem = (item: AudioLibraryItem) => (
    item.stored ? item.id === currentAudioAssetId : !currentAudioAssetId && item.name === audioFileName
  );

  const openAudioFlyout = (view: AudioFlyoutView = 'choices') => {
    setAudioFlyoutView(view);
    setAudioFlyoutOpen(true);
  };

  const renderAudioPanel = (mode: CreativeMode) => {
    const uploadTitle = mode === 'phone-call' ? 'Upload voicemail audio' : 'Upload voice audio';
    const currentName = formatVoiceName(currentAudioItem?.name || audioFileName || DEFAULT_AUDIO_NAME);
    const currentLabel = currentAudioItem ? getAudioItemLabel(currentAudioItem) : 'Example';

    return (
      <div className="relative space-y-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="wiggly-panel-title uppercase">Voice</h2>
          <span className="wiggly-panel-kicker">Audio</span>
        </div>

        <div className="wiggly-item-row flex items-center justify-between gap-3 px-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="wiggly-icon-tile">
              <AudioLines className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-800">Voice: {currentName}</span>
              <span className="block truncate text-xs font-semibold text-slate-500">{currentLabel}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => openAudioFlyout('choices')}
            className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white transition hover:bg-slate-800"
          >
            Change
          </button>
        </div>

        {audioFlyoutOpen && (
          <div className="fixed inset-x-4 bottom-4 z-[80] max-h-[78vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/20 lg:bottom-auto lg:left-[21.5rem] lg:top-24 lg:w-80 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Change voice</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Your ad keeps working while you choose.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAudioFlyoutOpen(false);
                  setAudioFlyoutView('choices');
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Close voice options"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {audioFlyoutView !== 'choices' && (
              <button
                type="button"
                onClick={() => setAudioFlyoutView('choices')}
                className="mb-3 text-xs font-black text-slate-500 transition hover:text-slate-900"
              >
                Back
              </button>
            )}

            {audioFlyoutView === 'choices' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setAudioFlyoutView('make')}
                  className="w-full rounded-2xl border border-slate-900 bg-slate-950 p-4 text-left text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-base font-black">Make me a voice</span>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-white/70">Write a short script. Wiggly turns it into audio.</span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAudioFlyoutView('library')}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-900 transition hover:border-slate-300 hover:bg-white"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-black">Use a voice I have</span>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">Pick an example, upload one, or reuse a saved voice.</span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
                  </span>
                </button>
              </div>
            )}

            {audioFlyoutView === 'make' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="block text-sm font-black text-slate-900">Make voice audio</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">Write a short two-person script, edit it, then make the audio.</span>
                  <button
                    type="button"
                    onClick={handleOpenConversationWizard}
                    disabled={isGeneratingDialogueScripts || isGeneratingDialogueAudio}
                    className="mt-3 w-full rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGeneratingDialogueScripts ? 'Writing...' : isGeneratingDialogueAudio ? 'Making...' : 'Open voice maker'}
                  </button>
                </div>
                {dialogueScripts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenConversationWizard}
                    className="w-full rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-100"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-black text-slate-800">{dialogueScripts.length} voice scripts ready</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">Review</span>
                    </span>
                    <span className="mt-1 block truncate text-[11px] font-semibold text-slate-500">
                      {draftDialogueScript?.title || dialogueScripts[0]?.title || 'Open to choose one.'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {audioFlyoutView === 'library' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700 transition hover:border-slate-400 hover:bg-white">
                    <Upload className="h-4 w-4" />
                    Upload
                    <input
                      type="file"
                      accept="audio/*,video/mp4"
                      onChange={(event) => {
                        handleAudioUpload(event);
                        if (event.target) event.target.value = '';
                      }}
                      className="sr-only"
                      title={uploadTitle}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={downloadCurrentAudio}
                    disabled={!audioUrl}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>

                <div className="space-y-2">
                  {readyAudioLibraryItems.map((item) => {
                    const current = isCurrentAudioItem(item);
                    return (
                      <div
                        key={item.id}
                        className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                          current
                            ? 'border-indigo-200 bg-indigo-50 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => useAudioItem(item)}
                          className="min-w-0 flex-1 text-left"
                          title={`Use ${formatVoiceName(item.name)}`}
                        >
                          <span className="block truncate text-xs font-black">{formatVoiceName(item.name)}</span>
                          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {current ? 'Using now' : getAudioItemLabel(item)}
                          </span>
                        </button>
                        {!item.builtIn && (
                          <button
                            type="button"
                            onClick={() => deleteStoredAudio(item.id)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                            title="Remove saved voice"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const enterStudio = () => {
    try {
      localStorage.setItem(STUDIO_SEEN_STORAGE_KEY, '1');
    } catch {
      // Ignore private browsing storage failures.
    }
    if (window.location.pathname !== '/builder') {
      window.history.pushState(null, '', '/builder');
    }
    setAppRoute('builder');
    setShareSlug(null);
  };

  const openCreateFlow = () => {
    if (window.location.pathname !== '/create') {
      window.history.pushState(null, '', '/create');
    }
    setAppRoute('create');
    setShareSlug(null);
  };

  const openHomepage = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
    setAppRoute('home');
    setShareSlug(null);
  };

  const applyGeneratedAdVariation = (variation: GeneratedAdVariation, brandBrain: BrandBrain, navigateToBuilder = true, resetPlatform = true) => {
    const businessName = brandBrain.businessName || 'Wiggly';
    const realCanvasLogo = pickCanvasBrandLogo(brandBrain);
    const appliedCanvasLogo = realCanvasLogo || buildTextLogoDataUrl(businessName);
    const appliedProfileLogo = isDataImage(brandBrain.brandAssets?.images.logo)
      ? brandBrain.brandAssets?.images.logo || null
      : brandBrain.brandAssets?.images.favicon || brandBrain.brandAssets?.images.logo || null;
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
    const brandContext = `[Name] ${businessName}
[Website] ${brandBrain.websiteUrl}
[Offer] ${brandBrain.offer}
[Audience] ${brandBrain.audience}
[Pain] ${brandBrain.pain}
[Result] ${brandBrain.promisedResult}
[Differentiator] ${brandBrain.differentiator}
[Logo] ${realCanvasLogo || 'Generated text mark'}
[Tone] ${brandBrain.tone}

This ad headline is: ${variation.headline}`;

    setActiveTab('single');
    setCreativeMode('visualizer');
    if (navigateToBuilder) setPlaying(false);
    useEditorStore.getState().setCaptions([]);
    if (resetPlatform) setPlatform('instagram-feed');
    setPlatformTheme('dark');
    setBrandName(businessName);
    setBrandLogo(appliedProfileLogo);
    setSimulatedCaption(brandBrain.offer || variation.headline);
    setAutoCta('Learn More');
    setCtaUrl(brandBrain.websiteUrl || '');
    setBgColor(FIXED_AD_BACKGROUND_COLOR);
    setBgMedia(null);
    setBgShadow(false);
    setIntroDuration(0);
    setVisualizerColor(appliedVisualizerColor);
    setAccentColor(appliedAccentColor);
    setCreativeBrief({
      offer: brandBrain.offer,
      buyer: brandBrain.audience,
      pain: brandBrain.pain,
      failedAlternatives: brandBrain.proof?.join(', ') || 'The old way is slower and harder to show clearly.',
      promisedResult: brandBrain.promisedResult,
      differentiator: brandBrain.differentiator,
      cta: '',
      reference: brandBrain.websiteUrl,
    });
    setBusinessContext(brandContext);
    const applyVariationToElement = (element: AdElement): AdElement => {
      if (element.componentRole === 'logo') {
        return {
          ...element,
          imageUrl: appliedCanvasLogo,
          removeWhite: false,
          styleArchetypeId: variation.archetype.id,
        };
      }
      if (element.locked) return element;
      if (element.componentRole === 'headline') {
        const headlineWidth = Math.min(320, variation.archetype.headlineTreatment.width);
        return {
          ...element,
          content: variation.headline,
          color: variation.archetype.headlineColor,
          fontSize: variation.archetype.headlineTreatment.fontSize,
          fontWeight: variation.archetype.headlineTreatment.fontWeight,
          lineHeight: Math.max(1.08, variation.archetype.headlineTreatment.lineHeight),
          x: (360 - headlineWidth) / 2,
          width: headlineWidth,
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
      return {
        ...element,
        styleArchetypeId: variation.archetype.id,
      };
    };
    setElements((currentElements) => {
      const sourceElements = currentElements.length ? currentElements : DEFAULT_ELEMENTS;
      return sourceElements.map(applyVariationToElement);
    });
    deselectAll();
    if (navigateToBuilder) {
      requestAnimationFrame(() => commitHistory());
      enterStudio();
    }
  };

  const openSaveDesignDialog = () => {
    setTemplateDraftName(getCurrentDesignTitle());
    setSaveTemplateOpen(true);
  };

  useEffect(() => {
    const syncPageFromUrl = () => {
      const nextRoute = getAppRoute();
      setAppRoute(nextRoute.route);
      setShareSlug(nextRoute.shareSlug);
    };
    window.addEventListener('popstate', syncPageFromUrl);
    return () => window.removeEventListener('popstate', syncPageFromUrl);
  }, []);

  useEffect(() => {
    if (appRoute !== 'share' || !shareSlug) {
      setSharePageRecord(null);
      return;
    }

    let cancelled = false;
    setSharePageLoading(true);
    getHostedSharePageBySlug(shareSlug)
      .then((record) => {
        if (!cancelled) setSharePageRecord(record);
      })
      .finally(() => {
        if (!cancelled) setSharePageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appRoute, shareSlug]);

  useEffect(() => {
    if (appRoute !== 'share') {
      document.title = 'Wiggly';
      return;
    }

    const title = sharePageRecord?.headline ? `${sharePageRecord.headline} | Wiggly` : 'Wiggly share page';
    document.title = title;
    const metaTags: Array<[string, string]> = [
      ['og:title', sharePageRecord?.headline || 'Wiggly ad'],
      ['og:description', sharePageRecord?.subhead || 'A visual ad made with Wiggly.'],
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', sharePageRecord?.headline || 'Wiggly ad'],
      ['twitter:description', sharePageRecord?.subhead || 'A visual ad made with Wiggly.'],
    ];
    metaTags.forEach(([property, content]) => {
      const selector = property.startsWith('twitter:') ? `meta[name="${property}"]` : `meta[property="${property}"]`;
      let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        if (property.startsWith('twitter:')) {
          tag.name = property;
        } else {
          tag.setAttribute('property', property);
        }
        document.head.appendChild(tag);
      }
      tag.content = content;
    });
  }, [appRoute, sharePageRecord]);

  const personaDecks = [
    {
      persona: 'Dental',
      customer: 'Dental practices',
      angle: 'Missed-call recovery',
      color: '#00FFCC',
      pain: 'High',
      speed: 'Fast',
      cards: [
        { headline: 'One lunch break can cost a $3,200 case.', background: '#00FFCC', accent: '#4F46E5' },
        { headline: "You don't need more leads. You need answered calls.", background: '#FFFFFF', accent: '#00FFCC' },
        { headline: 'Every voicemail is a patient choosing someone else.', background: '#080B16', accent: '#60A5FA', dark: true },
      ],
    },
    {
      persona: 'Med spa',
      customer: 'Med spa owners',
      angle: 'Luxury consults',
      color: '#F0ABFC',
      pain: 'Medium',
      speed: 'Fast',
      cards: [
        { headline: 'Empty consult slots are not a demand problem.', background: '#FFFFFF', accent: '#F0ABFC' },
        { headline: 'Your best leads are asking one question: price.', background: '#080B16', accent: '#F0ABFC', dark: true },
        { headline: 'Turn interest into booked consultations.', background: '#F0ABFC', accent: '#4F46E5' },
      ],
    },
    {
      persona: 'HVAC',
      customer: 'Home service teams',
      angle: 'Emergency calls',
      color: '#60A5FA',
      pain: 'High',
      speed: 'Urgent',
      cards: [
        { headline: 'The hottest lead is the one calling right now.', background: '#080B16', accent: '#60A5FA', dark: true },
        { headline: 'After-hours calls should still become booked jobs.', background: '#00FFCC', accent: '#4F46E5' },
        { headline: 'Miss the call. Lose the job.', background: '#FFFFFF', accent: '#60A5FA' },
      ],
    },
    {
      persona: 'Legal',
      customer: 'Law firms',
      angle: 'After-hours intake',
      color: '#FBBF24',
      pain: 'High',
      speed: 'Steady',
      cards: [
        { headline: 'New cases do not wait for office hours.', background: '#FBBF24', accent: '#4F46E5' },
        { headline: 'Your intake form is not answering the phone.', background: '#FFFFFF', accent: '#FBBF24' },
        { headline: 'Capture the case before they call another firm.', background: '#080B16', accent: '#FBBF24', dark: true },
      ],
    },
    {
      persona: 'Fitness',
      customer: 'Fitness studios',
      angle: 'Trial bookings',
      color: '#FB7185',
      pain: 'Medium',
      speed: 'Fast',
      cards: [
        { headline: 'Trial leads go cold faster than you think.', background: '#FB7185', accent: '#00FFCC' },
        { headline: 'More DMs should become booked intros.', background: '#FFFFFF', accent: '#FB7185' },
        { headline: 'Stop letting motivated leads drift away.', background: '#080B16', accent: '#FB7185', dark: true },
      ],
    },
    {
      persona: 'Real estate',
      customer: 'Real estate teams',
      angle: 'Lead follow-up',
      color: '#A78BFA',
      pain: 'Medium',
      speed: 'Fast',
      cards: [
        { headline: 'The first agent to respond usually wins.', background: '#A78BFA', accent: '#00FFCC' },
        { headline: 'Every Zillow lead needs instant follow-up.', background: '#FFFFFF', accent: '#A78BFA' },
        { headline: 'Speed-to-lead is the whole game.', background: '#080B16', accent: '#A78BFA', dark: true },
      ],
    },
  ];
  const activePersonaDeck = personaDecks[activePersonaDeckIndex];
  const saveTemplateModal = saveTemplateOpen ? (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Save Design</h2>
            <p className="mt-1 text-sm text-slate-500">Save this layout so you can reuse it later.</p>
          </div>
          <button
            type="button"
            onClick={() => setSaveTemplateOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <input
          type="text"
          value={templateDraftName}
          onChange={(e) => setTemplateDraftName(e.target.value)}
          placeholder={getCurrentDesignTitle()}
          className="mb-3 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
          autoFocus
        />
        <button
          type="button"
          onClick={() => saveCurrentTemplate()}
          className="wiggly-primary-action flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
        >
          <BookmarkPlus className="h-4 w-4" />
          Save Design
        </button>
      </div>
    </div>
  ) : null;
  const exportStatusCard = (rendering || exportDownload || exportPhase === 'error') ? (
    <div className="wiggly-export-card fixed bottom-5 right-5 z-50 w-[300px] p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-indigo-50 p-2">
          {exportDownload ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : exportPhase === 'error' ? (
            <X className="h-4 w-4 text-red-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">
              {exportDownload
                ? 'Video ready'
                : exportPhase === 'error'
                  ? 'Video failed'
                  : exportPhase === 'converting'
                    ? 'Finishing video'
                    : 'Making video'}
            </p>
            {exportDownload || exportPhase === 'error' ? (
              <button
                type="button"
                onClick={() => {
                  if (exportDownload) URL.revokeObjectURL(exportDownload.url);
                  setExportDownload(null);
                  setShareStatus('idle');
                  setShareUrl('');
                  setShareError('');
                  setExportPhase('recording');
                }}
                className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Dismiss export status"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">{Math.round(renderProgress)}%</span>
                <button
                  type="button"
                  onClick={cancelExport}
                  className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="Cancel export"
                  title="Cancel export"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            )}
          </div>
          {!exportDownload && exportPhase !== 'error' && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-indigo-500 transition-all duration-200 ${exportPhase === 'converting' ? 'animate-pulse' : ''}`}
                style={{ width: `${renderProgress}%` }}
              />
            </div>
          )}
          <p className="mt-2 text-xs leading-snug text-slate-500">
            {exportDownload
              ? `Ready to save: ${formatBytes(exportDownload.blob.size)} video.`
              : exportPhase === 'error'
                ? 'Try making the video again. If it repeats, restart the app.'
                : exportPhase === 'converting'
                  ? 'Finishing the video. Keep this tab open.'
                  : 'Making this video. You can keep working while it finishes.'}
          </p>
          {exportDownload && (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={downloadReadyExport}
                className="wiggly-primary-action flex w-full items-center justify-center gap-2 px-3 py-2 text-sm font-semibold"
              >
                <Download className="h-4 w-4" />
                Download Video
              </button>
              <button
                type="button"
                onClick={createShareLink}
                disabled={shareStatus === 'saving'}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {shareStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {shareStatus === 'saving' ? 'Creating link' : 'Create share link'}
              </button>
              {shareUrl && (
                <div className="rounded-xl border border-indigo-100 bg-white p-2">
                  <p className="mb-2 truncate text-xs font-semibold text-slate-500">{shareUrl}</p>
                  <p className="mb-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">
                    {shareIsLocalPreview ? 'Local preview only. Add the server Supabase key to share with friends.' : 'Share link copied. Open it once before sending.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(shareUrl)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')}
                      className="flex items-center justify-center gap-1 rounded-lg bg-slate-950 px-2 py-1.5 text-xs font-black text-white transition hover:bg-slate-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </button>
                  </div>
                </div>
              )}
              {shareStatus === 'error' && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{shareError || 'Could not create share link.'}</p>
              )}
              <button
                type="button"
                onClick={openReadyExport}
                className="wiggly-secondary-action flex w-full items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Preview Video
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  if (appRoute === 'create') {
    return (
      <>
        <CreateFlow
          audioFileName={audioFileName}
          hasUserAudio={Boolean(currentAudioAssetId) || Boolean(generatedDialogueAudioUrl)}
          onAudioUpload={(event) => {
            void handleAudioUpload(event);
            if (event.target) event.target.value = '';
          }}
          audioUrl={audioUrl}
          audioAnalysis={previewAudioAnalysis}
          platform={platform}
          backgroundColor={bgColor}
          bgMedia={bgMedia}
          bgShadow={bgShadow}
          bgShadowOpacity={bgShadowOpacity}
          introImage={introImage}
          introDuration={introDuration}
          introFeedCropY={introFeedCropY}
          introImageAspect={introImageAspect}
          previewDurationCap={renderDurationCap === 'full' ? null : renderDurationCap}
          playing={playing}
          onTogglePlayback={togglePlayback}
          onPlaybackComplete={() => setPlaying(false)}
          onDownloadVideo={() => void downloadSimulatedVideo()}
          onSaveDesign={openSaveDesignDialog}
          onPlatformChange={setPlatform}
          onRefreshBackgroundColor={refreshBackgroundColor}
          onApplyStyleArchetype={applyStyleArchetype}
          onPreviewVariation={(variation, nextBrandBrain) => applyGeneratedAdVariation(variation, nextBrandBrain, false, false)}
          onOpenBuilder={(variation, nextBrandBrain) => applyGeneratedAdVariation(variation, nextBrandBrain, true, false)}
          onOpenStudio={enterStudio}
          rendering={rendering}
        />
        {exportStatusCard}
        {saveTemplateModal}
      </>
    );
  }

  if (appRoute === 'share') {
    return (
      <ShareAdPage
        record={sharePageRecord}
        loading={sharePageLoading}
        onOpenBuilder={enterStudio}
      />
    );
  }

  if (appRoute === 'builder' && isMobileViewport) {
    return <MobileBuilderPlaceholder onHome={openHomepage} />;
  }

  if (showHomepage) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] font-sans text-slate-950">
        <header className="flex h-16 items-center justify-between bg-[#FBF7EF] px-6 md:px-10">
          <div className="flex items-center gap-3">
            <img src="/wiggly-logo.svg" alt="Wiggly" className="h-9 w-9 rounded-xl object-cover shadow-sm shadow-slate-950/10" />
            <p className="text-xl font-black leading-none tracking-normal text-slate-950">Wiggly</p>
          </div>
          <button
            type="button"
            onClick={enterStudio}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Open Studio
            <ArrowRight className="h-4 w-4" />
          </button>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
          <div className="relative grid min-h-[calc(100vh-120px)] items-center gap-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-10 shadow-2xl shadow-slate-900/8 md:grid-cols-[0.9fr_1.1fr] md:px-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(0,255,204,0.28),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(79,70,229,0.13),transparent_30%),linear-gradient(180deg,rgba(246,248,251,0),rgba(246,248,251,0.92))]" />
            <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-[#00FFCC]/20 blur-3xl" />
            <section className="max-w-xl">
              <div className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm backdrop-blur">
                <AudioLines className="h-4 w-4 text-[#00FFCC]" />
                Simple video ads for service businesses
              </div>
              <h1 className="relative text-5xl font-black leading-[0.95] tracking-normal text-slate-950 md:text-7xl">
                Make video ads without learning video editing.
              </h1>
              <p className="relative mt-6 max-w-lg text-lg font-medium leading-8 text-slate-600">
                Start with a ready-made design, add your message or voice recording, preview how it looks on Facebook, Instagram, or YouTube, then download the finished ad.
              </p>
              <div className="relative mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openCreateFlow}
                  className="inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-8 py-4 text-base font-black text-white shadow-xl shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Make an ad
                  <Wand2 className="h-5 w-5" />
                </button>
              </div>
            </section>

            <section className="relative flex gap-4 overflow-x-auto pb-4 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:block md:min-h-[560px] md:overflow-visible md:pb-0 md:pt-0">
              <div className="w-[172px] shrink-0 rotate-[-3deg] snap-center sm:w-[210px] md:absolute md:left-[8%] md:top-[8%] md:w-[36%] md:rotate-[-5deg]">
                <HomeAdCard headline="One lunch break can cost a $3,200 case." />
              </div>
              <div className="w-[172px] shrink-0 rotate-[2deg] snap-center sm:w-[210px] md:absolute md:left-[36%] md:top-0 md:w-[38%] md:rotate-[3deg]">
                <HomeAdCard headline="You don't need more leads. You need answered calls." background="#FFFFFF" accent="#4F46E5" />
              </div>
              <div className="w-[172px] shrink-0 rotate-[3deg] snap-center sm:w-[210px] md:absolute md:bottom-[4%] md:right-[4%] md:w-[36%] md:rotate-[6deg]">
                <HomeAdCard headline="Every voicemail is a patient choosing someone else." background="#080B16" accent="#6D5BFF" dark />
              </div>
              <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:absolute md:bottom-[12%] md:left-[18%] md:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00FFCC]/15">
                    <AudioLines className="h-5 w-5 text-[#00BFA5]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Headline + audio + button</p>
                    <p className="text-xs font-semibold text-slate-500">A simple ad layout you can reuse.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="pb-16 pt-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-black uppercase tracking-wide text-slate-400">Built for busy marketers</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950 md:text-5xl">
                Make the ad. Change the words. Ship the video.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Wand2,
                  title: 'New headline ideas',
                  copy: 'Click once to try a different headline when you are stuck.',
                },
                {
                  icon: AudioLines,
                  title: 'Audio that looks alive',
                  copy: 'Turn a voice recording into moving bars, captions, and a clean ad layout.',
                },
                {
                  icon: CheckCircle2,
                  title: 'See each placement',
                  copy: 'Preview the ad in Facebook feed, Instagram feed, reels, stories, and YouTube.',
                },
                {
                  icon: BookmarkPlus,
                  title: 'Reuse good designs',
                  copy: 'Save a layout once, then swap the text and audio for the next ad.',
                },
                {
                  icon: Download,
                  title: 'Download the ad',
                  copy: 'Get a video file you can upload to your ad account.',
                },
                {
                  icon: MousePointerClick,
                  title: 'No design degree needed',
                  copy: 'Everything is already laid out so you can focus on the message.',
                },
              ].map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <feature.icon className="mb-5 h-10 w-10 stroke-[2.4] text-slate-950" />
                  <h3 className="text-2xl font-black leading-tight tracking-normal text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{feature.copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative py-10 lg:px-10">
            <div className="absolute inset-x-0 top-20 bottom-16 overflow-hidden rounded-[2rem] bg-slate-950 shadow-2xl shadow-slate-900/15">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(0,255,204,0.18),transparent_28%),radial-gradient(circle_at_65%_42%,rgba(79,70,229,0.32),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_38%)]" />
              <div className="pointer-events-none absolute left-[28%] top-[12%] h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            </div>
            <div className="relative grid min-h-[640px] gap-6 text-white lg:grid-cols-[0.85fr_1.3fr_0.85fr]">
              <div className="self-start rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl lg:-ml-8">
                <p className="mb-5 text-sm font-black uppercase tracking-wide text-white/40">Pick who the ad is for</p>
                {personaDecks.map((deck, index) => (
                  <button
                    key={deck.persona}
                    type="button"
                    onClick={() => setActivePersonaDeckIndex(index)}
                    className={`group flex w-full items-center gap-3 border-b border-white/10 py-4 text-left transition last:border-b-0 ${index === activePersonaDeckIndex ? 'text-white' : 'text-white/55 hover:text-white'}`}
                    aria-pressed={index === activePersonaDeckIndex}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-black text-slate-950 transition group-hover:scale-105" style={{ backgroundColor: deck.color }}>
                      +
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-black leading-tight">{deck.persona}</span>
                      <span className="block truncate text-sm font-semibold text-white/40">{deck.angle}</span>
                    </span>
                    <Play className={`h-4 w-4 fill-white transition group-hover:text-white ${index === activePersonaDeckIndex ? 'text-white' : 'text-white/45'}`} />
                  </button>
                ))}
              </div>

              <div className="relative hidden min-h-[600px] lg:block">
                {activePersonaDeck.cards.map((card, index) => {
                  const positions = [
                    'left-[1%] top-[11%] w-[39%] rotate-[-7deg]',
                    'left-[30%] top-[20%] w-[40%] rotate-[3deg]',
                    'bottom-[8%] right-[-2%] w-[39%] rotate-[-4deg]',
                  ];
                  return (
                    <div key={`${activePersonaDeck.persona}-${card.headline}`} className={`absolute transition-all duration-300 ${positions[index]}`}>
                      <HomeAdCard headline={card.headline} background={card.background} accent={card.accent} dark={card.dark} />
                    </div>
                  );
                })}
              </div>

              <div className="self-start rounded-3xl border border-white/10 bg-white/[0.72] p-5 text-slate-950 shadow-2xl shadow-slate-950/20 backdrop-blur-xl lg:-mr-8 lg:mt-8">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-black">Wiggly</p>
                  <span className="h-8 w-14 rounded-full bg-[#00C6A6] p-1">
                    <span className="block h-6 w-6 translate-x-6 rounded-full bg-white shadow-sm" />
                  </span>
                </div>
                <div className="mt-5 border-t border-slate-950/10 pt-5">
                  <p className="text-sm font-black uppercase tracking-wide text-slate-400">Audience</p>
                  <p className="mt-2 text-2xl font-black leading-tight">{activePersonaDeck.customer}</p>
                </div>
                <div className="mt-6 space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-500">
                      <span>How urgent?</span>
                      <span>{activePersonaDeck.pain}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950/10">
                      <div className={`h-2 rounded-full bg-slate-950 ${activePersonaDeck.pain === 'High' ? 'w-4/5' : 'w-3/5'}`} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-500">
                      <span>How fast to test?</span>
                      <span>{activePersonaDeck.speed}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950/10">
                      <div className={`h-2 rounded-full bg-[#4F46E5] ${activePersonaDeck.speed === 'Urgent' ? 'w-full' : activePersonaDeck.speed === 'Steady' ? 'w-2/3' : 'w-11/12'}`} />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openCreateFlow}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Start with this audience
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="relative -mt-8 text-center text-sm font-black text-white/35">
              Pick who you are selling to. Wiggly gives you ad ideas to start from.
            </p>
          </section>

          <section className="py-16">
            <div className="mb-12 max-w-4xl">
              <h2 className="text-4xl font-black leading-[0.95] tracking-normal text-slate-950 md:text-6xl">
                The boring ad tasks are handled for you.
              </h2>
              <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-500">
                Choose a design, change the message, check how it looks, and download the version you like.
              </p>
            </div>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Wand2, title: 'Headline ideas' },
                { icon: AudioLines, title: 'Moving audio bars' },
                { icon: Layers, title: 'Reusable layouts' },
                { icon: Captions, title: 'On-screen captions' },
                { icon: Type, title: 'Editable text' },
                { icon: BookmarkPlus, title: 'Saved designs' },
                { icon: CheckCircle2, title: 'Feed, reel, and YouTube previews' },
                { icon: Download, title: 'Finished video downloads' },
              ].map((item) => (
                <div key={item.title} className="group flex flex-col items-center text-center">
                  <item.icon className="mb-5 h-16 w-16 stroke-[2.8] text-slate-950 transition duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:text-[#4F46E5]" />
                  <h3 className="max-w-[12rem] text-2xl font-black leading-tight tracking-normal text-slate-950">
                    {item.title}
                  </h3>
                </div>
              ))}
            </div>
          </section>

          <section className="relative mb-16 overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-white shadow-2xl shadow-slate-900/15 md:px-12 md:py-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,255,204,0.22),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(79,70,229,0.32),transparent_34%)]" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-[#00FFCC]">Make more ads faster</p>
                <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-normal md:text-6xl">
                  Make ten versions before lunch.
                </h2>
                <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/62">
                  Start with a saved design, try a different headline, preview the ad, then download the version that feels strongest.
                </p>
                <button
                  type="button"
                  onClick={openCreateFlow}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  Open Wiggly
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Headline', 'Lunch break = lost case'],
                    ['Format', 'IG Feed 4:5'],
                    ['Visual', 'Moving audio bars'],
                    ['Download', '30 second video'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white/[0.09] p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-white/35">{label}</p>
                      <p className="mt-2 text-lg font-black leading-tight text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-[#00FFCC] p-5 text-slate-950">
                  <p className="text-sm font-black uppercase tracking-wide opacity-60">Current message</p>
                  <p className="mt-2 text-3xl font-black leading-none tracking-normal">Stop losing patients to voicemail.</p>
                  <div className="mt-5 flex h-3 items-center gap-2">
                    <span className="h-3 w-12 rounded-full bg-slate-950" />
                    <span className="h-3 w-7 rounded-full bg-[#4F46E5]" />
                    <span className="h-3 w-16 rounded-full bg-slate-950" />
                    <span className="h-3 w-9 rounded-full bg-[#4F46E5]" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="relative overflow-hidden px-6 pb-10 md:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-slate-200 pt-8 text-sm font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Wiggly. Visual ads that move fast.</p>
            <button type="button" onClick={enterStudio} className="text-slate-950 transition hover:text-[#4F46E5]">
              Open Studio
            </button>
          </div>
          <div className="pointer-events-none -mb-8 hidden select-none overflow-hidden bg-gradient-to-b from-slate-950/10 to-slate-950/0 bg-clip-text text-center text-[10rem] font-black leading-none text-transparent sm:block md:text-[15rem]">
            Wiggly
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="wiggly-builder-shell flex h-screen w-full flex-col overflow-hidden font-sans text-slate-900">
      {/* Header */}
      <header className="wiggly-builder-header flex shrink-0 items-center justify-between px-5 lg:px-6">
        <button
          type="button"
          onClick={openHomepage}
          className="wiggly-brand-button flex items-center gap-3 rounded-2xl text-left transition"
          title="Open homepage"
        >
          <img src="/wiggly-logo.svg" alt="Wiggly" className="h-10 w-10 rounded-2xl object-cover shadow-sm shadow-slate-950/10" />
          <span>
            <span className="block text-lg font-black leading-none tracking-normal text-slate-950">{appTitle}</span>
            <span className="wiggly-brand-subtitle mt-0.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Visual ads that move fast</span>
          </span>
        </button>
        
        <div className="wiggly-header-actions flex items-center gap-3">
          <div className="wiggly-builder-nav flex items-center gap-1 rounded-full p-1">
            <button
              onClick={() => setActiveTab('single')}
              className={`wiggly-nav-button ${activeTab === 'single' ? 'wiggly-nav-button-active' : ''}`}
            >
              Make One Ad
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`wiggly-nav-button ${activeTab === 'batch' ? 'wiggly-nav-button-active' : ''}`}
            >
              Make Many Ads
            </button>
          </div>
          {activeTab === 'single' && (
            <div className="wiggly-mode-switch ml-1 grid grid-cols-2 rounded-full p-1">
              {([
                { id: 'visualizer', label: 'Audio Ad', icon: AudioLines },
                { id: 'phone-call', label: 'Phone Call', icon: PhoneCall },
              ] as const).map((mode) => {
                const Icon = mode.icon;
                const active = creativeMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      switchCreativeMode(mode.id);
                    }}
                    className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition ${active ? 'wiggly-mode-button-active' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="wiggly-builder-workspace flex flex-1 overflow-hidden">
        {/* Settings Sidebar */}
        <div className="wiggly-sidebar hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto overflow-x-hidden lg:flex">
            
            {activeTab === 'single' ? (
              <>
              {creativeMode === 'visualizer' ? (
              <>
              <div className="wiggly-panel p-4">
                {renderAudioPanel('visualizer')}
              </div>

              <PropertiesPanel />

              <details className="wiggly-panel group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span>
                    <span className="wiggly-panel-title block uppercase">Edit Parts</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">Add logos, images, captions, and buttons.</span>
                  </span>
                  <span className="text-lg font-black text-slate-400 transition group-open:rotate-90">›</span>
                </summary>
                <div className="mt-4 space-y-2">
                  {[
                    { label: 'Headline', description: headlineCount > 0 ? 'Add another big line' : 'Main ad message', icon: Type, action: handleAddHeadline, added: false, count: headlineCount },
                    { label: 'Sub-headline', description: subheadlineCount > 0 ? 'Add another small line' : 'Extra line under the headline', icon: Type, action: handleAddSubheadline, added: false, count: subheadlineCount },
                    { label: 'Moving Bars', description: visualizerCount > 0 ? 'Add another audio bar' : 'Bars that move with the voice', icon: AudioLines, action: handleAddVisualizer, added: false, count: visualizerCount },
                    { label: 'Captions', description: captionCount > 0 ? 'Add another caption box' : 'Words shown as the audio plays', icon: Captions, action: handleAddCaptions, added: false, count: captionCount },
                    { label: 'Button', description: ctaCount > 0 ? 'Add another button' : 'Call-to-action button', icon: MousePointerClick, action: handleAddCta, added: false, count: ctaCount },
                    { label: 'Logo', description: logoCount > 0 ? 'Add another logo' : 'Brand logo', icon: ImageIcon, action: handleAddLogo, added: false, count: logoCount },
                  ].map((component) => {
                    const Icon = component.icon;
                    const componentCount = 'count' in component ? component.count : 0;
                    return (
                      <button
                        key={component.label}
                        type="button"
                        onClick={component.action}
                        disabled={component.added}
                        className="wiggly-item-row flex w-full items-center justify-between gap-3 px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="flex items-center gap-3">
                          <span className="wiggly-icon-tile">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-slate-800">{component.label}</span>
                            <span className="block text-xs text-slate-500">{component.description}</span>
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-slate-400">{component.added ? 'Added' : componentCount > 0 ? `${componentCount} added` : 'Add'}</span>
                      </button>
                    );
                  })}
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        handleAddImageElement(e);
                        if(e.target) e.target.value = '';
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      title="Add image"
                    />
                    <div className="wiggly-item-row flex w-full items-center justify-between gap-3 border-dashed px-3 py-3 text-left">
                      <span className="flex items-center gap-3">
                        <span className="wiggly-icon-tile">
                          <Layers className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">Image</span>
                          <span className="block text-xs text-slate-500">Upload product or proof image</span>
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-slate-400">Upload</span>
                    </div>
                  </div>
                </div>
              </details>

              <details className="wiggly-panel group p-4">
                <summary className="mb-4 flex cursor-pointer list-none items-center justify-between gap-3">
                  <span>
                    <span className="wiggly-panel-title block uppercase">Advanced</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">Style, media, labels, and post settings.</span>
                  </span>
                  <span className="text-lg font-black text-slate-400 transition group-open:rotate-90">›</span>
                </summary>
                  <div className="space-y-2">
                    {[
                    { label: 'Visualizer', value: visualizerColor, onChange: handleVisualizerColorChange },
                    { label: 'Captions + button', value: accentColor, onChange: handleAccentColorChange },
                    { label: 'Background', value: bgColor, onChange: setBgColor },
                  ].map((colorControl) => (
                    <HexColorInput
                      key={colorControl.label}
                      label={colorControl.label}
                      value={colorControl.value}
                      onChange={colorControl.onChange}
                    />
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex min-w-0 gap-2">
                    <div className="relative group min-w-0 flex-1">
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        onChange={(e) => {
                          handleImageUpload(e);
                          if(e.target) e.target.value = '';
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Upload background"
                      />
                      <div className="wiggly-item-row flex h-full w-full items-center justify-between border-dashed px-3 py-3 text-sm text-slate-600">
                        <span className="flex items-center gap-3">
                          <span className="wiggly-icon-tile">
                            <Upload className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-700">Background image/video</span>
                            <span className="block text-xs text-slate-500">Image or video</span>
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {bgMedia ? "Loaded" : "Upload"}
                        </span>
                      </div>
                    </div>
                    {bgMedia && (
                      <button
                        onClick={() => setBgMedia(null)}
                        title="Remove Background"
                        className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {bgMedia && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      <label className="flex cursor-pointer items-center justify-between gap-3">
                        <span>
                          <span className="block text-sm font-semibold text-slate-700">Dark overlay</span>
                          <span className="block text-xs text-slate-500">Darken media behind the ad text</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={bgShadow}
                          onChange={(e) => setBgShadow(e.target.checked)}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </label>
                      <div className={bgShadow ? 'mt-3 space-y-1.5' : 'mt-3 space-y-1.5 opacity-40'}>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-600">Intensity</label>
                          <span className="text-xs font-semibold text-slate-500">{Math.round(bgShadowOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.75"
                          step="0.05"
                          value={bgShadowOpacity}
                          disabled={!bgShadow}
                          onChange={(e) => setBgShadowOpacity(parseFloat(e.target.value))}
                          className="w-full cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="relative group flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleIntroImageUpload(e);
                          if(e.target) e.target.value = '';
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Upload intro image"
                      />
                      <div className="wiggly-item-row flex h-full w-full min-w-0 items-center justify-between gap-2 border-dashed px-3 py-3 text-sm text-slate-600">
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="wiggly-icon-tile">
                            <ImageIcon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1 overflow-hidden">
                            <span className="block font-semibold text-slate-700">Intro image</span>
                            <span className="block truncate text-xs text-slate-500">{introImage ? introFileName || `Shows first ${introDuration}s` : 'No intro image'}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-slate-400">
                          {introImage ? "Loaded" : "Upload"}
                        </span>
                      </div>
                    </div>
                    {introImage && (
                      <button
                        onClick={() => {
                          setIntroImage(null);
                          setIntroFileName('');
                        }}
                        title="Remove intro image"
                        className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {introImage && (
                    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">How long to show it</span>
                        <span className="text-xs font-semibold text-slate-400">{introDuration}s then fade</span>
                      </div>
                      <div className="grid grid-cols-3 rounded-md bg-slate-100 p-1">
                        {([0, 1, 2, 3] as const).map((duration) => (
                          <button
                            key={duration}
                            type="button"
                            onClick={() => setIntroDuration(duration)}
                            className={`rounded px-2 py-1.5 text-xs font-bold transition ${
                              introDuration === duration
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {duration}s
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIntroCropOpen(true)}
                        className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white hover:text-slate-900"
                      >
                        Check feed preview
                      </button>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-600">Audio in the video</span>
                      <span className="text-xs font-semibold text-slate-400">
                        {renderDurationCap === 'full' ? 'Whole recording' : `First ${renderDurationCap}s`}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setRenderDurationCap('full')}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                          renderDurationCap === 'full'
                            ? 'border-indigo-200 bg-indigo-50 text-slate-900 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span>
                          <span className="block text-xs font-bold">Use the whole recording</span>
                          <span className="mt-0.5 block text-[11px] font-medium text-slate-500">Best default. No silence gets added.</span>
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-wide text-indigo-500">Default</span>
                      </button>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRenderDurationCap(30)}
                          className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                            renderDurationCap === 30
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Cut to first 30s
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenderDurationCap(60)}
                          className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                            renderDurationCap === 60
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Cut to first 60s
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] font-medium leading-snug text-slate-400">
                      Shorten only when a platform needs a shorter ad.
                    </p>
                  </div>

                  <div className="wiggly-timeline w-full p-3">
                    {creativeMode === 'phone-call' ? (
                      <>
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Timing</span>
                          <span className="text-xs font-semibold text-slate-500">Ring then voicemail</span>
                        </div>
                        <div className="flex h-8 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                          {phoneRingDuration > 0 && (
                            <div
                              className="flex min-w-[56px] items-center justify-center border-r border-white bg-emerald-500 text-[10px] font-bold text-white"
                              style={{ width: `${Math.max(16, phoneRingDuration * 12)}%` }}
                            >
                              Ring {phoneRingDuration}s
                            </div>
                          )}
                          <div className="flex flex-1 items-center justify-center bg-slate-900 text-[10px] font-bold text-white">
                            {phoneRingDuration > 0 ? 'Voicemail' : 'Recording includes ring'}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-400">
                          <span>0s</span>
                          <span>{phoneRingDuration > 0 ? 'Timer starts after ring' : 'No extra ring added'}</span>
                          <span>End</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Timing</span>
                          <span className="text-xs font-semibold text-slate-500">
                            {renderDurationCap === 'full' ? 'Full voice audio' : `${selectedTimelineDuration}s`}
                          </span>
                        </div>
                        <div className="flex h-8 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                          {introImage && (
                            <div
                              className="flex min-w-[46px] items-center justify-center border-r border-white bg-indigo-500 text-[10px] font-bold text-white"
                              style={{ width: introTimelineWidth }}
                              title={`Intro image: ${introDuration}s`}
                            >
                              Intro {introDuration}s
                            </div>
                          )}
                          <div className="flex flex-1 items-center justify-center bg-slate-900 text-[10px] font-bold text-white">
                            Main ad {mainTimelineSeconds}s
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-400">
                          <span>0s</span>
                          {introImage ? <span>Fade after {introDuration}s</span> : <span>No intro</span>}
                          <span>{renderDurationCap === 'full' ? 'End' : `${selectedTimelineDuration}s`}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </details>

              <details className="wiggly-panel group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span>
                    <span className="wiggly-panel-title block uppercase">Post Settings</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">Preview theme, profile, CTA, and caption.</span>
                  </span>
                  <span className="text-lg font-black text-slate-400 transition group-open:rotate-90">›</span>
                </summary>
                
                <div className="mt-4 space-y-4">

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPlatformTheme('dark')}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${platformTheme === 'dark' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-950/15' : 'border-slate-200 bg-white/75 text-slate-700 hover:border-indigo-200 hover:bg-white hover:shadow-sm'}`}
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatformTheme('light')}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${platformTheme === 'light' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-950/15' : 'border-slate-200 bg-white/75 text-slate-700 hover:border-indigo-200 hover:bg-white hover:shadow-sm'}`}
                    >
                      <Sun className="w-4 h-4" />
                      Light
                    </button>
                  </div>

                  <div className="space-y-2">
                    {[
                      { id: 'safeZonesToggle', label: 'Show safe area', checked: showSafeZones, onChange: setShowSafeZones },
                      { id: 'redGuidesToggle', label: 'Show guide labels', checked: showRedGuides, onChange: setShowRedGuides },
                    ].map((toggle) => (
                      <label key={toggle.id} htmlFor={toggle.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/75 px-3 py-2 shadow-sm">
                        <span className="text-sm font-semibold text-slate-700">{toggle.label}</span>
                        <span className="relative inline-block h-5 w-9">
                          <input
                            type="checkbox"
                            id={toggle.id}
                            checked={toggle.checked}
                            onChange={(event) => toggle.onChange(event.target.checked)}
                            className="peer sr-only"
                          />
                          <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-slate-900" />
                          <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-700">Account name</span>
                      <input 
                        type="text" 
                        value={brandName}
                        onChange={e => setBrandName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20" 
                      />
                    </label>

                    <div className="flex gap-2">
                       <div className="relative flex-1 group">
                         <input 
                           type="file" 
                           accept="image/*"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const url = URL.createObjectURL(file);
                               setBrandLogo(url);
                             }
                           }}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                         />
                         <div className="w-full px-3 py-3 border border-slate-200 border-dashed rounded-lg bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-between pointer-events-none">
                           <span>
                              <span className="block text-sm font-semibold text-slate-700">Profile picture or logo</span>
                              <span className="block text-xs text-slate-500">Shows next to the ad</span>
                           </span>
                           <span className="text-xs font-semibold text-slate-400">
                              {brandLogo ? "Uploaded" : "Upload"}
                           </span>
                         </div>
                       </div>
                       {brandLogo && (
                          <button 
                             onClick={() => setBrandLogo(null)}
                             title="Remove Logo"
                             className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                          >
                             <X className="w-4 h-4" />
                          </button>
                       )}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Ad button text</label>
                    <select 
                      value={autoCta}
                      onChange={e => setAutoCta(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    >
                      <option value="Learn More">Learn More</option>
                      <option value="Get Quote">Get Quote</option>
                      <option value="Book Now">Book Now</option>
                      <option value="Shop Now">Shop Now</option>
                      <option value="Sign Up">Sign Up</option>
                    </select>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700">Ad button link</span>
                    <input
                      type="url"
                      value={ctaUrl}
                      onChange={(event) => setCtaUrl(event.target.value)}
                      placeholder="https://example.com/book"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                    />
                    <span className="block text-[11px] font-semibold text-slate-400">Used on Wiggly share pages. The MP4 itself is still just a video.</span>
                  </label>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      Post caption
                    </label>
                    <textarea 
                      value={simulatedCaption}
                      onChange={e => setSimulatedCaption(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 resize-none" 
                    />
                    <div className="flex justify-end text-[10px] text-slate-400 font-medium">
                       {simulatedCaption.length > 125 ? <span className="flex items-center gap-1 text-orange-500">This may get shortened in the feed</span> : `${125 - simulatedCaption.length} characters before it may shorten`}
                    </div>
                  </div>
                </div>
              </details>

              <details className="wiggly-panel group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span>
                    <span className="wiggly-panel-title block uppercase">Visualizer Tuning</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">Fine-tune how the bars move.</span>
                  </span>
                  <span className="text-lg font-black text-slate-400 transition group-open:rotate-90">›</span>
                </summary>
                <div className="mt-4">
                  <DevTuningPanel />
                </div>
              </details>
              </>
              ) : (
                <>
                  <div className="wiggly-panel p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="wiggly-panel-title uppercase">Phone Call</h2>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">9:16</span>
                    </div>

                    <div className="space-y-4">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-slate-700">US phone number</span>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(event) => setPhoneNumber(event.target.value)}
                          placeholder="5551234567"
                          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                        />
                        <span className="mt-1 block text-xs font-semibold text-slate-400">{formatUsPhoneNumber(phoneNumber) || '(555) 123-4567'}</span>
                      </label>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">Ring duration</span>
                          <span className="text-xs font-semibold text-slate-400">{phoneRingDuration}s</span>
                        </div>
                        <div className="grid grid-cols-4 rounded-lg bg-slate-100 p-1">
                          {([0, 1, 2, 3] as const).map((duration) => (
                            <button
                              key={duration}
                              type="button"
                              onClick={() => setPhoneRingDuration(duration)}
                              className={`rounded-md px-2 py-2 text-xs font-black transition ${phoneRingDuration === duration ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              {duration}s
                            </button>
                          ))}
                        </div>
                      </div>

                      {renderAudioPanel('phone-call')}

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold leading-5 text-slate-500">
                          This looks like an outgoing iPhone call. If you add a ring, Wiggly plays a normal US phone ring before the voicemail.
                        </p>
                      </div>
                    </div>
                  </div>

                </>
              )}
              </>
            ) : (
              <div className="bg-indigo-900 rounded-xl border border-indigo-800 shadow-sm p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Make Many Ads</h2>
                  <Database className="w-4 h-4 text-indigo-400" />
                </div>
                
                <p className="text-[11px] leading-relaxed text-indigo-200 mb-4">
                  Upload a spreadsheet with a <strong>headline</strong> and <strong>audio link</strong> for each ad.
                </p>

                <div className="relative group mb-4">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleCsvUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-indigo-500/50 hover:bg-indigo-800/50 rounded-lg p-4 bg-indigo-950/20 transition-colors">
                    <Upload className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-200">
                      Upload spreadsheet
                    </span>
                  </div>
                </div>

                {csvData.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] leading-relaxed text-indigo-200 mb-2">
                      Ads to make: <span className="text-white font-semibold">{csvData.length}</span>
                    </p>
                    <div className="bg-indigo-950/50 rounded-lg border border-indigo-800 max-h-32 overflow-y-auto">
                      <table className="w-full text-left text-[10px]">
                        <thead className="sticky top-0 bg-indigo-900">
                          <tr>
                            <th className="px-2 py-1.5 font-medium text-indigo-300">#</th>
                            <th className="px-2 py-1.5 font-medium text-indigo-300">Headline</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-800/50">
                          {csvData.map((row, i) => (
                            <tr key={i}>
                              <td className="px-2 py-1.5 text-indigo-400">{i + 1}</td>
                              <td className="px-2 py-1.5 text-indigo-200 truncate max-w-[120px]">{row.headline || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <button 
                  onClick={runBatch}
                  disabled={batchStatus === 'processing' || csvData.length === 0}
                  className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold shadow-lg transition-colors flex justify-center items-center gap-2"
                >
                  {batchStatus === 'processing' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Making videos {Math.round(renderProgress)}%</>
                  ) : batchStatus === 'done' ? (
                    <><CheckCircle2 className="w-4 h-4" /> Videos ready</>
                  ) : (
                    "Make videos"
                  )}
                </button>
              </div>
            )}
            {activeTab === 'single' && creativeMode === 'visualizer' && (
              <div className="wiggly-panel p-3">
                <button
                  type="button"
                  onClick={() => setCreativeBriefOpen(true)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-800">Ad details</span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                    Change
                  </span>
                </button>
              </div>
            )}
            <div className="flex justify-end px-2 pb-2">
              <button
                type="button"
                onClick={replayGuidedJourney}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
                title="Replay guided journey"
                aria-label="Replay guided journey"
              >
                <Wand2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main Preview Area */}
          <div className={`wiggly-studio flex min-h-0 flex-1 flex-col items-center px-4 ${creativeMode === 'phone-call' ? 'justify-center overflow-y-auto overflow-x-visible py-4' : 'justify-center overflow-hidden py-5'}`}>
            
            {creativeMode === 'phone-call' ? (
              <div className="wiggly-stage-card relative w-full max-w-[420px] shrink-0 pb-8">
                <PhoneCallSimulator
                  phoneNumber={phoneNumber}
                  audioUrl={audioUrl}
                  ringDurationSeconds={phoneRingDuration}
                  playing={playing}
                  onPlaybackComplete={() => setPlaying(false)}
                />
              </div>
            ) : (
            <div className={`wiggly-stage-card relative w-full ${platform === 'youtube' ? 'max-w-[640px]' : 'max-w-[420px]'}`}>
              <PlatformFrame
                platform={platform}
                theme={platformTheme}
                brandName={brandName}
                brandLogo={brandLogo}
                caption={simulatedCaption}
                metaCta={autoCta}
              >
                <CanvasEditor 
                  platform={platform}
                  backgroundColor={bgColor}
                  bgMedia={bgMedia}
                  bgShadow={bgShadow}
                  bgShadowOpacity={bgShadowOpacity}
                  introImage={introImage}
                  introDuration={introDuration}
                  introFeedCropY={introFeedCropY}
                  introImageAspect={introImageAspect}
                  previewDurationCap={renderDurationCap === 'full' ? null : renderDurationCap}
                  audioUrl={audioUrl}
                  audioAnalysis={previewAudioAnalysis}
                  accentColor={accentColor}
                  playing={playing}
                  onPlaybackComplete={() => setPlaying(false)}
                  onRefreshBackgroundColor={refreshBackgroundColor}
                  onApplyStyleArchetype={applyStyleArchetype}
                />
              </PlatformFrame>
              
            </div>
            )}

            {/* Toolbar */}
            <div className="wiggly-toolbar mt-4 flex flex-col items-center gap-2">
                {creativeMode === 'visualizer' && (
                  <div
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black shadow-sm transition-all duration-500 ${
                      spaceRemixCueVisible
                        ? 'translate-y-0 border-indigo-100 bg-white text-slate-900 opacity-100'
                        : 'pointer-events-none -translate-y-1 border-transparent bg-white/0 text-slate-400 opacity-0'
                    }`}
                    aria-hidden={!spaceRemixCueVisible}
                  >
                    <span className="rounded-md bg-slate-950 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-white">Space</span>
                    <span>remix the ad</span>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-3">
                <button 
                  onClick={downloadSimulatedVideo}
                  disabled={rendering}
                  data-tour="download-button"
                  className={`wiggly-primary-action flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${exportLaunchAnimation ? 'wiggly-primary-action-launching' : ''}`}
                   >
                    {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {rendering ? 'Making Video' : 'Download Video'}
                  </button>
                <button 
                  onClick={togglePlayback}
                  data-tour="play-button"
                  className="wiggly-secondary-action flex items-center gap-2 self-start px-4 py-2 text-sm font-semibold"
                 >
                  {playing ? (
                    <><Square className="w-4 h-4 text-red-400" /> Stop</>
                  ) : (
                    <><Play className="w-4 h-4 fill-current text-indigo-500" /> Play</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={openSaveDesignDialog}
                  className="wiggly-secondary-action flex items-center gap-2 self-start px-4 py-2 text-sm font-semibold"
                >
                  <BookmarkPlus className="h-4 w-4 text-indigo-500" />
                  Save Design
                </button>
                <label className="wiggly-secondary-action flex items-center gap-2 self-start px-3 py-2 text-sm font-semibold">
                  <span className="text-slate-500">Preview</span>
                  <select
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value as PlatformType)}
                    className="bg-transparent text-sm font-bold text-slate-900 outline-none"
                    aria-label="Choose preview"
                  >
                    <option value="facebook-feed">FB Feed</option>
                    <option value="instagram-feed">IG Feed</option>
                    <option value="reels">Reels</option>
                    <option value="stories">Stories</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </label>
                {SOCIAL_POSTING_ENABLED && (
                  <button
                    type="button"
                    onClick={handlePostToSocials}
                    disabled={rendering}
                    className="wiggly-secondary-action flex items-center gap-2 self-start px-4 py-2 text-sm font-semibold text-slate-500 disabled:cursor-not-allowed disabled:opacity-80"
                  >
                    {rendering && postizAutoOpenAfterExport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>Post Online</span>
                  </button>
                )}
              </div>

            </div>
            
          </div>

          {/* Template Library */}
          {creativeMode === 'visualizer' && (
          showCompactDesignLibrary ? (
          <div className="hidden w-14 shrink-0 items-start justify-center border-l border-slate-200/70 bg-white/55 pt-5 xl:flex">
            <button
              type="button"
              onClick={() => setTemplateLibraryTab(templateLibraryTab === 'templates' ? 'history' : 'templates')}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
              title={templateLibraryTab === 'templates' ? 'No saved templates yet' : 'No download history yet'}
              aria-label={templateLibraryTab === 'templates' ? 'No saved templates yet' : 'No download history yet'}
            >
              <Database className="h-4 w-4" />
            </button>
          </div>
          ) : (
          <div className="wiggly-library hidden w-72 shrink-0 flex-col overflow-hidden xl:flex">
            <div className="border-b border-slate-100 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="wiggly-panel-title uppercase">Design Library</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Templates plus your last 20 downloaded ads.</p>
                </div>
                <span className="rounded-full bg-[#d9fff6] px-2 py-1 text-[11px] font-black text-slate-900">{activeTemplateCount}</span>
              </div>
              <div className="grid grid-cols-2 rounded-full border border-slate-200 bg-white/70 p-1">
                {(['templates', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTemplateLibraryTab(tab)}
                    className={`rounded-full px-2 py-1.5 text-xs font-bold transition ${templateLibraryTab === tab ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {tab === 'templates' ? 'Templates' : 'My History'}
                  </button>
                ))}
              </div>
              {templateLibraryTab === 'history' && (
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">History is saved on this device after you download a video.</p>
              )}
              {historySaveWarning && templateLibraryTab === 'history' && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">{historySaveWarning}</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {activeTemplateItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                  <Database className="mb-3 h-5 w-5 text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">{templateLibraryTab === 'templates' ? 'No templates yet' : 'No download history yet'}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {templateLibraryTab === 'templates'
                      ? 'When a layout works, save it here and reuse it for the next ad.'
                      : 'Downloaded ads will appear here so you can bring them back exactly.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {activeTemplateItems.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => loadTemplate(template)}
                      title={`Use ${getTemplateTitle(template)}`}
                      className="wiggly-template-card group relative overflow-hidden rounded-2xl p-2 text-left transition active:scale-[0.99]"
                    >
                      <TemplatePreview template={template} />
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <p className="min-w-0 truncate text-xs font-bold text-slate-700">{getTemplateTitle(template)}</p>
                        <span className="text-[10px] font-semibold text-slate-400">{template.elements.length}</span>
                      </div>
                      <span className="pointer-events-none absolute inset-2 rounded-lg bg-indigo-500/0 transition group-hover:bg-indigo-500/5" />
                      {!template.builtIn && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            templateLibraryTab === 'templates' ? deleteTemplate(template.id) : deleteHistoryItem(template.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              templateLibraryTab === 'templates' ? deleteTemplate(template.id) : deleteHistoryItem(template.id);
                            }
                          }}
                          title={templateLibraryTab === 'templates' ? 'Delete template' : 'Delete history item'}
                          className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-400 opacity-0 shadow-sm transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          )
          )}
        </main>

        {exportStatusCard}

        {postizOpen && (
          <div className="fixed inset-0 z-[74] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Post This Ad</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose where it should go. Wiggly will make a draft with this video and caption so you can review it before posting.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPostizOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Draft caption</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{getPostizDraftContent()}</p>
                </div>

                {postizStatus === 'loading' ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading social accounts
                  </div>
                ) : postizIntegrations.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                    {postizError || 'No connected social accounts found. Connect Facebook, Instagram, TikTok, or YouTube in Postiz, then refresh.'}
                    <button
                      type="button"
                      onClick={loadPostizIntegrations}
                      className="mt-3 block rounded-lg bg-white px-3 py-2 text-xs font-black text-amber-900 shadow-sm"
                    >
                      Refresh channels
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Choose where to send it</p>
                      <button
                        type="button"
                        onClick={loadPostizIntegrations}
                        disabled={postizStatus === 'uploading' || postizStatus === 'drafting'}
                        className="text-xs font-black text-slate-400 transition hover:text-slate-700 disabled:opacity-50"
                      >
                        Refresh
                      </button>
                    </div>
                    {postizIntegrations.map((integration) => {
                      const selected = selectedPostizIntegrationId === integration.id;
                      return (
                        <button
                          key={integration.id}
                          type="button"
                          onClick={() => setSelectedPostizIntegrationId(integration.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                            selected
                              ? 'border-slate-900 bg-white shadow-sm'
                              : 'border-slate-200 bg-slate-50 hover:bg-white'
                          }`}
                        >
                          {integration.picture ? (
                            <img src={integration.picture} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-black uppercase text-slate-500">
                              {integration.identifier.slice(0, 2)}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-slate-900">{integration.name || integration.profile || integration.identifier}</span>
                            <span className="block truncate text-xs font-semibold text-slate-500">{integration.identifier}{integration.profile ? ` · ${integration.profile}` : ''}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {postizStatus === 'error' && postizIntegrations.length > 0 && (
                  <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-700">{postizError}</p>
                )}

                {postizStatus === 'done' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-800">
                    {postizAppUrl ? (
                      <button
                        type="button"
                        onClick={() => window.open(postizAppUrl, '_blank', 'noopener,noreferrer')}
                        className="text-left font-black text-emerald-900 underline decoration-emerald-300 underline-offset-4 transition hover:text-emerald-700"
                      >
                        Draft ready on {getSelectedPostizChannelLabel()} — finish posting →
                      </button>
                    ) : (
                      <span>Draft ready on {getSelectedPostizChannelLabel()}. Add POSTIZ_APP_URL for a direct finish-posting link.</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-xs font-semibold text-slate-500">Nothing goes live until you approve it.</p>
                <button
                  type="button"
                  onClick={sendExportToPostiz}
                  disabled={!selectedPostizIntegrationId || postizStatus === 'loading' || postizStatus === 'uploading' || postizStatus === 'drafting' || postizStatus === 'done'}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {(postizStatus === 'uploading' || postizStatus === 'drafting') && <Loader2 className="h-4 w-4 animate-spin" />}
                  {postizStatus === 'uploading' ? 'Uploading video' : postizStatus === 'drafting' ? 'Making draft' : postizStatus === 'done' ? 'Draft ready' : 'Make draft'}
                </button>
              </div>
            </div>
          </div>
        )}

        {conversationWizardOpen && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Make Voice Audio</h2>
                  <p className="mt-1 text-sm text-slate-500">Check the business info, choose the words, edit anything, then make the audio.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopDialoguePreview();
                    setConversationWizardOpen(false);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-b border-slate-100 px-5 py-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: 'brief', label: '1. Business', detail: 'What the ad is about' },
                    { id: 'scripts', label: '2. Choose Words', detail: `${dialogueScripts.length || 0} options` },
                    { id: 'edit', label: '3. Make Audio', detail: 'Hear it first' },
                  ].map((step) => {
                    const active = conversationWizardStep === step.id;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          if (step.id === 'edit' && !draftDialogueScript) return;
                          setConversationWizardStep(step.id as ConversationWizardStep);
                        }}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          active
                            ? 'border-slate-900 bg-slate-950 text-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <span className="block text-xs font-black">{step.label}</span>
                        <span className={`mt-0.5 block text-[11px] font-semibold ${active ? 'text-white/70' : 'text-slate-400'}`}>{step.detail}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {conversationWizardStep === 'brief' && (
                  <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                    <div>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Check what this ad is selling</h3>
                          <p className="mt-1 text-sm text-slate-500">This is the context that decides what the conversation is about.</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {briefCompletion}/{requiredBriefFields}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {CREATIVE_BRIEF_FIELDS.map((field) => (
                          <label key={field.key} className={field.key === 'reference' ? 'block space-y-1.5 md:col-span-2' : 'block space-y-1.5'}>
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-700">{field.question}</span>
                              {field.optional && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Optional</span>}
                            </span>
                            <textarea
                              value={creativeBrief[field.key]}
                              onChange={(event) => updateCreativeBrief(field.key, event.target.value)}
                              rows={field.key === 'reference' ? 3 : 2}
                              placeholder={field.placeholder}
                              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Who this is for</p>
                      <p className="mt-2 text-lg font-black leading-tight text-slate-900">{activePersonaDeck?.customer || 'Dental practice owner'}</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">The script should sound like one person has the problem and another person casually points to the solution.</p>
                      <button
                        type="button"
                        onClick={() => handleGenerateDialogueScripts(false)}
                        disabled={isGeneratingDialogueScripts || isGeneratingDialogueAudio}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isGeneratingDialogueScripts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        {isGeneratingDialogueScripts ? 'Writing options' : dialogueScripts.length ? 'Write new options' : 'Write options'}
                      </button>
                      {dialogueScripts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setConversationWizardStep('scripts')}
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                        >
                          Choose words
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </aside>
                  </div>
                )}

                {conversationWizardStep === 'scripts' && (
                  <div className="grid gap-5 lg:grid-cols-[310px_1fr]">
                    <div className="space-y-2">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Choose an angle</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Click one, edit it on the right, then use it.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGenerateDialogueScripts(false)}
                          disabled={isGeneratingDialogueScripts || isGeneratingDialogueAudio}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {isGeneratingDialogueScripts ? 'Writing' : 'More options'}
                        </button>
                      </div>
                      {dialogueScripts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                          <p className="text-sm font-bold text-slate-700">No voice scripts yet</p>
                          <button
                            type="button"
                            onClick={() => handleGenerateDialogueScripts(false)}
                            className="mt-3 rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white"
                          >
                            Write options
                          </button>
                        </div>
                      ) : (
                        dialogueScripts.map((script, index) => {
                          const selected = index === selectedDialogueScriptIndex;
                          const previewKey = `script-${index}`;
                          const previewing = previewingDialogueKey === previewKey;
                          return (
                            <div
                              key={`${script.title}-${index}`}
                              className={`flex w-full items-start gap-2 rounded-xl border p-3 text-left transition ${
                                selected
                                  ? 'border-slate-900 bg-white shadow-sm'
                                  : 'border-slate-200 bg-slate-50 hover:bg-white'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDialogueScriptIndex(index);
                                  setDraftDialogueScript(cloneDialogueScript(script));
                                }}
                                className="min-w-0 flex-1 text-left"
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <span className="truncate text-sm font-black text-slate-900">{script.title || `Option ${index + 1}`}</span>
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">{script.lines.length} lines</span>
                                </span>
                                <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{script.angle}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => playDialoguePreview(script, previewKey)}
                                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-slate-700 transition ${
                                  previewing
                                    ? 'border-slate-900 bg-slate-950 text-white'
                                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:text-indigo-600'
                                }`}
                                title={previewing ? 'Stop' : 'Hear this script'}
                              >
                                {previewing ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      {draftDialogueScript ? (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-black leading-tight text-slate-950">Edit the exact words</h3>
                              <p className="mt-1 text-sm font-semibold text-slate-500">These words become the audio and the on-screen captions.</p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => playDialoguePreview(draftDialogueScript, `script-${selectedDialogueScriptIndex}`)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                              >
                                {previewingDialogueKey === `script-${selectedDialogueScriptIndex}` ? 'Stop' : 'Play'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConversationWizardStep('edit')}
                                disabled={!draftDialogueScript.lines.some((line) => line.text.trim())}
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                              >
                                Use these words
                              </button>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr]">
                            <label className="block space-y-1.5">
                              <span className="text-xs font-bold text-slate-700">Title</span>
                              <input
                                value={draftDialogueScript.title}
                                onChange={(event) => setDraftDialogueScript((current) => current ? { ...current, title: event.target.value } : current)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                              />
                            </label>
                            <label className="block space-y-1.5">
                              <span className="text-xs font-bold text-slate-700">Angle</span>
                              <input
                                value={draftDialogueScript.angle}
                                onChange={(event) => setDraftDialogueScript((current) => current ? { ...current, angle: event.target.value } : current)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                              />
                            </label>
                          </div>
                          <div className="mt-5 space-y-3">
                            {draftDialogueScript.lines.map((line, index) => (
                              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="mb-2 grid gap-2 sm:grid-cols-[110px_1fr_auto]">
                                  <input
                                    value={line.speaker}
                                    onChange={(event) => updateDraftDialogueLine(index, { speaker: event.target.value })}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-black text-slate-800 outline-none focus:border-indigo-400"
                                    aria-label={`Speaker for line ${index + 1}`}
                                  />
                                  <input
                                    value={line.tone}
                                    onChange={(event) => updateDraftDialogueLine(index, { tone: event.target.value })}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 outline-none focus:border-indigo-400"
                                    aria-label={`Tone for line ${index + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeDraftDialogueLine(index)}
                                    disabled={draftDialogueScript.lines.length <= 2}
                                    className="rounded-lg px-2.5 py-2 text-xs font-black text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <textarea
                                  value={line.text}
                                  onChange={(event) => updateDraftDialogueLine(index, { text: event.target.value })}
                                  rows={2}
                                  placeholder="Write what this person says..."
                                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                                />
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={addDraftDialogueLine}
                            className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                          >
                            Add another line
                          </button>
                        </>
                      ) : (
                        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                          <p className="text-sm font-bold text-slate-500">Choose a script to edit.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {conversationWizardStep === 'edit' && (
                  <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div>
                        <h3 className="text-xl font-black leading-tight text-slate-950">{draftDialogueScript?.title || 'Chosen words'}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{draftDialogueScript?.angle || 'Ready to make audio.'}</p>
                      </div>
                      <div className="mt-5 space-y-3">
                        {draftDialogueScript?.lines.map((line, index) => (
                          <div key={`${line.speaker}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-1 flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${index % 2 === 0 ? 'bg-[#00D6B8]' : 'bg-[#6554FF]'}`} />
                              <span className="text-xs font-black uppercase tracking-wide text-slate-500">{line.speaker}</span>
                              <span className="text-xs font-semibold text-slate-400">{line.tone}</span>
                            </div>
                            <p className="text-sm font-semibold leading-6 text-slate-800">{line.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <aside className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Final check</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">These exact words will become the audio and captions.</p>
                      <div className="mt-4 rounded-xl bg-white p-3">
                        <p className="text-xs font-black text-slate-400">Lines</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{draftDialogueScript?.lines.length || 0}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConversationWizardStep('scripts')}
                        className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        Back to options
                      </button>
                      <button
                        type="button"
                        onClick={() => draftDialogueScript && playDialoguePreview(draftDialogueScript, 'draft')}
                        disabled={!draftDialogueScript || !draftDialogueScript.lines.some((line) => line.text.trim())}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {previewingDialogueKey === 'draft' ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                        {previewingDialogueKey === 'draft' ? 'Stop' : 'Hear it first'}
                      </button>
                      <button
                        type="button"
                        onClick={() => draftDialogueScript && handleGenerateDialogueAudio(draftDialogueScript)}
                        disabled={
                          !draftDialogueScript ||
                          isGeneratingDialogueAudio ||
                          isGeneratingDialogueScripts ||
                          !draftDialogueScript.lines.some((line) => line.text.trim())
                        }
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isGeneratingDialogueAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
                        {isGeneratingDialogueAudio ? 'Making audio' : 'Make audio'}
                      </button>
                    </aside>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {introCropOpen && introImage && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Check Intro Image</h2>
                  <p className="mt-1 text-sm text-slate-500">Keep important text, faces, and buttons inside the square safe area for feed.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIntroCropOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-5 p-5 md:grid-cols-[1fr_260px]">
                <div>
                  <div className="mx-auto aspect-[4/5] max-h-[58vh] overflow-hidden rounded-xl border border-slate-200 bg-black shadow-inner">
                    <div className="relative h-full w-full overflow-hidden bg-black">
                      <div
                        className="absolute inset-0 scale-110 bg-cover bg-center blur-xl opacity-60"
                        style={{
                          backgroundImage: `url(${introImage})`,
                          backgroundPosition: introIsSquareish ? 'center' : `50% ${introFeedCropY}%`,
                        }}
                      />
                      <img
                        src={introImage}
                        alt=""
                        className={`absolute inset-0 h-full w-full ${introIsSquareish ? 'object-contain' : 'object-cover'}`}
                        style={{ objectPosition: introIsSquareish ? 'center' : `50% ${introFeedCropY}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative aspect-square w-full border-2 border-white/80 bg-white/[0.035] shadow-[0_0_0_999px_rgba(15,23,42,0.18)]">
                          <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-900 shadow">
                            1:1 safe area
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">{introIsSquareish ? 'Square safe area' : 'Feed view'}</span>
                      <span className="text-xs font-bold text-slate-400">{introIsSquareish ? '1:1' : `${introFeedCropY}%`}</span>
                    </div>
                    {introIsSquareish ? (
                      <p className="text-xs leading-relaxed text-slate-500">This image is already square, so it fits inside the safe area. There is nothing to adjust.</p>
                    ) : (
                      <>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={introFeedCropY}
                          onChange={(event) => setIntroFeedCropY(Number(event.target.value))}
                          className="w-full cursor-pointer"
                        />
                        <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <span>Top</span>
                          <span>Center</span>
                          <span>Bottom</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Stories / Reels</p>
                    <div className="mt-2 aspect-[9/16] overflow-hidden rounded-lg border border-slate-200 bg-black">
                      <img src={introImage} alt="" className="h-full w-full object-contain" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
                    If the main message cannot fit inside the square, make a new intro image with the important text inside the square.
                  </div>

                  <button
                    type="button"
                    onClick={() => setIntroCropOpen(false)}
                    className="mt-auto rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Use This View
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {saveTemplateModal}

        {creativeBriefOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-black tracking-normal text-slate-950">What's your ad about?</h2>
                  <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-500">Give Wiggly the basics once. It uses this to make better versions.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                    {briefCompletion}/{requiredBriefFields}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreativeBriefOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[64vh] overflow-y-auto p-6">
                <label className="mb-5 block rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <span className="text-sm font-black text-slate-900">What do you sell?</span>
                  <textarea
                    value={creativeBrief.offer}
                    onChange={(event) => updateCreativeBrief('offer', event.target.value)}
                    rows={3}
                    placeholder="AI receptionist that answers and books dental patient calls."
                    className="mt-2 min-h-[96px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                {CREATIVE_BRIEF_FIELDS.filter((field) => field.key !== 'offer').map((field) => (
                  <label key={field.key} className={field.key === 'reference' ? 'block rounded-2xl border border-slate-200 bg-white p-3 md:col-span-2' : 'block rounded-2xl border border-slate-200 bg-white p-3'}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{field.question}</span>
                      {field.optional && <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Optional</span>}
                    </span>
                    <textarea
                      value={creativeBrief[field.key]}
                      onChange={(event) => updateCreativeBrief(field.key, event.target.value)}
                      rows={field.key === 'reference' ? 4 : 3}
                      placeholder={field.placeholder}
                      className="mt-2 min-h-[92px] w-full resize-y rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </label>
                ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <p className="text-xs font-semibold text-slate-500">Saves automatically in this browser.</p>
                <button
                  type="button"
                  onClick={() => setCreativeBriefOpen(false)}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
      )}
      <InteractiveTutorial enabled={!showHomepage && creativeMode === 'visualizer'} replayToken={tutorialReplayKey} />
    </div>
  );
}
