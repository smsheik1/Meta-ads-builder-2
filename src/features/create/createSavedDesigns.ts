import type { PlatformType } from '../../components/PlatformFrame';
import type { AdScene } from '../../engine/ad-scene/scene';
import { deleteAdHistoryItem, listAdHistory, saveAdHistoryItem, type StoredAdSnapshot } from '../../lib/ad-history';
import type { AudioAnalysisData } from '../../lib/audio-analysis';
import type { AdElement } from '../../store';

export const TEMPLATE_STORAGE_KEY = 'visualizer_ad_templates_v1';

export type AudioIntent = 'default' | 'uploaded' | 'generated';
export type IntroDuration = 0 | 1 | 2 | 3;

export type SavedTemplate = {
  id: string;
  name: string;
  builtIn?: boolean;
  createdAt: number;
  audioAnalysis?: AudioAnalysisData | null;
  adScene?: AdScene | null;
  elements: AdElement[];
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
    audioIntent?: AudioIntent;
    audioBrandKey?: string | null;
    createBrandKey?: string | null;
  };
};

export type AdHistoryItem = SavedTemplate & StoredAdSnapshot;

export const loadSavedTemplates = (): SavedTemplate[] => {
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load templates:', error);
    return [];
  }
};

export const persistSavedTemplates = (nextTemplates: SavedTemplate[]) => {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates));
};

export const hydrateStoredMedia = (template: SavedTemplate | AdHistoryItem): SavedTemplate => {
  const historyTemplate = template as AdHistoryItem;
  const settings = { ...template.settings };
  const adScene = template.adScene ? JSON.parse(JSON.stringify(template.adScene)) as AdScene : null;

  if (historyTemplate.media?.introImage) settings.introImage = URL.createObjectURL(historyTemplate.media.introImage);
  if (historyTemplate.media?.audio) {
    settings.audioUrl = URL.createObjectURL(historyTemplate.media.audio);
    if (adScene && adScene.audio.status !== 'none') adScene.audio.url = settings.audioUrl;
  }
  if (historyTemplate.media?.brandLogo) {
    settings.brandLogo = URL.createObjectURL(historyTemplate.media.brandLogo);
    if (adScene) {
      adScene.brand.logoUrl = settings.brandLogo;
      adScene.brand.faviconUrl = settings.brandLogo;
    }
  }
  if (historyTemplate.media?.bgMedia && settings.bgMedia) {
    settings.bgMedia = { ...settings.bgMedia, url: URL.createObjectURL(historyTemplate.media.bgMedia) };
  }

  return { ...template, settings, adScene };
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

export const loadSavedAdHistory = async () => (
  await listAdHistory()
) as AdHistoryItem[];

export const removeSavedAdHistoryItem = async (historyId: string) => (
  await deleteAdHistoryItem(historyId)
) as AdHistoryItem[];

export const saveDownloadedAdToHistoryItem = async (
  snapshot: SavedTemplate,
  adScene?: AdScene | null,
): Promise<{ items?: AdHistoryItem[]; warning: string | null }> => {
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
    adScene: adScene || snapshot.adScene || null,
    media,
    mediaWarnings: warnings,
  };

  try {
    const items = await saveAdHistoryItem(historyItem);
    return {
      items: items as AdHistoryItem[],
      warning: warnings.length ? warnings.join(' ') : null,
    };
  } catch (error) {
    console.error('Failed to save ad history:', error);
    return {
      warning: 'Downloaded video, but browser history could not save this design.',
    };
  }
};
