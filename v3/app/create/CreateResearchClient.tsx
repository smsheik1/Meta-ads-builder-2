"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toPng } from "html-to-image";
import {
  ShieldAlert,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  isStaleAudioAnalysis,
  precomputeBrowserAudioAnalysisFromUrl,
} from "@/features/audio/browserAudioAnalysis";
import { updateGeneratedAudioCaptionText } from "@/features/audio/sceneAudio";
import { cloneDialogueScript, type DialogueScript } from "@/features/dialogue/dialogueScripts";
import type {
  RenderFlashRole,
  RenderFlashState,
} from "@/features/formats/types";
import {
  DEFAULT_NVIDIA_NIM_MEME_MODEL,
  DEFAULT_NVIDIA_NIM_VISUALIZER_MODEL,
} from "@/features/llm/nvidiaNimModels";
import { DEFAULT_JINGLE_STYLE_ID, JINGLE_STYLES, type JingleStyleId } from "@/features/formats/jingle/prompt";
import type { BrickStoryboard } from "@/features/formats/jingle/storyboard";
import { editThreeDBreakdownMediaPrompt, type ThreeDBreakdownMediaPromptTarget } from "@/features/formats/three-d-breakdown/editablePrompts";
import type { ThreeDBreakdownStoryDirection } from "@/features/formats/three-d-breakdown/storyDirections";
import type { ThreeDBreakdownStorySubject } from "@/features/formats/three-d-breakdown/storySubject";
import { editThreeDBreakdownScriptBeat } from "@/features/formats/three-d-breakdown/editScript";
import { getThreeDBreakdownCtaError } from "@/features/formats/three-d-breakdown/cta";
import { getThreeDBreakdownProgress } from "@/features/formats/three-d-breakdown/ProgressCanvas";
import {
  getDefaultReviewProductHandles,
  normalizeReviewProductHandles,
  productCatalogHasProductImage,
} from "@/features/formats/reviews/productSelection";
import { getVideoMemeTemplate, type VideoMemeTemplateId } from "@/features/formats/video-meme/templates";
import { getFormatModule } from "@/features/formats/registry";
import {
  getProductPhotoshootPartialStopMessage,
  hasUsableProductPhotoshootBoard,
  type ProductPhotoshootBoard,
} from "@/features/product-photoshoot/photoshoot";
import { useActiveCanvasPanel, useCanvasActions } from "@/features/create/canvasInteractionStore";
import {
  CREATIVE_PACK_HARD_TIMEOUT_MS,
  CREATIVE_PACK_MONEY_SHOT_READY_COUNT,
  CREATIVE_PACK_SHOWCASE_PRIORITY,
  CREATIVE_PACK_SOFT_TIMEOUT_MS,
  CREATIVE_PACK_CONCURRENCY,
  CREATIVE_PACK_FORMATS,
  getCreativePackFormatLabel,
  hasPlayableCreativePackScenes,
  hydrateCreativePackGroupsFromSceneRows,
  isCreativePackFormat,
  isCreativePackTerminalStatus,
  recoverCreativePackGroupsFromSceneRows,
  type CreativePackSceneRow,
  type CreativePackFormat,
  type CreativePackStatus,
} from "@/features/create/creativePack";
import {
  canSaveDesignWithoutPaywall,
  createSavedDesignId,
  FREE_SAVED_DESIGN_LIMIT,
  restoreSavedDesignSelection,
  type SavedAdSceneDesign,
} from "@/features/create/savedDesigns";
import { createDefaultSceneLocks, rerollScene } from "@/features/create/reroll";
import { useCanvasKeyboard } from "@/features/create/useCanvasKeyboard";
import { isStoredWebsiteResearchFailure } from "@/features/research/types";
import type {
  StoredWebsiteResearchResponse,
  StoredWebsiteResearchResult,
} from "@/features/research/types";
import { normalizePublicWebsiteUrl } from "@/features/research/url";
import { getClientRendererVersion } from "@/features/render/rendererVersion";
import type {
  AdFormatId,
  AdScene,
  AdSceneVisualizerStyle,
  JingleAdScene,
  ThreeDBreakdownAdScene,
  ThreeDBreakdownClipIndex,
  ThreeDBreakdownStoryboardFrameIndex,
} from "@/features/scene/types";
import { visualizerSceneVariants } from "@/features/scene/visualizerVariants";
import { getV3ConvexUrl } from "@/lib/convexEnv";
import { CreateCaptionModal } from "./CreateCaptionModal";
import { BrandDumpModal } from "./CreateBrandDumpModal";
import { CreateCanvasColumn } from "./CreateCanvasColumn";
import { CreateControlPanel } from "./CreateControlPanel";
import { CREATE_FORMAT_GUIDES } from "./createFormatEducation";
import type { CreativePackOverviewGroup } from "./CreateCreativePackOverview";
import { CreateCreativeBriefCard } from "./CreateCreativeBriefCard";
import { CreateDialogueModal } from "./CreateDialogueModal";
import { CreateIdeasList } from "./CreateIdeasList";
import {
  CreateLeftColumn,
  type WebsiteSubmitProgressFacts,
  type WebsiteSubmitProgressStage,
} from "./CreateLeftColumn";
import type { PreviewPlatform } from "./CreatePreviewChrome";
import { CreateQuickActions } from "./CreateQuickActions";
import { CreateProductPhotoshootWorkspace } from "./CreateProductPhotoshootSheet";
import { WigglyMark } from "./WigglyMark";
import { createStarterPlaceholderScene, placeholderAdSurfaceVariantCount } from "./createStarterScene";
import {
  PRODUCT_PHOTOSHOOT_FORMAT,
  isAdSceneCreateFormat,
  type CreateFormatId,
} from "./createFormats";
import { getAnonymousId } from "./createSession";

const rerollFlashMs = 680;
const slowResearchMessageDelayMs = 8000;
const threeDAllShotsBusyIndex = 0;

type ThreeDMediaUiStatus = "idle" | "loading" | "ready" | "error";
type ThreeDStoryDirectionStatus = "idle" | "loading" | "ready" | "error";

const researchTimeoutMessage = "That site took too long to read. Try again, or paste a more specific public page from the same brand.";
const fallbackUploadedAudioDurationMs = 8000;
function creativePackWasStarted(researchRunId: string, remember = false) {
  try {
    const key = `wiggly:create:creative-pack:${researchRunId}`;
    if (remember) sessionStorage.setItem(key, "1");
    return sessionStorage.getItem(key) === "1";
  } catch { return false; }
}

function getThreeDBreakdownLoadingLabel(elapsedSeconds: number) {
  if (elapsedSeconds >= 90) return "Still waiting on NVIDIA NIM. Slow, not frozen.";
  if (elapsedSeconds >= 45) return "Checking strict 3D story rules";
  if (elapsedSeconds >= 15) return "Writing 3D story directions";
  return "Finding visual evidence";
}

function getMusicGenerationErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || "");
  const message = rawMessage
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/\s+at\s+[\s\S]*$/m, "")
    .trim();

  if (/paid_plan_required|payment_required|402/i.test(message)) {
    return "Music generation failed: ElevenLabs Music requires a paid plan for this API key.";
  }
  if (/fish.*(?:401|invalid token)|invalid token.*fish/i.test(message)) {
    return "Music generation failed: the Fish voice API key is invalid. Update it, then try again.";
  }
  if (!message) return "Music generation failed.";
  if (/^music generation failed/i.test(message)) return message;
  return `Music generation failed: ${message}`;
}

function getBrickStoryboardErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || "");
  const message = rawMessage
    .replace(/^\[CONVEX[^\]]*]\s*/i, "")
    .replace(/^\[Request ID:[^\]]+]\s*/i, "")
    .replace(/^Server Error\s*/i, "")
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/^Uncaught ApiError:\s*/i, "")
    .replace(/\s+at\s+[\s\S]*$/m, "")
    .trim();
  const apiMessage = message.match(/"message"\s*:\s*"([^"]+)"/)?.[1];
  const cleanMessage = apiMessage || message;

  if (/NVIDIA NIM brick story director.*timed out|brick story director.*timeout/i.test(cleanMessage)) {
    return "Brick Story Director timed out before image generation. Try again.";
  }
  if (/Replicate Nano Banana image generation.*timed out|Nano Banana.*timeout/i.test(cleanMessage)) {
    return "Nano Banana image generation timed out while building storyboard stills. Try again.";
  }
  if (/Replicate image download.*timed out|image download.*timeout/i.test(cleanMessage)) {
    return "Storyboard image download timed out. Try again.";
  }
  if (/Replicate Seedance.*timed out|Seedance.*timeout/i.test(cleanMessage)) {
    return "Seedance video generation timed out. Try animating the board again.";
  }
  if (/timed out|timeout/i.test(cleanMessage)) {
    return cleanMessage;
  }
  if (/Replicate image generation is not configured/i.test(cleanMessage)) {
    return "Brick storyboard images are not configured. Add the Replicate API token, then try again.";
  }
  if (/quota exceeded|exceeded your current quota|rate-limit|rate limits/i.test(cleanMessage)) {
    return "Brick storyboard images hit the Replicate quota for this API token.";
  }
  if (/not found for API version|is not supported/i.test(cleanMessage)) {
    return "Brick storyboard images failed because the configured image model is unavailable.";
  }
  if (/Nano Banana returned no image|Replicate Nano Banana/i.test(cleanMessage)) {
    return cleanMessage;
  }
  return cleanMessage || "Brick storyboard generation failed.";
}

function getProductPhotoshootErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || "");
  const message = rawMessage
    .replace(/^\[CONVEX[^\]]*]\s*/i, "")
    .replace(/^\[Request ID:[^\]]+]\s*/i, "")
    .replace(/^Server Error\s*/i, "")
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/^Uncaught ApiError:\s*/i, "")
    .replace(/\s+at\s+[\s\S]*$/m, "")
    .trim();
  if (/Replicate|product photoshoot images are not configured/i.test(message)) {
    return message || "Product photoshoot images are not configured.";
  }
  if (/quota|rate-limit|too many requests|throttled|insufficient credit|purchase credit|billing/i.test(message)) {
    return "Product photoshoot images hit the Replicate quota or rate limit.";
  }
  return message || "Product photoshoot generation failed.";
}

function slugifyDownloadName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "wiggly-ad";
}

type AdSceneGenerationResponse = {
  scenes: AdScene[];
  sceneIds?: Id<"adScenes">[];
};

type ThreeDStoryDirectionsResponse = {
  directions: ThreeDBreakdownStoryDirection[];
  recommendedDirectionId?: string;
};

type ApplyGeneratedScenesOptions = {
  note?: string;
};

type RenderableSceneEntry = {
  scene: AdScene;
  sceneId: Id<"adScenes"> | null;
};

const getSceneVideoMemeTemplateId = (scene: AdScene | null): VideoMemeTemplateId | null => (
  scene?.format === "video-meme" ? scene.layout.templateId : null
);

type BillingStatus = {
  paid: boolean;
  paidUntil: number;
  freeLimit: number;
  freeUsed: number;
  freeRemaining: number | null;
  resetAt: number;
};

type CreateModal = "brand-details" | "dialogue" | "captions" | "paywall" | null;

type ReusableResearch = {
  researchRunId: string;
  facts: WebsiteSubmitProgressFacts | null;
  result?: StoredWebsiteResearchResult;
};

function getResearchActionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/\b(aborterror|aborted|timed out|timeout)\b/i.test(message)) return researchTimeoutMessage;
  return message || "Website research failed.";
}

function getAdGenerationErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || "");
  const message = rawMessage.match(/Uncaught Error:\s*([\s\S]*?)(?:\s+at\s|\n\s+at\s| Called by client|$)/)?.[1]?.trim()
    || rawMessage.replace(/^\[CONVEX[^\]]+]\s*\[Request ID:[^\]]+]\s*Server Error\s*/i, "").trim();
  if (/\b(aborterror|aborted|timed out|timeout)\b/i.test(message)) {
    if (/NVIDIA NIM|Gemini|Replicate|Seedance|Nano Banana|director/i.test(message)) {
      return `${message.replace(/[.\s]*$/, "")}. Try again.`;
    }
    if (/we'?re sorry/i.test(message)) {
      return "We're Sorry copy generation timed out. Try again.";
    }
    return "Ad generation timed out. Try again.";
  }
  if (/NVIDIA NIM.*(?:\b500\b|internal server error|upstream)/i.test(message)) {
    return "The writing model had a temporary problem. Press Generate ads to try again.";
  }
  return message || "Ad generation failed.";
}

function getCreativePackFailure(format: CreativePackFormat, error: unknown) {
  const debugMessage = getAdGenerationErrorMessage(error);
  if (format === "reviews" && /at least 2 actual review or testimonial lines/i.test(debugMessage)) {
    return {
      status: "needs-input" as const,
      message: "Needs two real customer quotes from a page you share.",
      debugMessage,
    };
  }
  return {
    status: "needs-retry" as const,
    message: "Needs retry.",
    debugMessage,
  };
}

function getSceneDefaultFlashSlots(scene: AdScene): RenderFlashRole[] {
  return [...getFormatModule(scene.format).defaultSlots];
}

function isRenderableScene(scene: AdScene | null | undefined): scene is AdScene {
  if (!scene) return false;
  try {
    return getFormatModule(scene.format).validate(scene).valid;
  } catch {
    return false;
  }
}

function getRenderableSceneEntries(
  scenes: AdScene[],
  sceneIds: Array<Id<"adScenes"> | null> = [],
): RenderableSceneEntry[] {
  return scenes
    .map((scene, index) => ({
      scene,
      sceneId: sceneIds[index] || null,
    }))
    .filter((entry) => isRenderableScene(entry.scene));
}

function assertRenderableScenes(scenes: AdScene[]) {
  for (const scene of scenes) {
    const validation = getFormatModule(scene.format).validate(scene);
    if (!validation.valid) {
      throw new Error(`Generated ${scene.format} scene is out of date. ${validation.errors.join(" ")}`);
    }
  }
}

function getGenerationCount(format: AdFormatId, videoMemeTemplateId: VideoMemeTemplateId = "bear-sniff") {
  if (format === "meme") return 12;
  if (format === "were-sorry") return 8;
  if (format === "video-meme") return Math.min(3, getVideoMemeTemplate(videoMemeTemplateId)?.variantCount || 3);
  if (format === "jingle") return 1;
  if (format === "text-message") return 6;
  if (format === "brainrot") return 3;
  if (format === "reviews") return 8;
  if (format === "motion-story") return 4;
  if (format === "three-d-breakdown") return 2;
  return 50;
}

function getNextJingleStyleId(styleId: JingleStyleId): JingleStyleId {
  const styleIds = JINGLE_STYLES.map((style) => style.id);
  const currentIndex = styleIds.indexOf(styleId);
  return styleIds[(currentIndex + 1) % styleIds.length] || DEFAULT_JINGLE_STYLE_ID;
}

const staticPngFormats = new Set<AdFormatId>(["meme", "text-message", "reviews", "were-sorry"]);

function getDefaultPhotoshootProductHandle(productCatalog: StoredWebsiteResearchResult["productCatalog"] | null | undefined) {
  const products = productCatalog?.products || [];
  const bestSeller = products.find((product) => product.imageUrl && product.badges?.includes("best-seller"));
  const firstWithImage = products.find((product) => product.imageUrl);
  return (bestSeller || firstWithImage)?.handle || "";
}

function getProductPhotoshootSetupError(result: StoredWebsiteResearchResult | null | undefined) {
  if (!result?.researchRunId) {
    return "Product Photoshoot needs website research before it can generate product shots. Submit a Shopify-style store first.";
  }
  if (!productCatalogHasProductImage(result.productCatalog)) {
    return "Product Photoshoot could not find any product images for this site. Try a Shopify product page or a store with visible product photos.";
  }
  return "Product Photoshoot needs a selected product with an image. Choose a product with an image, then try again.";
}

function normalizedUrlKey(value: string) {
  return normalizePublicWebsiteUrl(value).href;
}

async function fetchBillingJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error || "Billing request failed.") as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }
  return payload as BillingStatus & { url?: string };
}

function withClientTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
  timeoutMessage = `${label} timed out. Try again.`,
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([
    promise.finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    }),
    timeout,
  ]);
}

function getWebsiteSubmitProgressFacts(result: StoredWebsiteResearchResult): WebsiteSubmitProgressFacts {
  return {
    brandName: result.brand.name || result.brandBrief.brandName || result.host,
    hasLogo: Boolean(result.brand.logoUrl || result.brand.faviconUrl),
    colorCount: result.brand.colors.length,
    productCount: result.productCatalog?.summary.productCount || result.productCatalog?.products.length,
    proofCount: result.brandBrief.proof.length || result.evidence.receipts.specificClaims.length || result.evidence.receipts.namedProof.length,
    buyerMomentCount: result.brandBrief.buyerMoments.length || result.evidence.receipts.buyerMoments.length,
  };
}

function getSceneProgressFacts(scene: AdScene): WebsiteSubmitProgressFacts {
  return {
    brandName: scene.brand.name || scene.brand.host,
    hasLogo: Boolean(scene.brand.logoUrl || scene.brand.faviconUrl),
    colorCount: scene.brand.colors.length,
    proofCount: scene.brand.receipts.specificClaims.length || scene.brand.receipts.namedProof.length,
    buyerMomentCount: scene.brand.receipts.buyerMoments.length,
  };
}

function getUploadedAudioDurationMs(file: File): Promise<number> {
  if (typeof window === "undefined") return Promise.resolve(fallbackUploadedAudioDurationMs);

  return new Promise((resolve) => {
    const objectUrl = window.URL.createObjectURL(file);
    const audio = document.createElement("audio");
    const cleanup = () => window.URL.revokeObjectURL(objectUrl);
    const resolveFallback = () => {
      cleanup();
      resolve(fallbackUploadedAudioDurationMs);
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const durationMs = Math.round((Number.isFinite(audio.duration) ? audio.duration : 0) * 1000);
      cleanup();
      resolve(durationMs > 0 ? durationMs : fallbackUploadedAudioDurationMs);
    };
    audio.onerror = resolveFallback;
    audio.src = objectUrl;
  });
}

