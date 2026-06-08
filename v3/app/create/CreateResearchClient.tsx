"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Lock,
  Mic,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Unlock,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { updateGeneratedAudioCaptionText } from "@/features/audio/sceneAudio";
import { cloneDialogueScript, type DialogueScript } from "@/features/dialogue/dialogueScripts";
import { getFormatModule } from "@/features/formats/registry";
import type {
  FormatSceneLocks,
  FormatSelectableSlotDefinition,
  RenderFlashRole,
  RenderFlashState,
  RenderSelectableSlot,
} from "@/features/formats/types";
import {
  createDefaultCanvasInteractionLocks,
  useCanvasInteractionStore,
  type CanvasInteractionLocks,
} from "@/features/create/canvasInteractionStore";
import {
  createSavedDesignId,
  type SavedAdSceneDesign,
} from "@/features/create/savedDesigns";
import {
  rerollScene,
  sceneLockKeys,
  sceneLockLabels,
  type SceneLockKey,
} from "@/features/create/reroll";
import { useCanvasKeyboard } from "@/features/create/useCanvasKeyboard";
import { isStoredWebsiteResearchFailure } from "@/features/research/types";
import type {
  StoredWebsiteResearchResponse,
  StoredWebsiteResearchResult,
} from "@/features/research/types";
import type { AdScene } from "@/features/scene/types";
import { getV3ConvexUrl } from "@/lib/convexEnv";
import {
  FormatRail,
  PhonePreviewFrame,
  WigglyMark,
  previewPlatformOptions,
  type PreviewPlatform,
} from "./CreatePreviewChrome";

const anonymousIdKey = "wiggly:v3:anonymous-id";
const createSessionStorageKey = "wiggly:v3:create-session";
const createSessionTtlMs = 1000 * 60 * 60 * 12;
const rerollFlashMs = 680;

type CreateSessionSnapshot = {
  result: StoredWebsiteResearchResult | null;
  adScenes: AdScene[];
  selectedScene: AdScene | null;
  selectedSceneIndex: number;
  sceneLocks: CanvasInteractionLocks;
  rerollCount: number;
  adStatusNote: string;
  dialogueScripts: DialogueScript[];
  selectedDialogueIndex: number;
  savedAt: number;
};

const getAnonymousId = () => {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(anonymousIdKey);
  if (existing) return existing;

  const next = window.crypto.randomUUID();
  window.localStorage.setItem(anonymousIdKey, next);
  return next;
};

const pillClass = "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400 shadow-sm";
const researchTimeoutMessage = "That site took too long to read. Try again, or paste a more specific public page from the same brand.";
const fallbackUploadedAudioDurationMs = 8000;
const summarizeJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const uniqueNonEmptyStrings = (items: Array<string | null | undefined>) => (
  Array.from(new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item))))
);

const getCreativeBriefHighlights = (result: StoredWebsiteResearchResult | null) => {
  if (!result) return [];

  return [
    { label: "Offer", value: result.brandBrief.offer },
    { label: "Audience", value: result.brandBrief.audience },
    { label: "Hook", value: result.brandBrief.buyerMoments[0] || result.brandBrief.proof[0] || result.brand.description },
  ].filter((item) => item.value.trim());
};

const getBrandDumpImages = (result: StoredWebsiteResearchResult) => uniqueNonEmptyStrings([
  result.brand.logoUrl,
  result.brand.faviconUrl,
  result.brand.ogImageUrl,
  result.brand.screenshotUrl,
]);

const getUsefulClaims = (result: StoredWebsiteResearchResult) => uniqueNonEmptyStrings([
  result.brandBrief.offer,
  ...result.brandBrief.buyerMoments,
  ...result.brandBrief.proof,
  result.brandBrief.ctaDirection,
]);

const fallbackCaptionColors = ["#7DD3FC", "#FB7185", "#A78BFA", "#34D399", "#F59E0B", "#F472B6"];

const getSceneFormatInteraction = (scene: AdScene) => getFormatModule(scene.format).interaction;
const getSceneDefaultFlashSlots = (scene: AdScene): RenderFlashRole[] => [...getFormatModule(scene.format).defaultSlots];
const getSceneSelectableSlots = (scene: AdScene): readonly FormatSelectableSlotDefinition[] => getSceneFormatInteraction(scene).selectableSlots;
const getSceneSelectedSlotLabel = (scene: AdScene, slot: RenderSelectableSlot) => (
  getSceneSelectableSlots(scene).find((item) => item.slot === slot)?.label.toLowerCase() || slot
);
const getLockedSlotsForScene = (
  scene: AdScene,
  locks: FormatSceneLocks,
): Partial<Record<RenderSelectableSlot, boolean>> => (
  Object.fromEntries(getSceneSelectableSlots(scene).map((slot) => [slot.slot, locks[slot.lockKey]]))
);
const getSlotColorsForScene = (scene: AdScene): Partial<Record<RenderSelectableSlot, string>> => {
  const interaction = getSceneFormatInteraction(scene);
  return Object.fromEntries(interaction.selectableSlots.map((slot) => [
    slot.slot,
    interaction.getSlotColor(scene, slot.slot),
  ]));
};

