import React, { useState, useRef, useEffect } from 'react';
import { PlatformFrame, isFeedPlatform, isVerticalPlatform, type PlatformType } from './components/PlatformFrame';
import { CanvasEditor } from './components/CanvasEditor';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Upload, Play, Square, Database, CheckCircle2, Download, Layers, Loader2, X, Moon, Sun, ChevronDown, Type, AudioLines, Captions, MousePointerClick, Image as ImageIcon, BookmarkPlus, ClipboardList, ArrowRight, Wand2 } from 'lucide-react';
import Papa from 'papaparse';
import { useEditorStore } from './store';
import { drawAdvancedVisualizer } from './lib/visualizer';
import { stripRichText } from './lib/rich-text';
import { getRandomSeededHook } from './lib/headline-pool';
import { deleteAdHistoryItem, listAdHistory, saveAdHistoryItem, type StoredAdSnapshot } from './lib/ad-history';
import { deleteAudioItem, listAudioItems, saveAudioItem, type StoredAudioItem } from './lib/audio-library';
import type { ExportSnapshot } from './lib/export-snapshot';

const TEMPLATE_STORAGE_KEY = 'visualizer_ad_templates_v1';
const CREATIVE_BRIEF_STORAGE_KEY = 'visualizer_creative_brief_v1';
const STUDIO_SEEN_STORAGE_KEY = 'agent_enamel_studio_seen_v1';
const DEFAULT_INTRO_IMAGE = '/default-intro-image.png';
const DEFAULT_INTRO_IMAGE_NAME = 'Default intro image';
const DEFAULT_AUDIO_URL = '/ai-dental-receptionist-audio.mp3';
const DEFAULT_AUDIO_NAME = 'AI Dental Receptionist';
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

const isDefaultIntroImage = (url: string | null | undefined, fileName?: string | null) => (
  url === DEFAULT_INTRO_IMAGE || fileName === DEFAULT_INTRO_IMAGE_NAME
);

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
type IntroDuration = 1 | 2 | 3;

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
    question: "What's the CTA?",
    placeholder: 'Book a demo.',
  },
  {
    key: 'reference',
    question: 'Reference URL or winning ad',
    placeholder: 'Landing page URL, ad link, or notes from a top performer.',
    optional: true,
  },
];