function ResearchConnected() {
  const runWebsiteResearch = useAction(api.researchRuns.runWebsiteResearch);
  const generateAdScenes = useAction(api.adScenes.generateFromResearch);
  const generateThreeDStoryDirections = useAction(api.adScenes.generateThreeDStoryDirections);
  const generateDialogueScripts = useAction(api.dialogueScripts.generateForScene);
  const generateVoiceoverForScene = useAction(api.audioAssets.generateForScene);
  const generateDialogueAudioForScene = useAction(api.audioAssets.generateDialogueForScene);
  const generateJingleAudioForScene = useAction(api.audioAssets.generateJingleForScene);
  const generateBrainrotAudioForScene = useAction(api.audioAssets.generateBrainrotForScene);
  const generateThreeDImagesForScene = useAction(api.threeDImages.generateThreeDImages);
  const generateThreeDClipForScene = useAction(api.threeDImages.generateThreeDClip);
  const generateBrickStoryboardForScene = useAction(api.jingleStoryboards.generateBrickForScene);
  const regenerateBrickShotForScene = useAction(api.jingleStoryboards.regenerateBrickShot);
  const regenerateBrickShotVideoForScene = useAction(api.jingleStoryboards.regenerateBrickShotVideo);
  const animateBrickStoryboardForScene = useAction(api.jingleStoryboards.animateBrickBoard);
  const buildBrickMusicVideoForScene = useMutation(api.jingleStoryboards.buildMusicVideoForScene);
  const generateProductPhotoshootForResearch = useAction(api.productPhotoshoots.generateForResearch);
  const regenerateProductPhotoShotForBoard = useAction(api.productPhotoshoots.regenerateShot);
  const attachUploadedAudioForScene = useAction(api.audioAssets.attachUploadedToScene);
  const attachBackgroundMusicToScene = useAction(api.audioAssets.attachBackgroundMusicToScene);
  const removeBackgroundMusicFromScene = useAction(api.audioAssets.removeBackgroundMusicFromScene);
  const updateBackgroundMusicVolumeOnScene = useAction(api.audioAssets.updateBackgroundMusicVolumeOnScene);
  const createAudioUploadUrl = useMutation(api.audioAssets.createUploadUrl);
  const createSharePage = useMutation(api.sharePages.createFromScene);
  const createRenderJob = useMutation(api.renderJobs.createFromScene);
  const [url, setUrl] = useState("ogtool.com");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [adStatus, setAdStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [audioStatus, setAudioStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [renderStatus, setRenderStatus] = useState<"idle" | "loading" | "queued" | "error">("idle");
  const [result, setResult] = useState<StoredWebsiteResearchResult | null>(null);
  const [selectedAdFormat, setSelectedAdFormat] = useState<CreateFormatId>("meme");
  const [selectedMemeModel, setSelectedMemeModel] = useState(DEFAULT_NVIDIA_NIM_MEME_MODEL);
  const [selectedVideoMemeTemplateId, setSelectedVideoMemeTemplateId] = useState<VideoMemeTemplateId>("bear-sniff");
  const [selectedVisualizerModel, setSelectedVisualizerModel] = useState(DEFAULT_NVIDIA_NIM_VISUALIZER_MODEL);
  const [selectedJingleStyleId, setSelectedJingleStyleId] = useState<JingleStyleId>(DEFAULT_JINGLE_STYLE_ID);
  const [selectedReviewProductHandles, setSelectedReviewProductHandles] = useState<string[]>([]);
  const [creativePackStatus, setCreativePackStatus] = useState<CreativePackStatus>("idle");
  const [creativePackGroups, setCreativePackGroups] = useState<CreativePackOverviewGroup[]>([]);
  const [selectedCreativePackFormat, setSelectedCreativePackFormat] = useState<CreativePackFormat | null>(null);
  const [, setCreativePackMoneyShotActive] = useState(false);
  const [adScenes, setAdScenes] = useState<AdScene[]>([]);
  const [sceneIds, setSceneIds] = useState<Array<Id<"adScenes"> | null>>([]);
  const [selectedScene, setSelectedScene] = useState<AdScene | null>(null);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>("instagram-feed");
  const [rerollCount, setRerollCount] = useState(0);
  const [rerollFlash, setRerollFlash] = useState<RenderFlashState | null>(null);
  const [placeholderVariantIndex, setPlaceholderVariantIndex] = useState(0);
  const [adStatusNote, setAdStatusNote] = useState("");
  const [progressStage, setProgressStage] = useState<WebsiteSubmitProgressStage>(null);
  const [pendingProgressFacts, setPendingProgressFacts] = useState<WebsiteSubmitProgressFacts | null>(null);
  const [showSlowResearchMessage, setShowSlowResearchMessage] = useState(false);
  const [adGenerationElapsedSeconds, setAdGenerationElapsedSeconds] = useState(0);
  const [renderJobId, setRenderJobId] = useState<Id<"renderJobs"> | null>(null);
  const [staticPngDownloadBusy, setStaticPngDownloadBusy] = useState(false);
  const renderJob = useQuery(api.renderJobs.getStatus, renderJobId ? { renderJobId } : "skip");
  const renderWorkerReadiness = useQuery(api.renderJobs.workerReadiness, {
    rendererVersion: getClientRendererVersion(),
  });
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [backgroundMusicStatus, setBackgroundMusicStatus] = useState<"idle" | "loading" | "error">("idle");
  const [backgroundMusicError, setBackgroundMusicError] = useState("");
  const [activeModal, setActiveModal] = useState<CreateModal>(null);
  const [dialogueStatus, setDialogueStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dialogueScripts, setDialogueScripts] = useState<DialogueScript[]>([]);
  const [selectedDialogueIndex, setSelectedDialogueIndex] = useState(0);
  const [dialogueError, setDialogueError] = useState("");
  const [previewTimeSeconds, setPreviewTimeSeconds] = useState(1.1);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [brickStoryboardStatus, setBrickStoryboardStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [brickStoryboardAnimationStatus, setBrickStoryboardAnimationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [brickStoryboardBuildStatus, setBrickStoryboardBuildStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [brickStoryboardError, setBrickStoryboardError] = useState("");
  const [brickStoryboard, setBrickStoryboard] = useState<any>(null);
  const [brickStoryboardId, setBrickStoryboardId] = useState<Id<"jingleStoryboards"> | null>(null);
  const [brickStoryboardShotBusyIndex, setBrickStoryboardShotBusyIndex] = useState<number | null>(null);
  const [brickStoryboardVideoBusyIndex, setBrickStoryboardVideoBusyIndex] = useState<number | null>(null);
  const [threeDError, setThreeDError] = useState("");
  const [threeDStoryDirectionStatus, setThreeDStoryDirectionStatus] = useState<ThreeDStoryDirectionStatus>("idle");
  const [threeDStoryDirectionError, setThreeDStoryDirectionError] = useState("");
  const [threeDStoryDirections, setThreeDStoryDirections] = useState<ThreeDBreakdownStoryDirection[]>([]);
  const [selectedThreeDStoryDirectionId, setSelectedThreeDStoryDirectionId] = useState("");
  const [threeDStorySubject, setThreeDStorySubject] = useState<ThreeDBreakdownStorySubject | null>(null);
  const [threeDImageBusyIndex, setThreeDImageBusyIndex] = useState<number | null>(null);
  const [threeDClipBusyIndex, setThreeDClipBusyIndex] = useState<number | null>(null);
  const [productPhotoshootStatus, setProductPhotoshootStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [productPhotoshootError, setProductPhotoshootError] = useState("");
  const [productPhotoshoot, setProductPhotoshoot] = useState<ProductPhotoshootBoard | null>(null);
  const [productPhotoshootId, setProductPhotoshootId] = useState<Id<"productPhotoshoots"> | null>(null);
  const [productPhotoshootShotBusyIndex, setProductPhotoshootShotBusyIndex] = useState<number | null>(null);
  const [selectedPhotoshootProductHandle, setSelectedPhotoshootProductHandle] = useState("");
  const [anonymousId, setAnonymousId] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [error, setError] = useState("");
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const createEditorScopeRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const finalVideoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const analysisUpgradeKeyRef = useRef("");
  const rerollFlashTimeoutRef = useRef<number | null>(null);
  const backgroundMusicVolumeSaveTimeoutRef = useRef<number | null>(null);
  const researchByUrlRef = useRef(new Map<string, StoredWebsiteResearchResult>());
  const creativePackRunRef = useRef<{ id: number; cancelled: boolean } | null>(null);
  const creativePackRunKeysRef = useRef(new Set<string>());
  const shareResetRenderJobRef = useRef("");
  const creativePackPreviousStateRef = useRef<{
    result: StoredWebsiteResearchResult | null;
    selectedAdFormat: CreateFormatId;
    selectedReviewProductHandles: string[];
    url: string;
  } | null>(null);
  const selectedCreativePackFormatRef = useRef<CreativePackFormat | null>(null);
  const creativePackUserSelectedRef = useRef(false);
  const creativePackMoneyShotTriggeredRef = useRef(false);
  const savedDesigns = useQuery(api.savedDesigns.list, anonymousId ? { anonymousId } : "skip") as SavedAdSceneDesign[] | undefined;
  const latestGeneration = useQuery(api.adScenes.latestForAnonymousId, anonymousId ? { anonymousId } : "skip") as {
    result: StoredWebsiteResearchResult;
    scenes: AdScene[];
    sceneIds?: Id<"adScenes">[];
  } | null | undefined;
  const cachedResearchForUrl = useQuery(
    api.researchRuns.latestReadyForAnonymousIdAndUrl,
    anonymousId && url.trim() ? { anonymousId, url } : "skip",
  ) as StoredWebsiteResearchResult | null | undefined;
  const latestProductPhotoshoot = useQuery(
    api.productPhotoshoots.latestForResearch,
    result?.researchRunId ? { researchRunId: result.researchRunId as Id<"researchRuns"> } : "skip",
  ) as {
    _id: Id<"productPhotoshoots">;
    productHandle: string;
    board: ProductPhotoshootBoard;
  } | null | undefined;
  const researchRunSceneRows = useQuery(
    api.adScenes.listForResearchRun,
    result?.researchRunId ? { researchRunId: result.researchRunId as Id<"researchRuns"> } : "skip",
  ) as Array<CreativePackSceneRow<Id<"adScenes">>> | undefined;
  const selectedSceneId = sceneIds[selectedSceneIndex] || researchRunSceneRows?.find((row) => (
    row.generationBatchId === selectedScene?.metadata.generationBatchId
    && row.candidateIndex === selectedScene?.metadata.candidateIndex
    && row.format === selectedScene?.format
  ))?._id || null;
  const latestBrickStoryboard = useQuery(api.jingleStoryboards.latestForScene,
    selectedScene?.format === "jingle" && selectedSceneId ? { sceneId: selectedSceneId } : "skip") as {
    _id: Id<"jingleStoryboards">;
    storyboard: unknown;
    stitchStatus?: "queued" | "claimed" | "rendering" | "ready" | "failed";
    stitchError?: string;
  } | null | undefined;
  const saveDesign = useMutation(api.savedDesigns.saveFromScene);
  const savedDesignItems = savedDesigns || [];
  const canvasActions = useCanvasActions();
  const activeCreatePanel = useActiveCanvasPanel();
  const brandDetailsOpen = activeModal === "brand-details";
  const dialoguePanelOpen = activeModal === "dialogue";
  const captionPanelOpen = activeModal === "captions";
  const paywallOpen = activeModal === "paywall";

  useEffect(() => {
    selectedCreativePackFormatRef.current = selectedCreativePackFormat;
  }, [selectedCreativePackFormat]);

  const setModal = useCallback((modal: CreateModal) => {
    setActiveModal(modal);
    const canvasModal = modal === "brand-details" ? "brand-dump" : modal;
    if (canvasModal) canvasActions.openModal(canvasModal);
    else canvasActions.closeModal();
  }, [canvasActions]);

  const clearSubmitProgress = () => {
    setProgressStage(null);
    setPendingProgressFacts(null);
    setShowSlowResearchMessage(false);
  };

  useEffect(() => {
    setAnonymousId(getAnonymousId());
  }, []);

  useEffect(() => {
    void fetchBillingJson("/api/billing/status")
      .then(setBillingStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const checkoutSessionId = params.get("session_id");
    if (checkoutStatus === "cancelled") {
      setModal("paywall");
      window.history.replaceState(null, "", "/create");
      return;
    }
    if (checkoutStatus !== "success" || !checkoutSessionId) return;

    const completeCheckout = async () => {
      setCheckoutLoading(true);
      try {
        const nextStatus = await fetchBillingJson("/api/billing/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: checkoutSessionId }),
        });
        setBillingStatus(nextStatus);
        setModal(null);
        window.history.replaceState(null, "", "/create");
      } catch (checkoutError) {
        setModal("paywall");
        const message = checkoutError instanceof Error ? checkoutError.message : "Could not verify checkout.";
        setCheckoutError(message);
        setError(message);
      } finally {
        setCheckoutLoading(false);
      }
    };

    void completeCheckout();
  }, [setModal]);

  useEffect(() => () => {
    if (rerollFlashTimeoutRef.current) {
      window.clearTimeout(rerollFlashTimeoutRef.current);
    }
    if (backgroundMusicVolumeSaveTimeoutRef.current) {
      window.clearTimeout(backgroundMusicVolumeSaveTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (progressStage !== "reading-site") return;

    setShowSlowResearchMessage(false);
    const timeoutId = window.setTimeout(() => {
      setShowSlowResearchMessage(true);
    }, slowResearchMessageDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [progressStage]);

  useEffect(() => {
    if (adStatus !== "loading" || progressStage !== "writing-ads") {
      setAdGenerationElapsedSeconds(0);
      return;
    }

    setAdGenerationElapsedSeconds(0);
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setAdGenerationElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [adStatus, progressStage, selectedAdFormat]);

  useEffect(() => {
    if (selectedAdFormat === "three-d-breakdown" && previewPlatform === "instagram-feed") {
      setPreviewPlatform("reels");
    }
  }, [previewPlatform, selectedAdFormat]);

  useEffect(() => {
    if (result || adScenes.length || !latestGeneration?.scenes.length) return;

    const latestSceneIds = latestGeneration.sceneIds || latestGeneration.scenes.map(() => null);
    const renderableEntries = getRenderableSceneEntries(latestGeneration.scenes, latestSceneIds);
    const restoredScene = renderableEntries[0]?.scene || null;
    rememberResearchForReuse(latestGeneration.result);
    setUrl(latestGeneration.result.websiteUrl);
    setResult(latestGeneration.result);
    setStatus("ready");
    setAdScenes(renderableEntries.map((entry) => entry.scene));
    setSceneIds(renderableEntries.map((entry) => entry.sceneId));
    setSelectedScene(restoredScene);
    setSelectedSceneIndex(0);
    if (restoredScene) {
      setSelectedAdFormat(restoredScene.format);
      setSelectedCreativePackFormat(isCreativePackFormat(restoredScene.format) ? restoredScene.format : null);
      const templateId = getSceneVideoMemeTemplateId(restoredScene);
      if (templateId) setSelectedVideoMemeTemplateId(templateId);
    } else {
      setSelectedCreativePackFormat(null);
    }
    canvasActions.interactionReset();
    setRerollCount(0);
    setAdStatus(restoredScene ? "ready" : "idle");
    setAdStatusNote(
      restoredScene
        ? `${renderableEntries.length} ads restored. Press spacebar to find a stronger version.`
        : "Previous saved ads used an older format contract. Generate again.",
    );
    setAudioStatus(restoredScene?.audio.status === "generated" ? "ready" : "idle");
  }, [
    adScenes.length,
    canvasActions,
    latestGeneration,
    result,
  ]);

  const getCurrentAnonymousId = () => anonymousId || getAnonymousId();
  const renderedFinalVideoUrl = selectedScene?.format === "three-d-breakdown" && renderJob?.status === "ready" ? renderJob.downloadUrl || "" : "";
  const selectedFinalVideoUrl = selectedScene?.format === "three-d-breakdown" && selectedScene.layout.finalVideo?.status === "ready"
    ? selectedScene.layout.finalVideo.url : renderedFinalVideoUrl;
  const selectedFinalVideoDurationSeconds = selectedScene?.format === "three-d-breakdown"
    ? selectedScene.layout.durationMs / 1000
    : 0;
  const onFinalVideoElement = useCallback((element: HTMLVideoElement | null) => {
    finalVideoPreviewRef.current = element;
  }, []);

  const rememberResearchForReuse = (research: StoredWebsiteResearchResult) => {
    for (const value of [research.websiteUrl, research.finalUrl]) {
      try {
        researchByUrlRef.current.set(normalizedUrlKey(value), research);
      } catch {
        // Ignore malformed historical rows; fresh submits are validated before storage.
      }
    }
  };

  const resetPreviewPlayback = useCallback(() => {
    setIsAudioPlaying(false);
    canvasActions.playbackStopped();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    const backgroundMusic = backgroundMusicRef.current;
    if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
    const finalVideo = finalVideoPreviewRef.current;
    if (finalVideo) {
      finalVideo.pause();
      finalVideo.currentTime = 0;
    }
    setPreviewTimeSeconds(1.1);
  }, [canvasActions]);

  const onTogglePreviewPlayback = useCallback(() => {
    const finalVideo = selectedFinalVideoUrl ? finalVideoPreviewRef.current : null;
    if (finalVideo) {
      if (finalVideo.paused) {
        if (finalVideo.ended) finalVideo.currentTime = 0;
        setPreviewTimeSeconds(finalVideo.currentTime);
        setIsAudioPlaying(true);
        canvasActions.playbackStarted();
        void finalVideo.play().catch(() => {
          setIsAudioPlaying(false);
          canvasActions.playbackStopped();
        });
      } else {
        finalVideo.pause();
        setIsAudioPlaying(false);
        canvasActions.playbackStopped();
        setPreviewTimeSeconds(finalVideo.currentTime);
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play();
      return;
    }

    audio.pause();
  }, [canvasActions, selectedFinalVideoUrl]);

  useEffect(() => {
    const finalVideo = selectedFinalVideoUrl ? finalVideoPreviewRef.current : null;
    if (!finalVideo) return;
    const onEnded = () => {
      setIsAudioPlaying(false);
      canvasActions.playbackStopped();
      setPreviewTimeSeconds(finalVideo.duration || selectedFinalVideoDurationSeconds);
    };
    finalVideo.addEventListener("ended", onEnded);
    return () => finalVideo.removeEventListener("ended", onEnded);
  }, [canvasActions, selectedFinalVideoDurationSeconds, selectedFinalVideoUrl]);

  const resetShareState = () => {
    setShareStatus("idle");
    setShareUrl("");
    setShareError("");
  };

  const resetRenderState = () => {
    setRenderStatus("idle");
    setRenderJobId(null);
    setRenderError("");
  };

  const resetBrickStoryboardState = () => {
    setBrickStoryboardStatus("idle");
    setBrickStoryboardAnimationStatus("idle");
    setBrickStoryboardBuildStatus("idle");
    setBrickStoryboardError("");
    setBrickStoryboard(null);
    setBrickStoryboardId(null);
    setBrickStoryboardShotBusyIndex(null);
    setBrickStoryboardVideoBusyIndex(null);
  };

  const resetThreeDBreakdownState = () => {
    setThreeDError("");
    setThreeDImageBusyIndex(null);
    setThreeDClipBusyIndex(null);
  };

  const resetThreeDStoryDirections = () => {
    setThreeDStoryDirectionStatus("idle");
    setThreeDStoryDirectionError("");
    setThreeDStoryDirections([]);
    setSelectedThreeDStoryDirectionId("");
    setThreeDStorySubject(null);
  };

  const resetProductPhotoshootState = () => {
    setProductPhotoshootStatus("idle");
    setProductPhotoshootError("");
    setProductPhotoshoot(null);
    setProductPhotoshootId(null);
    setProductPhotoshootShotBusyIndex(null);
  };

  const resetDialogueState = () => {
    setModal(null);
    setDialogueStatus("idle");
    setDialogueScripts([]);
    setSelectedDialogueIndex(0);
    setDialogueError("");
  };

  const resetAudioState = () => {
    setAudioStatus("idle");
    setAudioError("");
    setModal(null);
    resetDialogueState();
    resetPreviewPlayback();
  };

  const resetSaveState = () => {
    setSaveStatus("idle");
    setSaveError("");
  };

  const openBrandDetails = () => {
    setModal("brand-details");
  };

  const closeBrandDetails = () => {
    setModal(null);
  };

  const openDialoguePanel = () => {
    setModal("dialogue");
  };

  const closeDialoguePanel = () => {
    setModal(null);
  };

  const openCaptionPanel = () => {
    setModal("captions");
  };

  const closeCaptionPanel = () => {
    setModal(null);
  };

  const ensureSelectedScene = useCallback(() => {
    if (selectedScene) return selectedScene;

    const starterScene = createStarterPlaceholderScene(placeholderVariantIndex);
    setSelectedScene(starterScene);
    setSelectedSceneIndex(0);
    setAdScenes([starterScene]);
    setSceneIds([null]);
    setAdStatus("ready");
    setAdStatusNote("Custom starter ad ready. Add audio, then save, share, or download it.");
    return starterScene;
  }, [placeholderVariantIndex, selectedScene]);

  const replaceSelectedScene = useCallback((nextScene: AdScene) => {
    setSelectedScene(nextScene);
    setAdScenes((scenes) => {
      if (!scenes.length) return [nextScene];
      return scenes.map((scene, index) => (
        index === selectedSceneIndex ? nextScene : scene
      ));
    });
  }, [selectedSceneIndex]);

  const clearSelectedJingleMusicVideo = useCallback(() => {
    if (!selectedScene || selectedScene.format !== "jingle" || !selectedScene.layout.musicVideo) return;
    replaceSelectedScene({
      ...selectedScene,
      layout: {
        ...selectedScene.layout,
        musicVideo: undefined,
      },
    });
  }, [replaceSelectedScene, selectedScene]);

  useEffect(() => {
    if (selectedScene?.audio.status !== "generated") return;
    if (!isStaleAudioAnalysis(selectedScene.audio.analysis)) return;

    const audio = selectedScene.audio;
    const upgradeKey = `${audio.storageId}:${audio.url}:${audio.durationMs}`;
    if (analysisUpgradeKeyRef.current === upgradeKey) return;
    analysisUpgradeKeyRef.current = upgradeKey;

    let cancelled = false;
    void precomputeBrowserAudioAnalysisFromUrl(audio.url, {
      durationSeconds: audio.durationSeconds,
    })
      .then((analysis) => {
        if (cancelled) return;
        setSelectedScene((currentScene) => {
          if (currentScene?.audio.status !== "generated") return currentScene;
          if (currentScene.audio.storageId !== audio.storageId) return currentScene;
          if (!isStaleAudioAnalysis(currentScene.audio.analysis)) return currentScene;

          const upgradedScene = {
            ...currentScene,
            audio: {
              ...currentScene.audio,
              analysis,
            },
          };

          setAdScenes((scenes) => scenes.map((scene, index) => (
            index === selectedSceneIndex ? upgradedScene : scene
          )));

          return upgradedScene;
        });
      })
      .catch(() => {
        analysisUpgradeKeyRef.current = "";
      });

    return () => {
      cancelled = true;
    };
  }, [selectedScene, selectedSceneIndex]);

  useEffect(() => {
    if (!latestBrickStoryboard) return;
    setBrickStoryboardId(latestBrickStoryboard._id);
    setBrickStoryboard(latestBrickStoryboard.storyboard);
    setBrickStoryboardStatus("ready");

    if (latestBrickStoryboard.stitchStatus === "queued" ||
      latestBrickStoryboard.stitchStatus === "claimed" ||
      latestBrickStoryboard.stitchStatus === "rendering") {
      setBrickStoryboardBuildStatus("loading");
    } else if (latestBrickStoryboard.stitchStatus === "ready") {
      setBrickStoryboardBuildStatus("ready");
    } else if (latestBrickStoryboard.stitchStatus === "failed") {
      setBrickStoryboardBuildStatus("error");
      setBrickStoryboardError(latestBrickStoryboard.stitchError || "Music video stitch failed.");
    }

    const storyboardMusicVideo = (latestBrickStoryboard.storyboard as {
      musicVideo?: JingleAdScene["layout"]["musicVideo"];
    })?.musicVideo;
    const stitchedVideo = storyboardMusicVideo?.stitchedVideo;
    if (!stitchedVideo || !selectedScene || selectedScene.format !== "jingle") return;
    if (selectedScene.layout.musicVideo?.stitchedVideo?.storageId === stitchedVideo.storageId) return;

    const nextScene: AdScene = {
      ...selectedScene,
      layout: {
        ...selectedScene.layout,
        musicVideo: storyboardMusicVideo,
      },
    };
    setSelectedScene(nextScene);
    setAdScenes((scenes) => scenes.map((scene, index) => (
      index === selectedSceneIndex ? nextScene : scene
    )));
    resetShareState();
    resetRenderState();
    resetSaveState();
  }, [latestBrickStoryboard, selectedScene, selectedSceneIndex]);

  useEffect(() => {
    const products = result?.productCatalog?.products || [];
    const defaultHandle = getDefaultPhotoshootProductHandle(result?.productCatalog);
    if (!defaultHandle) {
      setSelectedPhotoshootProductHandle("");
      resetProductPhotoshootState();
      return;
    }
    if (selectedPhotoshootProductHandle && products.some((product) => product.handle === selectedPhotoshootProductHandle)) {
      return;
    }
    setSelectedPhotoshootProductHandle(defaultHandle);
  }, [result?.researchRunId, result?.productCatalog, selectedPhotoshootProductHandle]);

  useEffect(() => {
    if (!latestProductPhotoshoot) return;
    if (!hasUsableProductPhotoshootBoard(latestProductPhotoshoot.board)) {
      setProductPhotoshootId(null);
      setProductPhotoshoot(null);
      return;
    }
    setProductPhotoshootId(latestProductPhotoshoot._id);
    setProductPhotoshoot(latestProductPhotoshoot.board);
    setProductPhotoshootStatus((current) => current === "error" ? "error" : "ready");
    setProductPhotoshootError((current) => {
      if (!current) return current;
      return getProductPhotoshootPartialStopMessage(current);
    });
    if (latestProductPhotoshoot.productHandle) {
      setSelectedPhotoshootProductHandle(latestProductPhotoshoot.productHandle);
    }
  }, [latestProductPhotoshoot]);

  const triggerRerollFlash = useCallback((roles: RenderFlashRole[]) => {
    if (rerollFlashTimeoutRef.current) {
      window.clearTimeout(rerollFlashTimeoutRef.current);
    }
    setRerollFlash(null);
    window.requestAnimationFrame(() => {
      setRerollFlash({
        key: `reroll-${Date.now()}`,
        roles,
      });
      rerollFlashTimeoutRef.current = window.setTimeout(() => {
        setRerollFlash(null);
        rerollFlashTimeoutRef.current = null;
      }, rerollFlashMs);
    });
  }, []);

  const replaceSelectedSceneAndInvalidate = useCallback((
    nextScene: AdScene,
    flashRoles: RenderFlashRole[] = [],
  ) => {
    if (nextScene === selectedScene) return;

    setSelectedScene(nextScene);
    setAdScenes((currentScenes) => currentScenes.map((scene, index) => (
      index === selectedSceneIndex ? nextScene : scene
    )));
    resetShareState();
    resetRenderState();
    resetSaveState();
    resetBrickStoryboardState();
    if (flashRoles.length) triggerRerollFlash(flashRoles);
  }, [selectedScene, selectedSceneIndex, triggerRerollFlash]);

  const generateSceneAudio = useCallback(async (
    scene: AdScene,
    sceneId: Id<"adScenes"> | null | undefined,
    {
      format,
      action,
    }: {
      format: "jingle" | "brainrot" | "three-d-breakdown";
      action: (args: { anonymousId: string; sceneId?: Id<"adScenes">; scene: AdScene }) => Promise<unknown>;
    },
  ) => {
    if (scene.format !== format || scene.audio.status === "generated" || audioStatus === "loading") return;
    const sceneKey = createSavedDesignId(scene);
    setAudioStatus("loading");
    setAudioError("");
    resetShareState();
    resetRenderState();
    canvasActions.beginBusy("audio-generation");

    try {
      const result = await action({
        anonymousId: getCurrentAnonymousId(),
        ...(sceneId ? { sceneId } : {}),
        scene,
      }) as { scene: AdScene };
      resetPreviewPlayback();
      setAdScenes((scenes) => scenes.map((candidate) => (
        createSavedDesignId(candidate) === sceneKey ? result.scene : candidate
      )));
      setSelectedScene((current) => (
        current && createSavedDesignId(current) === sceneKey ? result.scene : current
      ));
      setAudioStatus("ready");
      canvasActions.finishBusy();
    } catch (nextError) {
      setAudioStatus("error");
      setAudioError(getMusicGenerationErrorMessage(nextError));
      canvasActions.finishBusy();
    }
  }, [audioStatus, canvasActions, resetPreviewPlayback, resetRenderState, resetShareState]);

  const generateJingleMusicForScene = useCallback((scene: AdScene, sceneId?: Id<"adScenes"> | null) => (
    generateSceneAudio(scene, sceneId, {
      format: "jingle",
      action: generateJingleAudioForScene,
    })
  ), [generateJingleAudioForScene, generateSceneAudio]);

  const generateBrainrotAudioForSceneSelected = useCallback((scene: AdScene, sceneId?: Id<"adScenes"> | null) => (
    generateSceneAudio(scene, sceneId, {
      format: "brainrot",
      action: generateBrainrotAudioForScene,
    })
  ), [generateBrainrotAudioForScene, generateSceneAudio]);

  const generateVisualizerVoiceoverForScene = useCallback(async (scene: AdScene, sceneId?: Id<"adScenes"> | null, options: { force?: boolean } = {}) => {
    if (scene.format !== "visualizer" || audioStatus === "loading") return;
    if (scene.audio.status === "generated" && !options.force) return;
    const sceneKey = createSavedDesignId(scene);
    setAudioStatus("loading");
    setAudioError("");
    resetShareState();
    resetRenderState();
    canvasActions.beginBusy("audio-generation");

    try {
      const scriptsResult = await generateDialogueScripts({
        scene,
        count: 1,
      }) as { scripts: DialogueScript[] };
      const script = scriptsResult.scripts?.[0];
      if (!script) throw new Error("Dialogue script generation returned no scripts.");

      const result = await generateDialogueAudioForScene({
        anonymousId: getCurrentAnonymousId(),
        ...(sceneId ? { sceneId } : {}),
        scene,
        script,
      }) as { scene: AdScene };
      resetPreviewPlayback();
      setAdScenes((scenes) => scenes.map((candidate) => (
        createSavedDesignId(candidate) === sceneKey ? result.scene : candidate
      )));
      setSelectedScene((current) => (
        current && createSavedDesignId(current) === sceneKey ? result.scene : current
      ));
      setAudioStatus("ready");
      canvasActions.finishBusy();
    } catch (nextError) {
      setAudioStatus("error");
      setAudioError(nextError instanceof Error ? nextError.message : "Audio generation failed.");
      canvasActions.finishBusy();
    }
  }, [audioStatus, canvasActions, generateDialogueAudioForScene, generateDialogueScripts, resetPreviewPlayback, resetRenderState, resetShareState]);

  const onRegenerateVisualizerAudio = useCallback(() => {
    if (!selectedScene || selectedScene.format !== "visualizer") return;
    void generateVisualizerVoiceoverForScene(selectedScene, sceneIds[selectedSceneIndex], { force: true });
  }, [generateVisualizerVoiceoverForScene, sceneIds, selectedScene, selectedSceneIndex]);

  const onUpdateCreativeField = useCallback((field: string, value: string) => {
    if (field !== "headline" && field !== "subheadline" && field !== "ctaText") return;
    if (!selectedScene || selectedScene.creative[field] === value) return;
    replaceSelectedSceneAndInvalidate({
      ...selectedScene,
      creative: {
        ...selectedScene.creative,
        [field]: value,
      },
    }, field === "headline" ? ["headline"] : []);
  }, [replaceSelectedSceneAndInvalidate, selectedScene]);

  const onUpdateStyleColor = useCallback((field: string, value: string) => {
    if (!selectedScene) return;

    if (field === "visualizerColor") {
      if (selectedScene.format !== "visualizer" || selectedScene.style.visualizerColor === value) return;
      replaceSelectedSceneAndInvalidate({
        ...selectedScene,
        style: {
          ...selectedScene.style,
          visualizerColor: value,
        },
      }, ["visualizer", "captions"]);
      return;
    }

    if (field !== "backgroundColor" && field !== "textColor" && field !== "accentColor") return;
    if (selectedScene.style[field] === value) return;
    if (selectedScene.format === "visualizer") {
      replaceSelectedSceneAndInvalidate({
        ...selectedScene,
        style: {
          ...selectedScene.style,
          [field]: value,
        },
      }, field === "accentColor" ? ["visualizer", "captions"] : ["headline", "visualizer", "captions"]);
      return;
    }

    replaceSelectedSceneAndInvalidate({
      ...selectedScene,
      style: {
        ...selectedScene.style,
        [field]: value,
      },
    }, []);
  }, [replaceSelectedSceneAndInvalidate, selectedScene]);

  const onUpdateVisualizerPreset = useCallback((visualizer: AdSceneVisualizerStyle) => {
    if (!selectedScene || selectedScene.format !== "visualizer" || selectedScene.style.visualizer === visualizer) return;
    replaceSelectedSceneAndInvalidate({
      ...selectedScene,
      style: {
        ...selectedScene.style,
        visualizer,
      },
    }, ["visualizer"]);
  }, [replaceSelectedSceneAndInvalidate, selectedScene]);

  const onUpdateFormatPreset = useCallback((fieldId: string, value: string) => {
    if (fieldId !== "visualizerPreset") return;
    const variant = visualizerSceneVariants.find((item) => item.id === value);
    if (variant) onUpdateVisualizerPreset(variant.visualizer);
  }, [onUpdateVisualizerPreset]);

  const syncCreativePackGroupFromScenes = (scenes: AdScene[], nextSceneIds: Array<Id<"adScenes"> | null> = []) => {
    const firstScene = scenes[0] || null;
    if (!firstScene || !isCreativePackFormat(firstScene.format)) return;
    const researchRunId = firstScene.metadata.researchRunId || "";
    if (!researchRunId) return;

    setCreativePackGroups((groups) => groups.map((group) => {
      if (group.format !== firstScene.format) return group;
      const groupResearchRunId = group.scenes[0]?.metadata.researchRunId || researchRunId;
      if (groupResearchRunId !== researchRunId) return group;

      return {
        ...group,
        scenes,
        sceneIds: nextSceneIds.length ? nextSceneIds : scenes.map(() => null),
        status: hasPlayableCreativePackScenes(scenes) ? "ready" : group.status,
        message: hasPlayableCreativePackScenes(scenes) ? "" : group.message,
        publicMessage: hasPlayableCreativePackScenes(scenes) ? "" : group.publicMessage,
      };
    }));
  };

  const applyGeneratedScenes = (
    scenes: AdScene[],
    nextSceneIds: Array<Id<"adScenes"> | null> = [],
    options: ApplyGeneratedScenesOptions = {},
  ) => {
    if (!scenes.length) throw new Error("Ad idea generation returned no ads.");
    assertRenderableScenes(scenes);

    const firstScene = scenes[0] || null;
    setAdScenes(scenes);
    setSceneIds(nextSceneIds.length ? nextSceneIds : scenes.map(() => null));
    setSelectedScene(firstScene);
    setSelectedSceneIndex(0);
    canvasActions.interactionReset();
    setRerollCount(0);
    resetShareState();
    resetRenderState();
    resetAudioState();
    resetSaveState();
    resetBrickStoryboardState();
    resetThreeDBreakdownState();
    if (firstScene?.format === "three-d-breakdown") resetThreeDStoryDirections();
    syncCreativePackGroupFromScenes(scenes, nextSceneIds);
    setAdStatusNote(options.note || `${scenes.length} ads ready. Press spacebar to find a stronger version.`);
    setAdStatus("ready");
    canvasActions.finishBusy();
  };

  const generateScenesForResearch = async (
    researchRunId: Id<"researchRuns">,
    count = 50,
    format: AdFormatId = "visualizer",
    memeModel?: string,
    videoMemeTemplateId: VideoMemeTemplateId = selectedVideoMemeTemplateId,
    visualizerModel?: string,
    jingleStyleId: JingleStyleId = selectedJingleStyleId,
    reviewProductHandles: string[] = [],
    threeDStoryDirection?: ThreeDBreakdownStoryDirection,
    threeDStorySubject?: ThreeDBreakdownStorySubject,
  ) => {
    const generationArgs = {
      researchRunId,
      count,
      format,
      ...(format === "meme" && memeModel ? { memeModel } : {}),
      ...(format === "video-meme" ? { videoMemeTemplateId } : {}),
      ...(format === "visualizer" && visualizerModel ? { visualizerModel } : {}),
      ...(format === "jingle" ? { jingleStyleId } : {}),
      ...(format === "reviews" || format === "motion-story" ? { selectedProductHandles: normalizeReviewProductHandles(reviewProductHandles) } : {}),
      ...(format === "three-d-breakdown" && threeDStoryDirection ? { threeDStoryDirection } : {}),
      ...(format === "three-d-breakdown" && threeDStorySubject ? { threeDStorySubject } : {}),
    };
    const startedAt = Date.now();
    console.info("[wiggly:ad-generation] client:start", {
      count,
      format,
      researchRunId: String(researchRunId),
    });
    try {
      const nextGeneration = await generateAdScenes(generationArgs) as AdSceneGenerationResponse;
      console.info("[wiggly:ad-generation] client:ready", {
        elapsedMs: Date.now() - startedAt,
        format,
        sceneCount: nextGeneration.scenes?.length || 0,
      });
      return {
        scenes: nextGeneration.scenes || [],
        sceneIds: nextGeneration.sceneIds || [],
      };
    } catch (error) {
      console.error("[wiggly:ad-generation] client:error", {
        elapsedMs: Date.now() - startedAt,
        format,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

  };

  const getReusableResearchForUrl = (
    value: string,
    options: { requiresProductImage?: boolean } = {},
  ) => {
    try {
      const toReusableResearch = (research: StoredWebsiteResearchResult | null | undefined) => {
        if (!research?.researchRunId) return null;
        if (options.requiresProductImage && !productCatalogHasProductImage(research.productCatalog)) return null;
        return {
          researchRunId: research.researchRunId,
          facts: getWebsiteSubmitProgressFacts(research),
          result: research,
        };
      };
      const key = normalizedUrlKey(value);
      const cached = researchByUrlRef.current.get(key);
      const cachedReusable = toReusableResearch(cached);
      if (cachedReusable) return cachedReusable;
      if (cachedResearchForUrl?.researchRunId && (
        key === normalizedUrlKey(cachedResearchForUrl.websiteUrl) ||
        key === normalizedUrlKey(cachedResearchForUrl.finalUrl)
      )) {
        const reusable = toReusableResearch(cachedResearchForUrl);
        if (reusable) {
          rememberResearchForReuse(cachedResearchForUrl);
          return reusable;
        }
      }
      if (result?.researchRunId && (
        key === normalizedUrlKey(result.websiteUrl) ||
        key === normalizedUrlKey(result.finalUrl)
      )) {
        const reusable = toReusableResearch(result);
        if (reusable) return reusable;
      }
      if (selectedScene?.metadata.researchRunId) {
        if (options.requiresProductImage) return null;
        const sceneKeys = [
          selectedScene.brand.url,
          selectedScene.brand.host ? `https://${selectedScene.brand.host}/` : "",
        ].filter(Boolean).map(normalizedUrlKey);
        if (sceneKeys.includes(key)) {
          return {
            researchRunId: selectedScene.metadata.researchRunId,
            facts: getSceneProgressFacts(selectedScene),
            result: result || undefined,
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const updateCreativePackGroup = (
    format: CreativePackFormat,
    update: (group: CreativePackOverviewGroup) => CreativePackOverviewGroup,
  ) => {
    setCreativePackGroups((groups) => groups.map((group) => (
      group.format === format ? update(group) : group
    )));
  };

  const firstReadyPackFormatByPriority = (readyFormats: Set<CreativePackFormat>) => (
    CREATIVE_PACK_SHOWCASE_PRIORITY.find((format) => readyFormats.has(format)) || null
  );

  useEffect(() => {
    if (!result?.researchRunId || !researchRunSceneRows?.length) return;

    try {
      const currentUrlKey = normalizedUrlKey(url);
      const resultUrlKeys = [result.websiteUrl, result.finalUrl]
        .filter(Boolean)
        .map((value) => normalizedUrlKey(value));
      if (!resultUrlKeys.includes(currentUrlKey)) return;
    } catch {
      return;
    }

    if (!creativePackWasStarted(result.researchRunId)) return;

    if (creativePackGroups.length) {
      if (
        creativePackStatus === "researching" ||
        creativePackStatus === "generating" ||
        !creativePackGroups.some((group) => group.status === "needs-retry")
      ) return;
      setCreativePackGroups((groups) => recoverCreativePackGroupsFromSceneRows({
        groups,
        rows: researchRunSceneRows,
      }));
      return;
    }

    const hydratedGroups = hydrateCreativePackGroupsFromSceneRows({
      minimumReadyFormats: CREATIVE_PACK_MONEY_SHOT_READY_COUNT,
      rows: researchRunSceneRows,
    });
    if (!hydratedGroups.length) return;

    setCreativePackGroups(hydratedGroups.map((group) => ({
      ...group,
      researchResult: result,
    })));
    setCreativePackStatus("ready");

    const selectedFormat = selectedScene?.format;
    if (!selectedCreativePackFormat && selectedFormat && isCreativePackFormat(selectedFormat)) {
      selectedCreativePackFormatRef.current = selectedFormat;
      setSelectedCreativePackFormat(selectedFormat);
    }
  }, [
    creativePackGroups.length,
    creativePackStatus,
    researchRunSceneRows,
    result,
    selectedCreativePackFormat,
    selectedScene?.format,
    url,
  ]);

  const getCreativePackReviewProductHandles = (researchResult: StoredWebsiteResearchResult | undefined | null) => {
    const selectedHandles = normalizeReviewProductHandles(selectedReviewProductHandles);
    if (selectedHandles.length) return selectedHandles;

    const catalog = researchResult?.productCatalog || result?.productCatalog;
    const defaultHandles = getDefaultReviewProductHandles(catalog);
    if (defaultHandles.length) return defaultHandles;

    return normalizeReviewProductHandles((catalog?.products || [])
      .filter((product) => product.imageUrl)
      .map((product) => product.handle));
  };

  const getExistingCreativePackGroup = (researchRunId: string, format: CreativePackFormat) => {
    const existingGroup = creativePackGroups.find((group) => (
      group.format === format &&
      group.status === "ready" &&
      group.scenes[0]?.metadata.researchRunId === researchRunId
    ));
    if (existingGroup?.scenes.length && hasPlayableCreativePackScenes(existingGroup.scenes)) return existingGroup;

    if (
      adScenes.length &&
      adScenes[0]?.format === format &&
      adScenes[0]?.metadata.researchRunId === researchRunId &&
      hasPlayableCreativePackScenes(adScenes)
    ) {
      return {
        format,
        label: getCreativePackFormatLabel(format),
        status: "ready" as const,
        scenes: adScenes,
        sceneIds,
        researchResult: result || undefined,
      };
    }

    return null;
  };

  const createCreativePackGroupsForResearch = (researchRunId: string, researchResult?: StoredWebsiteResearchResult) => CREATIVE_PACK_FORMATS.map((item) => {
    const existingGroup = getExistingCreativePackGroup(researchRunId, item.format);
    return existingGroup ? { ...existingGroup, researchResult: existingGroup.researchResult || researchResult } : {
      format: item.format,
      label: item.label,
      status: "pending" as const,
      scenes: [],
      sceneIds: [],
      researchResult,
      message: "Queued",
      publicMessage: "Queued",
    };
  });

  const selectCreativePackGroup = (format: CreativePackFormat) => {
    const group = creativePackGroups.find((candidate) => candidate.format === format);
    if (!group || group.status !== "ready" || !group.scenes.length) return;

    creativePackUserSelectedRef.current = true;
    selectedCreativePackFormatRef.current = format;
    setSelectedCreativePackFormat(format);
    setSelectedAdFormat(format);
    if (group.researchResult) {
      rememberResearchForReuse(group.researchResult);
      setResult(group.researchResult);
      setUrl(group.researchResult.websiteUrl);
    }
    if (format === "video-meme") {
      const templateId = getSceneVideoMemeTemplateId(group.scenes[0] || null);
      if (templateId) setSelectedVideoMemeTemplateId(templateId);
    }
    applyGeneratedScenes(group.scenes, group.sceneIds, {
      note: `${group.label} from your creative pack is ready. Press spacebar to compare variants.`,
    });
  };

  const generateCreativePackFormat = async (
    research: ReusableResearch,
    format: CreativePackFormat,
  ) => {
    const researchResult = research.result || result;
    const packFormat = CREATIVE_PACK_FORMATS.find((item) => item.format === format);
    const reviewProductHandles = format === "reviews" ? getCreativePackReviewProductHandles(researchResult) : [];
    const generation = await generateScenesForResearch(
      research.researchRunId as Id<"researchRuns">,
      packFormat?.count || 1,
      format,
      selectedMemeModel,
      selectedVideoMemeTemplateId,
      selectedVisualizerModel,
      selectedJingleStyleId,
      reviewProductHandles,
    );

    let scenes = generation.scenes || [];
    let sceneIds = generation.sceneIds || [];
    if (format === "brainrot") {
      scenes = scenes.slice(0, 1);
      sceneIds = sceneIds.slice(0, 1);
    }
    if (format === "visualizer" || format === "jingle") {
      scenes = scenes.slice(0, 1);
      sceneIds = sceneIds.slice(0, 1);
    }

    return {
      scenes,
      sceneIds,
    };
  };

  const retryCreativePackGroup = async (format: CreativePackFormat) => {
    const group = creativePackGroups.find((candidate) => candidate.format === format);
    const researchResult = group?.researchResult || result;
    const reusableResearch = researchResult
      ? {
        researchRunId: researchResult.researchRunId,
        facts: getWebsiteSubmitProgressFacts(researchResult),
        result: researchResult,
      }
      : getReusableResearchForUrl(url);
    if (!reusableResearch) {
      updateCreativePackGroup(format, (candidate) => ({
        ...candidate,
        status: "needs-retry",
        publicMessage: "Run the pack again.",
        message: "Run the pack again.",
        debugMessage: "No cached research was available for this retry.",
      }));
      return;
    }

    const label = getCreativePackFormatLabel(format);
    const startedAt = Date.now();
    let softTimer: ReturnType<typeof setTimeout> | null = null;
    setCreativePackStatus("generating");
    setError("");
    updateCreativePackGroup(format, (candidate) => ({
      ...candidate,
      status: "generating",
      startedAt,
      elapsedMs: 0,
      actionLabel: "Generating preview",
      publicMessage: "Generating now.",
      message: "Generating now.",
      debugMessage: "",
    }));

    softTimer = setTimeout(() => {
      updateCreativePackGroup(format, (candidate) => (
        candidate.status === "generating"
          ? {
            ...candidate,
            status: "still-cooking",
            publicMessage: "Still cooking.",
            message: "Still cooking.",
            debugMessage: `${label} passed ${Math.round(CREATIVE_PACK_SOFT_TIMEOUT_MS / 1000)}s but is still running.`,
            elapsedMs: Date.now() - startedAt,
          }
          : candidate
      ));
    }, CREATIVE_PACK_SOFT_TIMEOUT_MS);

    try {
      const generation = await withClientTimeout(
        generateCreativePackFormat(reusableResearch, format),
        CREATIVE_PACK_HARD_TIMEOUT_MS,
        label,
        `${label} needs retry after ${Math.round(CREATIVE_PACK_HARD_TIMEOUT_MS / 1000)}s.`,
      );
      if (softTimer) clearTimeout(softTimer);
      const scenes = generation.scenes || [];
      if (!scenes.length) throw new Error(`${label} returned no ads.`);
      if (!hasPlayableCreativePackScenes(scenes)) throw new Error(`${label} returned no preview.`);

      updateCreativePackGroup(format, (candidate) => ({
        ...candidate,
        status: "ready",
        scenes,
        sceneIds: generation.sceneIds || [],
        researchResult: reusableResearch.result || candidate.researchResult,
        publicMessage: "",
        message: "",
        debugMessage: "",
        elapsedMs: Date.now() - startedAt,
      }));
      setCreativePackStatus("ready");
      if (!creativePackUserSelectedRef.current) {
        selectedCreativePackFormatRef.current = format;
        setSelectedCreativePackFormat(format);
        setSelectedAdFormat(format);
        if (reusableResearch.result) {
          rememberResearchForReuse(reusableResearch.result);
          setResult(reusableResearch.result);
          setUrl(reusableResearch.result.websiteUrl);
        }
        applyGeneratedScenes(scenes, generation.sceneIds || [], {
          note: `${label} is ready from your creative pack retry.`,
        });
      }
    } catch (nextError) {
      if (softTimer) clearTimeout(softTimer);
      const failure = getCreativePackFailure(format, nextError);
      updateCreativePackGroup(format, (candidate) => ({
        ...candidate,
        status: failure.status,
        publicMessage: failure.message,
        message: failure.message,
        debugMessage: failure.debugMessage,
        elapsedMs: Date.now() - startedAt,
      }));
      setCreativePackStatus("ready");
    }
  };

  const onCancelCreativePack = () => {
    if (creativePackRunRef.current) {
      creativePackRunRef.current.cancelled = true;
    }
    setCreativePackStatus("cancelled");
    setCreativePackGroups((groups) => groups.map((group) => (
      group.status === "pending" || group.status === "generating" || group.status === "still-cooking"
        ? { ...group, status: "cancelled", message: "Cancelled.", publicMessage: "Cancelled." }
        : group
    )));
    const hasReadyPackGroup = creativePackGroups.some((group) => group.status === "ready" && group.scenes.length);
    const previousState = creativePackPreviousStateRef.current;
    if (!hasReadyPackGroup && previousState) {
      setUrl(previousState.url);
      setResult(previousState.result);
      setSelectedAdFormat(previousState.selectedAdFormat);
      setSelectedReviewProductHandles(previousState.selectedReviewProductHandles);
    }
    setStatus((current) => current === "loading" ? (result || adScenes.length ? "ready" : "idle") : current);
    setAdStatus((current) => current === "loading" ? (adScenes.length ? "ready" : "idle") : current);
    clearSubmitProgress();
    canvasActions.finishBusy();
  };

  const onGenerateCreativePack = async () => {
    if (creativePackStatus === "researching" || creativePackStatus === "generating") return;

    const runToken = { id: Date.now(), cancelled: false };
    creativePackRunRef.current = runToken;
    creativePackPreviousStateRef.current = {
      result,
      selectedAdFormat,
      selectedReviewProductHandles,
      url,
    };
    selectedCreativePackFormatRef.current = null;
    creativePackUserSelectedRef.current = false;
    creativePackMoneyShotTriggeredRef.current = false;
    setSelectedCreativePackFormat(null);
    setCreativePackMoneyShotActive(false);
    setCreativePackGroups([]);
    // TODO(analytics): creative_pack_clicked.
    setError("");
    setAdStatusNote("");
    resetShareState();
    resetRenderState();
    resetPreviewPlayback();
    resetDialogueState();
    closeBrandDetails();
    closeCaptionPanel();
    resetSaveState();

    const reusableResearch = getReusableResearchForUrl(url);
    let research = reusableResearch;
    const hadExistingCanvas = Boolean(selectedScene || adScenes.length);

    if (!research) {
      setCreativePackStatus("researching");
      setStatus("loading");
      setAdStatus("loading");
      setProgressStage("reading-site");
      setPendingProgressFacts(null);
      setShowSlowResearchMessage(false);
      setAdStatusNote(hadExistingCanvas ? "Reading website for a creative pack. Keeping this canvas stable until ads are ready." : "");
      canvasActions.beginBusy("website-research");
      // TODO(analytics): creative_pack_research_started.

      try {
        try {
          setBillingStatus(await fetchBillingJson("/api/billing/consume-run", { method: "POST" }));
        } catch (billingError: unknown) {
          const typedError = billingError as Error & { status?: number; code?: string };
          if (typedError.status === 402 || typedError.code === "PAYWALL_REQUIRED") {
            setModal("paywall");
            setCreativePackStatus("idle");
            setStatus(hadExistingCanvas ? "ready" : "idle");
            setAdStatus(hadExistingCanvas ? "ready" : "idle");
            clearSubmitProgress();
            canvasActions.finishBusy();
            return;
          }
          throw billingError;
        }

        const nextResult = await runWebsiteResearch({
          anonymousId: getAnonymousId(),
          url,
        }) as StoredWebsiteResearchResponse;
        if (isStoredWebsiteResearchFailure(nextResult)) {
          setCreativePackStatus("error");
          setStatus(hadExistingCanvas ? "ready" : "error");
          setAdStatus(hadExistingCanvas ? "ready" : "error");
          setError(nextResult.error);
          clearSubmitProgress();
          canvasActions.finishBusy();
          return;
        }

        rememberResearchForReuse(nextResult);
        setResult(nextResult);
        setStatus("ready");
        const defaultReviewProductHandles = getDefaultReviewProductHandles(nextResult.productCatalog);
        if (defaultReviewProductHandles.length) setSelectedReviewProductHandles(defaultReviewProductHandles);
        research = {
          researchRunId: nextResult.researchRunId,
          facts: getWebsiteSubmitProgressFacts(nextResult),
          result: nextResult,
        };
      } catch (nextError) {
        setCreativePackStatus("error");
        setStatus(hadExistingCanvas ? "ready" : "error");
        setAdStatus(hadExistingCanvas ? "ready" : "error");
        setError(getResearchActionErrorMessage(nextError));
        clearSubmitProgress();
        canvasActions.finishBusy();
        return;
      }

      if (creativePackRunRef.current?.id !== runToken.id || runToken.cancelled) {
        setCreativePackStatus("cancelled");
        setAdStatus(hadExistingCanvas ? "ready" : "idle");
        clearSubmitProgress();
        canvasActions.finishBusy();
        return;
      }
    }

    if (!research) return;

    const packRunKey = `${research.researchRunId}:${normalizedUrlKey(research.result?.websiteUrl || url)}`;
    creativePackWasStarted(research.researchRunId, true);
    const initialGroups = createCreativePackGroupsForResearch(research.researchRunId, research.result || undefined);
    const alreadyRan = creativePackRunKeysRef.current.has(packRunKey);
    setCreativePackGroups(initialGroups);

    const selectBestReadyGroup = (groups: CreativePackOverviewGroup[], note = "Creative pack group is ready.") => {
      const readyFormats = new Set(groups
        .filter((group) => group.status === "ready" && group.scenes.length)
        .map((group) => group.format));
      const format = firstReadyPackFormatByPriority(readyFormats);
      const group = format ? groups.find((candidate) => candidate.format === format) : null;
      if (!group || !group.scenes.length) return false;

      selectedCreativePackFormatRef.current = group.format;
      setSelectedCreativePackFormat(group.format);
      setSelectedAdFormat(group.format);
      if (group.researchResult) {
        rememberResearchForReuse(group.researchResult);
        setResult(group.researchResult);
        setUrl(group.researchResult.websiteUrl);
      }
      applyGeneratedScenes(group.scenes, group.sceneIds, {
        note,
      });
      return true;
    };

    if (alreadyRan) {
      setCreativePackStatus("ready");
      setAdStatus("ready");
      selectBestReadyGroup(initialGroups, "Creative pack already generated for this URL. Pick a direction or press spacebar inside the selected group.");
      setAdStatusNote("Creative pack already generated for this URL in this session. Open a group or regenerate one format manually.");
      clearSubmitProgress();
      canvasActions.finishBusy();
      return;
    }

    const formatsToGenerate = initialGroups
      .filter((group) => !isCreativePackTerminalStatus(group.status))
      .map((group) => group.format);
    if (!formatsToGenerate.length) {
      setCreativePackStatus("ready");
      setAdStatus("ready");
      selectBestReadyGroup(initialGroups, "Creative pack is ready. Pick a direction or press spacebar inside the selected group.");
      clearSubmitProgress();
      canvasActions.finishBusy();
      return;
    }

    creativePackRunKeysRef.current.add(packRunKey);
    setCreativePackStatus("generating");
    setStatus("ready");
    setAdStatus("loading");
    setProgressStage("writing-ads");
    setPendingProgressFacts(research.facts);
    setShowSlowResearchMessage(false);
    setAdStatusNote("Generating your creative pack. Completed groups stay usable while the rest finish.");
    // TODO(analytics): creative_pack_generation_started.

    let cursor = 0;
    const readyResults = new Map<CreativePackFormat, {
      scenes: AdScene[];
      sceneIds: Array<Id<"adScenes"> | null>;
      researchResult?: StoredWebsiteResearchResult;
    }>();
    const readyFormats = new Set<CreativePackFormat>();
    const terminalFormats = new Set<CreativePackFormat>();
    for (const group of initialGroups) {
      if (group.status === "ready" && group.scenes.length) {
        readyFormats.add(group.format);
        terminalFormats.add(group.format);
        readyResults.set(group.format, {
          scenes: group.scenes,
          sceneIds: group.sceneIds,
          researchResult: group.researchResult,
        });
      }
    }

    const maybeTriggerMoneyShot = () => {
      const allTerminal = terminalFormats.size >= CREATIVE_PACK_FORMATS.length;
      const enoughReady = readyFormats.size >= CREATIVE_PACK_MONEY_SHOT_READY_COUNT;
      if (creativePackMoneyShotTriggeredRef.current || (!allTerminal && !enoughReady)) return;

      creativePackMoneyShotTriggeredRef.current = true;
      if (readyFormats.size > 0) setCreativePackMoneyShotActive(true);
      if (creativePackUserSelectedRef.current || selectedCreativePackFormatRef.current) return;

      const format = firstReadyPackFormatByPriority(readyFormats);
      const generation = format ? readyResults.get(format) : null;
      if (!format || !generation?.scenes.length) return;

      selectedCreativePackFormatRef.current = format;
      setSelectedCreativePackFormat(format);
      setSelectedAdFormat(format);
      if (generation.researchResult) {
        rememberResearchForReuse(generation.researchResult);
        setResult(generation.researchResult);
        setUrl(generation.researchResult.websiteUrl);
      }
      applyGeneratedScenes(generation.scenes, generation.sceneIds, {
        note: `${getCreativePackFormatLabel(format)} is ready. Other directions can keep landing without stealing the preview.`,
      });
    };

    const runFormat = async (format: CreativePackFormat) => {
      if (creativePackRunRef.current?.id !== runToken.id) return;
      const label = getCreativePackFormatLabel(format);
      const startedAt = Date.now();
      let softTimer: ReturnType<typeof setTimeout> | null = null;
      updateCreativePackGroup(format, (group) => ({
        ...group,
        status: "generating",
        startedAt,
        elapsedMs: 0,
        actionLabel: "Generating preview",
        message: "Generating now.",
        publicMessage: "Generating now.",
        debugMessage: "",
      }));
      softTimer = setTimeout(() => {
        if (creativePackRunRef.current?.id !== runToken.id || runToken.cancelled || terminalFormats.has(format)) return;
        updateCreativePackGroup(format, (group) => ({
          ...group,
          status: "still-cooking",
          publicMessage: "Still cooking.",
          message: "Still cooking.",
          debugMessage: `${label} passed ${Math.round(CREATIVE_PACK_SOFT_TIMEOUT_MS / 1000)}s but is still running.`,
          elapsedMs: Date.now() - startedAt,
        }));
        // TODO(analytics): creative_pack_group_still_cooking.
      }, CREATIVE_PACK_SOFT_TIMEOUT_MS);

      try {
        const generation = await withClientTimeout(
          generateCreativePackFormat(research, format),
          CREATIVE_PACK_HARD_TIMEOUT_MS,
          label,
          `${label} needs retry after ${Math.round(CREATIVE_PACK_HARD_TIMEOUT_MS / 1000)}s.`,
        );
        if (softTimer) clearTimeout(softTimer);
        if (creativePackRunRef.current?.id !== runToken.id) return;
        const scenes = generation.scenes || [];
        if (!scenes.length) throw new Error(`${getCreativePackFormatLabel(format)} returned no ads.`);
        if (!hasPlayableCreativePackScenes(scenes)) throw new Error(`${label} returned no preview.`);

        readyFormats.add(format);
        terminalFormats.add(format);
        readyResults.set(format, {
          scenes,
          sceneIds: generation.sceneIds || [],
          researchResult: research.result || result || undefined,
        });
        updateCreativePackGroup(format, (group) => ({
          ...group,
          status: "ready",
          scenes,
          sceneIds: generation.sceneIds || [],
          researchResult: research.result || result || group.researchResult,
          message: "",
          publicMessage: "",
          debugMessage: "",
          elapsedMs: Date.now() - startedAt,
        }));
        // TODO(analytics): creative_pack_group_ready.
        maybeTriggerMoneyShot();
      } catch (nextError) {
        if (softTimer) clearTimeout(softTimer);
        if (creativePackRunRef.current?.id !== runToken.id) return;
        if (runToken.cancelled) {
          terminalFormats.add(format);
          updateCreativePackGroup(format, (group) => ({
            ...group,
            status: "cancelled",
            message: "Cancelled.",
            publicMessage: "Cancelled.",
            elapsedMs: Date.now() - startedAt,
          }));
          return;
        }
        terminalFormats.add(format);
        const failure = getCreativePackFailure(format, nextError);
        updateCreativePackGroup(format, (group) => ({
          ...group,
          status: failure.status,
          message: failure.message,
          publicMessage: failure.message,
          debugMessage: failure.debugMessage,
          elapsedMs: Date.now() - startedAt,
        }));
        // TODO(analytics): creative_pack_group_unavailable.
        maybeTriggerMoneyShot();
      }
    };

    const workers = Array.from({ length: CREATIVE_PACK_CONCURRENCY }, async () => {
      while (cursor < formatsToGenerate.length) {
        if (runToken.cancelled || creativePackRunRef.current?.id !== runToken.id) return;
        const format = formatsToGenerate[cursor];
        cursor += 1;
        if (format) await runFormat(format);
      }
    });

    await Promise.all(workers);

    if (creativePackRunRef.current?.id !== runToken.id) return;
    setCreativePackStatus(runToken.cancelled ? "cancelled" : "ready");
    setCreativePackGroups((groups) => groups.map((group) => (
      runToken.cancelled && (group.status === "pending" || group.status === "generating" || group.status === "still-cooking")
        ? { ...group, status: "cancelled", message: "Cancelled.", publicMessage: "Cancelled." }
        : group.status === "pending" || group.status === "generating" || group.status === "still-cooking"
          ? { ...group, status: "needs-retry", message: "Needs retry.", publicMessage: "Needs retry.", debugMessage: "Could not finish before the pack runner stopped." }
          : group
    )));
    maybeTriggerMoneyShot();
    const finalReadyCount = readyFormats.size;
    setAdStatus(finalReadyCount ? "ready" : "error");
    setAdStatusNote(finalReadyCount
      ? "Creative pack ready. Open any group, then press spacebar to compare variants."
      : "Creative pack could not generate usable groups.");
    if (!finalReadyCount) setError("Creative pack could not generate any usable groups.");
    clearSubmitProgress();
    canvasActions.finishBusy();
    // TODO(analytics): creative_pack_completed or creative_pack_cancelled.
  };

  const generateThreeDStoryDirectionSlate = async (
    research: ReusableResearch,
    storySubject: ThreeDBreakdownStorySubject,
  ) => {
    if (research.result) {
      rememberResearchForReuse(research.result);
      setResult(research.result);
      setUrl(research.result.websiteUrl);
    }
    setStatus("ready");
    setAdStatus("loading");
    setThreeDStoryDirectionStatus("loading");
    setThreeDStoryDirectionError("");
    setThreeDStoryDirections([]);
    setSelectedThreeDStoryDirectionId("");
    setProgressStage("writing-ads");
    setPendingProgressFacts(research.facts);
    setShowSlowResearchMessage(false);
    setAdStatusNote("Finding five 3D story directions before any paid media generation.");
    setError("");
    resetShareState();
    resetRenderState();
    resetPreviewPlayback();
    resetDialogueState();
    resetSaveState();
    resetThreeDBreakdownState();
    canvasActions.beginBusy("ad-generation");

    try {
      const slate = await generateThreeDStoryDirections({
        researchRunId: research.researchRunId as Id<"researchRuns">,
        storySubject,
      }) as ThreeDStoryDirectionsResponse;
      const directions = slate.directions || [];
      if (!directions.length) throw new Error("3D Breakdown story direction generation returned no cards.");
      setThreeDStoryDirections(directions);
      setSelectedThreeDStoryDirectionId(
        directions.some((direction) => direction.directionId === slate.recommendedDirectionId)
          ? slate.recommendedDirectionId || directions[0]!.directionId
          : directions[0]!.directionId,
      );
      setThreeDStoryDirectionStatus("ready");
      setAdStatus("ready");
      setAdStatusNote("Pick a 3D story direction, or write your own, then generate the script.");
      setAdScenes([]);
      setSceneIds([]);
      setSelectedScene(null);
      setSelectedSceneIndex(0);
      clearSubmitProgress();
      canvasActions.finishBusy();
    } catch (nextError) {
      clearSubmitProgress();
      canvasActions.finishBusy();
      setThreeDStoryDirectionStatus("error");
      setThreeDStoryDirectionError(getAdGenerationErrorMessage(nextError));
      setAdStatus("error");
      setAdStatusNote(adScenes.length ? "Previous ads are still on the canvas. Story direction generation failed." : "");
      setError(getAdGenerationErrorMessage(nextError));
    }
  };

  const generateScenesOnly = async (
    research: ReusableResearch,
    format: AdFormatId,
    videoMemeTemplateId: VideoMemeTemplateId = selectedVideoMemeTemplateId,
    options: { jingleStyleId?: JingleStyleId; loadingNote?: string; note?: string; threeDStoryDirection?: ThreeDBreakdownStoryDirection; threeDStorySubject?: ThreeDBreakdownStorySubject } = {},
  ) => {
    if (research.result) {
      rememberResearchForReuse(research.result);
      setResult(research.result);
      setUrl(research.result.websiteUrl);
    }
    if (format === "three-d-breakdown" && !options.threeDStoryDirection) {
      if (!options.threeDStorySubject) {
        resetThreeDStoryDirections();
        setAdScenes([]);
        setSceneIds([]);
        setSelectedScene(null);
        setSelectedSceneIndex(0);
        setStatus("ready");
        setAdStatus("ready");
        setAdStatusNote("Choose what this 3D Breakdown should be about before Wiggly writes five concepts.");
        clearSubmitProgress();
        canvasActions.finishBusy();
        return;
      }
      await generateThreeDStoryDirectionSlate(research, options.threeDStorySubject);
      return;
    }
    setStatus("ready");
    setAdStatus("loading");
    setProgressStage("writing-ads");
    setPendingProgressFacts(research.facts);
    setShowSlowResearchMessage(false);
    canvasActions.beginBusy("ad-generation");
    resetShareState();
    resetRenderState();
    resetPreviewPlayback();
    resetDialogueState();
    closeCaptionPanel();
    resetSaveState();
    setError("");
    setAdStatusNote(options.loadingNote || "Reusing website research. Generating this format only.");

    try {
      const selectedReviewHandles = normalizeReviewProductHandles(selectedReviewProductHandles);
      const reviewProductHandles = format === "reviews" || format === "motion-story"
        ? selectedReviewHandles.length
          ? selectedReviewHandles
          : getDefaultReviewProductHandles((research.result || result)?.productCatalog)
        : [];
      const nextGeneration = await generateScenesForResearch(
        research.researchRunId as Id<"researchRuns">,
        getGenerationCount(format, videoMemeTemplateId),
        format,
        selectedMemeModel,
        videoMemeTemplateId,
        selectedVisualizerModel,
        options.jingleStyleId || selectedJingleStyleId,
        reviewProductHandles,
        options.threeDStoryDirection,
        options.threeDStorySubject,
      );
      setProgressStage("preparing-canvas");
      applyGeneratedScenes(nextGeneration.scenes, nextGeneration.sceneIds, {
        note: options.note,
      });
      clearSubmitProgress();
    } catch (nextError) {
      const message = getAdGenerationErrorMessage(nextError);
      clearSubmitProgress();
      canvasActions.finishBusy();
      setAdStatus("error");
      setAdStatusNote(adScenes.length ? "Previous ads are still on the canvas. New ad generation failed." : "");
      setError(message);
      if (format === "three-d-breakdown" && options.threeDStoryDirection) {
        setThreeDStoryDirectionStatus("error");
        setThreeDStoryDirectionError(message);
      }
    }
  };

  const onRerollScene = useCallback(() => {
    if (status === "loading" || adStatus === "loading" || audioStatus === "loading") return;

    if (selectedScene?.format === "jingle" && selectedScene.metadata.researchRunId) {
      const nextJingleStyleId = getNextJingleStyleId(selectedJingleStyleId);
      const nextJingleStyle = JINGLE_STYLES.find((style) => style.id === nextJingleStyleId);
      setRerollCount((count) => count + 1);
      triggerRerollFlash(["headline", "visualizer", "captions"]);
      setSelectedJingleStyleId(nextJingleStyleId);
      void generateScenesOnly(
        {
          researchRunId: selectedScene.metadata.researchRunId,
          facts: result ? getWebsiteSubmitProgressFacts(result) : getSceneProgressFacts(selectedScene),
          result: result || undefined,
        },
        "jingle",
        selectedVideoMemeTemplateId,
        {
          jingleStyleId: nextJingleStyleId,
          loadingNote: `Making a ${nextJingleStyle?.label || "new"} jingle...`,
          note: `${nextJingleStyle?.label || "New"} jingle ready. Press spacebar to make another one.`,
        },
      );
      return;
    }

    if (!adScenes.length || !selectedScene) {
      setPlaceholderVariantIndex((index) => (index + 1) % placeholderAdSurfaceVariantCount);
      setRerollCount((count) => count + 1);
      triggerRerollFlash(["headline", "visualizer", "captions"]);
      return;
    }

    const currentGeneratedAudio = selectedScene.audio.status === "generated" ? selectedScene.audio : null;
    const next = rerollScene(adScenes, selectedScene, selectedSceneIndex, {
      ...createDefaultSceneLocks(),
      audio: selectedScene.format !== "jingle" && selectedScene.format !== "brainrot" && Boolean(currentGeneratedAudio),
    });
    if (!next.scene) return;

    const nextScene = next.scene;
    const shouldKeepPlayback = nextScene.audio.status === "generated" && currentGeneratedAudio?.url === nextScene.audio.url;

    if (!shouldKeepPlayback) {
      resetPreviewPlayback();
    }
    setSelectedScene(nextScene);
    setSelectedSceneIndex(next.index);
    setRerollCount((count) => count + 1);
    resetShareState();
    resetRenderState();
    setAudioStatus(nextScene.audio.status === "generated" ? "ready" : "idle");
    setAudioError("");
    resetDialogueState();
    resetSaveState();
    triggerRerollFlash(getSceneDefaultFlashSlots(nextScene));
  }, [
    adScenes,
    adStatus,
    audioStatus,
    generateJingleMusicForScene,
    generateScenesOnly,
    resetPreviewPlayback,
    result,
    sceneIds,
    selectedJingleStyleId,
    selectedScene,
    selectedSceneIndex,
    selectedVideoMemeTemplateId,
    status,
    triggerRerollFlash,
  ]);

  useCanvasKeyboard({
    editorScopeRef: createEditorScopeRef,
    onReroll: selectedAdFormat === PRODUCT_PHOTOSHOOT_FORMAT ? () => {} : onRerollScene,
  });

  useEffect(() => {
    if (!isAudioPlaying) return;

    let animationFrame = 0;

    const tick = () => {
      const currentAudio = audioRef.current;
      if (!currentAudio || currentAudio.paused) return;
      setPreviewTimeSeconds(currentAudio.currentTime);
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isAudioPlaying]);

  useEffect(() => {
    if (!brandDetailsOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeBrandDetails();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [brandDetailsOpen]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hadExistingCanvas = Boolean(selectedScene || adScenes.length);
    // TODO: add an explicit same-URL refresh control if stale site content becomes a real problem.
    const reusableResearch = getReusableResearchForUrl(url, {
      requiresProductImage: selectedAdFormat === "motion-story" || selectedAdFormat === PRODUCT_PHOTOSHOOT_FORMAT,
    });
    if (reusableResearch) {
      closeBrandDetails();
      closeCaptionPanel();
      if (selectedAdFormat === PRODUCT_PHOTOSHOOT_FORMAT) {
        setStatus("ready");
        setAdStatus("idle");
        clearSubmitProgress();
        await generateProductPhotoshootBoard({
          researchResult: reusableResearch.result || result,
        });
        return;
      }
      if (!isAdSceneCreateFormat(selectedAdFormat)) return;
      await generateScenesOnly(reusableResearch, selectedAdFormat);
      return;
    }
    const keepPreviousCanvasAfterFailure = () => {
      setAdStatus(hadExistingCanvas ? "ready" : "error");
      if (hadExistingCanvas) {
        setAdStatusNote("Previous ads are still on the canvas. Try another URL when you're ready.");
      }
    };

    setStatus("loading");
    setAdStatus("loading");
    if (selectedAdFormat === "three-d-breakdown") resetThreeDStoryDirections();
    setProgressStage("reading-site");
    setPendingProgressFacts(null);
    setShowSlowResearchMessage(false);
    canvasActions.beginBusy("website-research");
    resetShareState();
    resetRenderState();
    resetPreviewPlayback();
    resetDialogueState();
    closeBrandDetails();
    closeCaptionPanel();
    resetSaveState();
    setAdStatusNote(hadExistingCanvas ? "Reading website. Keeping this canvas stable until the new ads are ready." : "");
    setError("");
    let researchCompleted = false;

    try {
      try {
        setBillingStatus(await fetchBillingJson("/api/billing/consume-run", { method: "POST" }));
      } catch (billingError: unknown) {
        const typedError = billingError as Error & { status?: number; code?: string };
        if (typedError.status === 402 || typedError.code === "PAYWALL_REQUIRED") {
          setModal("paywall");
          setStatus(hadExistingCanvas ? "ready" : "idle");
          keepPreviousCanvasAfterFailure();
          clearSubmitProgress();
          canvasActions.finishBusy();
          return;
        }
        throw billingError;
      }

      const nextResult = await runWebsiteResearch({
        anonymousId: getAnonymousId(),
        url,
      }) as StoredWebsiteResearchResponse;
      if (isStoredWebsiteResearchFailure(nextResult)) {
        setStatus(hadExistingCanvas ? "ready" : "error");
        setError(nextResult.error);
        keepPreviousCanvasAfterFailure();
        clearSubmitProgress();
        canvasActions.finishBusy();
        return;
      }
      researchCompleted = true;
      const defaultReviewProductHandles = getDefaultReviewProductHandles(nextResult.productCatalog);
      if (defaultReviewProductHandles.length) setSelectedReviewProductHandles(defaultReviewProductHandles);
      if (selectedAdFormat === PRODUCT_PHOTOSHOOT_FORMAT) {
        rememberResearchForReuse(nextResult);
        setResult(nextResult);
        setStatus("ready");
        setAdStatus("idle");
        clearSubmitProgress();
        canvasActions.finishBusy();
        await generateProductPhotoshootBoard({
          researchResult: nextResult,
          productHandle: getDefaultPhotoshootProductHandle(nextResult.productCatalog),
        });
        return;
      }
      if (selectedAdFormat === "reviews" || selectedAdFormat === "motion-story") {
        rememberResearchForReuse(nextResult);
        setResult(nextResult);
        setStatus("ready");
        setAdStatus(hadExistingCanvas ? "ready" : "idle");
        setAdStatusNote(defaultReviewProductHandles.length
          ? "Best sellers are selected. Adjust products if needed, then generate."
          : "Choose products if available, then generate.");
        clearSubmitProgress();
        canvasActions.finishBusy();
        return;
      }
      if (selectedAdFormat === "three-d-breakdown") {
        await generateScenesOnly({
          researchRunId: nextResult.researchRunId,
          facts: getWebsiteSubmitProgressFacts(nextResult),
          result: nextResult,
        }, "three-d-breakdown");
        return;
      }
      setPendingProgressFacts(getWebsiteSubmitProgressFacts(nextResult));
      setShowSlowResearchMessage(false);
      setProgressStage("writing-ads");
      canvasActions.beginBusy("ad-generation");
      if (!isAdSceneCreateFormat(selectedAdFormat)) return;
      const nextGeneration = await generateScenesForResearch(
        nextResult.researchRunId as Id<"researchRuns">,
        getGenerationCount(selectedAdFormat, selectedVideoMemeTemplateId),
        selectedAdFormat,
        selectedMemeModel,
        selectedVideoMemeTemplateId,
        selectedVisualizerModel,
        selectedJingleStyleId,
        [],
      );
      setProgressStage("preparing-canvas");
      rememberResearchForReuse(nextResult);
      setResult(nextResult);
      setStatus("ready");
      applyGeneratedScenes(nextGeneration.scenes, nextGeneration.sceneIds);
      clearSubmitProgress();
    } catch (nextError) {
      clearSubmitProgress();
      canvasActions.finishBusy();
      const message = getResearchActionErrorMessage(nextError);
      if (researchCompleted) {
        setStatus(hadExistingCanvas ? "ready" : "error");
        setAdStatus("error");
        setAdStatusNote(hadExistingCanvas ? "Previous ads are still on the canvas. New ad generation failed." : "");
        setError(getAdGenerationErrorMessage(nextError));
      } else {
        setStatus(hadExistingCanvas ? "ready" : "error");
        keepPreviousCanvasAfterFailure();
        setError(message);
      }
    }
  };

  const onFormatChange = (format: CreateFormatId) => {
    if (format === selectedAdFormat) return;
    setSelectedAdFormat(format);
    if (format !== "three-d-breakdown") resetThreeDStoryDirections();
    setSelectedCreativePackFormat(isAdSceneCreateFormat(format) && isCreativePackFormat(format) ? format : null);
    const reusableResearch = getReusableResearchForUrl(url, {
      requiresProductImage: format === "motion-story" || format === PRODUCT_PHOTOSHOOT_FORMAT,
    });
    if (format === PRODUCT_PHOTOSHOOT_FORMAT) {
      const defaultHandle = getDefaultPhotoshootProductHandle(reusableResearch?.result?.productCatalog || result?.productCatalog);
      if (defaultHandle) setSelectedPhotoshootProductHandle(defaultHandle);
      setAdStatusNote(reusableResearch ? "Pick a product, then generate six product shots." : "");
      return;
    }
    if (format === "reviews" || format === "motion-story") {
      const defaults = getDefaultReviewProductHandles(reusableResearch?.result?.productCatalog || result?.productCatalog);
      if (!selectedReviewProductHandles.length && defaults.length) setSelectedReviewProductHandles(defaults);
      setAdStatusNote(reusableResearch ? "Choose products, then generate this format." : "");
      return;
    }
    if (reusableResearch && isAdSceneCreateFormat(format)) setAdStatusNote(`${CREATE_FORMAT_GUIDES[format].label} selected. Generate when ready.`);
  };

  const onVideoMemeTemplateChange = (templateId: VideoMemeTemplateId) => {
    setSelectedVideoMemeTemplateId(templateId);
    const reusableResearch = getReusableResearchForUrl(url);
    if (selectedAdFormat !== "video-meme" || !reusableResearch || status === "loading" || adStatus === "loading") return;
    void generateScenesOnly(reusableResearch, "video-meme", templateId);
  };

  const startCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError("");
    setError("");
    try {
      const payload = await fetchBillingJson("/api/billing/checkout", { method: "POST" });
      if (!payload.url) throw new Error("Could not start checkout.");
      window.location.href = payload.url;
    } catch (checkoutError) {
      const message = checkoutError instanceof Error ? checkoutError.message : "Could not start checkout.";
      setCheckoutError(message);
      setError(message);
      setCheckoutLoading(false);
    }
  };

  const onCreateShareLink = async () => {
    if (!selectedScene) return;
    setShareStatus("loading");
    setShareUrl("");
    setShareError("");

    try {
      const sceneForShare = selectedScene.format === "three-d-breakdown"
        && renderJob?.status === "ready"
        && renderJob.downloadUrl
        && renderJob.outputStorageId
        ? {
          ...selectedScene,
          layout: {
            ...selectedScene.layout,
            finalVideo: {
              status: "ready" as const,
              url: renderJob.downloadUrl,
              storageId: String(renderJob.outputStorageId),
              mimeType: "video/mp4",
              durationMs: selectedScene.layout.durationMs,
            },
          },
        }
        : selectedScene;
      const share = await createSharePage({
        anonymousId: getCurrentAnonymousId(),
        scene: sceneForShare,
        ctaUrl: sceneForShare.brand.url,
        previewPlatform,
      }) as { path: string };
      const nextShareUrl = `${window.location.origin}${share.path}`;
      setShareUrl(nextShareUrl);
      setShareStatus("ready");

      try {
        await window.navigator.clipboard?.writeText(nextShareUrl);
      } catch {
        // Clipboard access is a convenience; the visible link is the source of truth.
      }
    } catch (nextError) {
      setShareStatus("error");
      setShareError(nextError instanceof Error ? nextError.message : "Share link failed.");
    }
  };

  const onOpenAudioPanel = () => {
    if (audioStatus === "loading") return;
    const scene = ensureSelectedScene();
    if (scene.format === "jingle") {
      void generateJingleMusicForScene(scene, sceneIds[selectedSceneIndex]);
      return;
    }
    if (scene.format === "brainrot") {
      void generateBrainrotAudioForSceneSelected(scene, sceneIds[selectedSceneIndex]);
      return;
    }
    if (scene.format === "three-d-breakdown") {
      const scriptError = scene.layout.scriptBeats.some((beat) => !beat.narration.trim())
        ? "Add words to every script section before generating the narrator."
        : getThreeDBreakdownCtaError(
          scene.layout.scriptBeats[4]?.narration,
          scene.layout.storyContract.storySubject?.kind,
        );
      if (scriptError) {
        setAudioError(scriptError);
        return;
      }
      void generateSceneAudio(scene, sceneIds[selectedSceneIndex], {
        format: "three-d-breakdown",
        action: generateVoiceoverForScene,
      });
      return;
    }
    if (dialoguePanelOpen) {
      closeDialoguePanel();
    } else {
      openDialoguePanel();
    }
    setAudioError("");
    setDialogueError("");
  };

  const onGenerateDialogueScripts = async () => {
    if (!selectedScene || audioStatus === "loading") return;
    openDialoguePanel();
    setDialogueStatus("loading");
    setDialogueError("");
    setAudioError("");

    try {
      const result = await generateDialogueScripts({
        scene: selectedScene,
        count: 5,
      }) as { scripts: DialogueScript[] };
      setDialogueScripts((result.scripts || []).map(cloneDialogueScript));
      setSelectedDialogueIndex(0);
      setDialogueStatus("ready");
    } catch (nextError) {
      setDialogueStatus("error");
      setDialogueError(nextError instanceof Error ? nextError.message : "Dialogue script generation failed.");
    }
  };

  const onSelectDialogueScript = (index: number) => {
    setSelectedDialogueIndex(index);
    setDialogueError("");
  };

  const onUpdateDialogueLineText = (lineIndex: number, text: string) => {
    setDialogueScripts((scripts) => scripts.map((script, scriptIndex) => (
      scriptIndex !== selectedDialogueIndex
        ? script
        : {
          ...script,
          lines: script.lines.map((line, index) => (
            index === lineIndex ? { ...line, text } : line
          )),
        }
    )));
    resetRenderState();
    resetShareState();
  };

  const onUpdateCaptionText = (captionIndex: number, text: string) => {
    if (!selectedScene || selectedScene.audio.status !== "generated") return;
    const nextAudio = updateGeneratedAudioCaptionText(selectedScene.audio, captionIndex, text);
    if (nextAudio === selectedScene.audio) return;

    replaceSelectedScene({
      ...selectedScene,
      audio: nextAudio,
    });
    resetRenderState();
    resetShareState();
    resetSaveState();
  };

  const onGenerateAudio = async () => {
    const script = dialogueScripts[selectedDialogueIndex];
    if (!selectedScene || !script || audioStatus === "loading") return;
    setAudioStatus("loading");
    canvasActions.beginBusy("audio-generation");
    setAudioError("");
    resetRenderState();
    resetShareState();

    try {
      const result = await generateDialogueAudioForScene({
        anonymousId: getCurrentAnonymousId(),
        ...(sceneIds[selectedSceneIndex] ? { sceneId: sceneIds[selectedSceneIndex] } : {}),
        scene: selectedScene,
        script,
      }) as { scene: AdScene };
      resetPreviewPlayback();
      replaceSelectedScene(result.scene);
      setAudioStatus("ready");
      closeDialoguePanel();
      canvasActions.finishBusy();
    } catch (nextError) {
      setAudioStatus("error");
      setAudioError(nextError instanceof Error ? nextError.message : "Audio generation failed.");
      if (dialoguePanelOpen) canvasActions.openModal("dialogue");
      else canvasActions.finishBusy();
    }
  };

  const onUploadAudio = async (file: File | null) => {
    if (!file || !selectedScene || audioStatus === "loading") return;
    if (!file.type.startsWith("audio/")) {
      setAudioStatus("error");
      setAudioError("Choose an audio file.");
      return;
    }

    setAudioStatus("loading");
    canvasActions.beginBusy("audio-upload");
    setAudioError("");
    setDialogueError("");
    resetRenderState();
    resetShareState();

    try {
      const durationMs = await getUploadedAudioDurationMs(file);
      const uploadUrl = await createAudioUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error("Audio upload failed.");

      const uploadResult = await uploadResponse.json() as { storageId?: Id<"_storage"> };
      if (!uploadResult.storageId) throw new Error("Audio upload did not return a stored file.");

      const result = await attachUploadedAudioForScene({
        anonymousId: getCurrentAnonymousId(),
        scene: selectedScene,
        storageId: uploadResult.storageId,
        mimeType: file.type || "application/octet-stream",
        durationMs,
        fileName: file.name,
      }) as { scene: AdScene };

      resetPreviewPlayback();
      replaceSelectedScene(result.scene);
      setAudioStatus("ready");
      closeDialoguePanel();
      canvasActions.finishBusy();
    } catch (nextError) {
      setAudioStatus("error");
      setAudioError(nextError instanceof Error ? nextError.message : "Audio upload failed.");
      if (dialoguePanelOpen) canvasActions.openModal("dialogue");
      else canvasActions.finishBusy();
    }
  };

  const onUploadBackgroundMusic = async (file: File | null) => {
    if (!file || !selectedScene || selectedScene.format !== "visualizer" || backgroundMusicStatus === "loading") return;
    if (!file.type.startsWith("audio/")) {
      setBackgroundMusicStatus("error");
      setBackgroundMusicError("Choose an audio file.");
      return;
    }

    setBackgroundMusicStatus("loading");
    setBackgroundMusicError("");
    resetRenderState();
    resetShareState();

    try {
      const durationMs = await getUploadedAudioDurationMs(file);
      const uploadUrl = await createAudioUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error("Background music upload failed.");

      const uploadResult = await uploadResponse.json() as { storageId?: Id<"_storage"> };
      if (!uploadResult.storageId) throw new Error("Background music upload did not return a stored file.");

      const result = await attachBackgroundMusicToScene({
        scene: selectedScene,
        ...(sceneIds[selectedSceneIndex] ? { sceneId: sceneIds[selectedSceneIndex] } : {}),
        storageId: uploadResult.storageId,
        mimeType: file.type || "application/octet-stream",
        durationMs,
        fileName: file.name,
      }) as { scene: AdScene };

      replaceSelectedScene(result.scene);
      resetSaveState();
      setBackgroundMusicStatus("idle");
    } catch (nextError) {
      setBackgroundMusicStatus("error");
      setBackgroundMusicError(nextError instanceof Error ? nextError.message : "Background music upload failed.");
    }
  };

  const onRemoveBackgroundMusic = async () => {
    if (!selectedScene || selectedScene.format !== "visualizer" || !selectedScene.backgroundMusic || backgroundMusicStatus === "loading") return;

    setBackgroundMusicStatus("loading");
    setBackgroundMusicError("");
    resetRenderState();
    resetShareState();

    try {
      const result = await removeBackgroundMusicFromScene({
        scene: selectedScene,
        ...(sceneIds[selectedSceneIndex] ? { sceneId: sceneIds[selectedSceneIndex] } : {}),
      }) as { scene: AdScene };

      replaceSelectedScene(result.scene);
      resetSaveState();
      setBackgroundMusicStatus("idle");
    } catch (nextError) {
      setBackgroundMusicStatus("error");
      setBackgroundMusicError(nextError instanceof Error ? nextError.message : "Background music removal failed.");
    }
  };

  const onUpdateBackgroundMusicVolume = (volume: number) => {
    if (!selectedScene || selectedScene.format !== "visualizer" || !selectedScene.backgroundMusic) return;
    const safeVolume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0.18));
    if (backgroundMusicRef.current) backgroundMusicRef.current.volume = safeVolume;

    const nextScene: AdScene = {
      ...selectedScene,
      backgroundMusic: {
        ...selectedScene.backgroundMusic,
        volume: safeVolume,
      },
    };

    replaceSelectedScene(nextScene);
    resetSaveState();
    resetRenderState();
    resetShareState();

    if (backgroundMusicVolumeSaveTimeoutRef.current) {
      window.clearTimeout(backgroundMusicVolumeSaveTimeoutRef.current);
    }
    backgroundMusicVolumeSaveTimeoutRef.current = window.setTimeout(() => {
      void updateBackgroundMusicVolumeOnScene({
        scene: nextScene,
        ...(sceneIds[selectedSceneIndex] ? { sceneId: sceneIds[selectedSceneIndex] } : {}),
        volume: safeVolume,
      }).catch((nextError) => {
        setBackgroundMusicStatus("error");
        setBackgroundMusicError(nextError instanceof Error ? nextError.message : "Background music volume update failed.");
      });
    }, 300);
  };

  const onSaveSelectedDesign = async () => {
    if (!selectedScene) return;
    const designId = createSavedDesignId(selectedScene);
    const alreadySaved = savedDesignItems.some((design) => design.id === designId);
    const paid = Boolean(billingStatus?.paid);

    if (!canSaveDesignWithoutPaywall({
      alreadySaved,
      paid,
      savedCount: savedDesignItems.length,
    })) {
      setSaveStatus("idle");
      setSaveError("");
      setModal("paywall");
      return;
    }

    setSaveStatus("loading");
    setSaveError("");

    try {
      await saveDesign({
        anonymousId: getCurrentAnonymousId(),
        scene: selectedScene,
      });
      setSaveStatus("ready");
    } catch (nextError) {
      setSaveStatus("error");
      setSaveError(nextError instanceof Error ? nextError.message : "Could not save this design.");
    }
  };

  const onLoadSavedDesign = (design: SavedAdSceneDesign) => {
    const restored = restoreSavedDesignSelection({
      scenes: adScenes,
      design,
    });
    const renderableEntries = getRenderableSceneEntries(restored.scenes);
    const restoredSceneIndex = renderableEntries.findIndex((entry) => entry.scene === restored.selectedScene);
    const selectedEntry = renderableEntries[restoredSceneIndex >= 0 ? restoredSceneIndex : 0] || null;
    if (!selectedEntry) {
      setError("That saved design uses an older format contract. Generate it again.");
      setAdStatusNote("Saved design could not be loaded because its scene format is out of date.");
      return;
    }

    resetPreviewPlayback();
    setUrl(selectedEntry.scene.brand.url || url);
    setSelectedAdFormat(selectedEntry.scene.format);
    setSelectedCreativePackFormat(isCreativePackFormat(selectedEntry.scene.format) ? selectedEntry.scene.format : null);
    const templateId = getSceneVideoMemeTemplateId(selectedEntry.scene);
    if (templateId) setSelectedVideoMemeTemplateId(templateId);
    setSelectedScene(selectedEntry.scene);
    setSelectedSceneIndex(restoredSceneIndex >= 0 ? restoredSceneIndex : 0);
    setAdScenes(renderableEntries.map((entry) => entry.scene));
    setSceneIds(renderableEntries.map(() => null));
    setAdStatus("ready");
    setAdStatusNote("Saved design loaded. Press spacebar to keep exploring ideas.");
    setAudioStatus(selectedEntry.scene.audio.status === "generated" ? "ready" : "idle");
    setAudioError("");
    setBackgroundMusicStatus("idle");
    setBackgroundMusicError("");
    resetDialogueState();
    resetShareState();
    resetRenderState();
    resetSaveState();
    resetBrickStoryboardState();
    canvasActions.interactionReset();
  };

  const onSelectAdIdea = (scene: AdScene, index: number) => {
    resetPreviewPlayback();
    setSelectedScene(scene);
    setSelectedSceneIndex(index);
    setSelectedCreativePackFormat(isCreativePackFormat(scene.format) ? scene.format : null);
    setAudioStatus(scene.audio.status === "generated" ? "ready" : "idle");
    setAudioError("");
    setBackgroundMusicStatus("idle");
    setBackgroundMusicError("");
    resetDialogueState();
    resetShareState();
    resetRenderState();
    resetBrickStoryboardState();
  };

  const onGenerateBrickStoryboard = async () => {
    const sceneId = sceneIds[selectedSceneIndex];
    if (!selectedScene || selectedScene.format !== "jingle" || selectedScene.audio.status !== "generated" || !sceneId) return;
    setBrickStoryboardStatus("loading");
    setBrickStoryboardError("");

    try {
      const result = await generateBrickStoryboardForScene({
        anonymousId: getCurrentAnonymousId(),
        sceneId,
        scene: selectedScene,
      }) as { storyboardId: Id<"jingleStoryboards">; storyboard: unknown };
      setBrickStoryboardId(result.storyboardId);
      setBrickStoryboard(result.storyboard);
      setBrickStoryboardStatus("ready");
      setBrickStoryboardAnimationStatus("idle");
    } catch (nextError) {
      setBrickStoryboardStatus("error");
      setBrickStoryboardError(getBrickStoryboardErrorMessage(nextError));
    }
  };

  const onRegenerateBrickShot = async (shotIndex: number) => {
    if (!brickStoryboardId || !brickStoryboard || brickStoryboardShotBusyIndex !== null || brickStoryboardVideoBusyIndex !== null) return;
    setBrickStoryboardShotBusyIndex(shotIndex);
    setBrickStoryboardError("");

    try {
      const result = await regenerateBrickShotForScene({
        storyboardId: brickStoryboardId,
        storyboard: brickStoryboard,
        shotIndex,
      }) as { storyboard: unknown };
      setBrickStoryboard(result.storyboard);
      setBrickStoryboardStatus("ready");
      setBrickStoryboardAnimationStatus("idle");
      setBrickStoryboardBuildStatus("idle");
      clearSelectedJingleMusicVideo();
      resetShareState();
      resetRenderState();
      resetSaveState();
    } catch (nextError) {
      setBrickStoryboardError(getBrickStoryboardErrorMessage(nextError));
    } finally {
      setBrickStoryboardShotBusyIndex(null);
    }
  };

  const onRegenerateBrickShotVideo = async (shotIndex: number) => {
    if (!brickStoryboardId || !brickStoryboard || brickStoryboardVideoBusyIndex !== null || brickStoryboardShotBusyIndex !== null) return;
    setBrickStoryboardVideoBusyIndex(shotIndex);
    setBrickStoryboardError("");

    try {
      const result = await regenerateBrickShotVideoForScene({
        storyboardId: brickStoryboardId,
        storyboard: brickStoryboard,
        shotIndex,
      }) as { storyboard: BrickStoryboard };
      setBrickStoryboard(result.storyboard);
      setBrickStoryboardAnimationStatus(result.storyboard.shots.every((shot) => shot.video?.url) ? "ready" : "idle");
      setBrickStoryboardBuildStatus("idle");
      clearSelectedJingleMusicVideo();
      resetShareState();
      resetRenderState();
      resetSaveState();
    } catch (nextError) {
      setBrickStoryboardAnimationStatus("error");
      setBrickStoryboardError(getBrickStoryboardErrorMessage(nextError));
    } finally {
      setBrickStoryboardVideoBusyIndex(null);
    }
  };

  const onAnimateBrickStoryboard = async () => {
    if (!brickStoryboardId || !brickStoryboard || brickStoryboardAnimationStatus === "loading" || brickStoryboardVideoBusyIndex !== null || brickStoryboardShotBusyIndex !== null) return;
    setBrickStoryboardAnimationStatus("loading");
    setBrickStoryboardError("");

    try {
      const result = await animateBrickStoryboardForScene({
        storyboardId: brickStoryboardId,
        storyboard: brickStoryboard,
      }) as { storyboard: unknown; error?: string };
      setBrickStoryboard(result.storyboard);
      if (result.error) {
        setBrickStoryboardAnimationStatus("error");
        setBrickStoryboardError(getBrickStoryboardErrorMessage(new Error(result.error)));
      } else {
        setBrickStoryboardAnimationStatus("ready");
      }
    } catch (nextError) {
      setBrickStoryboardAnimationStatus("error");
      setBrickStoryboardError(getBrickStoryboardErrorMessage(nextError));
    }
  };

  const onBuildBrickMusicVideo = async () => {
    const sceneId = sceneIds[selectedSceneIndex];
    if (!sceneId || !brickStoryboardId || !selectedScene || selectedScene.format !== "jingle" || brickStoryboardBuildStatus === "loading") return;
    if (renderWorkerReadiness && !renderWorkerReadiness.workerHealthy) {
      setBrickStoryboardBuildStatus("error");
      setBrickStoryboardError("Render worker is offline. Start `npm run dev` from the repo root so the music video stitcher can run.");
      return;
    }
    setBrickStoryboardBuildStatus("loading");
    setBrickStoryboardError("");

    try {
      const result = await buildBrickMusicVideoForScene({
        sceneId,
        storyboardId: brickStoryboardId,
      }) as { scene: AdScene; storyboard: unknown };
      setSelectedScene(result.scene);
      setAdScenes((scenes) => scenes.map((scene, index) => (
        index === selectedSceneIndex ? result.scene : scene
      )));
      setBrickStoryboard(result.storyboard);
      resetShareState();
      resetRenderState();
      resetSaveState();
      setBrickStoryboardBuildStatus("loading");
    } catch (nextError) {
      setBrickStoryboardBuildStatus("error");
      setBrickStoryboardError(getBrickStoryboardErrorMessage(nextError));
    }
  };

  const updateSelectedThreeDScene = (nextScene: ThreeDBreakdownAdScene) => {
    setSelectedScene(nextScene);
    setAdScenes((scenes) => scenes.map((scene, index) => (
      index === selectedSceneIndex ? nextScene : scene
    )));
    resetShareState();
    resetRenderState();
    resetSaveState();
  };

  const onThreeDScriptBeatChanged = (beatIndex: number, narration: string) => {
    if (!selectedThreeDScene) return;
    const hadGeneratedAudio = selectedThreeDScene.audio.status === "generated";
    updateSelectedThreeDScene(editThreeDBreakdownScriptBeat(selectedThreeDScene, beatIndex, narration));
    if (hadGeneratedAudio) resetAudioState();
  };

  const onThreeDMediaPromptChanged = (target: ThreeDBreakdownMediaPromptTarget, prompt: string) => {
    if (!selectedThreeDScene) return;
    updateSelectedThreeDScene(editThreeDBreakdownMediaPrompt(selectedThreeDScene, target, prompt));
  };

  const selectedThreeDScene = selectedScene?.format === "three-d-breakdown" ? selectedScene : null;
  const showThreeDStoryDirectionStage = selectedAdFormat === "three-d-breakdown" && status !== "loading" && Boolean(result?.researchRunId) && (
    !selectedThreeDScene
    || threeDStoryDirectionStatus !== "idle"
    || threeDStoryDirections.length > 0
  );
  const selectedThreeDPresenterStyle = selectedThreeDScene?.layout.storyContract.visualStyle === "presenter-teardown-vsl";
  const selectedThreeDStoryboardBoardReady = selectedThreeDScene?.layout.storyboardBoard?.image?.status === "ready";
  const selectedThreeDStoryboardFrames = selectedThreeDScene?.layout.storyboardBoard?.frames || [];
  const selectedThreeDClipPlans = selectedThreeDScene?.layout.clipPlans || [];
  const selectedThreeDRequiredFrameIndexes = Array.from(new Set(
    selectedThreeDClipPlans
      .flatMap((clipPlan) => [clipPlan.frameIndexes[0], clipPlan.frameIndexes.at(-1)])
      .filter(Boolean),
  ));
  const selectedThreeDRequiredFrames = selectedThreeDRequiredFrameIndexes.length
    ? selectedThreeDStoryboardFrames.filter((frame) => selectedThreeDRequiredFrameIndexes.includes(frame.frameIndex))
    : selectedThreeDStoryboardFrames;
  const selectedThreeDStoryboardFramesReady = selectedThreeDRequiredFrames.length > 0
    && selectedThreeDRequiredFrames.every((frame) => frame.image?.status === "ready");
  const selectedThreeDStoryboardFramesFailed = selectedThreeDStoryboardFrames.some((frame) => frame.image?.status === "failed")
    || selectedThreeDScene?.layout.storyboardBoard?.image?.status === "failed";
  const selectedThreeDClipsFailed = selectedThreeDClipPlans.some((clipPlan) => clipPlan.video?.status === "failed");
  const selectedThreeDClipsReady = selectedThreeDClipPlans.length > 0
    && selectedThreeDClipPlans.every((clipPlan) => clipPlan.video?.status === "ready");
  const threeDImageStatus: ThreeDMediaUiStatus = threeDImageBusyIndex !== null
    ? "loading"
    : selectedThreeDStoryboardFramesReady
      ? "ready"
      : selectedThreeDStoryboardFramesFailed
        ? "error"
        : "idle";
  const threeDAnimationStatus: ThreeDMediaUiStatus = selectedThreeDClipsFailed
    ? "error"
    : threeDClipBusyIndex !== null
      ? "loading"
      : selectedThreeDClipsReady
        ? "ready"
        : selectedThreeDStoryboardFramesReady
          ? "idle"
          : "idle";
  const getThreeDErrorFromScene = (scene: ThreeDBreakdownAdScene) => (
    (scene.layout.storyboardBoard?.image?.status === "failed" ? scene.layout.storyboardBoard.image.error : "")
    || scene.layout.storyboardBoard?.frames?.find((frame) => frame.image?.status === "failed")?.image?.error
    || scene.layout.clipPlans?.find((clipPlan) => clipPlan.video?.status === "failed")?.video?.error
    || ""
  );
  const onGenerateThreeDImages = async (
    modeOverride?: "storyboard" | "anchors" | `anchor-${ThreeDBreakdownStoryboardFrameIndex}` | "all",
  ) => {
    const sceneId = selectedSceneId;
    if (!selectedScene || selectedScene.format !== "three-d-breakdown" || threeDImageStatus === "loading") return;
    if (!sceneId) {
      setThreeDError("This 3D Breakdown scene is still syncing. Wait a moment and try again.");
      return;
    }
    setThreeDImageBusyIndex(threeDAllShotsBusyIndex);
    setThreeDError("");
    resetShareState();
    resetRenderState();
    resetSaveState();
    try {
      const mode = modeOverride || (selectedThreeDPresenterStyle
        ? selectedThreeDStoryboardBoardReady && !selectedThreeDStoryboardFramesReady
          ? "anchors"
          : "storyboard"
        : "all");
      const result = await generateThreeDImagesForScene({
        sceneId,
        scene: selectedScene,
        mode,
      }) as { scene: ThreeDBreakdownAdScene };
      updateSelectedThreeDScene(result.scene);
      setThreeDError(getThreeDErrorFromScene(result.scene));
    } catch (nextError) {
      setThreeDError(nextError instanceof Error ? nextError.message : "3D image generation failed.");
    } finally {
      setThreeDImageBusyIndex(null);
    }
  };

  const onGenerateThreeDClip = async (clipIndex: ThreeDBreakdownClipIndex) => {
    const sceneId = selectedSceneId;
    if (!selectedScene || selectedScene.format !== "three-d-breakdown" || threeDClipBusyIndex !== null) return;
    if (!sceneId) {
      setThreeDError("This 3D Breakdown scene is still syncing. Wait a moment and try again.");
      return;
    }
    const clipPlans = selectedScene.layout.clipPlans || [];
    if (clipIndex > 1) {
      const previousClipIndex = (clipIndex - 1) as ThreeDBreakdownClipIndex;
      const previousClipReady = clipPlans.some((clipPlan) => clipPlan.clipIndex === previousClipIndex && clipPlan.video?.status === "ready");
      if (!previousClipReady) {
        setThreeDError(`Generate 3D Breakdown clip ${previousClipIndex} before clip ${clipIndex}.`);
        return;
      }
    }
    if (!clipPlans.some((clipPlan) => clipPlan.clipIndex === clipIndex)) {
      setThreeDError(`3D Breakdown clip ${clipIndex} is not planned.`);
      return;
    }
    setThreeDClipBusyIndex(clipIndex);
    setThreeDError("");
    resetShareState();
    resetRenderState();
    resetSaveState();
    try {
      const result = await generateThreeDClipForScene({
        sceneId,
        scene: selectedScene,
        clipIndex,
      }) as { scene: ThreeDBreakdownAdScene };
      updateSelectedThreeDScene(result.scene);
      setThreeDError(getThreeDErrorFromScene(result.scene));
    } catch (nextError) {
      setThreeDError(nextError instanceof Error ? nextError.message : "3D clip generation failed.");
    } finally {
      setThreeDClipBusyIndex(null);
    }
  };

  const onUseThreeDStoryDirection = (direction: ThreeDBreakdownStoryDirection) => {
    const reusableResearch = result?.researchRunId
      ? {
        researchRunId: result.researchRunId,
        facts: getWebsiteSubmitProgressFacts(result),
        result,
      }
      : getReusableResearchForUrl(url);
    if (!reusableResearch) {
      setThreeDStoryDirectionStatus("error");
      setThreeDStoryDirectionError("Run website research before choosing a 3D story direction.");
      return;
    }
    setSelectedThreeDStoryDirectionId(direction.directionId);
    setThreeDStoryDirectionStatus("loading");
    setThreeDStoryDirectionError("");
    setError("");
    void generateScenesOnly(
      reusableResearch,
      "three-d-breakdown",
      selectedVideoMemeTemplateId,
      {
        loadingNote: `Writing the 3D script for: ${direction.hookLine}`,
        note: "3D script ready. Generate frames only when you're ready to spend on media.",
        threeDStoryDirection: direction,
        threeDStorySubject: threeDStorySubject || undefined,
      },
    );
  };

  const onChooseThreeDStorySubject = (storySubject: ThreeDBreakdownStorySubject) => {
    const reusableResearch = result?.researchRunId
      ? {
        researchRunId: result.researchRunId,
        facts: getWebsiteSubmitProgressFacts(result),
        result,
      }
      : getReusableResearchForUrl(url);
    if (!reusableResearch) {
      setThreeDStoryDirectionStatus("error");
      setThreeDStoryDirectionError("Run website research before choosing what this 3D Breakdown is about.");
      return;
    }
    setThreeDStorySubject(storySubject);
    void generateScenesOnly(
      reusableResearch,
      "three-d-breakdown",
      selectedVideoMemeTemplateId,
      { threeDStorySubject: storySubject },
    );
  };

  const generateProductPhotoshootBoard = async ({
    productHandle,
    researchResult,
  }: {
    productHandle?: string;
    researchResult?: StoredWebsiteResearchResult | null;
  } = {}) => {
    const activeResult = researchResult || result;
    const activeProductHandle = productHandle || selectedPhotoshootProductHandle || getDefaultPhotoshootProductHandle(activeResult?.productCatalog);
    if (productPhotoshootStatus === "loading") return;
    if (!activeResult?.researchRunId || !activeProductHandle) {
      const message = getProductPhotoshootSetupError(activeResult);
      if (activeResult) {
        rememberResearchForReuse(activeResult);
        setResult(activeResult);
        setUrl(activeResult.websiteUrl);
        setPendingProgressFacts(getWebsiteSubmitProgressFacts(activeResult));
      }
      setStatus(activeResult?.researchRunId ? "ready" : "error");
      setAdStatus("error");
      setAdStatusNote(message);
      setProductPhotoshootStatus("error");
      setProductPhotoshootError(message);
      setError(message);
      clearSubmitProgress();
      canvasActions.finishBusy();
      return;
    }

    rememberResearchForReuse(activeResult);
    setResult(activeResult);
    setUrl(activeResult.websiteUrl);
    setSelectedPhotoshootProductHandle(activeProductHandle);
    setStatus("ready");
    setAdStatus("loading");
    setProgressStage("writing-ads");
    setPendingProgressFacts(getWebsiteSubmitProgressFacts(activeResult));
    setShowSlowResearchMessage(false);
    setAdStatusNote("Generating product assets from the selected product reference.");
    canvasActions.beginBusy("product-photoshoot");
    setProductPhotoshootStatus("loading");
    setProductPhotoshootError("");
    setProductPhotoshootId(null);
    setProductPhotoshoot(null);

    try {
      const nextResult = await generateProductPhotoshootForResearch({
        anonymousId: getCurrentAnonymousId(),
        researchRunId: activeResult.researchRunId as Id<"researchRuns">,
        productHandle: activeProductHandle,
      }) as { photoshootId: Id<"productPhotoshoots">; board: ProductPhotoshootBoard };
      setProductPhotoshootId(nextResult.photoshootId);
      setProductPhotoshoot(nextResult.board);
      setProductPhotoshootStatus("ready");
      setAdStatus("ready");
      setAdStatusNote("Product photoshoot ready. Regenerate individual shots or download the assets you like.");
      clearSubmitProgress();
      canvasActions.finishBusy();
    } catch (nextError) {
      if (!hasUsableProductPhotoshootBoard(productPhotoshoot)) {
        setProductPhotoshootId(null);
        setProductPhotoshoot(null);
      }
      setProductPhotoshootStatus("error");
      setAdStatus("error");
      setProductPhotoshootError(getProductPhotoshootErrorMessage(nextError));
      setError(getProductPhotoshootErrorMessage(nextError));
      clearSubmitProgress();
      canvasActions.finishBusy();
    }
  };

  const onGenerateProductPhotoshoot = async () => {
    await generateProductPhotoshootBoard();
  };

  const onRegenerateProductPhotoShot = async (shotIndex: number) => {
    if (!productPhotoshootId || !productPhotoshoot || productPhotoshootShotBusyIndex !== null) return;
    setProductPhotoshootShotBusyIndex(shotIndex);
    setProductPhotoshootError("");

    try {
      const nextResult = await regenerateProductPhotoShotForBoard({
        photoshootId: productPhotoshootId,
        board: productPhotoshoot,
        shotIndex,
      }) as { board: ProductPhotoshootBoard };
      setProductPhotoshoot(nextResult.board);
      setProductPhotoshootStatus("ready");
    } catch (nextError) {
      setProductPhotoshootError(getProductPhotoshootErrorMessage(nextError));
    } finally {
      setProductPhotoshootShotBusyIndex(null);
    }
  };

  const onRegenerateFailedProductPhotoShots = async () => {
    if (!productPhotoshootId || !productPhotoshoot || productPhotoshootShotBusyIndex !== null) return;
    const failedShotIndexes = productPhotoshoot.shots
      .filter((shot) => shot.status === "failed")
      .map((shot) => shot.shotIndex);
    if (!failedShotIndexes.length) return;

    setProductPhotoshootError("");
    let nextBoard = productPhotoshoot;

    try {
      for (const shotIndex of failedShotIndexes) {
        setProductPhotoshootShotBusyIndex(shotIndex);
        const nextResult = await regenerateProductPhotoShotForBoard({
          photoshootId: productPhotoshootId,
          board: nextBoard,
          shotIndex,
        }) as { board: ProductPhotoshootBoard };
        nextBoard = nextResult.board;
        setProductPhotoshoot(nextBoard);
      }
      setProductPhotoshootStatus("ready");
    } catch (nextError) {
      setProductPhotoshootError(getProductPhotoshootErrorMessage(nextError));
    } finally {
      setProductPhotoshootShotBusyIndex(null);
    }
  };

  const onCreateRenderJob = async () => {
    if (!selectedScene) return;
    if (renderWorkerReadiness && !renderWorkerReadiness.workerHealthy) {
      setRenderStatus("error");
      setRenderError("Render worker is offline. Start `npm run dev` from the repo root so downloads can render.");
      return;
    }

    setRenderStatus("loading");
    canvasActions.beginBusy("render");
    setRenderJobId(null);
    setRenderError("");

    try {
      const job = await createRenderJob({
        anonymousId: getCurrentAnonymousId(),
        rendererVersion: getClientRendererVersion(),
        scene: selectedScene,
      }) as { renderJobId: Id<"renderJobs"> };
      setRenderJobId(job.renderJobId);
      setRenderStatus("queued");
    } catch (nextError) {
      setRenderStatus("error");
      setRenderError(nextError instanceof Error ? nextError.message : "Video render failed to start.");
      canvasActions.finishBusy();
    }
  };

  const onDownloadStaticPng = async () => {
    if (!selectedScene || !staticPngFormats.has(selectedScene.format) || staticPngDownloadBusy) return;

    const targetSelector = selectedScene.format === "meme"
      ? "[data-meme-artboard]"
      : `[data-render-surface="ad"][data-format="${selectedScene.format}"]`;
    const artboard = createEditorScopeRef.current?.querySelector<HTMLElement>(targetSelector);
    if (!artboard) {
      setRenderStatus("error");
      setRenderError("Could not find the static ad canvas to download.");
      return;
    }

    setStaticPngDownloadBusy(true);
    setRenderError("");

    try {
      await document.fonts?.ready;
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const dataUrl = await toPng(artboard, {
        cacheBust: true,
        pixelRatio: 3,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${slugifyDownloadName(`${selectedScene.brand.name}-${selectedScene.creative.headline}`)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (nextError) {
      setRenderError(nextError instanceof Error ? nextError.message : "PNG download failed.");
    } finally {
      setStaticPngDownloadBusy(false);
    }
  };

  const currentRenderStatus = renderJob?.status || renderStatus;
  const renderWorkerHealthy = renderWorkerReadiness?.workerHealthy ?? null;
  const renderProgress = renderJob?.progress ?? (renderStatus === "loading" ? 2 : 0);
  const renderDownloadUrl = renderJob?.downloadUrl || "";
  const renderStatusLabel = currentRenderStatus === "ready"
    ? "Video ready"
    : currentRenderStatus === "failed" || currentRenderStatus === "error"
      ? "Video render failed"
      : renderWorkerHealthy === false
        ? "Renderer offline"
      : currentRenderStatus === "queued" || currentRenderStatus === "claimed"
        ? "Queued for render"
        : currentRenderStatus === "rendering"
          ? `Rendering ${renderProgress}%`
          : "Download video";
  const selectedAudio = selectedScene?.audio.status === "generated" ? selectedScene.audio : null;
  const selectedMotionStoryMusicUrl = selectedScene?.format === "motion-story" ? selectedScene.layout.musicBed.src : "";
  const selectedBackgroundMusic = selectedScene?.backgroundMusic || null;
  const hasGeneratedAudio = Boolean(selectedAudio || selectedMotionStoryMusicUrl);
  const playableAudioUrl = selectedFinalVideoUrl ? "" : selectedAudio?.url || selectedMotionStoryMusicUrl;
  const generatedCaptions = selectedAudio?.captions || [];
  const hasEmptyEditedCaption = generatedCaptions.some((caption) => !caption.text.trim());
  const selectedDialogueScript = dialogueScripts[selectedDialogueIndex] || null;
  const dialogueCanGenerateAudio = Boolean(selectedScene && selectedDialogueScript && selectedDialogueScript.lines.some((line) => line.text.trim()));
  const selectedSavedDesignId = selectedScene ? createSavedDesignId(selectedScene) : "";
  const selectedDesignIsSaved = Boolean(selectedSavedDesignId && savedDesignItems.some((design) => design.id === selectedSavedDesignId));
  const saveCounterLabel = billingStatus?.paid
    ? ""
    : `(${Math.min(savedDesignItems.length, FREE_SAVED_DESIGN_LIMIT)}/${FREE_SAVED_DESIGN_LIMIT})`;
  const saveStatusLabel = saveStatus === "loading"
    ? "Saving"
    : saveStatus === "ready" || selectedDesignIsSaved
      ? "Saved"
      : "Save";
  const renderBusy = currentRenderStatus === "loading"
    || currentRenderStatus === "queued"
    || currentRenderStatus === "claimed"
    || currentRenderStatus === "rendering";
  const selectedSceneForCanvas: AdScene | null = selectedThreeDScene
    && renderJob?.status === "ready"
    && renderJob.downloadUrl
    && renderJob.outputStorageId
    ? {
      ...selectedThreeDScene,
      layout: {
        ...selectedThreeDScene.layout,
        finalVideo: {
          status: "ready" as const,
          url: renderJob.downloadUrl,
          storageId: String(renderJob.outputStorageId),
          mimeType: "video/mp4",
          durationMs: selectedThreeDScene.layout.durationMs,
        },
      },
    }
    : selectedScene;
  const selectedSceneMatchesActiveFormat = selectedScene?.format === selectedAdFormat;
  const selectedSceneForActiveFormat = selectedSceneMatchesActiveFormat ? selectedScene : null;
  const selectedSceneForActiveCanvas = selectedSceneForCanvas?.format === selectedAdFormat ? selectedSceneForCanvas : null;
  const selectedThreeDFinalVideoReady = selectedSceneForActiveCanvas?.format === "three-d-breakdown"
    && selectedSceneForActiveCanvas.layout.finalVideo?.status === "ready";
  const showThreeDProgressCanvas = selectedAdFormat === "three-d-breakdown" && !selectedThreeDFinalVideoReady;
  const threeDProgress = getThreeDBreakdownProgress({
    show: showThreeDProgressCanvas,
    hasScene: Boolean(selectedThreeDScene),
    storyDirectionCount: threeDStoryDirections.length,
    storyDirectionStatus: threeDStoryDirectionStatus,
    storyboardReady: selectedThreeDStoryboardBoardReady,
    framesReady: selectedThreeDStoryboardFramesReady,
    imageStatus: threeDImageStatus,
    clipsReady: selectedThreeDClipsReady,
    voiceReady: selectedThreeDScene?.audio.status === "generated",
    animationStatus: threeDAnimationStatus,
    audioStatus,
    renderBusy,
    renderFailed: currentRenderStatus === "failed" || currentRenderStatus === "error",
    renderStatusLabel,
  });
  const adGenerationStatusLabel = selectedAdFormat === "three-d-breakdown" && adStatus === "loading" && progressStage === "writing-ads"
    ? getThreeDBreakdownLoadingLabel(adGenerationElapsedSeconds)
    : "";
  const selectedFormatLabel = CREATE_FORMAT_GUIDES[selectedAdFormat].label;
  const previewBusyLabel = status === "loading"
    ? `Reading your brand for ${selectedFormatLabel}`
    : adStatus === "loading"
      ? adGenerationStatusLabel || `Building ${selectedFormatLabel}`
      : audioStatus === "loading"
        ? "Making audio"
        : renderBusy
          ? renderStatusLabel
          : staticPngDownloadBusy
            ? "Making PNG"
            : "";
  const previewBusyHidesScene = Boolean(previewBusyLabel) && (
    status === "loading" ||
    (adStatus === "loading" && selectedSceneForCanvas?.format !== selectedAdFormat)
  );
  const productPhotoshootMode = selectedAdFormat === PRODUCT_PHOTOSHOOT_FORMAT;
  const canGenerateProductPhotoshoot = Boolean(
    result?.researchRunId &&
    selectedPhotoshootProductHandle &&
    result.productCatalog?.products.some((product) => product.handle === selectedPhotoshootProductHandle && product.imageUrl),
  );
  useEffect(() => {
    if (currentRenderStatus === "ready" || currentRenderStatus === "failed" || currentRenderStatus === "error") {
      canvasActions.finishBusy();
    }
    if (
      currentRenderStatus === "ready" &&
      selectedScene?.format === "three-d-breakdown" &&
      renderJob?.renderJobId &&
      shareResetRenderJobRef.current !== String(renderJob.renderJobId)
    ) {
      shareResetRenderJobRef.current = String(renderJob.renderJobId);
      resetShareState();
    }
  }, [canvasActions, currentRenderStatus, renderJob?.renderJobId, selectedScene?.format]);

  return (
    <div
      ref={createEditorScopeRef}
      className="create-desktop-fit-shell min-h-screen overflow-x-hidden bg-[#F7F4EA] px-3 py-4 font-sans text-slate-950 sm:px-6 md:px-10"
      data-create-editor-scope="true"
    >
      {paywallOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl shadow-slate-950/30">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Wiggly beta pass</p>
                <h2 className="mt-2 text-3xl font-black leading-tight">Loving Wiggly?</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setCheckoutError("");
                }}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                aria-label="Close paywall"
              >
                x
              </button>
            </div>
            <p className="text-sm font-semibold leading-6 text-slate-600">
              You hit a free limit. Start with 7 days of unlimited Wiggly for $1. After that, keep unlimited access for $9/month as an early user, 50% off the normal $19.95.
            </p>
            <button
              type="button"
              onClick={() => void startCheckout()}
              disabled={checkoutLoading}
              className="mt-6 flex h-13 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-base font-black text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800 disabled:cursor-progress disabled:opacity-70"
            >
              {checkoutLoading ? "Starting checkout..." : "Start unlimited for $1"}
            </button>
            {checkoutError ? (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-5 text-rose-700">
                {checkoutError} Email me at buildwithshaz@gmail.com and I will get you unstuck.
              </p>
            ) : null}
            <p className="mt-3 text-center text-xs font-bold text-slate-400">$1 today, then $9/month after 7 days. Cancel anytime in Stripe.</p>
            <p className="mt-2 text-center text-xs font-semibold text-slate-400">
              If anything gets weird or you have ideas, email me directly: buildwithshaz@gmail.com.
            </p>
          </div>
        </div>
      ) : null}
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <img
            src="/wiggly-wordmark-3d-crop.png"
            alt="Wiggly"
            className="h-16 w-auto rounded-xl object-contain"
          />
          <p className="mt-1 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
            Ads without the hard part
          </p>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1500px] items-start gap-8 py-5 sm:gap-10 sm:py-6 lg:min-h-[calc(100vh-5.5rem)] lg:grid-cols-[minmax(300px,0.62fr)_minmax(760px,1.38fr)] lg:gap-8">
        <div>
          <CreateLeftColumn
            adScenesCount={selectedSceneMatchesActiveFormat ? adScenes.length : 0}
            adStatus={adStatus}
            creativePackGroups={creativePackGroups}
            creativePackStatus={creativePackStatus}
            selectedCreativePackFormat={selectedCreativePackFormat}
            error={error}
            format={selectedAdFormat}
            memeModel={selectedMemeModel}
            productCatalog={result ? result.productCatalog || null : undefined}
            selectedReviewProductHandles={selectedReviewProductHandles}
            jingleStyleId={selectedJingleStyleId}
            videoMemeTemplateId={selectedVideoMemeTemplateId}
            visualizerModel={selectedVisualizerModel}
            onFormatChange={onFormatChange}
            onGenerateCreativePack={() => void onGenerateCreativePack()}
            onCancelCreativePack={onCancelCreativePack}
            onCreativePackGroupRetry={(format) => void retryCreativePackGroup(format)}
            onCreativePackGroupSelect={selectCreativePackGroup}
            onJingleStyleChange={setSelectedJingleStyleId}
            onMemeModelChange={setSelectedMemeModel}
            onReviewProductSelectionChange={(handles) => setSelectedReviewProductHandles(normalizeReviewProductHandles(handles))}
            onVideoMemeTemplateChange={onVideoMemeTemplateChange}
            onVisualizerModelChange={setSelectedVisualizerModel}
            onSubmit={onSubmit}
            onUrlChange={(nextUrl) => {
              setUrl(nextUrl);
              setSelectedReviewProductHandles([]);
              setSelectedPhotoshootProductHandle("");
              setCreativePackStatus("idle");
              setCreativePackGroups([]);
              setSelectedCreativePackFormat(null);
              setCreativePackMoneyShotActive(false);
              creativePackUserSelectedRef.current = false;
              creativePackMoneyShotTriggeredRef.current = false;
              resetProductPhotoshootState();
            }}
            adGenerationStatusLabel={adGenerationStatusLabel}
            progressFacts={pendingProgressFacts}
            progressStage={progressStage}
            showSlowResearchMessage={showSlowResearchMessage}
            status={status}
            url={url}
          />
        </div>

        <div className="relative space-y-4">
          {productPhotoshootMode ? (
            <CreateProductPhotoshootWorkspace
              board={productPhotoshoot}
              canGenerate={canGenerateProductPhotoshoot}
              catalog={result?.productCatalog}
              error={productPhotoshootError}
              onGenerate={() => void onGenerateProductPhotoshoot()}
              onRegenerateFailedShots={() => void onRegenerateFailedProductPhotoShots()}
              onRegenerateShot={(shotIndex) => void onRegenerateProductPhotoShot(shotIndex)}
              onSelectedProductChange={setSelectedPhotoshootProductHandle}
              selectedProductHandle={selectedPhotoshootProductHandle}
              shotBusyIndex={productPhotoshootShotBusyIndex}
              status={productPhotoshootStatus}
            />
          ) : (
          <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[minmax(260px,420px)_minmax(260px,1fr)]">
            <CreateCanvasColumn
              adScenesCount={selectedSceneMatchesActiveFormat ? adScenes.length : 0}
              isAudioPlaying={isAudioPlaying}
              onFinalVideoElement={onFinalVideoElement}
              onOpenAudioPanel={onOpenAudioPanel}
              onPreviewTimeChange={setPreviewTimeSeconds}
              onRerollScene={onRerollScene}
              placeholderVariantIndex={placeholderVariantIndex}
              previewBusyLabel={previewBusyLabel}
              previewBusyHidesScene={previewBusyHidesScene}
              previewPlatform={previewPlatform}
              previewTimeSeconds={previewTimeSeconds}
              rerollBusy={status === "loading" || adStatus === "loading" || audioStatus === "loading"}
              rerollCount={rerollCount}
              rerollFlash={rerollFlash}
              result={previewBusyHidesScene ? null : result}
              selectedScene={previewBusyHidesScene ? null : selectedSceneForActiveCanvas}
              threeDProgress={threeDProgress}
            />

            <aside
              aria-hidden={previewBusyHidesScene}
              className={`space-y-4 transition-opacity ${previewBusyHidesScene ? "pointer-events-none opacity-0" : "opacity-100"}`}
              data-create-workspace-stale-content={previewBusyHidesScene ? "hidden" : "visible"}
            >
              <CreateQuickActions
                currentRenderStatus={currentRenderStatus}
                hasSelectedScene={Boolean(selectedSceneForActiveFormat)}
                isAudioPlaying={isAudioPlaying}
                onAnimateBrickStoryboard={() => void onAnimateBrickStoryboard()}
                onBuildBrickMusicVideo={() => void onBuildBrickMusicVideo()}
                onCreateRenderJob={() => void onCreateRenderJob()}
                onCreateShareLink={() => void onCreateShareLink()}
                onDownloadStaticPng={() => void onDownloadStaticPng()}
                onGenerateBrickStoryboard={() => void onGenerateBrickStoryboard()}
                onGenerateThreeDClip={(clipIndex) => void onGenerateThreeDClip(clipIndex)}
                onGenerateThreeDImages={(mode) => void onGenerateThreeDImages(mode)}
                onRegenerateBrickShot={(shotIndex) => void onRegenerateBrickShot(shotIndex)}
                onRegenerateBrickShotVideo={(shotIndex) => void onRegenerateBrickShotVideo(shotIndex)}
                onRegenerateVisualizerAudio={onRegenerateVisualizerAudio}
                onLoadSavedDesign={onLoadSavedDesign}
                onOpenAudioPanel={onOpenAudioPanel}
                onSaveSelectedDesign={() => void onSaveSelectedDesign()}
                onThreeDMediaPromptChanged={onThreeDMediaPromptChanged}
                onThreeDScriptBeatChanged={onThreeDScriptBeatChanged}
                onTogglePreviewPlayback={onTogglePreviewPlayback}
                audioStatus={audioStatus}
                playableAudioUrl={selectedSceneMatchesActiveFormat ? playableAudioUrl : ""}
                renderBusy={renderBusy}
                renderDownloadUrl={selectedFinalVideoUrl || renderDownloadUrl}
                renderErrorMessage={renderJob?.error || renderError}
                renderStatusLabel={renderStatusLabel}
                renderWorkerHealthy={renderWorkerHealthy}
                audioError={audioError}
                brickStoryboard={brickStoryboard}
                brickStoryboardAnimationStatus={brickStoryboardAnimationStatus}
                brickStoryboardBuildStatus={brickStoryboardBuildStatus}
                brickStoryboardError={brickStoryboardError}
                brickStoryboardShotBusyIndex={brickStoryboardShotBusyIndex}
                brickStoryboardVideoBusyIndex={brickStoryboardVideoBusyIndex}
                brickStoryboardStatus={brickStoryboardStatus}
                canGenerateBrickStoryboard={Boolean(
                  selectedScene?.format === "jingle" &&
                  selectedScene.audio.status === "generated" &&
                  sceneIds[selectedSceneIndex],
                )}
                threeDAnimationStatus={threeDAnimationStatus}
                threeDClipBusyIndex={threeDClipBusyIndex}
                threeDError={threeDError}
                threeDImageStatus={threeDImageStatus}
                threeDScene={selectedSceneMatchesActiveFormat ? selectedThreeDScene : null}
                threeDStorySlateActive={showThreeDStoryDirectionStage}
                threeDStoryDirectionError={threeDStoryDirectionError}
                threeDStoryDirections={threeDStoryDirections}
                threeDStoryDirectionStatus={threeDStoryDirectionStatus}
                threeDStorySubject={threeDStorySubject}
                staticPngDownloadBusy={staticPngDownloadBusy}
                onSelectThreeDStoryDirection={setSelectedThreeDStoryDirectionId}
                onUseThreeDStoryDirection={onUseThreeDStoryDirection}
                onChooseThreeDStorySubject={onChooseThreeDStorySubject}
                productCatalog={result?.productCatalog}
                saveCounterLabel={saveCounterLabel}
                saveError={saveError}
                savedDesigns={savedDesignItems}
                saveStatus={saveStatus}
                saveStatusLabel={saveStatusLabel}
                selectedFormat={selectedSceneForActiveFormat?.format || (isAdSceneCreateFormat(selectedAdFormat) ? selectedAdFormat : null)}
                selectedThreeDStoryDirectionId={selectedThreeDStoryDirectionId}
                selectedDesignIsSaved={selectedDesignIsSaved}
                shareError={shareError}
                shareStatus={shareStatus}
                shareUrl={shareUrl}
              />

              {playableAudioUrl ? (
                <audio
                  ref={audioRef}
                  aria-label="Audio preview"
                  className="hidden"
                  preload="metadata"
                  src={playableAudioUrl}
                  onPlay={() => {
                    setIsAudioPlaying(true);
                    canvasActions.playbackStarted();
                    const backgroundMusic = backgroundMusicRef.current;
                    if (backgroundMusic) {
                      backgroundMusic.volume = selectedBackgroundMusic?.volume ?? 0.18;
                      backgroundMusic.currentTime = audioRef.current?.currentTime && backgroundMusic.duration
                        ? audioRef.current.currentTime % backgroundMusic.duration
                        : 0;
                      void backgroundMusic.play();
                    }
                  }}
                  onPause={(event) => {
                    setIsAudioPlaying(false);
                    canvasActions.playbackStopped();
                    backgroundMusicRef.current?.pause();
                    setPreviewTimeSeconds(event.currentTarget.currentTime || 1.1);
                  }}
                  onTimeUpdate={(event) => {
                    setPreviewTimeSeconds(event.currentTarget.currentTime);
                  }}
                  onEnded={() => {
                    setIsAudioPlaying(false);
                    canvasActions.playbackStopped();
                    if (audioRef.current) audioRef.current.currentTime = 0;
                    if (backgroundMusicRef.current) {
                      backgroundMusicRef.current.pause();
                      backgroundMusicRef.current.currentTime = 0;
                    }
                    setPreviewTimeSeconds(1.1);
                  }}
                />
              ) : null}

              {selectedBackgroundMusic ? (
                <audio
                  ref={backgroundMusicRef}
                  aria-label="Background music preview"
                  className="hidden"
                  loop
                  preload="metadata"
                  src={selectedBackgroundMusic.url}
                />
              ) : null}

              {!showThreeDStoryDirectionStage ? (
                <CreateControlPanel
                  activePanel={activeCreatePanel}
                  audioStatus={audioStatus}
                  backgroundMusicError={backgroundMusicError}
                  backgroundMusicStatus={backgroundMusicStatus}
                  hasGeneratedAudio={hasGeneratedAudio}
                  hasSelectedScene={Boolean(selectedSceneForActiveFormat)}
                  onOpenAudioPanel={onOpenAudioPanel}
                  onOpenCaptionEditor={openCaptionPanel}
                  onRemoveBackgroundMusic={onRemoveBackgroundMusic}
                  onUpdateBackgroundMusicVolume={onUpdateBackgroundMusicVolume}
                  onUploadBackgroundMusic={(file) => void onUploadBackgroundMusic(file)}
                  onPanelChange={(panel) => {
                    if (panel) canvasActions.openPanel(panel);
                    else canvasActions.closePanel();
                  }}
                  onPreviewPlatformChange={setPreviewPlatform}
                  onUpdateCreativeField={onUpdateCreativeField}
                  onUpdateStyleColor={onUpdateStyleColor}
                  onUpdateFormatPreset={onUpdateFormatPreset}
                  previewPlatform={previewPlatform}
                  selectedScene={selectedSceneForActiveFormat}
                />
              ) : null}

              <CreateCreativeBriefCard
                onOpenDetails={openBrandDetails}
                result={result}
              />
            </aside>
          </div>
          )}
        </div>
      </section>

      {!productPhotoshootMode ? (
      <div className="mx-auto max-w-7xl pb-14">
        {!previewBusyHidesScene && selectedSceneMatchesActiveFormat && !showThreeDStoryDirectionStage ? (
          <CreateIdeasList
            scenes={adScenes}
            selectedSceneIndex={selectedSceneIndex}
            onSelectScene={onSelectAdIdea}
          />
        ) : null}
      </div>
      ) : null}

      {result && brandDetailsOpen ? (
        <BrandDumpModal
          result={result}
          onClose={closeBrandDetails}
        />
      ) : null}

      {dialoguePanelOpen ? (
        <CreateDialogueModal
          audioError={audioError}
          audioStatus={audioStatus}
          canGenerateAudio={dialogueCanGenerateAudio}
          dialogueError={dialogueError}
          dialogueScripts={dialogueScripts}
          dialogueStatus={dialogueStatus}
          hasSelectedScene={Boolean(selectedScene)}
          onClose={closeDialoguePanel}
          onGenerateAudio={() => void onGenerateAudio()}
          onGenerateDialogueScripts={() => void onGenerateDialogueScripts()}
          onSelectDialogueScript={onSelectDialogueScript}
          onUpdateDialogueLineText={onUpdateDialogueLineText}
          onUploadAudio={(file) => void onUploadAudio(file)}
          selectedDialogueIndex={selectedDialogueIndex}
        />
      ) : null}

      {captionPanelOpen && hasGeneratedAudio ? (
        <CreateCaptionModal
          captions={generatedCaptions}
          hasEmptyEditedCaption={hasEmptyEditedCaption}
          onClose={closeCaptionPanel}
          onOpenAudioPanel={onOpenAudioPanel}
          onUpdateCaptionText={onUpdateCaptionText}
        />
      ) : null}
    </div>
  );
}

export function CreateResearchClient() {
  const convexConfigured = Boolean(getV3ConvexUrl());

  if (!convexConfigured) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center">
        <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-8 text-amber-900 shadow-sm">
          <ShieldAlert className="size-8" />
          <h1 className="mt-5 text-4xl font-black">Convex is missing.</h1>
          <p className="mt-4 text-lg font-bold leading-8">
            Add NEXT_PUBLIC_V3_CONVEX_URL to v3/.env.local before running Phase 1 research.
          </p>
        </div>
      </section>
    );
  }

  return <ResearchConnected />;
}
