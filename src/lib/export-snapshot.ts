import type { AdElement, Caption } from '../store';
import type { PlatformType } from '../components/PlatformFrame';

export type ExportSnapshot = {
  id: string;
  name: string;
  durationSeconds?: number;
  elements: AdElement[];
  captions: Caption[];
  settings: {
    visualizerColor: string;
    accentColor: string;
    bgColor: string;
    platform: PlatformType;
    bgMedia: { url: string; type: string } | null;
    bgShadow: boolean;
    bgShadowOpacity: number;
    introImage: string | null;
    introDuration: number;
    introFeedCropY: number;
    audioUrl: string | null;
    renderDurationCap: 30 | 60 | 'full';
  };
};

export const EXPORT_FPS = 60;

export const getEditorDimensions = (platform: PlatformType) => {
  if (platform === 'youtube') {
    return { width: 640, height: 360 };
  }

  const vertical = platform === 'reels' || platform === 'stories' || platform === 'vertical';
  return {
    width: 360,
    height: vertical ? 640 : 450,
  };
};

export const getExportDimensions = (platform: PlatformType) => {
  if (platform === 'youtube') {
    return {
      width: 1920,
      height: 1080,
    };
  }

  const vertical = platform === 'reels' || platform === 'stories' || platform === 'vertical';
  return {
    width: 1080,
    height: vertical ? 1920 : 1350,
  };
};

export const getActiveCaption = (captions: Caption[], timeInSeconds: number) => {
  const index = captions.findIndex(caption => timeInSeconds >= caption.start && timeInSeconds <= caption.end);
  return {
    caption: index >= 0 ? captions[index] : null,
    index,
  };
};
