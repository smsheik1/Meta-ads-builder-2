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
import { CreateActionCard } from "./CreateActionCard";
import { CreateAudioCard } from "./CreateAudioCard";
import { CreateCaptionModal } from "./CreateCaptionModal";
import { BrandDumpModal } from "./CreateBrandDumpModal";
import { CreateCanvasColumn } from "./CreateCanvasColumn";
import { CreateCreativeBriefCard } from "./CreateCreativeBriefCard";
import { CreateDialogueModal } from "./CreateDialogueModal";
import { CreateIdeasList } from "./CreateIdeasList";
import { CreateLeftColumn } from "./CreateLeftColumn";
import type { PreviewPlatform } from "./CreatePreviewChrome";
import { WigglyMark } from "./WigglyMark";
import {
  fallbackCaptionColors,
  getNextDistinctColor,
  getSceneDefaultFlashSlots,
  getSceneFormatInteraction,
  getSceneSelectableSlots,
} from "./createFormatInteraction";
import {
  getAnonymousId,
  loadCreateSessionSnapshot,
  saveCreateSessionSnapshot,
} from "./createSession";

const rerollFlashMs = 680;

const researchTimeoutMessage = "That site took too long to read. Try again, or paste a more specific public page from the same brand.";
const fallbackUploadedAudioDurationMs = 8000;

