"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
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
import { DEFAULT_NVIDIA_NIM_MEME_MODEL } from "@/features/formats/meme/models";
import { getFormatModule } from "@/features/formats/registry";
import { useActiveCanvasPanel, useCanvasActions } from "@/features/create/canvasInteractionStore";
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
import { getClientRendererVersion } from "@/features/render/rendererVersion";
import type { AdFormatId, AdScene, AdSceneVisualizerStyle } from "@/features/scene/types";
import { visualizerSceneVariants } from "@/features/scene/visualizerVariants";
import { getV3ConvexUrl } from "@/lib/convexEnv";
import { CreateCaptionModal } from "./CreateCaptionModal";
import { BrandDumpModal } from "./CreateBrandDumpModal";
import { CreateCanvasColumn } from "./CreateCanvasColumn";
import { CreateControlPanel } from "./CreateControlPanel";
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
import { WigglyMark } from "./WigglyMark";
import { createStarterPlaceholderScene, placeholderAdSurfaceVariantCount } from "./createStarterScene";
import { getAnonymousId } from "./createSession";

const rerollFlashMs = 680;
const slowResearchMessageDelayMs = 8000;

const researchTimeoutMessage = "That site took too long to read. Try again, or paste a more specific public page from the same brand.";
const fallbackUploadedAudioDurationMs = 8000;

type AdSceneGenerationResponse = {
  scenes: AdScene[];
};

type BillingStatus = {
  paid: boolean;
  paidUntil: number;
  freeLimit: number;
  freeUsed: number;
  freeRemaining: number | null;
  resetAt: number;
};

type CreateModal = "brand-details" | "dialogue" | "captions" | "paywall" | null;

function getResearchActionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/\b(aborterror|aborted|timed out|timeout)\b/i.test(message)) return researchTimeoutMessage;
  return message || "Website research failed.";
}

