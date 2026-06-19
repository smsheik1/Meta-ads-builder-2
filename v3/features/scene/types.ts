import type { BrandAdAngle, BrandSnapshot, ResearchReceipts } from "../research/types";

export const AD_SCENE_VERSION = 1 as const;

export type AdFormatId = "visualizer" | "meme" | "were-sorry" | "video-meme" | "jingle" | "text-message" | "brainrot";

export type HeadlineType =
  | "painful_moment"
  | "receipt_drop"
  | "callout"
  | "contrast"
  | "transformation";

export type AdSceneCandidate = {
  angleId: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  headlineType: HeadlineType;
  selectedPain: string;
  selectedProof: string;
};

export type AdSceneCaption = {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: 1 | 2;
};

export type AdSceneAudioAnalysis = {
  fps: number;
  levels: number[];
  bands: number[][];
};

export type AdSceneAudio =
  | {
    status: "none";
    transcript: "";
    captions: [];
  }
  | {
    status: "generated";
    storageId: string;
    url: string;
    mimeType: string;
    durationMs: number;
    durationSeconds: number;
    transcript: string;
    captions: AdSceneCaption[];
    analysis?: AdSceneAudioAnalysis;
    provider: "gemini" | "upload" | "elevenlabs" | "fish-studio";
    model: string;
    generatedAt: number;
  };

export type AdSceneVisualizerStyle = {
  type: "bars-bottom" | "bars-center" | "waveform-strip";
  barCount: number;
  sensitivity: number;
  heightScale: number;
  baseline: number;
  gain: number;
  compression: number;
  floor: number;
  ceiling: number;
  curve: "default" | "linear" | "sqrt" | "log";
  bandFocus: "full" | "voice" | "low" | "high";
  mirror: boolean;
  splitSpeakers: boolean;
};

export type AdSceneStyleBase = {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFeel: BrandSnapshot["fonts"]["feel"];
};

export type AdSceneBase<
  TFormat extends string,
  TStyle extends AdSceneStyleBase,
  TLayout extends { preset: string },
> = {
  version: typeof AD_SCENE_VERSION;
  format: TFormat;
  brand: BrandSnapshot & {
    receipts: ResearchReceipts;
  };
  creative: {
    angleId: string;
    headline: string;
    subheadline: string;
    ctaText: string;
    headlineType: HeadlineType;
    selectedPain: string;
    selectedProof: string;
  };
  style: TStyle;
  audio: AdSceneAudio;
  layout: TLayout;
  metadata: {
    candidateIndex: number;
    generationBatchId: string;
    researchRunId: string;
    brandSnapshotId: string;
    model: string;
    provider: "gemini" | "nvidia-nim" | "deterministic";
    generatedAt: number;
    adAngles?: BrandAdAngle[];
  };
};

export type VisualizerAdSceneStyle = AdSceneStyleBase & {
  visualizerColor: string;
  visualizer?: AdSceneVisualizerStyle;
};

export type VisualizerAdScene = AdSceneBase<
  "visualizer",
  VisualizerAdSceneStyle,
  { preset: "centered-hero" }
>;

export type MemeAdScene = AdSceneBase<
  "meme",
  AdSceneStyleBase,
  {
    preset: "meme-template";
    templateId: string;
    slots: Record<string, string>;
  }
>;

export type WereSorryAdScene = AdSceneBase<
  "were-sorry",
  AdSceneStyleBase,
  {
    preset: "were-sorry-poster";
    apologyHeader: string;
    legalOpener: string;
    confessions: string[];
    signoff: string;
  }
>;

export type VideoMemeAdScene = AdSceneBase<
  "video-meme",
  AdSceneStyleBase,
  {
    preset: "video-meme-template";
    templateId: "bear-sniff" | "pingu-noot-noot" | "darwin-journey";
    videoSrc: string;
    durationSeconds: number;
    captionPosition: "top";
    slots: {
      caption?: string;
      setupText?: string;
      dreadText?: string;
    };
  }
>;

export type JingleCompositionChunk = {
  text: string;
  duration_ms: number;
  positive_styles: string[];
  negative_styles: string[];
  context_adherence: "high";
};

export type JingleMusicVideoClip = {
  shotIndex: number;
  storageId: string;
  url: string | null;
  startMs: number;
  endMs: number;
};

export type JingleMusicVideoStitchedVideo = {
  storageId: string;
  url: string | null;
  mimeType: string;
  durationMs: number;
  builtAt: number;
};

export type JingleAdScene = AdSceneBase<
  "jingle",
  AdSceneStyleBase,
  {
    preset: "jingle-lyrics";
    brandPhonetic: string;
    angle: string;
    lyrics: string[];
    musicLengthMs: number;
    compositionPlan: {
      chunks: JingleCompositionChunk[];
    };
    musicVideo?: {
      sourceStoryboardId: string;
      clips: JingleMusicVideoClip[];
      stitchedVideo?: JingleMusicVideoStitchedVideo;
      builtAt: number;
    };
    selfCheckPassed: string;
  }
>;

export type TextMessageAdScene = AdSceneBase<
  "text-message",
  AdSceneStyleBase,
  {
    preset: "text-message-screenshot";
    contactName: string;
    timestampLabel: string;
    messages: Array<{
      side: "left" | "right";
      text: string;
    }>;
  }
>;

export type BrainrotBeat = {
  speaker: "left" | "right";
  text: string;
  startMs?: number;
  durationMs?: number;
};

export type BrainrotAdScene = AdSceneBase<
  "brainrot",
  AdSceneStyleBase,
  {
    preset: "brainrot-dialogue";
    backgroundVideoSrc: string;
    characters: {
      leftSpriteSrc: string;
      rightSpriteSrc: string;
    };
    beats: BrainrotBeat[];
    beatGapMs: number;
    ctaText?: string;
    angle: string;
    selfCheckPassed: string;
  }
>;

export type AdScene =
  | VisualizerAdScene
  | MemeAdScene
  | WereSorryAdScene
  | VideoMemeAdScene
  | JingleAdScene
  | TextMessageAdScene
  | BrainrotAdScene;