function normalizeHexColor(value: string): string | null {
  if (!/^#[0-9A-F]{6}$/i.test(value)) return null;
  return value.toUpperCase();
}

function getNextDistinctColor(currentColor: string, colors: string[], offset: number): string {
  const current = normalizeHexColor(currentColor);
  const palette = colors
    .map(normalizeHexColor)
    .filter((color): color is string => Boolean(color))
    .filter((color, index, all) => all.indexOf(color) === index);

  const usefulPalette = palette.length ? palette : fallbackCaptionColors;
  const startIndex = Math.max(0, Math.trunc(offset)) % usefulPalette.length;
  for (let step = 0; step < usefulPalette.length; step += 1) {
    const candidate = usefulPalette[(startIndex + step) % usefulPalette.length];
    if (candidate && candidate !== current) return candidate;
  }

  return fallbackCaptionColors.find((color) => color !== current) || "#7DD3FC";
}

const getCreateSessionStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const normalizePersistedLocks = (locks: Partial<CanvasInteractionLocks> | null | undefined): CanvasInteractionLocks => ({
  ...createDefaultCanvasInteractionLocks(),
  ...(locks || {}),
});

const loadCreateSessionSnapshot = (): CreateSessionSnapshot | null => {
  const storage = getCreateSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(createSessionStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreateSessionSnapshot>;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > createSessionTtlMs) {
      storage.removeItem(createSessionStorageKey);
      return null;
    }

    const adScenes = Array.isArray(parsed.adScenes) ? parsed.adScenes : [];
    const selectedSceneIndex = Math.min(
      Math.max(0, Math.trunc(Number(parsed.selectedSceneIndex) || 0)),
      Math.max(0, adScenes.length - 1),
    );

    return {
      result: parsed.result || null,
      adScenes,
      selectedScene: parsed.selectedScene || adScenes[selectedSceneIndex] || null,
      selectedSceneIndex,
      sceneLocks: normalizePersistedLocks(parsed.sceneLocks),
      rerollCount: Math.max(0, Math.trunc(Number(parsed.rerollCount) || 0)),
      adStatusNote: typeof parsed.adStatusNote === "string" ? parsed.adStatusNote : "",
      dialogueScripts: Array.isArray(parsed.dialogueScripts)
        ? parsed.dialogueScripts.map((script) => cloneDialogueScript(script as DialogueScript))
        : [],
      selectedDialogueIndex: Math.max(0, Math.trunc(Number(parsed.selectedDialogueIndex) || 0)),
      savedAt: parsed.savedAt,
    };
  } catch {
    storage.removeItem(createSessionStorageKey);
    return null;
  }
};

const saveCreateSessionSnapshot = (snapshot: Omit<CreateSessionSnapshot, "savedAt">) => {
  const storage = getCreateSessionStorage();
  if (!storage) return;

  try {
    if (!snapshot.result && !snapshot.adScenes.length) {
      storage.removeItem(createSessionStorageKey);
      return;
    }
    storage.setItem(createSessionStorageKey, JSON.stringify({
      ...snapshot,
      savedAt: Date.now(),
    }));
  } catch {
    // Session restore is a convenience; it should never break the create flow.
  }
};

function getResearchActionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/\b(aborterror|aborted|timed out|timeout)\b/i.test(message)) return researchTimeoutMessage;
  return message || "Website research failed.";
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
  const [adScenes, setAdScenes] = useState<AdScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<AdScene | null>(null);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>("instagram-feed");
  const [rerollCount, setRerollCount] = useState(0);
  const [rerollFlash, setRerollFlash] = useState<RenderFlashState | null>(null);
  const [adStatusNote, setAdStatusNote] = useState("");
  const [renderJobId, setRenderJobId] = useState<Id<"renderJobs"> | null>(null);
  const renderJob = useQuery(api.renderJobs.getStatus, renderJobId ? { renderJobId } : "skip");
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [dialoguePanelOpen, setDialoguePanelOpen] = useState(false);
  const [brandDetailsOpen, setBrandDetailsOpen] = useState(false);
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
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false);
  const [error, setError] = useState("");
  const [sessionRestored, setSessionRestored] = useState(false);
  const createEditorScopeRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rerollFlashTimeoutRef = useRef<number | null>(null);
  const savedDesigns = useQuery(api.savedDesigns.list, anonymousId ? { anonymousId } : "skip") as SavedAdSceneDesign[] | undefined;
  const latestGeneration = useQuery(api.adScenes.latestForAnonymousId, anonymousId ? { anonymousId } : "skip") as {
    result: StoredWebsiteResearchResult;
    scenes: AdScene[];
  } | null | undefined;
  const saveDesign = useMutation(api.savedDesigns.saveFromScene);
  const savedDesignItems = savedDesigns || [];
  const canvasMode = useCanvasInteractionStore((state) => state.mode);
  const selectedPreviewSlot = useCanvasInteractionStore((state) => state.selectedSlot);
  const sceneLocks = useCanvasInteractionStore((state) => state.locks);
  const setCanvasMode = useCanvasInteractionStore((state) => state.setMode);
  const selectPreviewSlot = useCanvasInteractionStore((state) => state.selectSlot);
  const clearSelectedPreviewSlot = useCanvasInteractionStore((state) => state.clearSelectedSlot);
  const setCanvasLocks = useCanvasInteractionStore((state) => state.setLocks);
  const toggleCanvasLock = useCanvasInteractionStore((state) => state.toggleLock);
  const resetCanvasInteraction = useCanvasInteractionStore((state) => state.resetInteraction);

  useEffect(() => {
    setAnonymousId(getAnonymousId());
  }, []);

  useEffect(() => () => {
    if (rerollFlashTimeoutRef.current) {
      window.clearTimeout(rerollFlashTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const snapshot = loadCreateSessionSnapshot();
    if (snapshot) {
      setResult(snapshot.result);
      setStatus(snapshot.result ? "ready" : "idle");
      setAdScenes(snapshot.adScenes);
      setSelectedScene(snapshot.selectedScene);
      setSelectedSceneIndex(snapshot.selectedSceneIndex);
      setCanvasLocks(snapshot.sceneLocks);
      clearSelectedPreviewSlot();
      setCanvasMode("idle");
      setRerollCount(snapshot.rerollCount);
      setAdStatus(snapshot.adScenes.length ? "ready" : "idle");
      setAdStatusNote(snapshot.adStatusNote);
      setAudioStatus(snapshot.selectedScene?.audio.status === "generated" ? "ready" : "idle");
      setDialogueScripts(snapshot.dialogueScripts);
      setSelectedDialogueIndex(Math.min(snapshot.selectedDialogueIndex, Math.max(0, snapshot.dialogueScripts.length - 1)));
      setDialogueStatus(snapshot.dialogueScripts.length ? "ready" : "idle");
    }
    setSessionRestored(true);
  }, []);

  useEffect(() => {
    if (!sessionRestored) return;
    saveCreateSessionSnapshot({
      result,
      adScenes,
      selectedScene,
      selectedSceneIndex,
      sceneLocks,
      rerollCount,
      adStatusNote,
      dialogueScripts,
      selectedDialogueIndex,
    });
  }, [
    adScenes,
    adStatusNote,
    dialogueScripts,
    rerollCount,
    result,
    sceneLocks,
    selectedScene,
    selectedSceneIndex,
    selectedDialogueIndex,
    sessionRestored,
  ]);

  useEffect(() => {
    if (!sessionRestored || result || adScenes.length || !latestGeneration?.scenes.length) return;

    const restoredScene = latestGeneration.scenes[0] || null;
    setResult(latestGeneration.result);
    setStatus("ready");
    setAdScenes(latestGeneration.scenes);
    setSelectedScene(restoredScene);
    setSelectedSceneIndex(0);
    setCanvasLocks(createDefaultCanvasInteractionLocks());
    clearSelectedPreviewSlot();
    setCanvasMode("idle");
    setRerollCount(0);
    setAdStatus("ready");
    setAdStatusNote(`${latestGeneration.scenes.length} ads restored. Press spacebar to find a stronger version.`);
    setAudioStatus(restoredScene?.audio.status === "generated" ? "ready" : "idle");
  }, [
    adScenes.length,
    latestGeneration,
    result,
    clearSelectedPreviewSlot,
    sessionRestored,
    setCanvasLocks,
    setCanvasMode,
  ]);

  useEffect(() => {
    const nextMode = status === "loading" || adStatus === "loading" || audioStatus === "loading"
      ? "generating"
      : isAudioPlaying
        ? "playing"
        : "idle";

    if (canvasMode !== nextMode) {
      setCanvasMode(nextMode);
    }
  }, [
    adStatus,
    audioStatus,
    canvasMode,
    isAudioPlaying,
    setCanvasMode,
    status,
  ]);

  const getCurrentAnonymousId = () => anonymousId || getAnonymousId();

  const resetPreviewPlayback = useCallback(() => {
    setIsAudioPlaying(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPreviewTimeSeconds(1.1);
  }, []);

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
    setDialoguePanelOpen(false);
    setDialogueStatus("idle");
    setDialogueScripts([]);
    setSelectedDialogueIndex(0);
    setDialogueError("");
  };

  const resetAudioState = () => {
    setAudioStatus("idle");
    setAudioError("");
    setBrandDetailsOpen(false);
    resetDialogueState();
    resetPreviewPlayback();
  };

  const resetSaveState = () => {
    setSaveStatus("idle");
    setSaveError("");
  };

  const replaceSelectedScene = useCallback((nextScene: AdScene) => {
    setSelectedScene(nextScene);
    setAdScenes((scenes) => scenes.map((scene, index) => (
      index === selectedSceneIndex ? nextScene : scene
    )));
  }, [selectedSceneIndex]);

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

  const onRerollScene = useCallback(() => {
    const formatInteraction = selectedScene ? getSceneFormatInteraction(selectedScene) : null;
    const effectiveLocks = selectedPreviewSlot && formatInteraction
      ? formatInteraction.getRerollLocksForSlot(selectedPreviewSlot, sceneLocks)
      : sceneLocks;
    const next = rerollScene(adScenes, selectedScene, selectedSceneIndex, effectiveLocks);
    if (!next.scene) return;

    const currentGeneratedAudio = selectedScene?.audio.status === "generated" ? selectedScene.audio : null;
    const shouldCarryAudio = Boolean(currentGeneratedAudio && next.scene.audio.status !== "generated");
    const formatRerolledScene = formatInteraction && selectedScene
      ? formatInteraction.applySlotReroll({
        selectedSlot: selectedPreviewSlot,
        currentScene: selectedScene,
        nextScene: next.scene,
        allScenes: adScenes,
        locks: sceneLocks,
        fallbackColors: fallbackCaptionColors,
        offset: rerollCount + 1,
        pickDistinctColor: getNextDistinctColor,
      })
      : next.scene;
    const nextScene = shouldCarryAudio && currentGeneratedAudio
      ? {
        ...formatRerolledScene,
        audio: currentGeneratedAudio,
      }
      : formatRerolledScene;
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
    triggerRerollFlash(selectedPreviewSlot ? [selectedPreviewSlot] : getSceneDefaultFlashSlots(nextScene));
  }, [adScenes, resetPreviewPlayback, sceneLocks, selectedPreviewSlot, selectedScene, selectedSceneIndex, triggerRerollFlash]);

  const onToggleLock = (key: SceneLockKey) => {
    toggleCanvasLock(key);
  };

  const onSelectPreviewSlot = (slot: RenderSelectableSlot) => {
    selectPreviewSlot(slot);
  };

  const onTogglePreviewSlotLock = (slot: RenderSelectableSlot) => {
    if (!selectedScene) return;
    const slotDefinition = getSceneSelectableSlots(selectedScene).find((item) => item.slot === slot);
    if (!slotDefinition) return;
    onToggleLock(slotDefinition.lockKey as SceneLockKey);
  };

  const onChangePreviewSlotColor = (slot: RenderSelectableSlot, color: string) => {
    if (!selectedScene) return;
    const nextScene = getSceneFormatInteraction(selectedScene).applySlotColor(selectedScene, slot, color);
    replaceSelectedScene(nextScene);
    resetShareState();
    resetRenderState();
    resetSaveState();
    triggerRerollFlash([slot]);
  };

  const onChangePreviewBackgroundColor = (color: string) => {
    if (!selectedScene) return;
    const nextScene = getSceneFormatInteraction(selectedScene).applyBackgroundColor(selectedScene, color);
    replaceSelectedScene(nextScene);
    resetShareState();
    resetRenderState();
    resetSaveState();
  };

  useCanvasKeyboard({
    editorScopeRef: createEditorScopeRef,
    enabled: adScenes.length > 0 && !brandDetailsOpen && !dialoguePanelOpen,
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
      if (event.key === "Escape") setBrandDetailsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [brandDetailsOpen]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setAdStatus("idle");
    setAdScenes([]);
    setSelectedScene(null);
    setSelectedSceneIndex(0);
    resetCanvasInteraction();
    setRerollCount(0);
    resetShareState();
    resetRenderState();
    resetAudioState();
    resetSaveState();
    setAdStatusNote("");
    setError("");

    try {
      const nextResult = await runWebsiteResearch({
        anonymousId: getAnonymousId(),
        url,
      }) as StoredWebsiteResearchResponse;
      if (isStoredWebsiteResearchFailure(nextResult)) {
        setStatus("error");
        setError(nextResult.error);
        return;
      }
      setResult(nextResult);
      setStatus("ready");
    } catch (nextError) {
      setStatus("error");
      setError(getResearchActionErrorMessage(nextError));
    }
  };

  const onGenerateAds = async (count = 50) => {
    if (!result) return;
    setAdStatus("loading");
    setAdStatusNote("");
    setError("");

    try {
      const nextGeneration = await generateAdScenes({
        researchRunId: result.researchRunId as Id<"researchRuns">,
        count,
      }) as {
        scenes: AdScene[];
        providerStatus: { reason: string; status: string };
      };
      setAdScenes(nextGeneration.scenes);
      setSelectedScene(nextGeneration.scenes[0] || null);
      setSelectedSceneIndex(0);
      resetCanvasInteraction();
      setRerollCount(0);
      resetShareState();
      resetRenderState();
      resetAudioState();
      resetSaveState();
      setAdStatusNote(`${nextGeneration.scenes.length} ads ready. Press spacebar to find a stronger version.`);
      setAdStatus("ready");
    } catch (nextError) {
      setAdStatus("error");
      setError(nextError instanceof Error ? nextError.message : "Ad idea generation failed.");
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
    if (!selectedScene || selectedScene.audio.status === "generated" || audioStatus === "loading") return;
    setDialoguePanelOpen((open) => !open);
    setAudioError("");
    setDialogueError("");
  };

  const onGenerateDialogueScripts = async () => {
    if (!selectedScene || selectedScene.audio.status === "generated") return;
    setDialoguePanelOpen(true);
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

  const onGenerateAudio = async () => {
    const script = dialogueScripts[selectedDialogueIndex];
    if (!selectedScene || selectedScene.audio.status === "generated" || !script) return;
    setAudioStatus("loading");
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
      setDialoguePanelOpen(false);
    } catch (nextError) {
      setAudioStatus("error");
      setAudioError(nextError instanceof Error ? nextError.message : "Audio generation failed.");
    }
  };

  const onUploadAudio = async (file: File | null) => {
    if (!file || !selectedScene || selectedScene.audio.status === "generated" || audioStatus === "loading") return;
    if (!file.type.startsWith("audio/")) {
      setAudioStatus("error");
      setAudioError("Choose an audio file.");
      return;
    }

    setAudioStatus("loading");
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
      setDialoguePanelOpen(false);
    } catch (nextError) {
      setAudioStatus("error");
      setAudioError(nextError instanceof Error ? nextError.message : "Audio upload failed.");
    }
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

  const onSaveSelectedDesign = async () => {
    if (!selectedScene) return;
    setSaveStatus("loading");
    setSaveError("");

    try {
      await saveDesign({
        anonymousId: getCurrentAnonymousId(),
        scene: selectedScene,
      });
      setSaveStatus("ready");
      setSavedDesignsOpen(true);
    } catch (nextError) {
      setSaveStatus("error");
      setSaveError(nextError instanceof Error ? nextError.message : "Could not save this design.");
    }
  };

  const onOpenSavedDesign = (design: SavedAdSceneDesign) => {
    const existingIndex = adScenes.findIndex((scene) => createSavedDesignId(scene) === design.id);

    resetPreviewPlayback();
    setSelectedScene(design.scene);
    setSelectedSceneIndex(existingIndex >= 0 ? existingIndex : 0);
    if (existingIndex < 0) {
      setAdScenes((scenes) => [design.scene, ...scenes]);
    }
    setAudioStatus(design.scene.audio.status === "generated" ? "ready" : "idle");
    setAudioError("");
    resetDialogueState();
    resetShareState();
    resetRenderState();
    setSaveStatus("ready");
    setSaveError("");
    setSavedDesignsOpen(false);
  };

  const closeSavedDesignsOnBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    setSavedDesignsOpen(false);
  };

  const onCreateRenderJob = async () => {
    if (!selectedScene) return;
    setRenderStatus("loading");
    setRenderJobId(null);
    setRenderError("");

    try {
      const job = await createRenderJob({
        anonymousId: getCurrentAnonymousId(),
        scene: selectedScene,
      }) as { renderJobId: Id<"renderJobs"> };
      setRenderJobId(job.renderJobId);
      setRenderStatus("queued");
    } catch (nextError) {
      setRenderStatus("error");
      setRenderError(nextError instanceof Error ? nextError.message : "Video render failed to start.");
    }
  };

  const currentRenderStatus = renderJob?.status || renderStatus;
  const renderProgress = renderJob?.progress ?? (renderStatus === "loading" ? 2 : 0);
  const renderDownloadUrl = renderJob?.downloadUrl || "";
  const renderStatusLabel = currentRenderStatus === "ready"
    ? "Video ready"
    : currentRenderStatus === "failed" || currentRenderStatus === "error"
      ? "Video render failed"
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
  const hasDialogueScripts = dialogueScripts.length > 0;
  const dialogueCanGenerateAudio = Boolean(selectedScene && selectedDialogueScript && selectedDialogueScript.lines.some((line) => line.text.trim()));
  const selectedSavedDesignId = selectedScene ? createSavedDesignId(selectedScene) : "";
  const selectedDesignIsSaved = Boolean(selectedSavedDesignId && savedDesignItems.some((design) => design.id === selectedSavedDesignId));
  const saveStatusLabel = saveStatus === "loading"
    ? "Saving"
    : saveStatus === "ready" || selectedDesignIsSaved
      ? "Saved"
      : "Save";
  const audioStatusLabel = hasGeneratedAudio
    ? "Audio ready"
    : audioStatus === "loading"
      ? "Generating audio"
      : audioStatus === "error"
        ? "Audio failed"
        : dialoguePanelOpen
          ? "Audio script open"
          : "Add audio for this ad";
  const creativeBriefHighlights = getCreativeBriefHighlights(result);

  const renderBusy = currentRenderStatus === "loading"
    || currentRenderStatus === "queued"
    || currentRenderStatus === "claimed"
    || currentRenderStatus === "rendering";

  return (
    <div
      ref={createEditorScopeRef}
      className="min-h-screen min-w-[1280px] overflow-x-auto bg-[#f7f4ea] px-10 py-7 text-slate-950"
      data-create-editor-scope="true"
    >
      <header className="mx-auto flex max-w-[1720px] items-center justify-between">
        <div className="flex items-center gap-3">
          <WigglyMark size="sm" />
          <div>
            <p className="text-2xl font-black leading-none tracking-normal text-slate-950">Wiggly</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              Audio that looks expensive
            </p>
          </div>
        </div>
        <span aria-hidden="true" />
      </header>

      <section className="mx-auto grid max-w-[1720px] grid-cols-[minmax(390px,560px)_minmax(560px,650px)_minmax(330px,430px)] items-start gap-10 pb-14 pt-9">
        <div className="pt-16">
          <p className={pillClass}>{adScenes.length ? "Ads ready to review" : "Add a voice clip first"}</p>
          <h1 className="mt-7 max-w-[560px] text-[78px] font-black leading-[0.93] tracking-normal text-slate-950">
            Make video ads without learning video editing.
          </h1>
          <p className="mt-8 max-w-[560px] text-lg font-black leading-8 text-slate-500">
            Wiggly reads the site, finds the selling angle, and fills the canvas with polished ads you can preview, save, download, or edit.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-11 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
          >
            <label className="text-sm font-black text-slate-900" htmlFor="website-url">
              Website
            </label>
            <input
              id="website-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="mt-3 w-full rounded-full border border-slate-200 bg-slate-50 px-6 py-4 text-lg font-bold text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white"
              placeholder="https://yourbrand.com"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {status === "loading" ? <Loader2 className="size-5 animate-spin" /> : <Wand2 className="size-5" />}
              {status === "loading" ? "Reading website" : "Generate ads"}
            </button>
          </form>

          {result ? (
            <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Generated ads</p>
                  <p className="mt-2 text-base font-black leading-6 text-slate-600">
                    Your generated ads appear on the canvas.
                  </p>
                </div>
                <RefreshCw className="size-5 text-slate-300" />
              </div>
              <button
                type="button"
                disabled={adStatus === "loading"}
                onClick={() => void onGenerateAds(50)}
                className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {adStatus === "loading" ? <Loader2 className="size-5 animate-spin" /> : <Wand2 className="size-5" />}
                {adStatus === "loading" ? "Writing ideas" : "Generate 50 ads"}
              </button>
              {adStatusNote ? (
                <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-500">
                  {adStatusNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {status === "error" || adStatus === "error" ? (
            <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm font-black leading-6 text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex items-start justify-center gap-4">
            <FormatRail />
            <div>
              <PhonePreviewFrame
                scene={selectedScene}
                result={result}
                platform={previewPlatform}
                motionMode={isAudioPlaying ? "audio" : "idle"}
                rerollFlash={rerollFlash}
                timeSeconds={previewTimeSeconds}
                onOpenAudioPanel={onOpenAudioPanel}
                onTogglePlayback={onTogglePreviewPlayback}
                previewReady={Boolean(playableAudioUrl)}
                isAudioPlaying={isAudioPlaying}
                selectedSlot={selectedPreviewSlot}
                selectableSlots={selectedScene ? getSceneSelectableSlots(selectedScene) : undefined}
                lockedSlots={selectedScene ? getLockedSlotsForScene(selectedScene, sceneLocks) : undefined}
                slotColors={selectedScene ? getSlotColorsForScene(selectedScene) : undefined}
                backgroundColor={selectedScene ? getSceneFormatInteraction(selectedScene).getBackgroundColor(selectedScene) : "#fbfaf5"}
                onSelectSlot={onSelectPreviewSlot}
                onToggleSlotLock={onTogglePreviewSlotLock}
                onChangeSlotColor={onChangePreviewSlotColor}
                onChangeBackgroundColor={onChangePreviewBackgroundColor}
              />

              {adScenes.length ? (
                <>
                  <section className="mx-auto mt-7 w-full max-w-[520px] rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_20px_54px_rgba(15,23,42,0.12)]">
                    <button
                      type="button"
                      onClick={onRerollScene}
                      className="group flex w-full items-center justify-center gap-3 rounded-[22px] bg-slate-950 px-5 py-4 text-2xl font-black text-white shadow-[0_16px_42px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
                    >
                      <Sparkles className="size-7" />
                      <span>Press</span>
                      <kbd className="rounded-xl bg-white px-7 py-2.5 text-lg font-black uppercase tracking-[0.22em] text-slate-950 shadow-[inset_0_-2px_0_rgba(15,23,42,0.12)]">
                        Spacebar
                      </kbd>
                      <span>make a wish</span>
                    </button>
                    <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      {selectedPreviewSlot && selectedScene
                        ? `Spacebar rerolls the ${getSceneSelectedSlotLabel(selectedScene, selectedPreviewSlot)}`
                        : rerollCount
                          ? `${rerollCount} reroll${rerollCount === 1 ? "" : "s"} this session`
                          : "Start here. Make a fresh version in one tap."}
                    </p>
                  </section>

                  <section className="mx-auto mt-5 flex w-full max-w-[390px] items-center justify-between rounded-[28px] border border-slate-200 bg-white/95 px-6 py-4 shadow-[0_18px_46px_rgba(15,23,42,0.10)]">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">Generation</p>
                      <p className="mt-1 text-xl font-black text-slate-950">Was this one useful?</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        aria-label="Thumbs up"
                        className="grid size-14 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300"
                      >
                        <ThumbsUp className="size-6" />
                      </button>
                      <button
                        type="button"
                        aria-label="Thumbs down"
                        className="grid size-14 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300"
                      >
                        <ThumbsDown className="size-6" />
                      </button>
                    </div>
                  </section>

                  <section className="mx-auto mt-5 grid w-full max-w-[520px] grid-cols-4 gap-2 rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_46px_rgba(15,23,42,0.10)]">
                    {sceneLockKeys.map((key) => {
                      const locked = sceneLocks[key];
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => onToggleLock(key)}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-black transition ${
                            locked
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                          }`}
                          aria-pressed={locked}
                        >
                          {locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                          {sceneLockLabels[key]}
                        </button>
                      );
                    })}
                  </section>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="pt-28">
          <section
            className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8"
            data-create-action-card="legacy"
          >
            {!selectedScene ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Generated ads</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Your generated ad appears on the canvas.
                  </p>
                </div>
                <RefreshCw className="size-5 text-slate-300" />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void onCreateRenderJob()}
              disabled={!selectedScene || renderBusy}
              className={`${selectedScene ? "" : "mt-4"} flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {renderBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : currentRenderStatus === "ready" ? (
                <Check className="size-4" />
              ) : (
                <Download className="size-4" />
              )}
              {renderStatusLabel}
            </button>

            {renderDownloadUrl ? (
              <a
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                href={renderDownloadUrl}
                download
              >
                Download MP4
                <ExternalLink className="size-4" />
              </a>
            ) : null}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onTogglePreviewPlayback}
                disabled={!playableAudioUrl}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="size-4" />
                {isAudioPlaying ? "Stop" : "Play"}
              </button>

              <div
                className="relative"
                onMouseEnter={() => setSavedDesignsOpen(true)}
                onMouseLeave={() => setSavedDesignsOpen(false)}
                onFocus={() => setSavedDesignsOpen(true)}
                onBlur={closeSavedDesignsOnBlur}
              >
                <button
                  type="button"
                  onClick={() => void onSaveSelectedDesign()}
                  disabled={!selectedScene || saveStatus === "loading"}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title={selectedDesignIsSaved ? "Saved to designs" : "Save this ad to designs"}
                >
                  {saveStatus === "loading" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : saveStatus === "ready" || selectedDesignIsSaved ? (
                    <Check className="size-4 text-emerald-500" />
                  ) : (
                    <BookmarkPlus className="size-4" />
                  )}
                  {saveStatusLabel}
                  {savedDesignItems.length ? (
                    <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">
                      {Math.min(savedDesignItems.length, 9)}
                    </span>
                  ) : null}
                </button>

              {savedDesignsOpen && savedDesignItems.length ? (
                <div className="absolute right-0 top-full z-[70] w-80 pt-2">
                  <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/15">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Saved ads</p>
                      <span className="text-[10px] font-black text-slate-400">{savedDesignItems.length}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {savedDesignItems.slice(0, 4).map((design) => (
                        <button
                          key={design.id}
                          type="button"
                          onClick={() => onOpenSavedDesign(design)}
                          title={`Open ${design.title}`}
                          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <span
                            className="block h-14 overflow-hidden rounded-xl border border-slate-200"
                            style={{ backgroundColor: design.scene.style.backgroundColor }}
                          >
                            <span
                              className="mx-auto mt-8 block h-2 w-2/3 rounded-full"
                              style={{ backgroundColor: design.scene.style.visualizerColor }}
                            />
                          </span>
                          <span className="mt-2 block truncate text-[11px] font-black text-slate-700">
                            {design.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {design.format}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            </div>

            {saveError ? (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700">
                {saveError}
              </p>
            ) : null}

            {renderBusy ? (
              <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black leading-5 text-slate-500">
                Render worker is turning this frozen scene into an MP4.
              </p>
            ) : null}

            {renderJob?.error || renderError ? (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700">
                {renderJob?.error || renderError}
              </p>
            ) : null}

            <label className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
              <span>Preview</span>
              <select
                value={previewPlatform}
                onChange={(event) => setPreviewPlatform(event.target.value as PreviewPlatform)}
                className="bg-transparent text-sm font-black text-slate-950 outline-none"
                aria-label="Choose preview"
              >
                {previewPlatformOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onRerollScene}
                disabled={!adScenes.length}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Try another
              </button>
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                title="Builder stays legacy-only while v3 /create is stabilized."
              >
                Open in builder
                <ArrowRight className="size-4" />
              </button>
            </div>
          </section>

          <section
            className="mt-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8"
            data-create-share-card="v3"
          >
            <button
              type="button"
              onClick={() => void onCreateShareLink()}
              disabled={!selectedScene || shareStatus === "loading"}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {shareStatus === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : shareStatus === "ready" ? (
                <Check className="size-4" />
              ) : (
                <Link2 className="size-4" />
              )}
              {shareStatus === "loading" ? "Creating share link" : shareStatus === "ready" ? "Share link copied" : "Create share link"}
            </button>

            {shareUrl ? (
              <a
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open share page
                <ExternalLink className="size-4" />
              </a>
            ) : null}

            {shareError ? (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700">
                {shareError}
              </p>
            ) : null}
          </section>

          <section
            className="mt-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8"
            data-create-audio-card="v3"
          >
            <button
              type="button"
              onClick={onOpenAudioPanel}
              disabled={!selectedScene || audioStatus === "loading" || hasGeneratedAudio}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {audioStatus === "loading" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : hasGeneratedAudio ? (
                <Check className="size-5" />
              ) : (
                <Mic className="size-5" />
              )}
              {audioStatusLabel}
            </button>

            {audioError ? (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700">
                {audioError}
              </p>
            ) : null}

            {playableAudioUrl ? (
              <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                <audio
                  ref={audioRef}
                  aria-label="Audio preview"
                  className="w-full"
                  controls
                  preload="metadata"
                  src={playableAudioUrl}
                  onPlay={() => {
                    setIsAudioPlaying(true);
                  }}
                  onPause={(event) => {
                    setIsAudioPlaying(false);
                    setPreviewTimeSeconds(event.currentTarget.currentTime || 1.1);
                  }}
                  onTimeUpdate={(event) => {
                    setPreviewTimeSeconds(event.currentTarget.currentTime);
                  }}
                  onEnded={() => {
                    setIsAudioPlaying(false);
                    if (audioRef.current) audioRef.current.currentTime = 0;
                    setPreviewTimeSeconds(1.1);
                  }}
                />
                <p className="mt-2 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Audio preview syncs captions and visualizer
                </p>
              </div>
            ) : null}

            {hasGeneratedAudio ? (
              <div className="mt-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Captions
                    </p>
                    <p className="mt-1 text-xs font-black leading-5 text-slate-500">
                      Fix typos or wording. Timing stays the same.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Text only
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {generatedCaptions.map((caption, index) => (
                    <label key={`${caption.startMs}-${caption.endMs}`} className="block">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Line {index + 1}
                      </span>
                      <textarea
                        value={caption.text}
                        onChange={(event) => onUpdateCaptionText(index, event.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black leading-5 text-slate-700 outline-none transition focus:border-slate-950 focus:bg-white"
                      />
                    </label>
                  ))}
                </div>
                {hasEmptyEditedCaption ? (
                  <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-700">
                    Empty caption lines will disappear from the preview.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section
            className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
            data-create-creative-brief-card="legacy"
          >
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Creative brief</p>
            {result ? (
              <>
                <div className="mt-3 space-y-3">
                  {creativeBriefHighlights.map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{item.label}</p>
                      <p className="mt-1 text-sm font-black leading-5 text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setBrandDetailsOpen(true)}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
                  >
                    More
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
                Run research to see the brand summary Wiggly will use for ad formats.
              </p>
            )}
          </section>

          {adScenes.length ? (
            <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
              <p className="text-sm font-black uppercase tracking-[0.26em] text-slate-400">All ideas</p>
              <div className="mt-4 grid max-h-[440px] gap-3 overflow-auto pr-2">
                {adScenes.map((scene, index) => (
                  <button
                    type="button"
                    key={`${scene.metadata.generationBatchId}-${scene.metadata.candidateIndex}`}
                    onClick={() => {
                      resetPreviewPlayback();
                      setSelectedScene(scene);
                      setSelectedSceneIndex(index);
                      setAudioStatus(scene.audio.status === "generated" ? "ready" : "idle");
                      setAudioError("");
                      resetDialogueState();
                      resetShareState();
                      resetRenderState();
                    }}
                    className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                      selectedSceneIndex === index
                        ? "border-slate-950 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        {scene.creative.headlineType.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs font-black text-slate-400">
                        #{scene.metadata.candidateIndex + 1}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-black leading-tight text-slate-950">
                      {scene.creative.headline}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-600">
                      {scene.creative.subheadline}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </section>

      {result && brandDetailsOpen ? (
        <BrandDumpModal
          result={result}
          onClose={() => setBrandDetailsOpen(false)}
        />
      ) : null}

      {dialoguePanelOpen && !hasGeneratedAudio ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 px-8 py-8 backdrop-blur-sm"
          data-dialogue-editor="modal"
        >
          <section className="flex max-h-[88vh] w-full max-w-[980px] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.35)]">
            <div className="flex items-start justify-between gap-6 border-b border-slate-100 px-7 py-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Voice script</p>
                <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950">
                  Pick the conversation people will hear.
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
                  Two people talking about this product. Choose an option, edit the lines, then generate audio.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close voice script editor"
                onClick={() => setDialoguePanelOpen(false)}
                className="grid size-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-7 py-6">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4">
                <label
                  className={`inline-flex cursor-pointer items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 ${
                    !selectedScene || audioStatus === "loading" ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {audioStatus === "loading" ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                  Upload your audio
                  <input
                    type="file"
                    accept="audio/*"
                    className="sr-only"
                    disabled={!selectedScene || audioStatus === "loading"}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] || null;
                      event.currentTarget.value = "";
                      void onUploadAudio(file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void onGenerateDialogueScripts()}
                  disabled={dialogueStatus === "loading" || !selectedScene}
                  className="inline-flex items-center justify-center gap-3 rounded-[20px] bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {dialogueStatus === "loading" ? <Loader2 className="size-5 animate-spin" /> : <Wand2 className="size-5" />}
                  {dialogueStatus === "loading" ? "Writing script options" : hasDialogueScripts ? "Rewrite script options" : "Write script options"}
                </button>
                <span className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {dialogueScripts.length ? `${dialogueScripts.length} options` : "No options yet"}
                </span>
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
                Uploaded audio uses this ad's current copy as starter captions. You can edit captions after the audio is attached.
              </p>

              {audioError ? (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black leading-6 text-red-700">
                  {audioError}
                </p>
              ) : null}

              {dialogueError ? (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black leading-6 text-red-700">
                  {dialogueError}
                </p>
              ) : null}

              {hasDialogueScripts ? (
                <>
                  <div className="mt-5 grid grid-cols-5 gap-3" data-dialogue-option-grid="true">
                    {dialogueScripts.map((script, index) => (
                      <button
                        key={`${script.title}-${index}`}
                        type="button"
                        onClick={() => onSelectDialogueScript(index)}
                        className={`min-w-0 rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 ${
                          selectedDialogueIndex === index
                            ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_46px_rgba(15,23,42,0.20)]"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <span className="block text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
                          Option {index + 1}
                        </span>
                        <span className="mt-2 block truncate text-sm font-black">
                          {script.title}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedDialogueScript ? (
                    <div className="mt-6 rounded-[24px] bg-slate-50 p-5">
                      <div className="flex items-start justify-between gap-5">
                        <div>
                          <h3 className="text-2xl font-black leading-tight text-slate-950">
                            {selectedDialogueScript.title}
                          </h3>
                          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
                            {selectedDialogueScript.angle}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void onGenerateAudio()}
                          disabled={!dialogueCanGenerateAudio || audioStatus === "loading"}
                          className="inline-flex shrink-0 items-center justify-center gap-3 rounded-[18px] bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {audioStatus === "loading" ? <Loader2 className="size-5 animate-spin" /> : <Mic className="size-5" />}
                          Generate this audio
                        </button>
                      </div>

                      <div className="mt-5 grid gap-4">
                        {selectedDialogueScript.lines.map((line, index) => (
                          <label key={`${line.speaker}-${index}`} className="grid grid-cols-[150px_1fr] gap-4 rounded-[20px] border border-slate-200 bg-white p-4">
                            <span>
                              <span className="block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                {line.speaker}
                              </span>
                              <span className="mt-2 block rounded-full bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                {line.tone}
                              </span>
                            </span>
                            <textarea
                              value={line.text}
                              onChange={(event) => onUpdateDialogueLineText(index, event.target.value)}
                              rows={3}
                              className="min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold leading-7 text-slate-800 outline-none transition focus:border-slate-950 focus:bg-white"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-5 rounded-[22px] bg-slate-50 px-5 py-4 text-sm font-black leading-6 text-slate-500">
                  Start by writing script options. Nothing is generated until you choose one.
                </p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function BrandDumpModal({
  result,
  onClose,
}: {
  result: StoredWebsiteResearchResult;
  onClose: () => void;
}) {
  const brandImages = getBrandDumpImages(result);
  const usefulClaims = getUsefulClaims(result);
  const fonts = uniqueNonEmptyStrings([
    result.brand.fonts.heading ? `Heading: ${result.brand.fonts.heading}` : null,
    result.brand.fonts.body ? `Body: ${result.brand.fonts.body}` : null,
    result.brand.fonts.feel !== "unknown" ? `Feel: ${result.brand.fonts.feel}` : null,
  ]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4"
      data-brand-dump-modal="legacy"
      role="dialog"
      aria-modal="true"
      aria-label="Full brand dump"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-2xl shadow-slate-950/30">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Full brand dump</p>
            <h2 className="mt-1 text-3xl font-black leading-tight text-slate-950">{result.brand.name}</h2>
            <p className="mt-1 max-w-2xl text-base font-bold text-slate-600">{result.finalUrl}</p>
          </div>
          <button
            type="button"
            aria-label="Close brand dump"
            onClick={onClose}
            className="grid size-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[0.92fr_1.08fr]">
          <div className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50/70 px-6 py-5">
            <div className="grid gap-5">
              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Images Firecrawl found</h3>
                {brandImages.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {brandImages.map((imageUrl) => (
                      <a
                        key={imageUrl}
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt=""
                          className="h-28 w-full object-contain p-3 transition group-hover:scale-105"
                          src={imageUrl}
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">[]</p>
                )}
              </section>

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Colors</h3>
                {result.brand.colors.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.brand.colors.map((color) => (
                      <span
                        key={color}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500"
                      >
                        <span className="size-4 rounded-full border border-slate-200" style={{ backgroundColor: color }} />
                        {color}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">[]</p>
                )}
              </section>

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <EvidenceList title="Fonts" items={fonts} />
                <div className="mt-5">
                  <EvidenceList title="Vibe tags" items={result.brand.vibeTags} />
                </div>
              </section>

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Provider status</h3>
                {result.providerStatus.length ? (
                  <div className="mt-3 grid gap-2">
                    {result.providerStatus.map((provider) => (
                      <div key={`${provider.provider}-${provider.reason}`} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                          {provider.provider} · {provider.status}
                        </p>
                        <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{provider.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">[]</p>
                )}
              </section>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto bg-white px-6 py-5">
            <div className="grid gap-5">
              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-base font-black leading-7 text-slate-700">{result.brand.description}</p>
              </section>

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <EvidenceList title="Useful claims" items={usefulClaims} />
              </section>

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-5">
                  <EvidenceList title="Offer" items={[result.brandBrief.offer]} />
                  <EvidenceList title="Audience" items={[result.brandBrief.audience]} />
                  <EvidenceList title="Buyer moments" items={result.brandBrief.buyerMoments} />
                  <EvidenceList title="Proof" items={result.brandBrief.proof} />
                  <EvidenceList title="Site language" items={result.brandBrief.siteLanguage} />
                  <EvidenceList title="CTA direction" items={[result.brandBrief.ctaDirection]} />
                  <EvidenceList title="Visual notes" items={result.brandBrief.visualNotes} />
                  <EvidenceList title="Ignored junk" items={result.brandBrief.droppedNoiseSummary} />
                </div>
              </section>

              <JsonDump title="Metadata JSON" value={result.metadata} />
              <JsonDump title="Branding JSON" value={result.branding} />
              <TextDump title="Raw website text" value={result.evidence.rawMarkdown} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function JsonDump({ title, value }: { title: string; value: unknown }) {
  return <TextDump title={title} value={summarizeJson(value)} />;
}

function TextDump({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 px-4 py-3 text-xs font-bold leading-5 text-slate-100">
        {value.trim() || "[]"}
      </pre>
    </section>
  );
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  const cleanedItems = items.map((item) => item.trim()).filter(Boolean);

  return (
    <section>
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">{title}</h3>
      {cleanedItems.length ? (
        <ul className="mt-3 grid gap-2">
          {cleanedItems.map((item) => (
            <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">[]</p>
      )}
    </section>
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
