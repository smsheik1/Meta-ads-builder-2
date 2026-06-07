// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { isFeedPlatform, isVerticalPlatform, type PlatformType } from './components/PlatformFrame';
import { CreateFlow, type GeneratedAdVariation } from './components/CreateFlow';
import { Upload, Play, Database, CheckCircle2, Download, Layers, Loader2, X, Type, AudioLines, Captions, MousePointerClick, BookmarkPlus, ArrowRight, Wand2, Link2, ExternalLink, Copy, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import Papa from 'papaparse';
import { DEFAULT_ELEMENTS, useEditorStore, type Caption } from './store';
import { getVisualizerBarCount, getVisualizerBars, normalizeVisualizerType } from './lib/visualizer';
import { stripRichText } from './lib/rich-text';
import { getRandomSeededHook } from './lib/headline-pool';
import type { AudioAnalysisData } from './lib/audio-analysis';
import { getEditorDimensions, type ExportSnapshot } from './lib/export-snapshot';
import { FIXED_AD_BACKGROUND_COLOR, createTintedAdBackground, type AdStyleArchetype } from './lib/style-archetypes';
import { InteractiveTutorial, WIGGLY_TUTORIAL_EVENT, WIGGLY_TUTORIAL_SEEN_KEY, emitTutorialEvent } from './components/InteractiveTutorial';
import { getHostedSharePageBySlug, type SharePageRecord } from './lib/share-pages';
import { VOICE_VISUALIZER_PRESET } from './lib/visualizer-presets';
import { ShareAdPage } from './routes/ShareAdPage';
import type { BrandBrain } from './lib/prompts/brand-brain';
import type { AdScene } from './engine/ad-scene/scene';
import { createLegacyCreateAdScene } from './lib/legacy-create-ad-scene';
import {
  hydrateStoredMedia,
  loadSavedAdHistory,
  loadSavedTemplates,
  persistSavedTemplates,
  removeSavedAdHistoryItem,
  saveDownloadedAdToHistoryItem,
  type AdHistoryItem,
  type IntroDuration,
  type SavedTemplate,
} from './features/create/createSavedDesigns';
import {
  appendMediaForRemotion,
  formatBytes,
  getMediaDurationSeconds,
} from './features/create/createExportMedia';
import { useCreateExportController } from './features/create/useCreateExportController';
import { CreateVoiceWizard } from './features/create/CreateVoiceWizard';
import {
  type CreativeBrief,
  type CreativeBriefTextKey,
} from './features/create/createVoiceScripts';
import { useCreateVoiceController } from './features/create/useCreateVoiceController';
import {
  DEFAULT_AUDIO_NAME,
  DEFAULT_AUDIO_URL,
  cleanCaptions,
  inferAudioMimeType,
  useCreateMediaController,
} from './features/create/useCreateMediaController';
import {
  buildGeneratedAdApplication,
  normalizeCreativeBriefReceipts,
} from './features/create/createAdApplication';
import { CreateDesignLibrary } from './features/create/components/CreateDesignLibrary';
import { CreatePreviewStage } from './features/create/components/CreatePreviewStage';
import { CreateSidebar } from './features/create/components/CreateSidebar';

const CREATIVE_BRIEF_STORAGE_KEY = 'visualizer_creative_brief_v1';
const STUDIO_SEEN_STORAGE_KEY = 'agent_enamel_studio_seen_v1';
const DEFAULT_INTRO_IMAGE = '/default-intro-image.png';
const DEFAULT_INTRO_IMAGE_NAME = 'Default intro image';
const BACKGROUND_COLOR_FAMILIES = [
  { hue: 158, saturation: [70, 95], lightness: [45, 96] },
  { hue: 190, saturation: [55, 90], lightness: [42, 94] },
  { hue: 230, saturation: [45, 75], lightness: [44, 96] },
  { hue: 255, saturation: [45, 78], lightness: [45, 94] },
  { hue: 315, saturation: [35, 70], lightness: [48, 94] },
  { hue: 25, saturation: [35, 70], lightness: [50, 94] },
  { hue: 0, saturation: [0, 0], lightness: [8, 98] },
];

const PERSONA_DECKS = [
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

const CAPTION_SPEAKER_COLORS: Record<number, string> = {
  1: '#00D6B8',
  2: '#6554FF',
};

type RenderDurationCap = 30 | 60 | 'full';
type AppRoute = 'home' | 'builder' | 'share' | 'create';

const CURRENT_RENDER_VERSION = 2;
const SPACE_REMIX_CUE_DISMISSED_KEY = 'wiggly_space_remix_cue_dismissed_v1';

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
  receipts: {
    specificClaims: [],
    buyerMoments: [],
    exactSiteLanguage: [],
    namedProof: [],
  },
};

const CREATIVE_BRIEF_FIELDS: Array<{
  key: CreativeBriefTextKey;
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

const BUILT_IN_TEMPLATES: SavedTemplate[] = [];

type AudioFlyoutView = 'choices' | 'make' | 'library';

const getAppRoute = (): { route: AppRoute; shareSlug: string | null } => {
  const host = window.location.hostname;
  const shouldForceCreateRoute = host === 'wiggly.agentenamel.com' || host === 'www.wiggly.agentenamel.com';
  const match = window.location.pathname.match(/^\/s\/([^/?#]+)/);
  if (match) return { route: 'share', shareSlug: decodeURIComponent(match[1]) };
  if (shouldForceCreateRoute && window.location.pathname === '/') return { route: 'create', shareSlug: null };
  if (window.location.pathname === '/create') return { route: 'create', shareSlug: null };
  if (window.location.pathname === '/builder') return { route: 'builder', shareSlug: null };
  return { route: 'home', shareSlug: null };
};

const isCreateHomepageHost = () => {
  const host = window.location.hostname;
  return host === 'wiggly.agentenamel.com' || host === 'www.wiggly.agentenamel.com';
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

function MobileComputerGate() {
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
            Open Wiggly on your computer.
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base font-semibold leading-7 text-slate-500">
            The app uses a real canvas, keyboard rerolls, locks, dragging, and video export. It is built for desktop and laptop screens.
          </p>
        </section>

        <footer className="space-y-3 pb-2">
          <p className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-center text-sm font-black leading-6 text-slate-600 shadow-xl shadow-slate-950/8">
            Come back on a bigger screen and make the ad properly.
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

export default function App() {
  const initialRoute = getAppRoute();
  const [appRoute, setAppRoute] = useState<AppRoute>(initialRoute.route);
  const [shareSlug, setShareSlug] = useState<string | null>(initialRoute.shareSlug);
  const showHomepage = appRoute === 'home';
  const isMobileViewport = useIsMobileViewport();
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  
  useEffect(() => {
    if (appRoute === 'create' && isCreateHomepageHost() && window.location.pathname === '/') {
      window.history.replaceState(null, '', '/create');
    }
  }, [appRoute]);

  // Single Template State
  const [visualizerColor, setVisualizerColor] = useState("#00d6b8");
  const [accentColor, setAccentColor] = useState("#4f46e5");
  const [bgColor, setBgColor] = useState(FIXED_AD_BACKGROUND_COLOR);

  // Platform Frame State
  const [platform, setPlatform] = useState<PlatformType>('instagram-feed');
  const [platformTheme, setPlatformTheme] = useState<'light' | 'dark'>('dark');
  const [brandName, setBrandName] = useState('Wiggly');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [simulatedCaption, setSimulatedCaption] = useState('');
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
  const [currentCreateAdScene, setCurrentCreateAdScene] = useState<AdScene | null>(null);

  const refreshBackgroundColor = () => {
    setBgColor((currentColor) => getFreshBackgroundColor(currentColor));
  };

  const applyStyleArchetype = (archetype?: AdStyleArchetype) => {
    const nextVisualizerColor = archetype?.visualizerColor || visualizerColor;
    setBgColor(createTintedAdBackground(nextVisualizerColor, archetype?.backgroundColor || FIXED_AD_BACKGROUND_COLOR));
    if (archetype?.visualizerColor) setVisualizerColor(archetype.visualizerColor);
    if (archetype?.speaker2CaptionColor) setAccentColor(archetype.speaker2CaptionColor);
  };
  
  // Playback/Render State
  const [playing, setPlaying] = useState(false);
  const [renderDurationCap, setRenderDurationCap] = useState<RenderDurationCap>('full');
  const [previewAudioAnalysis, setPreviewAudioAnalysis] = useState<AudioAnalysisData | null>(null);
  const clearGeneratedDialogueAudioRef = useRef<() => void>(() => {});
  const generatedDialogueAudioUrlRef = useRef<string | null>(null);
  const [spaceRemixCueVisible, setSpaceRemixCueVisible] = useState(() => (
    typeof window !== 'undefined' && localStorage.getItem(SPACE_REMIX_CUE_DISMISSED_KEY) !== '1'
  ));
  const [sharePageRecord, setSharePageRecord] = useState<SharePageRecord | null>(null);
  const [sharePageLoading, setSharePageLoading] = useState(false);

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
  const [templateLibraryTab, setTemplateLibraryTab] = useState<'templates' | 'history'>('templates');
  const [historySaveWarning, setHistorySaveWarning] = useState<string | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateDraftName, setTemplateDraftName] = useState('');
  const [creativeBrief, setCreativeBrief] = useState<CreativeBrief>(EMPTY_CREATIVE_BRIEF);
  const [creativeBriefOpen, setCreativeBriefOpen] = useState(false);
  const [appTitle] = useState('Wiggly');
  const [activePersonaDeckIndex, setActivePersonaDeckIndex] = useState(0);
  const [tutorialReplayKey, setTutorialReplayKey] = useState(0);
  const [audioFlyoutOpen, setAudioFlyoutOpen] = useState(false);
  const [audioFlyoutView, setAudioFlyoutView] = useState<AudioFlyoutView>('choices');

  const { showSafeZones, setShowSafeZones, showRedGuides, setShowRedGuides, addElement, setElements, deselectAll, commitHistory, setBusinessContext, elements, captions } = useEditorStore();
  const hasComponent = (role: NonNullable<typeof elements[number]['componentRole']>) => elements.some((element) => element.componentRole === role);
  const headlineCount = elements.filter((element) => element.componentRole === 'headline').length;
  const subheadlineCount = elements.filter((element) => element.componentRole === 'subheadline').length;
  const visualizerCount = elements.filter((element) => element.type === 'visualizer').length;
  const primaryVisualizerElement = elements.find((element) => element.type === 'visualizer');
  const captionCount = elements.filter((element) => element.componentRole === 'captions').length;
  const ctaCount = elements.filter((element) => element.componentRole === 'cta').length;
  const logoCount = elements.filter((element) => element.componentRole === 'logo').length;
  const duplicateOffset = (count: number) => Math.min(count * 12, 48);

  const {
    activeCreateBrandKey,
    audioBrandKey,
    audioFileName,
    audioIntent,
    audioUrl,
    createAudioUrl,
    createSavedVoiceOptions,
    currentAudioAssetId,
    currentAudioItem,
    deleteStoredAudio,
    downloadCurrentAudio,
    formatVoiceName,
    getAudioItemLabel,
    getCachedAudioAnalysis,
    handleAudioUpload,
    hasPlayableCreateAudio,
    isCurrentAudioItem,
    isTranscribing,
    readyAudioLibraryItems,
    rememberGeneratedVoiceAudio,
    setActiveCreateBrandKey,
    useAudioItem,
    useCreateSavedVoice,
    clearCreateAudioForNewBrand,
    applyAudioSettings,
    updateCreateCaptions,
  } = useCreateMediaController({
    appRoute,
    renderDurationCap,
    primaryVisualizerElement,
    previewAudioAnalysis,
    onPreviewAudioAnalysisChange: setPreviewAudioAnalysis,
    onClearGeneratedDialogueAudio: () => clearGeneratedDialogueAudioRef.current(),
    getGeneratedDialogueAudioUrl: () => generatedDialogueAudioUrlRef.current,
    onAudioPicked: () => {
      setAudioFlyoutOpen(false);
      setAudioFlyoutView('choices');
    },
  });

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

  const replayGuidedJourney = () => {
    localStorage.removeItem(WIGGLY_TUTORIAL_SEEN_KEY);
    setTutorialReplayKey((key) => key + 1);
  };

  useEffect(() => {
    const savedTemplates = loadSavedTemplates();
    if (savedTemplates.length) setTemplates(savedTemplates);
  }, []);

  useEffect(() => {
    loadSavedAdHistory()
      .then((items) => setHistoryItems(items))
      .catch((error) => console.error('Failed to load ad history:', error));
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CREATIVE_BRIEF_STORAGE_KEY);
      if (saved) {
        const savedBrief = JSON.parse(saved);
        const parsedBrief = {
          ...EMPTY_CREATIVE_BRIEF,
          ...savedBrief,
          receipts: normalizeCreativeBriefReceipts(savedBrief?.receipts),
        };
        setCreativeBrief(parsedBrief);
        setBusinessContext(serializeCreativeBrief(parsedBrief));
      }
    } catch (error) {
      console.error('Failed to load creative brief:', error);
    }
  }, []);

  const briefCompletion = CREATIVE_BRIEF_FIELDS.filter(field => !field.optional && creativeBrief[field.key].trim()).length;
  const requiredBriefFields = CREATIVE_BRIEF_FIELDS.filter(field => !field.optional).length;

  const serializeCreativeBrief = (brief: CreativeBrief) => {
    const receipts = normalizeCreativeBriefReceipts(brief.receipts);
    const receiptLines = [
      receipts.specificClaims.length ? `[Receipt: Specific Claims]\n${receipts.specificClaims.map((item) => `- ${item}`).join('\n')}` : '',
      receipts.buyerMoments.length ? `[Receipt: Buyer Moments]\n${receipts.buyerMoments.map((item) => `- ${item}`).join('\n')}` : '',
      receipts.exactSiteLanguage.length ? `[Receipt: Exact Site Language]\n${receipts.exactSiteLanguage.map((item) => `- ${item}`).join('\n')}` : '',
      receipts.namedProof.length ? `[Receipt: Named Proof]\n${receipts.namedProof.map((item) => `- ${item}`).join('\n')}` : '',
    ];
    return [
      `[Offer] ${brief.offer}`,
      `[Buyer] ${brief.buyer}`,
      `[Pain] ${brief.pain}`,
      `[Failed Alternatives] ${brief.failedAlternatives}`,
      `[Promised Result] ${brief.promisedResult}`,
      `[Differentiator] ${brief.differentiator}`,
      `[Action] ${brief.cta}`,
      brief.reference ? `[Reference] ${brief.reference}` : '',
      ...receiptLines,
    ].filter(Boolean).join('\n');
  };

  const updateCreativeBrief = (key: CreativeBriefTextKey, value: string) => {
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
      persistSavedTemplates(nextTemplates);
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

  const createCurrentSnapshot = (nameOverride?: string, adScene?: AdScene | null): SavedTemplate => {
    const name = (nameOverride || templateDraftName || getCurrentDesignTitle()).trim();
    const snapshotAudioUrl = appRoute === 'create' ? createAudioUrl : audioUrl;

    return {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `template-${Date.now()}`,
      name,
      createdAt: Date.now(),
      audioAnalysis: snapshotAudioUrl ? previewAudioAnalysis : null,
      adScene: appRoute === 'create' ? (adScene || currentCreateAdScene || null) : null,
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
        audioUrl: snapshotAudioUrl,
        audioFileName: snapshotAudioUrl ? audioFileName : '',
        audioAssetId: snapshotAudioUrl ? currentAudioAssetId : null,
        audioIntent: snapshotAudioUrl ? audioIntent : 'default',
        audioBrandKey: snapshotAudioUrl ? audioBrandKey : null,
        createBrandKey: activeCreateBrandKey,
      },
    };
  };

  const saveCurrentTemplate = (nameOverride?: string, adScene?: AdScene | null) => {
    const template = createCurrentSnapshot(nameOverride, adScene);

    persistTemplates([template, ...templates]);
    setTemplateDraftName('');
    setSaveTemplateOpen(false);
  };

  const loadTemplate = (template: SavedTemplate | AdHistoryItem) => {
    const hydratedTemplate = hydrateStoredMedia(template);
    setPlaying(false);
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
    applyAudioSettings(hydratedTemplate.settings);
    setCurrentCreateAdScene(hydratedTemplate.adScene || null);
    requestAnimationFrame(() => commitHistory());
  };

  const deleteTemplate = (templateId: string) => {
    persistTemplates(templates.filter((template) => template.id !== templateId));
  };

  const saveDownloadedAdToHistory = async (snapshot: SavedTemplate, adScene?: AdScene | null) => {
    const result = await saveDownloadedAdToHistoryItem(snapshot, adScene);
    if (result.items) {
      setHistoryItems(result.items);
      setTemplateLibraryTab('history');
    }
    setHistorySaveWarning(result.warning);
  };

  const createRemotionSnapshot = async (snapshot: SavedTemplate): Promise<FormData> => {
    const audioDuration = snapshot.settings.audioUrl
      ? await getMediaDurationSeconds(snapshot.settings.audioUrl, 'audio')
      : 0;
    const bgVideoDuration = snapshot.settings.bgMedia?.type === 'video'
      ? await getMediaDurationSeconds(snapshot.settings.bgMedia.url, 'video')
      : null;
    const uncappedDuration = Math.max(3, audioDuration || 0, bgVideoDuration || 0);
    const durationSeconds = renderDurationCap === 'full' ? uncappedDuration : Math.min(uncappedDuration, renderDurationCap);

    const visualizerElement = snapshot.elements.find(element => element.type === 'visualizer');
    const audioAnalysis = snapshot.settings.audioUrl
      ? await getCachedAudioAnalysis(
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
      })
      : null;
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
    if (remotionSnapshot.settings.audioUrl) {
      await appendMediaForRemotion(formData, 'audio', remotionSnapshot.settings.audioUrl, url => { remotionSnapshot.settings.audioUrl = url; });
    }
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

  const getCurrentLegacyCreateAdScene = (
    variation: GeneratedAdVariation,
    nextBrandBrain: BrandBrain,
  ) => {
    const sceneCaptions = cleanCaptions(useEditorStore.getState().captions);
    const sceneAudioStatus = createAudioUrl && audioIntent === 'generated'
      ? 'generated'
      : createAudioUrl && audioIntent === 'uploaded'
        ? 'uploaded'
        : 'none';

    return createLegacyCreateAdScene({
      brandBrain: nextBrandBrain,
      variation,
      elements: JSON.parse(JSON.stringify(useEditorStore.getState().elements)),
      captions: sceneCaptions,
      platform,
      backgroundColor: bgColor,
      visualizerColor,
      accentColor,
      ctaText: autoCta,
      ctaUrl,
      brandLogoUrl: brandLogo,
      audioStatus: sceneAudioStatus,
      audioUrl: sceneAudioStatus === 'none' ? null : createAudioUrl,
      audioStorageId: sceneAudioStatus === 'none' ? null : currentAudioAssetId,
      audioMimeType: sceneAudioStatus === 'none' || !createAudioUrl ? null : inferAudioMimeType(createAudioUrl),
      audioTranscript: sceneCaptions.map((caption) => caption.text).join(' '),
      audioBrandKey: sceneAudioStatus === 'none' ? null : audioBrandKey,
    });
  };

  const {
    rendering,
    renderProgress,
    setRenderProgress,
    exportPhase,
    exportErrorMessage,
    exportDownload,
    exportLaunchAnimation,
    shareStatus,
    shareUrl,
    shareError,
    shareIsLocalPreview,
    cancelExport,
    createShareLink,
    dismissExportStatus,
    downloadReadyExport,
    downloadSimulatedVideo,
    openReadyExport,
  } = useCreateExportController({
    appRoute,
    currentRenderVersion: CURRENT_RENDER_VERSION,
    createCurrentSnapshot: () => createCurrentSnapshot(getCurrentDesignTitle(), currentCreateAdScene),
    createRemotionSnapshot,
    currentCreateAdScene,
    getCurrentLegacyCreateAdScene,
    onCurrentCreateAdScene: setCurrentCreateAdScene,
    saveDownloadedAdToHistory,
  });

  const deleteHistoryItem = async (historyId: string) => {
    const nextItems = await removeSavedAdHistoryItem(historyId);
    setHistoryItems(nextItems);
  };

  const {
    dialogueScripts,
    conversationWizardOpen,
    conversationWizardStep,
    selectedDialogueScriptIndex,
    draftDialogueScript,
    previewingDialogueKey,
    isGeneratingDialogueScripts,
    isGeneratingDialogueAudio,
    generatedDialogueAudioUrl,
    clearGeneratedDialogueAudio,
    openConversationWizard,
    closeConversationWizard,
    setConversationWizardStep,
    setDraftDialogueScript,
    updateDraftDialogueLine,
    addDraftDialogueLine,
    removeDraftDialogueLine,
    playDialoguePreview,
    generateDialogueScripts,
    generateDialogueAudio,
    selectDialogueScript,
  } = useCreateVoiceController({
    creativeBrief,
    personaLabel: PERSONA_DECKS[activePersonaDeckIndex]?.customer || 'Dental practice owner',
    briefCompletion,
    requiredBriefFields,
    onBeforeOpenWizard: () => {
      setAudioFlyoutOpen(false);
      setAudioFlyoutView('choices');
    },
    onGeneratedVoiceAudio: async ({ url, filename, blob, captions: nextCaptions }) => {
      await rememberGeneratedVoiceAudio({
        url,
        filename,
        blob,
        captions: nextCaptions,
        brandKey: activeCreateBrandKey,
      });
      if (captionCount === 0) handleAddCaptions();
      if (visualizerCount === 0) handleAddVisualizer();
    },
  });

  clearGeneratedDialogueAudioRef.current = clearGeneratedDialogueAudio;
  generatedDialogueAudioUrlRef.current = generatedDialogueAudioUrl;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgMedia({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      });
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

  const handleBrandLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBrandLogo(url);
    }
  };

  useEffect(() => {
    // Intentionally skipped auto generation via `/api/generate-copy` 
    // Users can generate Ad Copy using the API key panel
  }, []);

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

  function handleAddVisualizer() {
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
  }

  function handleAddCaptions() {
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
  }

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
    if (appRoute === 'create' && !hasPlayableCreateAudio) {
      return;
    }
    if (!audioUrl) {
      alert('Please upload an audio file first.');
      return;
    }
    if (!playing) {
      emitTutorialEvent({ type: 'play-clicked' });
    }
    setPlaying(!playing);
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

  const openAudioFlyout = (view: AudioFlyoutView = 'choices') => {
    setAudioFlyoutView(view);
    setAudioFlyoutOpen(true);
  };

  const renderAudioPanel = () => {
    const uploadTitle = 'Upload voice audio';
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
                    onClick={openConversationWizard}
                    disabled={isGeneratingDialogueScripts || isGeneratingDialogueAudio}
                    className="mt-3 w-full rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGeneratingDialogueScripts ? 'Writing...' : isGeneratingDialogueAudio ? 'Making...' : 'Open voice maker'}
                  </button>
                </div>
                {dialogueScripts.length > 0 && (
                  <button
                    type="button"
                    onClick={openConversationWizard}
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
    const application = buildGeneratedAdApplication({
      variation,
      brandBrain,
      activeCreateBrandKey,
      audioIntent,
      audioBrandKey,
      resetPlatform,
    });

    setActiveTab('single');
    setCurrentCreateAdScene(null);
    if (navigateToBuilder) setPlaying(false);
    setActiveCreateBrandKey(application.nextBrandKey);
    if (application.shouldClearAudio) {
      clearCreateAudioForNewBrand();
    }
    if (application.platform) setPlatform(application.platform);
    setPlatformTheme(application.platformTheme);
    setBrandName(application.businessName);
    setBrandLogo(application.brandLogo);
    setSimulatedCaption(application.simulatedCaption);
    setAutoCta(application.autoCta);
    setCtaUrl(application.ctaUrl);
    setBgColor(application.backgroundColor);
    setBgMedia(null);
    setBgShadow(false);
    setIntroDuration(0);
    setVisualizerColor(application.visualizerColor);
    setAccentColor(application.accentColor);
    setCreativeBrief(application.creativeBrief);
    setBusinessContext(application.businessContext);
    setElements(application.resolveElements);
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

  const saveGeneratedAdDesign = (variation: GeneratedAdVariation, nextBrandBrain: BrandBrain) => {
    applyGeneratedAdVariation(variation, nextBrandBrain, false, false);
    const scene = getCurrentLegacyCreateAdScene(variation, nextBrandBrain);
    setCurrentCreateAdScene(scene);
    setTemplateLibraryTab('templates');
    saveCurrentTemplate(variation.headline, scene);
  };

  const openSavedCreateDesign = (designId: string) => {
    const template = templates.find((candidate) => candidate.id === designId);
    if (!template) return;
    setPlaying(false);
    setTemplateLibraryTab('templates');
    loadTemplate(template);
  };

  const resetCreateCanvasForNewWebsite = () => {
    setPlaying(false);
    setActiveCreateBrandKey(null);
    setCurrentCreateAdScene(null);
    setBrandName('Your brand');
    setBrandLogo(null);
    setSimulatedCaption('Add audio for this ad');
    setAutoCta('Learn More');
    setCtaUrl('');
    setBgColor(FIXED_AD_BACKGROUND_COLOR);
    setBgMedia(null);
    setBgShadow(false);
    setIntroDuration(0);
    setElements(JSON.parse(JSON.stringify(DEFAULT_ELEMENTS)));
    deselectAll();
    if (audioIntent === 'generated' || audioIntent === 'default') {
      clearCreateAudioForNewBrand();
    }
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

  const activePersonaDeck = PERSONA_DECKS[activePersonaDeckIndex];
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
                onClick={dismissExportStatus}
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
                ? exportErrorMessage || 'Try making the video again. If it repeats, restart the app.'
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

  const voiceWizardModal = (
    <CreateVoiceWizard
      open={conversationWizardOpen}
      step={conversationWizardStep}
      creativeBrief={creativeBrief}
      creativeBriefFields={CREATIVE_BRIEF_FIELDS}
      briefCompletion={briefCompletion}
      requiredBriefFields={requiredBriefFields}
      personaLabel={activePersonaDeck?.customer || 'Your customer'}
      dialogueScripts={dialogueScripts}
      selectedDialogueScriptIndex={selectedDialogueScriptIndex}
      draftDialogueScript={draftDialogueScript}
      previewingDialogueKey={previewingDialogueKey}
      isGeneratingDialogueScripts={isGeneratingDialogueScripts}
      isGeneratingDialogueAudio={isGeneratingDialogueAudio}
      onClose={closeConversationWizard}
      onStepChange={setConversationWizardStep}
      onUpdateCreativeBrief={updateCreativeBrief}
      onGenerateDialogueScripts={() => void generateDialogueScripts(false, true)}
      onSelectDialogueScript={selectDialogueScript}
      onSetDraftDialogueScript={setDraftDialogueScript}
      onUpdateDraftDialogueLine={updateDraftDialogueLine}
      onAddDraftDialogueLine={addDraftDialogueLine}
      onRemoveDraftDialogueLine={removeDraftDialogueLine}
      onPlayDialoguePreview={playDialoguePreview}
      onGenerateDialogueAudio={(script) => void generateDialogueAudio(script)}
    />
  );

  if (isMobileViewport && appRoute !== 'share') {
    return <MobileComputerGate />;
  }

  if (appRoute === 'create') {
    return (
      <>
        <CreateFlow
          audioFileName={audioFileName}
          hasUserAudio={hasPlayableCreateAudio}
          hasPlayableAudio={hasPlayableCreateAudio}
          onAudioUpload={(event) => {
            void handleAudioUpload(event);
            if (event.target) event.target.value = '';
          }}
          onOpenVoiceMaker={openConversationWizard}
          savedVoiceOptions={createSavedVoiceOptions}
          onUseSavedVoice={useCreateSavedVoice}
          captions={captions}
          onUpdateCaptions={updateCreateCaptions}
          audioUrl={createAudioUrl}
          audioAnalysis={hasPlayableCreateAudio ? previewAudioAnalysis : null}
          captionsLoading={isTranscribing}
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
          onDownloadVideo={(variation, nextBrandBrain) => void downloadSimulatedVideo(variation, nextBrandBrain)}
          onSaveDesign={saveGeneratedAdDesign}
          savedDesigns={templates.map((template) => ({
            id: template.id,
            name: template.name,
            previewTitle: getTemplateTitle(template),
            backgroundColor: template.settings.bgColor || '#f8fafc',
            accentColor: template.settings.accentColor || '#4f46e5',
          }))}
          onOpenSavedDesign={openSavedCreateDesign}
          onPlatformChange={setPlatform}
          onRefreshBackgroundColor={refreshBackgroundColor}
          onApplyStyleArchetype={applyStyleArchetype}
          onPreviewVariation={(variation, nextBrandBrain) => applyGeneratedAdVariation(variation, nextBrandBrain, false, false)}
          onOpenBuilder={(variation, nextBrandBrain) => applyGeneratedAdVariation(variation, nextBrandBrain, true, false)}
          onResetCanvasForNewWebsite={resetCreateCanvasForNewWebsite}
          onOpenStudio={enterStudio}
          rendering={rendering}
        />
        {exportStatusCard}
        {saveTemplateModal}
        {voiceWizardModal}
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
                Drop in your website and watch the magic happen.
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
                {PERSONA_DECKS.map((deck, index) => (
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
        </div>
      </header>

      <main className="wiggly-builder-workspace flex flex-1 overflow-hidden">
        <CreateSidebar
          activeTab={activeTab}
          renderAudioPanel={renderAudioPanel}
          headlineCount={headlineCount}
          subheadlineCount={subheadlineCount}
          visualizerCount={visualizerCount}
          captionCount={captionCount}
          ctaCount={ctaCount}
          logoCount={logoCount}
          visualizerColor={visualizerColor}
          accentColor={accentColor}
          bgColor={bgColor}
          bgMedia={bgMedia}
          bgShadow={bgShadow}
          bgShadowOpacity={bgShadowOpacity}
          introImage={introImage}
          introFileName={introFileName}
          introDuration={introDuration}
          renderDurationCap={renderDurationCap}
          selectedTimelineDuration={selectedTimelineDuration}
          introTimelineWidth={introTimelineWidth}
          mainTimelineSeconds={mainTimelineSeconds}
          platformTheme={platformTheme}
          showSafeZones={showSafeZones}
          showRedGuides={showRedGuides}
          brandName={brandName}
          brandLogo={brandLogo}
          autoCta={autoCta}
          ctaUrl={ctaUrl}
          simulatedCaption={simulatedCaption}
          csvData={csvData}
          batchStatus={batchStatus}
          renderProgress={renderProgress}
          onAddHeadline={handleAddHeadline}
          onAddSubheadline={handleAddSubheadline}
          onAddVisualizer={handleAddVisualizer}
          onAddCaptions={handleAddCaptions}
          onAddCta={handleAddCta}
          onAddLogo={handleAddLogo}
          onAddImageElement={handleAddImageElement}
          onVisualizerColorChange={handleVisualizerColorChange}
          onAccentColorChange={handleAccentColorChange}
          onBgColorChange={setBgColor}
          onBackgroundUpload={handleImageUpload}
          onClearBackground={() => setBgMedia(null)}
          onBgShadowChange={setBgShadow}
          onBgShadowOpacityChange={setBgShadowOpacity}
          onIntroImageUpload={handleIntroImageUpload}
          onClearIntroImage={() => {
            setIntroImage(null);
            setIntroFileName('');
          }}
          onIntroDurationChange={setIntroDuration}
          onOpenIntroCrop={() => setIntroCropOpen(true)}
          onRenderDurationCapChange={setRenderDurationCap}
          onPlatformThemeChange={setPlatformTheme}
          onShowSafeZonesChange={setShowSafeZones}
          onShowRedGuidesChange={setShowRedGuides}
          onBrandNameChange={setBrandName}
          onBrandLogoUpload={handleBrandLogoUpload}
          onClearBrandLogo={() => setBrandLogo(null)}
          onAutoCtaChange={setAutoCta}
          onCtaUrlChange={setCtaUrl}
          onSimulatedCaptionChange={setSimulatedCaption}
          onCsvUpload={handleCsvUpload}
          onRunBatch={runBatch}
          onOpenCreativeBrief={() => setCreativeBriefOpen(true)}
          onReplayGuidedJourney={replayGuidedJourney}
        />

          <CreatePreviewStage
            platform={platform}
            platformTheme={platformTheme}
            brandName={brandName}
            brandLogo={brandLogo}
            caption={appRoute === 'create' && !hasPlayableCreateAudio ? 'Add audio for this ad' : simulatedCaption}
            autoCta={autoCta}
            bgColor={bgColor}
            bgMedia={bgMedia}
            bgShadow={bgShadow}
            bgShadowOpacity={bgShadowOpacity}
            introImage={introImage}
            introDuration={introDuration}
            introFeedCropY={introFeedCropY}
            introImageAspect={introImageAspect}
            previewDurationCap={renderDurationCap === 'full' ? null : renderDurationCap}
            audioUrl={audioUrl}
            previewAudioAnalysis={previewAudioAnalysis}
            isTranscribing={isTranscribing}
            accentColor={accentColor}
            playing={playing}
            spaceRemixCueVisible={spaceRemixCueVisible}
            rendering={rendering}
            exportLaunchAnimation={exportLaunchAnimation}
            hasPlayableCreateAudio={hasPlayableCreateAudio}
            onPlaybackComplete={() => setPlaying(false)}
            onRefreshBackgroundColor={refreshBackgroundColor}
            onApplyStyleArchetype={applyStyleArchetype}
            onDownloadVideo={downloadSimulatedVideo}
            onTogglePlayback={togglePlayback}
            onSaveDesign={openSaveDesignDialog}
            onPlatformChange={setPlatform}
          />

          <CreateDesignLibrary
            showCompactDesignLibrary={showCompactDesignLibrary}
            templateLibraryTab={templateLibraryTab}
            activeTemplateCount={activeTemplateCount}
            activeTemplateItems={activeTemplateItems}
            historySaveWarning={historySaveWarning}
            getTemplateTitle={getTemplateTitle}
            onTemplateLibraryTabChange={setTemplateLibraryTab}
            onLoadTemplate={loadTemplate}
            onDeleteTemplate={deleteTemplate}
            onDeleteHistoryItem={deleteHistoryItem}
          />
        </main>

        {exportStatusCard}

        {voiceWizardModal}

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
      <InteractiveTutorial enabled={!showHomepage} replayToken={tutorialReplayKey} />
    </div>
  );
}
