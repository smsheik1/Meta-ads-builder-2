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
    provider: "gemini";
    model: string;
    generatedAt: number;
  };

export type AdScene = {
  version: typeof AD_SCENE_VERSION;
  format: AdFormatId;
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
  style: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    visualizerColor: string;
    fontFeel: BrandSnapshot["fonts"]["feel"];
  };
  audio: AdSceneAudio;
  layout: {
    preset: "centered-hero";
  };
  metadata: {
    candidateIndex: number;
    generationBatchId: string;
    researchRunId: string;
    brandSnapshotId: string;
    model: string;
    provider: "gemini" | "openrouter" | "deterministic";
    generatedAt: number;
  };
};
