import type { BrandSnapshot, ResearchReceipts } from "../research/types";

export const AD_SCENE_VERSION = 1 as const;

export type AdFormatId = "visualizer";

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
    provider: "gemini" | "upload";
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
    provider: "gemini" | "deterministic";
    generatedAt: number;
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

export type AdScene = VisualizerAdScene;