function getSceneDefaultFlashSlots(scene: AdScene): RenderFlashRole[] {
  return [...getFormatModule(scene.format).defaultSlots];
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

function getWebsiteSubmitProgressFacts(result: StoredWebsiteResearchResult): WebsiteSubmitProgressFacts {
  return {
    brandName: result.brand.name || result.brandBrief.brandName || result.host,
    hasLogo: Boolean(result.brand.logoUrl || result.brand.faviconUrl),
    colorCount: result.brand.colors.length,
    proofCount: result.brandBrief.proof.length || result.evidence.receipts.specificClaims.length || result.evidence.receipts.namedProof.length,
    buyerMomentCount: result.brandBrief.buyerMoments.length || result.evidence.receipts.buyerMoments.length,
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
  const generateDialogueScripts = useAction(api.dialogueScripts.generateForScene);
  const generateDialogueAudioForScene = useAction(api.audioAssets.generateDialogueForScene);
  const attachUploadedAudioForScene = useAction(api.audioAssets.attachUploadedToScene);
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
  const [selectedAdFormat, setSelectedAdFormat] = useState<AdFormatId>("visualizer");
  const [selectedMemeModel, setSelectedMemeModel] = useState(DEFAULT_NVIDIA_NIM_MEME_MODEL);
  const [adScenes, setAdScenes] = useState<AdScene[]>([]);
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
  const [renderJobId, setRenderJobId] = useState<Id<"renderJobs"> | null>(null);
  const renderJob = useQuery(api.renderJobs.getStatus, renderJobId ? { renderJobId } : "skip");
  const renderWorkerReadiness = useQuery(api.renderJobs.workerReadiness, {});
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [activeModal, setActiveModal] = useState<CreateModal>(null);
  const [dialogueStatus, setDialogueStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dialogueScripts, setDialogueScripts] = useState<DialogueScript[]>([]);
  const [selectedDialogueIndex, setSelectedDialogueIndex] = useState(0);
  const [dialogueError, setDialogueError] = useState("");
  const [previewTimeSeconds, setPreviewTimeSeconds] = useState(1.1);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [anonymousId, setAnonymousId] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [error, setError] = useState("");
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const createEditorScopeRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analysisUpgradeKeyRef = useRef("");
  const rerollFlashTimeoutRef = useRef<number | null>(null);
  const savedDesigns = useQuery(api.savedDesigns.list, anonymousId ? { anonymousId } : "skip") as SavedAdSceneDesign[] | undefined;
  const latestGeneration = useQuery(api.adScenes.latestForAnonymousId, anonymousId ? { anonymousId } : "skip") as {
    result: StoredWebsiteResearchResult;
    scenes: AdScene[];
  } | null | undefined;
  const saveDesign = useMutation(api.savedDesigns.saveFromScene);
  const savedDesignItems = savedDesigns || [];
  const canvasActions = useCanvasActions();
  const activeCreatePanel = useActiveCanvasPanel();
  const brandDetailsOpen = activeModal === "brand-details";
  const dialoguePanelOpen = activeModal === "dialogue";
  const captionPanelOpen = activeModal === "captions";
  const paywallOpen = activeModal === "paywall";

  const setModal = useCallback((modal: CreateModal) => {
    setActiveModal(modal);
    if (modal === "brand-details") canvasActions.openModal("brand-dump");
    else canvasActions.closeModal("brand-dump");
    if (modal === "dialogue") canvasActions.openModal("dialogue");
    else canvasActions.closeModal("dialogue");
    if (modal === "captions") canvasActions.openModal("captions");
    else canvasActions.closeModal("captions");
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
    if (result || adScenes.length || !latestGeneration?.scenes.length) return;

    const restoredScene = latestGeneration.scenes[0] || null;
    setResult(latestGeneration.result);
    setStatus("ready");
    setAdScenes(latestGeneration.scenes);
    setSelectedScene(restoredScene);
    setSelectedSceneIndex(0);
    canvasActions.interactionReset();
    setRerollCount(0);
    setAdStatus("ready");
    setAdStatusNote(`${latestGeneration.scenes.length} ads restored. Press spacebar to find a stronger version.`);
    setAudioStatus(restoredScene?.audio.status === "generated" ? "ready" : "idle");
  }, [
    adScenes.length,
    canvasActions,
    latestGeneration,
    result,
  ]);

  const getCurrentAnonymousId = () => anonymousId || getAnonymousId();

  const resetPreviewPlayback = useCallback(() => {
    setIsAudioPlaying(false);
    canvasActions.playbackStopped();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPreviewTimeSeconds(1.1);
  }, [canvasActions]);

  const onTogglePreviewPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || selectedScene?.audio.status !== "generated") return;

    if (audio.paused) {
      void audio.play();
      return;
    }

    audio.pause();
  }, [selectedScene?.audio.status]);

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
    if (flashRoles.length) triggerRerollFlash(flashRoles);
  }, [selectedScene, selectedSceneIndex, triggerRerollFlash]);

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

  const onRerollScene = useCallback(() => {
    if (!adScenes.length || !selectedScene) {
      setPlaceholderVariantIndex((index) => (index + 1) % placeholderAdSurfaceVariantCount);
      setRerollCount((count) => count + 1);
      triggerRerollFlash(["headline", "visualizer", "captions"]);
      return;
    }

    const currentGeneratedAudio = selectedScene.audio.status === "generated" ? selectedScene.audio : null;
    const next = rerollScene(adScenes, selectedScene, selectedSceneIndex, {
      ...createDefaultSceneLocks(),
      audio: Boolean(currentGeneratedAudio),
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
  }, [adScenes, resetPreviewPlayback, selectedScene, selectedSceneIndex, triggerRerollFlash]);

  const applyGeneratedScenes = (scenes: AdScene[]) => {
    if (!scenes.length) throw new Error("Ad idea generation returned no ads.");

    const firstScene = scenes[0] || null;
    setAdScenes(scenes);
    setSelectedScene(firstScene);
    setSelectedSceneIndex(0);
    canvasActions.interactionReset();
    setRerollCount(0);
    resetShareState();
    resetRenderState();
    resetAudioState();
    resetSaveState();
    setAdStatusNote(`${scenes.length} ads ready. Press spacebar to find a stronger version.`);
    setAdStatus("ready");
    canvasActions.finishBusy();
  };

  const generateScenesForResearch = async (
    researchRunId: Id<"researchRuns">,
    count = 50,
    format: AdFormatId = "visualizer",
    memeModel?: string,
  ) => {
    const generationArgs = {
      researchRunId,
      count,
      format,
      ...(format === "meme" && memeModel ? { memeModel } : {}),
    };
    const nextGeneration = await generateAdScenes(generationArgs) as AdSceneGenerationResponse;

    return nextGeneration.scenes || [];
  };

  useCanvasKeyboard({
    editorScopeRef: createEditorScopeRef,
    onReroll: onRerollScene,
  });

  useEffect(() => {
    if (!selectedScene) return;

    const shouldRunClock = selectedScene.audio.status === "generated" && isAudioPlaying;
    if (!shouldRunClock) return;

    let animationFrame = 0;

    const tick = () => {
      const currentAudio = audioRef.current;
      if (currentAudio && !currentAudio.paused) {
        setPreviewTimeSeconds(currentAudio.currentTime);
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    isAudioPlaying,
    selectedScene?.audio.status,
  ]);

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
    const keepPreviousCanvasAfterFailure = () => {
      setAdStatus(hadExistingCanvas ? "ready" : "error");
      if (hadExistingCanvas) {
        setAdStatusNote("Previous ads are still on the canvas. Try another URL when you're ready.");
      }
    };

    setStatus("loading");
    setAdStatus("loading");
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
      setPendingProgressFacts(getWebsiteSubmitProgressFacts(nextResult));
      setShowSlowResearchMessage(false);
      setProgressStage("writing-ads");
      canvasActions.beginBusy("ad-generation");
      const nextScenes = await generateScenesForResearch(
        nextResult.researchRunId as Id<"researchRuns">,
        selectedAdFormat === "meme" ? 4 : 50,
        selectedAdFormat,
        selectedMemeModel,
      );
      setProgressStage("preparing-canvas");
      setResult(nextResult);
      setStatus("ready");
      applyGeneratedScenes(nextScenes);
      clearSubmitProgress();
    } catch (nextError) {
      clearSubmitProgress();
      canvasActions.finishBusy();
      const message = getResearchActionErrorMessage(nextError);
      if (researchCompleted) {
        setStatus(hadExistingCanvas ? "ready" : "error");
        setAdStatus("error");
        setAdStatusNote(hadExistingCanvas ? "Previous ads are still on the canvas. New ad generation failed." : "");
        setError(message);
      } else {
        setStatus(hadExistingCanvas ? "ready" : "error");
        keepPreviousCanvasAfterFailure();
        setError(message);
      }
    }
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
      const share = await createSharePage({
        anonymousId: getCurrentAnonymousId(),
        scene: selectedScene,
        ctaUrl: selectedScene.brand.url,
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
    ensureSelectedScene();
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

    resetPreviewPlayback();
    setSelectedScene(restored.selectedScene);
    setSelectedSceneIndex(restored.selectedSceneIndex);
    setAdScenes(restored.scenes);
    setAdStatus("ready");
    setAdStatusNote("Saved design loaded. Press spacebar to keep exploring ideas.");
    setAudioStatus(restored.selectedScene.audio.status === "generated" ? "ready" : "idle");
    setAudioError("");
    resetDialogueState();
    resetShareState();
    resetRenderState();
    resetSaveState();
    canvasActions.interactionReset();
  };

  const onSelectAdIdea = (scene: AdScene, index: number) => {
    resetPreviewPlayback();
    setSelectedScene(scene);
    setSelectedSceneIndex(index);
    setAudioStatus(scene.audio.status === "generated" ? "ready" : "idle");
    setAudioError("");
    resetDialogueState();
    resetShareState();
    resetRenderState();
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
  const hasGeneratedAudio = selectedScene?.audio.status === "generated";
  const playableAudioUrl = selectedScene?.audio.status === "generated" ? selectedScene.audio.url : "";
  const generatedCaptions = selectedScene?.audio.status === "generated" ? selectedScene.audio.captions : [];
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

  useEffect(() => {
    if (currentRenderStatus === "ready" || currentRenderStatus === "failed" || currentRenderStatus === "error") {
      canvasActions.finishBusy();
    }
  }, [canvasActions, currentRenderStatus]);

  return (
    <div
      ref={createEditorScopeRef}
      className="create-desktop-fit-shell min-h-screen min-w-[1280px] overflow-x-auto bg-[#F7F4EA] px-3 py-4 font-sans text-slate-950 sm:px-6 md:px-10"
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
        <div className="flex items-center gap-3">
          <WigglyMark size="sm" />
          <div>
            <p className="text-2xl font-black leading-none tracking-normal text-slate-950">Wiggly</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              Audio that looks expensive
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-8 py-6 sm:gap-10 sm:py-8 lg:min-h-[calc(100vh-5.5rem)] lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 lg:py-10">
        <CreateLeftColumn
          adScenesCount={adScenes.length}
          adStatus={adStatus}
          error={error}
          format={selectedAdFormat}
          freeRunsLabel={billingStatus && !billingStatus.paid && billingStatus.freeRemaining !== null
            ? `${billingStatus.freeRemaining} of ${billingStatus.freeLimit} free runs left`
            : ""}
          memeModel={selectedMemeModel}
          onFormatChange={setSelectedAdFormat}
          onMemeModelChange={setSelectedMemeModel}
          onSubmit={onSubmit}
          onUrlChange={setUrl}
          progressFacts={pendingProgressFacts}
          progressStage={progressStage}
          showSlowResearchMessage={showSlowResearchMessage}
          status={status}
          url={url}
        />

        <div className="space-y-4">
          <div className="grid items-center gap-5 sm:gap-6 lg:grid-cols-[minmax(260px,420px)_minmax(260px,1fr)]">
            <CreateCanvasColumn
              adScenesCount={adScenes.length}
              isAudioPlaying={isAudioPlaying}
              onOpenAudioPanel={onOpenAudioPanel}
              onRerollScene={onRerollScene}
              placeholderVariantIndex={placeholderVariantIndex}
              previewPlatform={previewPlatform}
              previewTimeSeconds={previewTimeSeconds}
              rerollCount={rerollCount}
              rerollFlash={rerollFlash}
              result={result}
              selectedScene={selectedScene}
            />

            <aside className="space-y-4">
              <CreateQuickActions
                currentRenderStatus={currentRenderStatus}
                hasSelectedScene={Boolean(selectedScene)}
                isAudioPlaying={isAudioPlaying}
                onCreateRenderJob={() => void onCreateRenderJob()}
                onCreateShareLink={() => void onCreateShareLink()}
                onLoadSavedDesign={onLoadSavedDesign}
                onOpenAudioPanel={onOpenAudioPanel}
                onSaveSelectedDesign={() => void onSaveSelectedDesign()}
                onTogglePreviewPlayback={onTogglePreviewPlayback}
                playableAudioUrl={playableAudioUrl}
                renderBusy={renderBusy}
                renderDownloadUrl={renderDownloadUrl}
                renderErrorMessage={renderJob?.error || renderError}
                renderStatusLabel={renderStatusLabel}
                renderWorkerHealthy={renderWorkerHealthy}
                saveCounterLabel={saveCounterLabel}
                saveError={saveError}
                savedDesigns={savedDesignItems}
                saveStatus={saveStatus}
                saveStatusLabel={saveStatusLabel}
                selectedFormat={selectedScene?.format || null}
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
                  }}
                  onPause={(event) => {
                    setIsAudioPlaying(false);
                    canvasActions.playbackStopped();
                    setPreviewTimeSeconds(event.currentTarget.currentTime || 1.1);
                  }}
                  onTimeUpdate={(event) => {
                    setPreviewTimeSeconds(event.currentTarget.currentTime);
                  }}
                  onEnded={() => {
                    setIsAudioPlaying(false);
                    canvasActions.playbackStopped();
                    if (audioRef.current) audioRef.current.currentTime = 0;
                    setPreviewTimeSeconds(1.1);
                  }}
                />
              ) : null}

              <CreateControlPanel
                activePanel={activeCreatePanel}
                audioStatus={audioStatus}
                hasGeneratedAudio={hasGeneratedAudio}
                hasSelectedScene={Boolean(selectedScene)}
                onOpenAudioPanel={onOpenAudioPanel}
                onOpenCaptionEditor={openCaptionPanel}
                onPanelChange={(panel) => {
                  if (panel) canvasActions.openPanel(panel);
                  else canvasActions.closePanel();
                }}
                onPreviewPlatformChange={setPreviewPlatform}
                onUpdateCreativeField={onUpdateCreativeField}
                onUpdateStyleColor={onUpdateStyleColor}
                onUpdateFormatPreset={onUpdateFormatPreset}
                previewPlatform={previewPlatform}
                selectedScene={selectedScene}
              />

              <CreateCreativeBriefCard
                onOpenDetails={openBrandDetails}
                result={result}
              />
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl pb-14">
        <CreateIdeasList
          scenes={adScenes}
          selectedSceneIndex={selectedSceneIndex}
          onSelectScene={onSelectAdIdea}
        />
      </div>

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
