import type { BrandAdAngle, BrandSnapshot, ResearchReceipts } from "../research/types";

export const AD_SCENE_VERSION = 1 as const;

export type AdFormatId = "visualizer" | "meme" | "were-sorry" | "video-meme" | "jingle" | "text-message" | "brainrot" | "reviews" | "motion-story";

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

export type AdSceneBackgroundMusic = {
  status: "uploaded";
  storageId: string;
  url: string;
  mimeType: string;
  durationMs: number;
  fileName: string;
  volume: number;
  loop: true;
  addedAt: number;
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
  backgroundMusic?: AdSceneBackgroundMusic;
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
    selectedProductHandles?: string[];
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

export type ReviewsProofItem = {
  type: "review";
  text: string;
  rating?: number;
  sourceName?: string;
  sourceUrl?: string;
  provider: "website";
};

export type ReviewsProductAnchor = {
  title: string;
  handle: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  isBestSeller: boolean;
};

export type ReviewsTemplate = "proof-card" | "minimal-quote";

export type ReviewsAdScene = AdSceneBase<
  "reviews",
  AdSceneStyleBase,
  {
    preset: "reviews-proof-card";
    template?: ReviewsTemplate;
    proof: ReviewsProofItem;
    proofIndex: number;
    proofTotal: number;
    proofText: string;
    headline: string;
    ctaText: string;
    productAnchor?: ReviewsProductAnchor;
    backgroundImages: string[];
  }
>;

export type MotionStoryMusicBedId = "polished-upbeat" | "warm-premium" | "playful-retail" | "bold-retail";
export type MotionStoryBeatRole = "hook" | "product" | "proof" | "cta";
export type MotionStoryBeatMotion = "kinetic-reveal" | "image-expand" | "proof-card" | "cta-slam";

export type MotionStoryBeat = {
  role: MotionStoryBeatRole;
  motion: MotionStoryBeatMotion;
  headline: string;
  supportingText?: string;
  startMs: number;
  endMs: number;
};

export type MotionStoryProduct = {
  title: string;
  handle: string;
  imageUrl: string;
  cutoutUrl: string;
  url?: string;
  isBestSeller: boolean;
};

export type MotionStoryProof = {
  originalText: string;
  displayText: string;
  sourceName?: string;
  rating?: number;
  aggregateText?: string;
  proofIndex: number;
  strengthReason: string;
};

export type MotionStoryAdScene = AdSceneBase<
  "motion-story",
  AdSceneStyleBase,
  {
    preset: "motion-story-product";
    durationMs: 20000;
    product: MotionStoryProduct;
    proof: MotionStoryProof;
    beats: [
      MotionStoryBeat & { role: "hook"; motion: "kinetic-reveal"; startMs: 0; endMs: 3000 },
      MotionStoryBeat & { role: "product"; motion: "image-expand"; startMs: 3000; endMs: 8000 },
      MotionStoryBeat & { role: "proof"; motion: "proof-card"; startMs: 8000; endMs: 16000 },
      MotionStoryBeat & { role: "cta"; motion: "cta-slam"; startMs: 16000; endMs: 20000 },
    ];
    brandLockup: {
      logoUrl?: string;
      fallbackText: string;
    };
    musicBed: {
      id: MotionStoryMusicBedId;
      src: string;
      volume: 0.18;
      loop: true;
    };
    shareCopy: string;
  }
>;

export type AdScene =
  | VisualizerAdScene
  | MemeAdScene
  | WereSorryAdScene
  | VideoMemeAdScene
  | JingleAdScene
  | TextMessageAdScene
  | BrainrotAdScene
  | ReviewsAdScene
  | MotionStoryAdScene;
