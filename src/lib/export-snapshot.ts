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

export type PhoneCallSnapshot = {
  kind: 'phone-call';
  id: string;
  name: string;
  durationSeconds: number;
  settings: {
    phoneNumber: string;
    audioUrl: string | null;
    ringAudioUrl?: string | null;
    ringDurationSeconds: 0 | 1 | 2 | 3;
    backgroundColor: string;
  };
};

export type RenderSnapshot = ExportSnapshot | PhoneCallSnapshot;

export const isPhoneCallSnapshot = (snapshot: RenderSnapshot | unknown): snapshot is PhoneCallSnapshot => (
  Boolean(snapshot && typeof snapshot === 'object' && (snapshot as PhoneCallSnapshot).kind === 'phone-call')
);

export const EXPORT_FPS = 60;
export const PHONE_CALL_EXPORT_DIMENSIONS = { width: 1080, height: 1920 };

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

export const getDefaultLayoutOffsetX = (platform: PlatformType) => {
  if (platform !== 'youtube') return 0;
  return (getEditorDimensions(platform).width - 360) / 2;
};

export const getDefaultLayoutScaleY = (platform: PlatformType) => {
  if (platform !== 'youtube') return 1;
  return getEditorDimensions(platform).height / 450;
};

export const getPlatformElementFrame = (element: AdElement, platform: PlatformType) => {
  const editorDimensions = getEditorDimensions(platform);
  const rawWidth = Number(element.width) || 200;
  const rawHeight = Number(element.height) || 50;
  let x = element.x;
  let y = element.y;
  let width = rawWidth;
  let height = rawHeight;

  if (platform === 'youtube') {
    const offsetX = getDefaultLayoutOffsetX(platform);
    if (element.type === 'visualizer') {
      x = -offsetX;
      width = editorDimensions.width;
    }

    if (element.type === 'caption') {
      x = 48 - offsetX;
      width = editorDimensions.width - 96;
      height = Math.max(rawHeight, 86);
      y = Math.min(y, 450 - height - 16);
    }
  }

  return { x, y, width, height };
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