type SavedTemplate = {
  id: string;
  name: string;
  builtIn?: boolean;
  createdAt: number;
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

type AdHistoryItem = SavedTemplate & StoredAdSnapshot;

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
  const [showHomepage, setShowHomepage] = useState(() => {
    try {
      return localStorage.getItem(STUDIO_SEEN_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  
  // Single Template State
  const [visualizerColor, setVisualizerColor] = useState("#00ffcc");
  const [accentColor, setAccentColor] = useState("#4f46e5");
  const [bgColor, setBgColor] = useState("#f5f5f5");

  // Platform Frame State
  const [platform, setPlatform] = useState<PlatformType>('instagram-feed');
  const [platformTheme, setPlatformTheme] = useState<'light' | 'dark'>('dark');
  const [brandName, setBrandName] = useState('Agent Enamel');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [simulatedCaption, setSimulatedCaption] = useState('Check out our new AI receptionist feature! Never miss a lead and keep your customers happy.');
  const [autoCta, setAutoCta] = useState('Learn More');
  
  // Media State
  const [bgMedia, setBgMedia] = useState<{url: string, type: string} | null>(null);
  const [bgShadow, setBgShadow] = useState(true);
  const [bgShadowOpacity, setBgShadowOpacity] = useState(0.38);
  const [introImage, setIntroImage] = useState<string | null>(null);
  const [introFileName, setIntroFileName] = useState<string>('');
  const [introDuration, setIntroDuration] = useState<IntroDuration>(1);
  const [introFeedCropY, setIntroFeedCropY] = useState(50);
  const [introImageAspect, setIntroImageAspect] = useState<number | null>(null);
  const [introCropOpen, setIntroCropOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(DEFAULT_AUDIO_URL);
  const [audioFileName, setAudioFileName] = useState<string>(DEFAULT_AUDIO_NAME);

  const refreshBackgroundColor = () => {
    setBgColor((currentColor) => getFreshBackgroundColor(currentColor));
  };
  
  // Playback/Render State
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState<ExportPhase>('recording');
  const [exportDownload, setExportDownload] = useState<{ url: string; blob: Blob; filename: string; snapshot: SavedTemplate } | null>(null);
  const [exportLaunchAnimation, setExportLaunchAnimation] = useState(false);
  const [renderDurationCap, setRenderDurationCap] = useState<RenderDurationCap>(30);
  const exportCancelRef = useRef<(() => void) | null>(null);
  const savedExportHistoryIdRef = useRef<string | null>(null);

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
  const [isGeneratingDialogueScripts, setIsGeneratingDialogueScripts] = useState(false);
  const [isGeneratingDialogueAudio, setIsGeneratingDialogueAudio] = useState(false);
  const [generatedDialogueAudioUrl, setGeneratedDialogueAudioUrl] = useState<string | null>(null);

  const { showSafeZones, setShowSafeZones, showRedGuides, setShowRedGuides, addElement, setElements, deselectAll, commitHistory, setBusinessContext, elements } = useEditorStore();
  const hasComponent = (role: NonNullable<typeof elements[number]['componentRole']>) => elements.some((element) => element.componentRole === role);
  const hasSubheadline = hasComponent('subheadline');

  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (saved) setTemplates(JSON.parse(saved));
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  useEffect(() => {
    listAdHistory()
      .then((items) => setHistoryItems(items as AdHistoryItem[]))
      .catch((error) => console.error('Failed to load ad history:', error));
  }, []);

  useEffect(() => {
    listAudioItems()
      .then(setStoredAudioItems)
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
    `[CTA] ${brief.cta}`,
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
    const snapshotIntroImage = isDefaultIntroImage(introImage, introFileName) ? null : introImage;
    const snapshotIntroFileName = snapshotIntroImage ? introFileName : '';

    return {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `template-${Date.now()}`,
      name,
      createdAt: Date.now(),
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
        bgMedia,
        bgShadow,
        bgShadowOpacity,
        introImage: snapshotIntroImage,
        introFileName: snapshotIntroFileName,
        introDuration,
        introFeedCropY,
        introImageAspect: snapshotIntroImage ? introImageAspect : null,
        audioUrl,
        audioFileName,
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
    setBgMedia(hydratedTemplate.settings.bgMedia);
    setBgShadow(hydratedTemplate.settings.bgShadow);
    setBgShadowOpacity(hydratedTemplate.settings.bgShadowOpacity);
    const hydratedIntroImage = isDefaultIntroImage(hydratedTemplate.settings.introImage, hydratedTemplate.settings.introFileName)
      ? null
      : hydratedTemplate.settings.introImage;
    setIntroImage(hydratedIntroImage);
    setIntroFileName(hydratedIntroImage ? hydratedTemplate.settings.introFileName || '' : '');
    setIntroDuration(hydratedTemplate.settings.introDuration || 1);
    setIntroFeedCropY(hydratedTemplate.settings.introFeedCropY ?? 50);
    setIntroImageAspect(hydratedIntroImage ? hydratedTemplate.settings.introImageAspect ?? null : null);
    setAudioUrl(hydratedTemplate.settings.audioUrl);
    setAudioFileName(hydratedTemplate.settings.audioFileName);
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

  const saveExportToHistoryOnce = (snapshot: SavedTemplate) => {
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
    const snapshotIntroImage = isDefaultIntroImage(snapshot.settings.introImage, snapshot.settings.introFileName)
      ? null
      : snapshot.settings.introImage;
    const audioDuration = await getMediaDurationSeconds(snapshot.settings.audioUrl, 'audio');
    const bgVideoDuration = snapshot.settings.bgMedia?.type === 'video'
      ? await getMediaDurationSeconds(snapshot.settings.bgMedia.url, 'video')
      : null;
    const uncappedDuration = Math.max(3, audioDuration || 0, bgVideoDuration || 0);
    const durationSeconds = renderDurationCap === 'full' ? uncappedDuration : Math.min(uncappedDuration, renderDurationCap);

    const remotionSnapshot: ExportSnapshot = {
      id: snapshot.id,
      name: snapshot.name,
      durationSeconds,
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
        introImage: snapshotIntroImage,
        introDuration: snapshot.settings.introDuration || 1,
        introFeedCropY: snapshot.settings.introFeedCropY ?? 50,
        audioUrl: snapshot.settings.audioUrl,
        renderDurationCap,
      },
    };

    const formData = new FormData();
    await appendMediaForRemotion(formData, 'audio', remotionSnapshot.settings.audioUrl, url => { remotionSnapshot.settings.audioUrl = url; });
    await appendMediaForRemotion(formData, 'introImage', remotionSnapshot.settings.introImage, url => { remotionSnapshot.settings.introImage = url; });
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
    setExportDownload({ url, blob: mp4Blob, filename, snapshot: exportSnapshot });
    setExportPhase('complete');
    setRenderProgress(100);
  };

  const downloadReadyExport = async () => {
    if (!exportDownload) return;

    let mp4Bytes: Uint8Array;
    try {
      mp4Bytes = await getValidMp4Bytes(exportDownload.blob, 'Ready export');
    } catch (error) {
      console.error('Blocked invalid MP4 download:', error);
      setExportPhase('error');
      alert('This export is not a valid MP4. Please export again.');
      return;
    }

    const showSaveFilePicker = (window as any).showSaveFilePicker;

    if (typeof showSaveFilePicker === 'function') {
      try {
        const fileHandle = await showSaveFilePicker({
          suggestedName: exportDownload.filename,
          types: [
            {
              description: 'MP4 video',
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
      alert('This export is not a valid MP4. Please export again.');
      return;
    }
    window.open(exportDownload.url, '_blank', 'noopener,noreferrer');
    saveExportToHistoryOnce(exportDownload.snapshot);
  };

  const deleteHistoryItem = async (historyId: string) => {
    const nextItems = await deleteAdHistoryItem(historyId);
    setHistoryItems(nextItems as AdHistoryItem[]);
  };

  const rememberAudioBlob = async (name: string, blob: Blob) => {
    try {
      const item: StoredAudioItem = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `audio-${Date.now()}`,
        name,
        createdAt: Date.now(),
        blob,
        mimeType: blob.type || 'audio/mpeg',
      };
      const nextItems = await saveAudioItem(item);
      setStoredAudioItems(nextItems);
    } catch (error) {
      console.error('Failed to save audio item:', error);
    }
  };

  const useAudioItem = (item: AudioLibraryItem) => {
    setGeneratedDialogueAudioUrl(null);
    const nextUrl = item.stored ? URL.createObjectURL(item.stored.blob) : item.url;
    setAudioUrl(nextUrl);
    setAudioFileName(item.name);
  };

  const deleteStoredAudio = async (audioId: string) => {
    const nextItems = await deleteAudioItem(audioId);
    setStoredAudioItems(nextItems);
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
      setAudioUrl(url);
      setAudioFileName(file.name);
      await rememberAudioBlob(file.name, file);
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

  const handleGenerateDialogueScripts = async () => {
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
      setDialogueScripts(Array.isArray(data.scripts) ? data.scripts : []);
    } catch (error: any) {
      console.error('Dialogue script generation failed:', error);
      alert(`Dialogue generation failed: ${error.message || 'Unknown error'}`.slice(0, 180));
    } finally {
      setIsGeneratingDialogueScripts(false);
    }
  };

  const handleGenerateDialogueAudio = async (script: DialogueScript) => {
    try {
      setIsGeneratingDialogueAudio(true);
      const res = await fetch('/api/generate-dialogue-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
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
      const captions = captionsFromDialogueScript(script, audioDuration);
      useEditorStore.getState().setCaptions(captions);
      setGeneratedDialogueAudioUrl(url);
      setAudioUrl(url);
      const filename = data.filename || `${script.title || 'conversation-ad'}.wav`;
      setAudioFileName(filename);
      await rememberAudioBlob(filename, blob);
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
           alert('Transcription failed: ' + errorText.substring(0, 50));
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
  }, [audioUrl, generatedDialogueAudioUrl]);

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
    if (hasSubheadline) return;

    addElement({
      type: 'text',
      componentRole: 'subheadline',
      content: 'Your secondary message goes here',
      x: 20,
      y: 198,
      width: 320,
      height: 72,
      rotation: 0,
      zIndex: 2,
      fontSize: 18,
      fontWeight: '600',
      color: accentColor,
      textAlign: 'center',
      lineHeight: 1.12,
    });
  };

  const handleAddHeadline = () => {
    if (hasComponent('headline')) return;
    addElement({
      type: 'text',
      componentRole: 'headline',
      content: getRandomSeededHook(),
      x: 20,
      y: 118,
      width: 320,
      height: 120,
      rotation: 0,
      zIndex: 1,
      fontSize: 52,
      fontWeight: '900',
      color: '#000000',
      textAlign: 'center',
      lineHeight: 1.04,
    });
  };

  const handleAddVisualizer = () => {
    if (hasComponent('visualizer')) return;
    addElement({
      type: 'visualizer',
      componentRole: 'visualizer',
      x: 0,
      y: 255,
      width: 360,
      height: 90,
      rotation: 0,
      zIndex: 3,
      visualizerType: 'bars-center',
      barColor: visualizerColor,
      barCount: 16,
      visualizerSensitivity: 1.5,
      visualizerSmoothing: 0.85,
      visualizerHeight: 0.9,
      visualizerBaseline: 4,
      visualizerSplitSpeakers: false,
    });
  };

  const handleAddCaptions = () => {
    if (hasComponent('captions')) return;
    addElement({
      type: 'caption',
      componentRole: 'captions',
      x: 20,
      y: 350,
      width: 320,
      height: 48,
      rotation: 0,
      zIndex: 4,
    });
  };

  const handleAddCta = () => {
    addElement({
      type: 'button',
      componentRole: 'cta',
      content: 'BOOK A DEMO',
      x: 88,
      y: 590,
      width: 184,
      height: 48,
      rotation: 0,
      zIndex: 5,
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
      backgroundColor: accentColor,
      borderRadius: 8,
    });
  };

  const handleAddLogo = () => {
    if (hasComponent('logo')) return;
    addElement({
      type: 'image',
      componentRole: 'logo',
      imageUrl: '/logo.png',
      x: 120,
      y: 70,
      width: 120,
      height: 48,
      rotation: 0,
      zIndex: 10,
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
      alert("Please upload an audio file first.");
      return;
    }
    setPlaying(!playing);
  };

  const cancelExport = () => {
    exportCancelRef.current?.();
  };

  const downloadSimulatedVideo = async () => {
    const exportSnapshot = createCurrentSnapshot(getCurrentDesignTitle());
    setExportLaunchAnimation(true);
    window.setTimeout(() => setExportLaunchAnimation(false), 650);
    setRendering(true);
    setRenderProgress(0);
    setExportPhase('recording');
    savedExportHistoryIdRef.current = null;
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
      console.warn('Remotion export failed, falling back to browser recorder:', error);
      setExportPhase('recording');
      setRenderProgress(0);
    }

    const isVertical = isVerticalPlatform(platform);
    const targetWidth = 1080;
    const targetHeight = isVertical ? 1920 : 1350;
    
    // UI is based on 360px width
    const scale = targetWidth / 360;

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
        setExportDownload({ url, blob: mp4Blob, filename, snapshot: exportSnapshot });
        setExportPhase('complete');
        setRenderProgress(100);
      } catch (err) {
        if (exportCancelled || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }
        console.error("Error creating MP4:", err);
        setExportPhase('error');
        alert('MP4 export failed. Please try again.');
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
         const rawElW = typeof el.width === 'number' ? el.width : 200;
         const rawElH = typeof el.height === 'number' ? el.height : 50;
         const feedSafeSquareTop = isFeedPlatform(platform) ? Math.max(0, (canvasHeight - canvasWidth) / 2) : 0;
         const feedSafeSquareBottom = feedSafeSquareTop + canvasWidth;
         const rawElY = isFeedPlatform(platform) && el.type === 'caption'
           ? Math.min(el.y, feedSafeSquareBottom - rawElH - 8)
           : el.y;
         const elX = el.x * scale;
         const elY = rawElY * scale;
         const elW = rawElW * scale;
         const elH = rawElH * scale;
         
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
             const activeCaptionIndex = renderCaptions.findIndex(c => currentTimeSec >= c.start && currentTimeSec <= c.end);
             const activeCaption = activeCaptionIndex >= 0 ? renderCaptions[activeCaptionIndex] : undefined;
             
             if (activeCaption) {
                const maxTextWidth = elW - (18 * scale);
                const maxTextHeight = elH - (16 * scale);
                const captionText = `${activeCaption.text}`;
                const captionSpeaker = (activeCaptionIndex % 2) + 1;
                const captionColor = CAPTION_SPEAKER_COLORS[captionSpeaker] || el.color || accentColor;
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
                let high = 72 * scale;
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
             
             const type = el.visualizerType || 'bars-center';
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
                     val = Math.min((dataArray[Math.min(dataIdx, dataArray.length-1)] / 255.0) * sensitivityMultiplier, 1.0); 
                     val = Math.pow(val, 1.5); // non-linear scaling for better visuals
                 } else {
                     val = Math.min(((Math.sin(frame * 0.2 + idx) * 0.5 + 0.5) * 0.5) * sensitivityMultiplier, 1.0);
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
             } else if (['waveform-strip', 'ai-orb', 'siri-wave', 'ai-blob', 'elevenlabs-v1', 'elevenlabs-v2', 'elevenlabs-v3', 'chatgpt-orb'].includes(type)) {
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
                     v = Math.min((v / 255.0) * sensitivityMultiplier, 1.0);
                 } else {
                     v = Math.min(((Math.sin(frame * 0.2) * 0.5 + 0.5) * 0.5) * sensitivityMultiplier, 1.0);
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

      if (introImgEl) {
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
      alert("Please upload a CSV file with batch data.");
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
  const audioLibraryItems: AudioLibraryItem[] = [
    { id: 'built-in-ai-dental-receptionist-audio', name: DEFAULT_AUDIO_NAME, url: DEFAULT_AUDIO_URL, builtIn: true },
    ...storedAudioItems.map((item) => ({
      id: item.id,
      name: item.name,
      url: '',
      stored: item,
    })),
  ];

  const enterStudio = () => {
    try {
      localStorage.setItem(STUDIO_SEEN_STORAGE_KEY, '1');
    } catch {
      // Ignore private browsing storage failures.
    }
    setShowHomepage(false);
  };

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

  if (showHomepage) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] font-sans text-slate-950">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 md:px-10">
          <div className="flex items-center gap-3">
            <img src="/wiggly-logo.svg" alt="Wiggly" className="h-10 w-10 rounded-xl object-cover shadow-sm" />
            <div>
              <p className="text-lg font-black leading-tight">Wiggly</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Visual ads that move fast.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={enterStudio}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
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
                Visualizer ads for modern service brands
              </div>
              <h1 className="relative text-5xl font-black leading-[0.95] tracking-normal text-slate-950 md:text-7xl">
                Turn sharp hooks into scroll-stopping ad creatives.
              </h1>
              <p className="relative mt-6 max-w-lg text-lg font-medium leading-8 text-slate-600">
                Build branded Meta ads with bold hooks, intro cards, voiceover audio, waveform visuals, and export-ready layouts without opening a video editor.
              </p>
              <div className="relative mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={enterStudio}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Create an ad
                  <Wand2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={enterStudio}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
                >
                  Explore templates
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
                    <p className="text-sm font-black text-slate-900">Hook + waveform + CTA</p>
                    <p className="text-xs font-semibold text-slate-500">The reusable ad-card system.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="pb-16 pt-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-black uppercase tracking-wide text-slate-400">Built for the marketer workflow</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950 md:text-5xl">
                Fast ad making without the design-tool maze.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Wand2,
                  title: 'Slot-machine hooks',
                  copy: 'Refresh ad angles instantly without prompt writing.',
                },
                {
                  icon: AudioLines,
                  title: 'Audio-first visuals',
                  copy: 'Waveforms, captions, intro cards, and CTA layouts in one builder.',
                },
                {
                  icon: CheckCircle2,
                  title: 'Meta-safe previews',
                  copy: 'Check feed, reels, stories, and safe areas before export.',
                },
                {
                  icon: BookmarkPlus,
                  title: 'Reusable designs',
                  copy: 'Save winning layouts and reload them for the next ad.',
                },
                {
                  icon: Download,
                  title: 'MP4 export',
                  copy: 'Create upload-ready ads without opening a video editor.',
                },
                {
                  icon: MousePointerClick,
                  title: 'Marketer-first flow',
                  copy: 'Strategy, copy, design, preview, and export stay together.',
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
                <p className="mb-5 text-sm font-black uppercase tracking-wide text-white/40">Persona decks</p>
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
                  <p className="text-sm font-black uppercase tracking-wide text-slate-400">Current persona</p>
                  <p className="mt-2 text-2xl font-black leading-tight">{activePersonaDeck.customer}</p>
                </div>
                <div className="mt-6 space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-500">
                      <span>Pain intensity</span>
                      <span>{activePersonaDeck.pain}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950/10">
                      <div className={`h-2 rounded-full bg-slate-950 ${activePersonaDeck.pain === 'High' ? 'w-4/5' : 'w-3/5'}`} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-500">
                      <span>Creative speed</span>
                      <span>{activePersonaDeck.speed}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950/10">
                      <div className={`h-2 rounded-full bg-[#4F46E5] ${activePersonaDeck.speed === 'Urgent' ? 'w-full' : activePersonaDeck.speed === 'Steady' ? 'w-2/3' : 'w-11/12'}`} />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={enterStudio}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Open this deck
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="relative -mt-8 text-center text-sm font-black text-white/35">
              Pick a customer type. Wiggly gives you a visual direction to start from.
            </p>
          </section>

          <section className="py-16">
            <div className="mb-12 max-w-4xl">
              <h2 className="text-4xl font-black leading-[0.95] tracking-normal text-slate-950 md:text-6xl">
                Designed for the parts marketers repeat every day.
              </h2>
              <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-500">
                Wiggly keeps the creative loop small: pick a hook, preview the ad, save what works, and ship the next variation.
              </p>
            </div>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Wand2, title: 'Fresh hook angles' },
                { icon: AudioLines, title: 'Reactive waveform ads' },
                { icon: Layers, title: 'Layouts you can reuse' },
                { icon: Captions, title: 'Caption-ready videos' },
                { icon: Type, title: 'Editable ad copy' },
                { icon: BookmarkPlus, title: 'Saved design library' },
                { icon: CheckCircle2, title: 'Placement checks' },
                { icon: Download, title: 'Export-ready MP4s' },
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
                <p className="text-sm font-black uppercase tracking-wide text-[#00FFCC]">The ad creative loop</p>
                <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-normal md:text-6xl">
                  Make ten ad directions before lunch.
                </h2>
                <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/62">
                  Start with a saved layout, refresh the hook, check the Meta placement, then export the version that feels strongest.
                </p>
                <button
                  type="button"
                  onClick={enterStudio}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  Open Wiggly
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Hook', 'Lunch break = lost case'],
                    ['Format', 'IG Feed 4:5'],
                    ['Motion', 'Center waveform'],
                    ['Export', '30s MP4'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white/[0.09] p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-white/35">{label}</p>
                      <p className="mt-2 text-lg font-black leading-tight text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-[#00FFCC] p-5 text-slate-950">
                  <p className="text-sm font-black uppercase tracking-wide opacity-60">Current angle</p>
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
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
        <button
          type="button"
          onClick={() => setShowHomepage(true)}
          className="flex items-center gap-3 rounded-xl text-left transition hover:opacity-80"
          title="Open homepage"
        >
          <img src="/wiggly-logo.svg" alt="Wiggly" className="h-8 w-8 rounded-md object-cover shadow-sm" />
          <h1 className="text-lg font-semibold tracking-tight">
            {appTitle}
          </h1>
        </button>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'single' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Create Ad
          </button>
          <button 
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'batch' ? 'bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700' : 'text-slate-600 hover:bg-slate-50 rounded-lg'}`}
          >
            Batch Ads
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Settings Sidebar */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 shrink-0 hidden lg:flex">
            
            {activeTab === 'single' ? (
              <>
              <PropertiesPanel />

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Components</h2>
                <div className="space-y-2">
                  {[
                    { label: 'Headline', description: 'Hook slot with refresh', icon: Type, action: handleAddHeadline, added: hasComponent('headline') },
                    { label: 'Sub-headline', description: 'Optional supporting copy', icon: Type, action: handleAddSubheadline, added: hasSubheadline },
                    { label: 'Visualizer', description: 'Audio-reactive bars', icon: AudioLines, action: handleAddVisualizer, added: hasComponent('visualizer') },
                    { label: 'Captions', description: 'Timed transcript text', icon: Captions, action: handleAddCaptions, added: hasComponent('captions') },
                    { label: 'CTA Button', description: 'Clickable-style call to action', icon: MousePointerClick, action: handleAddCta, added: false },
                    { label: 'Logo', description: 'Default brand mark', icon: ImageIcon, action: handleAddLogo, added: hasComponent('logo') },
                  ].map((component) => {
                    const Icon = component.icon;
                    return (
                      <button
                        key={component.label}
                        type="button"
                        onClick={component.action}
                        disabled={component.added}
                        className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-500" />
                          <span>
                            <span className="block text-sm font-semibold text-slate-800">{component.label}</span>
                            <span className="block text-xs text-slate-500">{component.description}</span>
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-slate-400">{component.added ? 'Added' : 'Add'}</span>
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
                      title="Add Image Layer"
                    />
                    <div className="w-full flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-left transition-colors group-hover:bg-slate-50">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">Image Layer</span>
                          <span className="block text-xs text-slate-500">Upload product or proof image</span>
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-slate-400">Upload</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Style & Assets</h2>
                <div className="space-y-2">
                  {[
                    { label: 'Visualizer', value: visualizerColor, onChange: setVisualizerColor },
                    { label: 'Accent', value: accentColor, onChange: setAccentColor },
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
                      <div className="w-full h-full flex items-center justify-between px-3 py-3 text-sm border border-dashed border-slate-300 rounded-lg text-slate-600 group-hover:bg-slate-50 bg-white transition-colors">
                        <span className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span>
                            <span className="block font-semibold text-slate-700">Background media</span>
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
                          <span className="block text-sm font-semibold text-slate-700">Shadow overlay</span>
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
                      <div className="w-full h-full flex min-w-0 items-center justify-between gap-2 px-3 py-3 text-sm border border-dashed border-slate-300 rounded-lg text-slate-600 group-hover:bg-slate-50 bg-white transition-colors">
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <ImageIcon className="w-4 h-4 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 overflow-hidden">
                            <span className="block font-semibold text-slate-700">Intro image</span>
                            <span className="block truncate text-xs text-slate-500">{introImage ? introFileName || `Shows first ${introDuration}s` : 'No intro. Ad starts immediately.'}</span>
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
                        <span className="text-xs font-semibold text-slate-600">Intro duration</span>
                        <span className="text-xs font-semibold text-slate-400">{introDuration}s then fade</span>
                      </div>
                      <div className="grid grid-cols-3 rounded-md bg-slate-100 p-1">
                        {([1, 2, 3] as const).map((duration) => (
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
                        Check feed crop
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="relative group flex-1">
                      <input 
                        type="file" 
                        accept="audio/*,video/mp4" 
                        onChange={(e) => {
                          handleAudioUpload(e);
                          if(e.target) e.target.value = '';
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Upload audio"
                      />
                      <div className="w-full h-full flex items-center justify-between px-3 py-3 text-sm border border-dashed border-slate-300 rounded-lg text-slate-600 group-hover:bg-slate-50 bg-white transition-colors">
                        <span className="flex items-center gap-2">
                          {isTranscribing ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" /> : <Upload className="w-4 h-4 text-slate-400" />}
                          <span>
                            <span className="block font-semibold text-slate-700">{isTranscribing ? "Transcribing..." : "Voiceover audio"}</span>
                            <span className="block max-w-[170px] truncate text-xs text-slate-500">{audioFileName || "MP3, WAV, M4A"}</span>
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {audioUrl ? "Loaded" : "Upload"}
                        </span>
                      </div>
                    </div>
                    {audioUrl && (
                      <button 
                        onClick={() => { setAudioUrl(null); setAudioFileName(''); setGeneratedDialogueAudioUrl(null); }}
                        title="Remove Audio"
                        className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {audioLibraryItems.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Previous audios</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400">{audioLibraryItems.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {audioLibraryItems.slice(0, 6).map((item) => (
                          <div
                            key={item.id}
                            className={`group flex items-center gap-2 rounded-md border px-2 py-2 text-left transition ${
                              audioFileName === item.name
                                ? 'border-indigo-200 bg-white text-slate-900'
                                : 'border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => useAudioItem(item)}
                              className="min-w-0 flex-1 text-left"
                              title={`Use ${item.name}`}
                            >
                              <span className="block truncate text-xs font-bold">{item.name}</span>
                              <span className="block text-[10px] font-semibold text-slate-400">{item.builtIn ? 'Default audio' : 'Saved on this device'}</span>
                            </button>
                            {!item.builtIn && (
                              <button
                                type="button"
                                onClick={() => deleteStoredAudio(item.id)}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                                title="Remove audio"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="block text-sm font-bold text-slate-800">Conversation ad</span>
                        <span className="block text-xs font-semibold leading-5 text-slate-500">Generate a subtle two-person voice scene from the brief.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateDialogueScripts}
                        disabled={isGeneratingDialogueScripts || isGeneratingDialogueAudio}
                        className="shrink-0 rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isGeneratingDialogueScripts ? 'Writing...' : 'Generate'}
                      </button>
                    </div>
                    {dialogueScripts.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {dialogueScripts.map((script, index) => (
                          <button
                            key={`${script.title}-${index}`}
                            type="button"
                            onClick={() => handleGenerateDialogueAudio(script)}
                            disabled={isGeneratingDialogueAudio || isGeneratingDialogueScripts}
                            className="w-full rounded-md border border-slate-200 bg-white p-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-black text-slate-800">{script.title || `Option ${index + 1}`}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                                {isGeneratingDialogueAudio ? 'Making audio' : 'Use'}
                              </span>
                            </span>
                            <span className="mt-1 block truncate text-[11px] font-semibold text-slate-500">{script.angle}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Simulator</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Meta preview</span>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: 'facebook-feed', label: 'FB Feed', ratio: '4:5' },
                      { id: 'instagram-feed', label: 'IG Feed', ratio: '4:5' },
                      { id: 'reels', label: 'Reels', ratio: '9:16' },
                      { id: 'stories', label: 'Stories', ratio: '9:16' },
                    ] as const).map((option) => {
                      const active = platform === option.id || (platform === 'feed' && option.id === 'facebook-feed') || (platform === 'vertical' && option.id === 'reels');
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setPlatform(option.id)}
                          className={`rounded-lg border px-3 py-2 text-left transition-colors ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                        >
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className={`block text-xs ${active ? 'text-white/70' : 'text-slate-500'}`}>{option.ratio}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPlatformTheme('dark')}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${platformTheme === 'dark' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatformTheme('light')}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${platformTheme === 'light' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                    >
                      <Sun className="w-4 h-4" />
                      Light
                    </button>
                  </div>

                  <div className="space-y-2">
                    {[
                      { id: 'safeZonesToggle', label: 'Safe zones', checked: showSafeZones, onChange: setShowSafeZones },
                      { id: 'redGuidesToggle', label: 'Info labels', checked: showRedGuides, onChange: setShowRedGuides },
                    ].map((toggle) => (
                      <label key={toggle.id} htmlFor={toggle.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
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
                      <span className="mb-1.5 block text-xs font-semibold text-slate-700">Brand username</span>
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
                              <span className="block text-sm font-semibold text-slate-700">Brand logo</span>
                              <span className="block text-xs text-slate-500">Profile avatar</span>
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
                    <label className="text-xs font-semibold text-slate-700">Platform CTA</label>
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

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      Caption Preview
                    </label>
                    <textarea 
                      value={simulatedCaption}
                      onChange={e => setSimulatedCaption(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 resize-none" 
                    />
                    <div className="flex justify-end text-[10px] text-slate-400 font-medium">
                       {simulatedCaption.length > 125 ? <span className="text-orange-500 flex items-center gap-1">⚠ Truncated (~125 chars max before 'more')</span> : `~${125 - simulatedCaption.length} chars until truncation`}
                    </div>
                  </div>
                </div>
              </div>
              </>
            ) : (
              <div className="bg-indigo-900 rounded-xl border border-indigo-800 shadow-sm p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Batch Engine</h2>
                  <Database className="w-4 h-4 text-indigo-400" />
                </div>
                
                <p className="text-[11px] leading-relaxed text-indigo-200 mb-4">
                  Upload a CSV file containing <strong>headline</strong> and <strong>audioUrl</strong> to render multiple variations.
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
                      Drag & Drop CSV
                    </span>
                  </div>
                </div>

                {csvData.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] leading-relaxed text-indigo-200 mb-2">
                      Current Queue: <span className="text-white font-semibold">{csvData.length} Combinations</span>
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> Batch Render {Math.round(renderProgress)}%</>
                  ) : batchStatus === 'done' ? (
                    <><CheckCircle2 className="w-4 h-4" /> Batch Complete</>
                  ) : (
                    "Initialize Batch Render"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Main Preview Area */}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-3">
            
            <div className="w-full max-w-[420px] relative">
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
                  accentColor={accentColor}
                  playing={playing}
                  onPlaybackComplete={() => setPlaying(false)}
                  onRefreshBackgroundColor={refreshBackgroundColor}
                />
              </PlatformFrame>
              
              {/* Cycle Platform Button */}
              <button 
                onClick={() => {
                  const platforms: PlatformType[] = ['facebook-feed', 'instagram-feed', 'reels', 'stories'];
                  const currentIndex = platforms.indexOf(platform);
                  const nextIndex = (currentIndex + 1) % platforms.length;
                  setPlatform(platforms[nextIndex]);
                }}
                className="absolute -right-14 sm:-right-20 bottom-8 p-3 bg-white border border-slate-200 shadow-xl rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all cursor-pointer group z-10"
                title="Next Environment"
              >
                <ChevronDown className="w-6 h-6 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
              </button>

              <div className="absolute -right-11 top-[30%] z-20 hidden sm:block">
                <button
                  type="button"
                  onClick={() => {
                    setTemplateDraftName(getCurrentDesignTitle());
                    setSaveTemplateOpen(true);
                  }}
                  className="flex h-24 w-8 items-center justify-center rounded-r-xl border border-l-0 border-slate-200 bg-white/95 text-slate-500 shadow-lg backdrop-blur transition hover:w-10 hover:text-slate-900"
                  title="Save this design as a template"
                >
                  <BookmarkPlus className="h-4 w-4" />
                </button>
              </div>

              {saveTemplateOpen && (
                <div className="absolute -right-56 top-[30%] z-30 hidden w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl sm:block">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Save template</p>
                      <p className="mt-0.5 text-xs text-slate-500">Name is optional.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSaveTemplateOpen(false)}
                      className="rounded-md p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={templateDraftName}
                    onChange={(e) => setTemplateDraftName(e.target.value)}
                    placeholder={getCurrentDesignTitle()}
                    className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => saveCurrentTemplate()}
                    className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
                  >
                    Save
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setCreativeBriefOpen(true)}
                className="absolute -right-14 top-[12%] z-20 hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition hover:text-slate-900 hover:shadow-xl sm:flex"
                title="Open Creative Brief"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {briefCompletion}/{requiredBriefFields}
                </span>
              </button>
            </div>

            {/* Toolbar */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex flex-wrap justify-center gap-3">
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={downloadSimulatedVideo}
                    disabled={rendering}
                    className={`px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold flex items-center gap-2 text-slate-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${exportLaunchAnimation ? 'translate-y-8 scale-90 opacity-0' : ''}`}
                   >
                    {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {rendering ? 'Exporting MP4' : 'Export MP4'}
                  </button>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span className="font-medium mr-1 text-slate-600">Video length:</span>
                    <button 
                      onClick={() => setRenderDurationCap(30)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${renderDurationCap === 30 ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-slate-100'}`}
                    >
                      30s
                    </button>
                    <button 
                      onClick={() => setRenderDurationCap(60)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${renderDurationCap === 60 ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-slate-100'}`}
                    >
                      60s
                    </button>
                    <button 
                      onClick={() => setRenderDurationCap('full')}
                      className={`px-1.5 py-0.5 rounded transition-colors ${renderDurationCap === 'full' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-slate-100'}`}
                    >
                      Full
                    </button>
                  </div>
                </div>
                <button 
                  onClick={togglePlayback}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors self-start"
                 >
                  {playing ? (
                    <><Square className="w-4 h-4 text-red-400" /> Stop Preview</>
                  ) : (
                    <><Play className="w-4 h-4 text-indigo-400 fill-current" /> Play Preview</>
                  )}
                </button>
              </div>

              <div className="mt-1 w-full max-w-[360px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Timeline</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {renderDurationCap === 'full' ? 'Full audio' : `${selectedTimelineDuration}s`}
                  </span>
                </div>
                <div className="flex h-8 overflow-hidden rounded-lg bg-slate-100">
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
                    Visualizer {mainTimelineSeconds}s
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-400">
                  <span>0s</span>
                  {introImage ? <span>Fade after {introDuration}s</span> : <span>No intro</span>}
                  <span>{renderDurationCap === 'full' ? 'End' : `${selectedTimelineDuration}s`}</span>
                </div>
              </div>
            </div>
            
          </div>

          {/* Template Library */}
          <div className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:flex">
            <div className="border-b border-slate-100 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Design Library</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Templates plus your last 20 downloaded ads.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">{activeTemplateCount}</span>
              </div>
              <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                {(['templates', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTemplateLibraryTab(tab)}
                    className={`rounded-md px-2 py-1.5 text-xs font-bold transition ${templateLibraryTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {tab === 'templates' ? 'Templates' : 'My History'}
                  </button>
                ))}
              </div>
              {templateLibraryTab === 'history' && (
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">History is saved on this device after you download an MP4.</p>
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
                      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 text-left transition hover:border-indigo-300 hover:bg-white hover:shadow-sm active:scale-[0.99]"
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
        </main>

        {(rendering || exportDownload || exportPhase === 'error') && (
          <div className="fixed bottom-5 right-5 z-50 w-[300px] rounded-lg border border-slate-200 bg-white p-4 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
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
                      ? 'MP4 ready'
                      : exportPhase === 'error'
                        ? 'Export failed'
                        : exportPhase === 'converting'
                          ? 'Converting to MP4'
                          : 'Rendering frames'}
                  </p>
                  {exportDownload || exportPhase === 'error' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (exportDownload) URL.revokeObjectURL(exportDownload.url);
                        setExportDownload(null);
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
                {!exportDownload && exportPhase !== 'error' && <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-indigo-500 transition-all duration-200 ${exportPhase === 'converting' ? 'animate-pulse' : ''}`}
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>}
                <p className="mt-2 text-xs leading-snug text-slate-500">
                  {exportDownload
                    ? `Ready to save: ${formatBytes(exportDownload.blob.size)} MP4 snapshot.`
                    : exportPhase === 'error'
                      ? 'Try exporting again. If it repeats, restart the dev server.'
                      : exportPhase === 'converting'
                    ? 'Finalizing the 60fps MP4. Keep this tab open.'
                    : 'Rendering a snapshot of this ad. You can start a different creative while this finishes.'}
                </p>
                {exportDownload && (
                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={downloadReadyExport}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      <Download className="h-4 w-4" />
                      Download MP4
                    </button>
                    <button
                      type="button"
                      onClick={openReadyExport}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open MP4
                    </button>
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
                  <h2 className="text-base font-bold text-slate-900">Check Intro Crop</h2>
                  <p className="mt-1 text-sm text-slate-500">Keep important text, faces, and CTA inside the 1:1 safe area for feed.</p>
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
                      <span className="text-sm font-bold text-slate-700">{introIsSquareish ? 'Feed-safe square fit' : 'Feed vertical crop'}</span>
                      <span className="text-xs font-bold text-slate-400">{introIsSquareish ? '1:1' : `${introFeedCropY}%`}</span>
                    </div>
                    {introIsSquareish ? (
                      <p className="text-xs leading-relaxed text-slate-500">This image is already square, so it is fitted into the 1:1 safe area. There is no vertical crop to adjust.</p>
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
                    If the core message cannot fit inside the square, recreate a feed-safe intro image instead of forcing the crop.
                  </div>

                  <button
                    type="button"
                    onClick={() => setIntroCropOpen(false)}
                    className="mt-auto rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Use This Crop
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {creativeBriefOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Creative Brief</h2>
                  <p className="mt-1 text-sm text-slate-500">Answer once. Future ad variations use this as strategy context.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
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

              <div className="grid max-h-[64vh] gap-4 overflow-y-auto p-5 md:grid-cols-2">
                {CREATIVE_BRIEF_FIELDS.map((field) => (
                  <label key={field.key} className={field.key === 'reference' ? 'block space-y-1.5 md:col-span-2' : 'block space-y-1.5'}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{field.question}</span>
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

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-xs text-slate-500">This saves automatically in this browser.</p>
                <button
                  type="button"
                  onClick={() => setCreativeBriefOpen(false)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