type AdSceneGenerationResponse = {
  scenes: AdScene[];
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
  const [captionPanelOpen, setCaptionPanelOpen] = useState(false);
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
  const analysisUpgradeKeyRef = useRef("");
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
    setCaptionPanelOpen(false);
    setDialogueStatus("idle");
    setDialogueScripts([]);
    setSelectedDialogueIndex(0);
    setDialogueError("");
  };

  const resetAudioState = () => {
    setAudioStatus("idle");
    setAudioError("");
    setBrandDetailsOpen(false);
    setCaptionPanelOpen(false);
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

  const applyGeneratedScenes = (scenes: AdScene[]) => {
    if (!scenes.length) throw new Error("Ad idea generation returned no ads.");

    const firstScene = scenes[0] || null;
    setAdScenes(scenes);
    setSelectedScene(firstScene);
    setSelectedSceneIndex(0);
    resetCanvasInteraction();
    setRerollCount(0);
    resetShareState();
    resetRenderState();
    resetAudioState();
    resetSaveState();
    setAdStatusNote(`${scenes.length} ads ready. Press spacebar to find a stronger version.`);
    setAdStatus("ready");
  };

  const generateScenesForResearch = async (researchRunId: Id<"researchRuns">, count = 50) => {
    const nextGeneration = await generateAdScenes({
      researchRunId,
      count,
    }) as AdSceneGenerationResponse;

    applyGeneratedScenes(nextGeneration.scenes || []);
  };

  useCanvasKeyboard({
    editorScopeRef: createEditorScopeRef,
    enabled: adScenes.length > 0 && !brandDetailsOpen && !dialoguePanelOpen && !captionPanelOpen,
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
    let researchCompleted = false;

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
      researchCompleted = true;
      setAdStatus("loading");
      await generateScenesForResearch(nextResult.researchRunId as Id<"researchRuns">, 50);
    } catch (nextError) {
      const message = getResearchActionErrorMessage(nextError);
      if (researchCompleted) {
        setStatus("ready");
        setAdStatus("error");
        setError(message);
      } else {
        setStatus("error");
        setError(message);
      }
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
  const dialogueCanGenerateAudio = Boolean(selectedScene && selectedDialogueScript && selectedDialogueScript.lines.some((line) => line.text.trim()));
  const selectedSavedDesignId = selectedScene ? createSavedDesignId(selectedScene) : "";
  const selectedDesignIsSaved = Boolean(selectedSavedDesignId && savedDesignItems.some((design) => design.id === selectedSavedDesignId));
  const saveStatusLabel = saveStatus === "loading"
    ? "Saving"
    : saveStatus === "ready" || selectedDesignIsSaved
      ? "Saved"
      : "Save";
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
        <CreateLeftColumn
          adScenesCount={adScenes.length}
          adStatus={adStatus}
          error={error}
          onSubmit={onSubmit}
          onUrlChange={setUrl}
          status={status}
          url={url}
        />

        <CreateCanvasColumn
          adScenesCount={adScenes.length}
          isAudioPlaying={isAudioPlaying}
          onChangePreviewBackgroundColor={onChangePreviewBackgroundColor}
          onChangePreviewSlotColor={onChangePreviewSlotColor}
          onOpenAudioPanel={onOpenAudioPanel}
          onRerollScene={onRerollScene}
          onSelectPreviewSlot={onSelectPreviewSlot}
          onTogglePlayback={onTogglePreviewPlayback}
          onTogglePreviewSlotLock={onTogglePreviewSlotLock}
          playableAudioUrl={playableAudioUrl}
          previewPlatform={previewPlatform}
          previewTimeSeconds={previewTimeSeconds}
          rerollCount={rerollCount}
          rerollFlash={rerollFlash}
          result={result}
          sceneLocks={sceneLocks}
          selectedPreviewSlot={selectedPreviewSlot}
          selectedScene={selectedScene}
        />

        <aside className="pt-28">
          <CreateActionCard
            currentRenderStatus={currentRenderStatus}
            hasGeneratedAudio={hasGeneratedAudio}
            hasSelectedScene={Boolean(selectedScene)}
            isAudioPlaying={isAudioPlaying}
            onCreateRenderJob={() => void onCreateRenderJob()}
            onCreateShareLink={() => void onCreateShareLink()}
            onOpenCaptionEditor={() => setCaptionPanelOpen(true)}
            onOpenSavedDesign={onOpenSavedDesign}
            onPreviewPlatformChange={setPreviewPlatform}
            onSaveSelectedDesign={() => void onSaveSelectedDesign()}
            onSavedDesignsBlur={closeSavedDesignsOnBlur}
            onSavedDesignsOpenChange={setSavedDesignsOpen}
            onTogglePreviewPlayback={onTogglePreviewPlayback}
            playableAudioUrl={playableAudioUrl}
            previewPlatform={previewPlatform}
            renderBusy={renderBusy}
            renderDownloadUrl={renderDownloadUrl}
            renderErrorMessage={renderJob?.error || renderError}
            renderStatusLabel={renderStatusLabel}
            saveError={saveError}
            savedDesignItems={savedDesignItems}
            savedDesignsOpen={savedDesignsOpen}
            saveStatus={saveStatus}
            saveStatusLabel={saveStatusLabel}
            selectedDesignIsSaved={selectedDesignIsSaved}
            shareError={shareError}
            shareStatus={shareStatus}
            shareUrl={shareUrl}
          />

          <CreateAudioCard
            audioError={audioError}
            audioRef={audioRef}
            onAudioEnded={() => {
              setIsAudioPlaying(false);
              if (audioRef.current) audioRef.current.currentTime = 0;
              setPreviewTimeSeconds(1.1);
            }}
            onAudioPause={(currentTime) => {
              setIsAudioPlaying(false);
              setPreviewTimeSeconds(currentTime);
            }}
            onAudioPlay={() => {
              setIsAudioPlaying(true);
            }}
            onAudioTimeUpdate={setPreviewTimeSeconds}
            playableAudioUrl={playableAudioUrl}
          />

          <CreateCreativeBriefCard
            onOpenDetails={() => setBrandDetailsOpen(true)}
            result={result}
          />

          <CreateIdeasList
            scenes={adScenes}
            selectedSceneIndex={selectedSceneIndex}
            onSelectScene={onSelectAdIdea}
          />
        </aside>
      </section>

      {result && brandDetailsOpen ? (
        <BrandDumpModal
          result={result}
          onClose={() => setBrandDetailsOpen(false)}
        />
      ) : null}

      {dialoguePanelOpen && !hasGeneratedAudio ? (
        <CreateDialogueModal
          audioError={audioError}
          audioStatus={audioStatus}
          canGenerateAudio={dialogueCanGenerateAudio}
          dialogueError={dialogueError}
          dialogueScripts={dialogueScripts}
          dialogueStatus={dialogueStatus}
          hasSelectedScene={Boolean(selectedScene)}
          onClose={() => setDialoguePanelOpen(false)}
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
          onClose={() => setCaptionPanelOpen(false)}
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
