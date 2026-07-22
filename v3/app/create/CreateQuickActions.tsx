"use client";
import {
  AudioLines,
  BookmarkPlus,
  Check,
  Clapperboard,
  Download,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Play,
  RefreshCw,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SavedAdSceneDesign } from "@/features/create/savedDesigns";
import type { BrickStoryboard } from "@/features/formats/jingle/storyboard";
import { getThreeDAnchorPrompt, getThreeDStoryboardPrompt, type ThreeDBreakdownMediaPromptTarget } from "@/features/formats/three-d-breakdown/editablePrompts";
import type { ThreeDBreakdownStoryDirection } from "@/features/formats/three-d-breakdown/storyDirections";
import type { ThreeDBreakdownStorySubject } from "@/features/formats/three-d-breakdown/storySubject";
import type { ProductCatalog } from "@/features/research/types";
import type { AdFormatId, ThreeDBreakdownAdScene, ThreeDBreakdownClipIndex } from "@/features/scene/types";
import { CreateAssemblyLine, type CreateAssemblyStageStatus } from "./CreateAssemblyLine";
import { CreateBrickStoryboardSheet } from "./CreateBrickStoryboardSheet";
import { CreateThreeDBreakdownSubjectPicker } from "./CreateThreeDBreakdownSubjectPicker";
import { ThreeDBreakdownStoryDirectionsCard } from "./ThreeDBreakdownStoryDirectionsCard";
import { ThreeDBreakdownMediaPromptEditor } from "./ThreeDBreakdownMediaPromptEditor";
import { ThreeDBreakdownScriptEditor } from "./ThreeDBreakdownScriptEditor";
type SaveStatus = "idle" | "loading" | "ready" | "error";
type BrickStoryboardStatus = "idle" | "loading" | "ready" | "error";
type ThreeDImageGenerationMode = "storyboard" | "anchors" | "anchor-1" | "anchor-2" | "all";
const statusBannerBaseClass = "rounded-2xl border px-4 py-3 text-xs font-black leading-5";
const formatSavedDate = (timestamp: number) => new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
}).format(new Date(timestamp));

const getAssemblyStageStatus = (ready: boolean, failed: boolean, building: boolean): CreateAssemblyStageStatus =>
  ready ? "ready" : failed ? "failed" : building ? "building" : "needs";

export function CreateQuickActions({
  currentRenderStatus,
  hasSelectedScene,
  isAudioPlaying,
  onCreateRenderJob,
  onCreateShareLink,
  onAnimateBrickStoryboard,
  onBuildBrickMusicVideo,
  onDownloadStaticPng,
  onGenerateBrickStoryboard,
  onGenerateThreeDClip,
  onRegenerateBrickShot,
  onRegenerateBrickShotVideo,
  onGenerateThreeDImages,
  onRegenerateVisualizerAudio,
  onLoadSavedDesign,
  onOpenAudioPanel,
  onSaveSelectedDesign,
  onThreeDMediaPromptChanged,
  onThreeDScriptBeatChanged,
  onTogglePreviewPlayback,
  productCatalog,
  audioStatus,
  playableAudioUrl,
  renderBusy,
  renderDownloadUrl,
  renderErrorMessage,
  renderStatusLabel,
  renderWorkerHealthy,
  audioError,
  brickStoryboard,
  brickStoryboardAnimationStatus,
  brickStoryboardBuildStatus,
  brickStoryboardError,
  brickStoryboardShotBusyIndex,
  brickStoryboardVideoBusyIndex,
  brickStoryboardStatus,
  canGenerateBrickStoryboard,
  threeDAnimationStatus,
  threeDClipBusyIndex,
  threeDError,
  threeDImageStatus,
  threeDScene,
  threeDStorySlateActive,
  threeDStoryDirectionError,
  threeDStoryDirections,
  threeDStoryDirectionStatus,
  threeDStorySubject,
  staticPngDownloadBusy,
  onSelectThreeDStoryDirection,
  onUseThreeDStoryDirection,
  onChooseThreeDStorySubject,
  saveCounterLabel,
  saveError,
  savedDesigns,
  saveStatus,
  saveStatusLabel,
  selectedFormat,
  selectedDesignIsSaved,
  selectedThreeDStoryDirectionId,
  shareError,
  shareStatus,
  shareUrl,
}: {
  currentRenderStatus: string;
  hasSelectedScene: boolean;
  isAudioPlaying: boolean;
  onCreateRenderJob: () => void;
  onCreateShareLink: () => void;
  onAnimateBrickStoryboard: () => void;
  onBuildBrickMusicVideo: () => void;
  onDownloadStaticPng: () => void;
  onGenerateBrickStoryboard: () => void;
  onGenerateThreeDClip: (clipIndex: ThreeDBreakdownClipIndex) => void;
  onRegenerateBrickShot: (shotIndex: number) => void;
  onRegenerateBrickShotVideo: (shotIndex: number) => void;
  onGenerateThreeDImages: (mode?: ThreeDImageGenerationMode) => void;
  onRegenerateVisualizerAudio: () => void;
  onLoadSavedDesign: (design: SavedAdSceneDesign) => void;
  onOpenAudioPanel: () => void;
  onSaveSelectedDesign: () => void;
  onThreeDMediaPromptChanged: (target: ThreeDBreakdownMediaPromptTarget, prompt: string) => void;
  onThreeDScriptBeatChanged: (beatIndex: number, narration: string) => void;
  onTogglePreviewPlayback: () => void;
  productCatalog: ProductCatalog | null | undefined;
  audioStatus: "idle" | "loading" | "ready" | "error";
  playableAudioUrl: string;
  renderBusy: boolean;
  renderDownloadUrl: string;
  renderErrorMessage: string;
  renderStatusLabel: string;
  renderWorkerHealthy: boolean | null;
  audioError: string;
  brickStoryboard: BrickStoryboard | null;
  brickStoryboardAnimationStatus: BrickStoryboardStatus;
  brickStoryboardBuildStatus: BrickStoryboardStatus;
  brickStoryboardError: string;
  brickStoryboardShotBusyIndex: number | null;
  brickStoryboardVideoBusyIndex: number | null;
  brickStoryboardStatus: BrickStoryboardStatus;
  canGenerateBrickStoryboard: boolean;
  threeDAnimationStatus: BrickStoryboardStatus;
  threeDClipBusyIndex: number | null;
  threeDError: string;
  threeDImageStatus: BrickStoryboardStatus;
  threeDScene: ThreeDBreakdownAdScene | null;
  threeDStorySlateActive: boolean;
  threeDStoryDirectionError: string;
  threeDStoryDirections: ThreeDBreakdownStoryDirection[];
  threeDStoryDirectionStatus: BrickStoryboardStatus;
  threeDStorySubject: ThreeDBreakdownStorySubject | null;
  staticPngDownloadBusy: boolean;
  onSelectThreeDStoryDirection: (directionId: string) => void;
  onUseThreeDStoryDirection: (direction: ThreeDBreakdownStoryDirection) => void;
  onChooseThreeDStorySubject: (subject: ThreeDBreakdownStorySubject) => void;
  saveCounterLabel: string;
  saveError: string;
  savedDesigns: SavedAdSceneDesign[];
  saveStatus: SaveStatus;
  saveStatusLabel: string;
  selectedFormat: AdFormatId | null;
  selectedDesignIsSaved: boolean;
  selectedThreeDStoryDirectionId: string;
  shareError: string;
  shareStatus: "idle" | "loading" | "ready" | "error";
  shareUrl: string;
}) {
  const staticPngSelected = selectedFormat === "meme" || selectedFormat === "text-message" || selectedFormat === "reviews" || selectedFormat === "were-sorry";
  const hasPlayableAudio = Boolean(playableAudioUrl);
  const hasThreeDVoiceover = threeDScene?.audio.status === "generated";
  const hasPreviewMedia = hasPlayableAudio || (selectedFormat === "three-d-breakdown" && Boolean(renderDownloadUrl));
  const generatedAudioPending = !hasPlayableAudio && audioStatus === "loading";
  const visualizerAudioReady = selectedFormat === "visualizer" && hasPlayableAudio;
  const shareSupported = staticPngSelected || selectedFormat === "visualizer" || selectedFormat === "motion-story" || ((selectedFormat === "jingle" || selectedFormat === "brainrot") && hasPlayableAudio) || (selectedFormat === "three-d-breakdown" && hasThreeDVoiceover);
  const showBrickStoryboard = selectedFormat === "jingle";
  const showThreeDStorySlateStage = threeDStorySlateActive;
  const showThreeDStorySubjectPicker = showThreeDStorySlateStage && !threeDStorySubject;
  const showThreeDStoryDirections = showThreeDStorySlateStage && Boolean(threeDStorySubject) && (threeDStoryDirections.length > 0 || threeDStoryDirectionStatus === "loading" || Boolean(threeDStoryDirectionError));
  const showThreeDBreakdownAssembly = selectedFormat === "three-d-breakdown" && threeDScene;
  const threeDClipPlans = threeDScene?.layout.clipPlans || [];
  const threeDClipsReady = threeDClipPlans.length > 0 && threeDClipPlans.every((clipPlan) => clipPlan.video?.status === "ready");
  const threeDVoiceoverBlocked = selectedFormat === "three-d-breakdown" && !hasThreeDVoiceover;
  const threeDRenderBlocked = selectedFormat === "three-d-breakdown" && (!threeDClipsReady || threeDVoiceoverBlocked);
  const renderWorkerOffline = hasSelectedScene && !staticPngSelected && renderWorkerHealthy === false;
  const renderButtonDisabled = !hasSelectedScene || renderBusy || renderWorkerOffline || threeDRenderBlocked;
  const activeRenderDownloadUrl = staticPngSelected ? "" : renderDownloadUrl;
  const downloadLabel = staticPngSelected ? "PNG" : "MP4";
  const downloadTitle = staticPngSelected
    ? "Download this static ad as a PNG"
    : threeDVoiceoverBlocked
      ? "Add the documentary voiceover before building the MP4."
      : threeDRenderBlocked
      ? "Generate the storyboard, production anchors, and Seedance clips before building the MP4."
      : renderWorkerOffline
      ? "Start npm run dev from the repo root to run the render worker."
      : "Download this ad as an MP4";
  const banners = [
    audioError ? { id: "audio-error", className: "border-red-100 bg-red-50 text-red-700", message: audioError } : null,
    saveError ? { id: "save-error", className: "border-red-100 bg-red-50 text-red-700", message: saveError } : null,
    shareError ? { id: "share-error", className: "border-red-100 bg-red-50 text-red-700", message: shareError } : null,
    renderErrorMessage ? { id: "render-error", className: "border-red-100 bg-red-50 text-red-700", message: renderErrorMessage } : null,
    renderWorkerOffline
      ? { id: "render-worker-offline", className: "border-amber-100 bg-amber-50 text-amber-800", message: "Render worker is offline. Start npm run dev from the repo root before downloading videos." }
      : null,
    renderBusy ? { id: "render-busy", className: "border-sky-100 bg-sky-50 text-sky-800", message: "Rendering this frozen scene into an MP4." } : null,
  ].filter(Boolean).slice(0, 2) as Array<{ id: string; className: string; message: string }>;

  return (
    <section className="space-y-3" data-create-quick-actions="v3">
      {!showThreeDStorySlateStage ? (
        <div
          className="grid grid-cols-4 gap-2 rounded-[1.35rem] border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/8"
          data-create-global-actions="true"
        >
        <button
          type="button"
          onClick={hasPreviewMedia ? onTogglePreviewPlayback : onOpenAudioPanel}
          disabled={(hasPreviewMedia && !hasSelectedScene) || generatedAudioPending}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={hasPreviewMedia ? (isAudioPlaying ? "Stop video preview" : "Play video preview") : generatedAudioPending ? "Audio pending" : "Add audio for this ad"}
          title={hasPreviewMedia ? (isAudioPlaying ? "Stop video preview" : "Play video preview") : generatedAudioPending ? "Generated audio is still being created." : "Add audio for this ad"}
        >
          {hasPreviewMedia ? <Play className="size-4" /> : <AudioLines className="size-4" />}
          {hasPreviewMedia ? (isAudioPlaying ? "Stop" : "Play") : generatedAudioPending ? "Audio pending" : "Add audio"}
        </button>

        <button
          type="button"
          onClick={onSaveSelectedDesign}
          disabled={!hasSelectedScene || saveStatus === "loading"}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={selectedDesignIsSaved ? "Saved design" : "Save design"}
          title={saveCounterLabel ? `${selectedDesignIsSaved ? "Saved to designs" : "Save this design"} ${saveCounterLabel}` : selectedDesignIsSaved ? "Saved to designs" : "Save this design"}
        >
          {saveStatus === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saveStatus === "ready" || selectedDesignIsSaved ? (
            <Check className="size-4 text-emerald-500" />
          ) : (
            <BookmarkPlus className="size-4" />
          )}
          <span>{saveCounterLabel ? `${saveStatusLabel} ${saveCounterLabel}` : saveStatusLabel}</span>
        </button>

        {shareUrl ? (
          <a
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50"
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open share page"
            title="Open share page"
          >
            <ExternalLink className="size-4" />
            Share
          </a>
        ) : (
          <button
            type="button"
            onClick={onCreateShareLink}
            disabled={!hasSelectedScene || shareStatus === "loading" || !shareSupported}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={shareStatus === "ready" ? "Share link copied" : "Create share link"}
            title={shareSupported ? "Create share link" : "Share pages are coming next for this format."}
          >
            {shareStatus === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
            Share
          </button>
        )}

        {activeRenderDownloadUrl ? (
          <a
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-950 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-slate-800"
            href={activeRenderDownloadUrl}
            download
            aria-label="Download MP4"
            title="Download MP4"
            data-create-download-action="true"
          >
            <ExternalLink className="size-4" />
            MP4
          </a>
        ) : (
          <button
            type="button"
            onClick={staticPngSelected ? onDownloadStaticPng : onCreateRenderJob}
            disabled={staticPngSelected ? !hasSelectedScene || staticPngDownloadBusy : renderButtonDisabled}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-950 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={staticPngSelected ? "Download PNG" : renderStatusLabel}
            title={downloadTitle}
            data-create-download-action="true"
          >
            {staticPngDownloadBusy || renderBusy || currentRenderStatus === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : currentRenderStatus === "ready" ? (
              <Check className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            {downloadLabel}
          </button>
        )}
        </div>
      ) : null}

      {visualizerAudioReady ? (
        <button
          type="button"
          onClick={onRegenerateVisualizerAudio}
          disabled={!hasSelectedScene || audioStatus === "loading"}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-lg shadow-slate-950/5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Regenerate visualizer audio"
          title="Regenerate the one-shot voiceover for this visualizer ad"
        >
          {audioStatus === "loading" ? <Loader2 className="size-4 animate-spin" /> : <AudioLines className="size-4" />}
          {audioStatus === "loading" ? "Regenerating audio" : "Regenerate audio"}
        </button>
      ) : null}

      {banners.map((banner) => (
        <p
          key={banner.id}
          className={`${statusBannerBaseClass} ${banner.className}`}
          data-create-status-banner={banner.id}
        >
          {banner.message}
        </p>
      ))}

      {showBrickStoryboard ? (
        <CreateBrickStoryboardSheet
          brickStoryboard={brickStoryboard}
          brickStoryboardAnimationStatus={brickStoryboardAnimationStatus}
          brickStoryboardBuildStatus={brickStoryboardBuildStatus}
          brickStoryboardError={brickStoryboardError}
          brickStoryboardShotBusyIndex={brickStoryboardShotBusyIndex}
          brickStoryboardVideoBusyIndex={brickStoryboardVideoBusyIndex}
          brickStoryboardStatus={brickStoryboardStatus}
          canGenerateBrickStoryboard={canGenerateBrickStoryboard}
          onAnimateBrickStoryboard={onAnimateBrickStoryboard}
          onBuildBrickMusicVideo={onBuildBrickMusicVideo}
          onGenerateBrickStoryboard={onGenerateBrickStoryboard}
          onRegenerateBrickShot={onRegenerateBrickShot}
          onRegenerateBrickShotVideo={onRegenerateBrickShotVideo}
        />
      ) : null}

      {showThreeDStorySubjectPicker ? (
        <CreateThreeDBreakdownSubjectPicker catalog={productCatalog} onContinue={onChooseThreeDStorySubject} />
      ) : null}

      {showThreeDStoryDirections ? (
        <ThreeDBreakdownStoryDirectionsCard
          directions={threeDStoryDirections}
          error={threeDStoryDirectionError}
          onSelectDirection={onSelectThreeDStoryDirection}
          onUseDirection={onUseThreeDStoryDirection}
          selectedDirectionId={selectedThreeDStoryDirectionId}
          status={threeDStoryDirectionStatus}
        />
      ) : null}

      {showThreeDBreakdownAssembly ? (
        <ThreeDBreakdownAssemblyCard
          animationStatus={threeDAnimationStatus}
          currentRenderStatus={currentRenderStatus}
          error={threeDError}
          hasVoiceover={hasThreeDVoiceover}
          imageStatus={threeDImageStatus}
          onAddVoice={onOpenAudioPanel}
          onBuildFinalVideo={onCreateRenderJob}
          onGenerateClip={onGenerateThreeDClip}
          onGenerateImages={onGenerateThreeDImages}
          onMediaPromptChanged={onThreeDMediaPromptChanged}
          onScriptBeatChanged={onThreeDScriptBeatChanged}
          renderBusy={renderBusy}
          scene={threeDScene}
          scriptEditingDisabled={audioStatus === "loading" || threeDImageStatus === "loading" || threeDAnimationStatus === "loading" || renderBusy}
          threeDClipBusyIndex={threeDClipBusyIndex}
        />
      ) : null}

      {!showThreeDStorySlateStage ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-between rounded-2xl border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-lg shadow-slate-950/5"
              data-create-saved-library-trigger="true"
            >
              <span>Saved designs</span>
              <Badge variant="secondary" className="rounded-full font-black">
                {savedDesigns.length}
              </Badge>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[380px] border-slate-200 bg-white p-0 sm:max-w-[420px]">
            <SheetHeader className="border-b border-slate-200 px-5 py-5 text-left">
              <SheetTitle className="text-2xl font-black tracking-tight text-slate-950">
                Saved designs
              </SheetTitle>
              <SheetDescription className="font-semibold text-slate-500">
                Open a saved ad back onto the canvas.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="space-y-3 p-4">
              {savedDesigns.length ? savedDesigns.map((design) => (
                <SheetClose key={design.id} asChild>
                  <button
                    type="button"
                    onClick={() => onLoadSavedDesign(design)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                    data-create-saved-design-item={design.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-black leading-snug text-slate-950">
                        {design.title}
                      </p>
                      <Badge variant="outline" className="shrink-0 rounded-full text-[10px] font-black uppercase">
                        {design.format.replace(/-/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                      {design.scene.brand.name} · saved {formatSavedDate(design.updatedAt)}
                    </p>
                  </button>
                </SheetClose>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-black text-slate-950">No saved designs yet.</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                    Save an ad, then it will show up here.
                  </p>
                </div>
              )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  );
}

function ThreeDBreakdownAssemblyCard({
  animationStatus,
  currentRenderStatus,
  error,
  imageStatus,
  onAddVoice,
  onBuildFinalVideo,
  onGenerateClip,
  onGenerateImages,
  onMediaPromptChanged,
  onScriptBeatChanged,
  hasVoiceover,
  renderBusy,
  scene,
  scriptEditingDisabled,
  threeDClipBusyIndex,
}: {
  animationStatus: BrickStoryboardStatus;
  currentRenderStatus: string;
  error: string;
  imageStatus: BrickStoryboardStatus;
  onAddVoice: () => void;
  onBuildFinalVideo: () => void;
  onGenerateClip: (clipIndex: ThreeDBreakdownClipIndex) => void;
  onGenerateImages: (mode?: ThreeDImageGenerationMode) => void;
  onMediaPromptChanged: (target: ThreeDBreakdownMediaPromptTarget, prompt: string) => void;
  onScriptBeatChanged: (beatIndex: number, narration: string) => void;
  hasVoiceover: boolean;
  renderBusy: boolean;
  scene: ThreeDBreakdownAdScene;
  scriptEditingDisabled: boolean;
  threeDClipBusyIndex: number | null;
}) {
  const storyboardBoard = scene.layout.storyboardBoard;
  const storyboardFrames = storyboardBoard?.frames || [];
  const clipPlans = scene.layout.clipPlans || [];
  const requiredFrameIndexes = Array.from(new Set(clipPlans.map((clipPlan) => clipPlan.frameIndexes[0]).filter(Boolean)));
  const requiredFrames = requiredFrameIndexes.length
    ? storyboardFrames.filter((frame) => requiredFrameIndexes.includes(frame.frameIndex))
    : storyboardFrames;
  const framesReady = requiredFrames.length > 0 && requiredFrames.every((frame) => frame.image?.status === "ready");
  const framesFailed = storyboardFrames.some((frame) => frame.image?.status === "failed");
  const failedFrames = storyboardFrames.filter((frame) => frame.image?.status === "failed");
  const getPreviousClipReady = (clipIndex: ThreeDBreakdownClipIndex) => {
    if (clipIndex === 1) return true;
    const previousClipIndex = (clipIndex - 1) as ThreeDBreakdownClipIndex;
    return clipPlans.some((clipPlan) => clipPlan.clipIndex === previousClipIndex && clipPlan.video?.status === "ready");
  };
  const nextClipPlan = clipPlans.find((clipPlan) => clipPlan.video?.status !== "ready");
  const videosReady = clipPlans.length > 0 && clipPlans.every((clipPlan) => clipPlan.video?.status === "ready");
  const finalReady = currentRenderStatus === "ready";
  const storyboardBoardStatus = storyboardBoard?.image?.status || "idle";
  const isPresenterStyle = scene.layout.storyContract.visualStyle === "presenter-teardown-vsl";
  const storyboardBoardReady = storyboardBoardStatus === "ready";
  const storyboardBoardFailed = storyboardBoardStatus === "failed";
  const storyboardPrompt = storyboardBoard ? getThreeDStoryboardPrompt(storyboardBoard) : "";
  const storyboardPromptReady = Boolean(storyboardPrompt.trim());
  const anchorPromptsReady = requiredFrames.length > 0 && requiredFrames.every((frame) => getThreeDAnchorPrompt(frame).trim());
  const scriptReady = scene.layout.scriptBeats.every((beat) => beat.narration.trim());
  const storyboardHelperCopy = isPresenterStyle
    ? storyboardBoardReady
      ? framesReady
        ? "Storyboard and production anchors are ready for animation."
        : "Storyboard is ready. Generate production anchors only after the board looks right."
      : "Generate the six-panel storyboard first. Stop here until it matches the reference."
    : "Generate the production frames before animation.";
  const storyDirectionNumber = (scene.metadata.candidateIndex ?? 0) + 1;
  const storyboardStageStatus = getAssemblyStageStatus(
    storyboardBoardReady,
    storyboardBoardFailed || (!storyboardBoardReady && imageStatus === "error"),
    !storyboardBoardReady && imageStatus === "loading",
  );
  const anchorsStageStatus = getAssemblyStageStatus(
    framesReady,
    framesFailed || (storyboardBoardReady && imageStatus === "error"),
    imageStatus === "loading",
  );
  const clipsFailed = clipPlans.some((clipPlan) => clipPlan.video?.status === "failed");
  const clipsStageStatus = getAssemblyStageStatus(
    videosReady,
    clipsFailed || animationStatus === "error",
    threeDClipBusyIndex !== null || animationStatus === "loading",
  );
  const finalStageStatus = getAssemblyStageStatus(
    finalReady,
    currentRenderStatus === "failed" || currentRenderStatus === "error",
    renderBusy,
  );
  const scriptContent = (
    <div className="space-y-2">
      <p className="text-xs font-bold leading-5 text-slate-500">
        Story direction {storyDirectionNumber}. Press Spacebar to compare before generating images.
      </p>
      <ThreeDBreakdownScriptEditor
        disabled={scriptEditingDisabled}
        onBeatChanged={onScriptBeatChanged}
        scriptBeats={scene.layout.scriptBeats}
      />
    </div>
  );
  const storyboardContent = (
    <div className="space-y-3">
      <p className="text-xs font-bold leading-5 text-slate-500">{storyboardHelperCopy}</p>
      {storyboardBoard ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" data-three-d-storyboard-board="true">
          <div className="p-3">
            <ThreeDBreakdownMediaPromptEditor
              disabled={scriptEditingDisabled}
              label="Storyboard creative prompt"
              onChange={(prompt) => onMediaPromptChanged({ kind: "storyboard" }, prompt)}
              prompt={storyboardPrompt}
              rows={8}
              target="storyboard"
            />
          </div>
          {storyboardBoard.image?.url ? (
            <img src={storyboardBoard.image.url} alt="3D Breakdown storyboard board" className="aspect-[9/16] w-full object-cover" />
          ) : (
            <div className="grid aspect-[9/16] place-items-center bg-slate-100 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
              {imageStatus === "loading" ? <Loader2 className="size-5 animate-spin" /> : "Storyboard pending"}
            </div>
          )}
        </div>
      ) : null}
      {storyboardBoardFailed ? (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
          Storyboard generation failed. Generate the storyboard again before production anchors.
        </p>
      ) : null}
      <Button
        type="button"
        variant={storyboardBoardReady ? "outline" : "default"}
        className="h-10 w-full rounded-2xl text-xs font-black uppercase tracking-[0.12em]"
        onClick={() => onGenerateImages("storyboard")}
        disabled={imageStatus === "loading" || !scriptReady || !storyboardPromptReady}
        data-three-d-regenerate-storyboard={storyboardBoardReady ? "true" : undefined}
        data-three-d-generate-storyboard={!storyboardBoardReady ? "true" : undefined}
      >
        {imageStatus === "loading" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
        {storyboardBoardReady ? "Regenerate storyboard" : "Generate storyboard"}
      </Button>
    </div>
  );
  const anchorsContent = (
    <div className="space-y-3">
      <p className="text-xs font-bold leading-5 text-slate-500">
        {isPresenterStyle
          ? "Create the two production anchors only after the storyboard looks right."
          : "Create the production frames before animation."}
      </p>
      {requiredFrames.length ? (
        <div className="grid grid-cols-2 gap-2" data-three-d-storyboard-frames="true">
          {requiredFrames.map((frame) => {
            const clipPlan = clipPlans.find((plan) => plan.frameIndexes[0] === frame.frameIndex);
            const frameLabel = isPresenterStyle && clipPlan ? `Anchor ${clipPlan.clipIndex}` : `Frame ${frame.frameIndex}`;
            const detailLabel = isPresenterStyle && clipPlan ? `Frames ${clipPlan.frameIndexes.join("-")}` : frame.label;
            return (
              <div key={frame.frameIndex} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{frameLabel}</p>
                    <p className="truncate text-[10px] font-black leading-3 text-slate-950">{detailLabel}</p>
                  </div>
                  <Badge variant={frame.image?.status === "ready" ? "default" : "outline"} className="rounded-full px-2 text-[9px] font-black uppercase">
                    {frame.image?.status || "idle"}
                  </Badge>
                </div>
                <div className="px-2.5 pb-2">
                  <ThreeDBreakdownMediaPromptEditor
                    disabled={scriptEditingDisabled}
                    label={`${frameLabel} creative prompt`}
                    onChange={(prompt) => onMediaPromptChanged({ kind: "anchor", frameIndex: frame.frameIndex }, prompt)}
                    prompt={getThreeDAnchorPrompt(frame)}
                    rows={5}
                    target={`anchor-${frame.frameIndex}`}
                  />
                </div>
                {frame.image?.url ? (
                  <img src={frame.image.url} alt={`${frameLabel} preview`} className="aspect-[6/7] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[6/7] items-center justify-center bg-slate-50 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                    {frame.image?.status === "generating" ? <Loader2 className="size-4 animate-spin" /> : "Pending"}
                  </div>
                )}
                {isPresenterStyle && frame.image?.status === "ready" && (clipPlan?.clipIndex === 1 || clipPlan?.clipIndex === 2) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-full rounded-none border-t border-slate-200 text-[9px] font-black uppercase tracking-[0.12em] text-slate-600"
                    onClick={() => onGenerateImages(clipPlan.clipIndex === 1 ? "anchor-1" : "anchor-2")}
                    disabled={imageStatus === "loading" || !scriptReady || !getThreeDAnchorPrompt(frame).trim()}
                    aria-label={`Regenerate ${frameLabel}`}
                    data-three-d-regenerate-anchor={clipPlan.clipIndex}
                  >
                    <RefreshCw className="mr-1.5 size-3" />
                    Regenerate
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {framesFailed ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
          <p>One or more production anchors failed. Generate anchors again.</p>
          {failedFrames.length ? (
            <div className="mt-2 space-y-1" data-three-d-anchor-errors="true">
              {failedFrames.map((frame) => (
                <p key={frame.frameIndex}>Frame {frame.frameIndex}: {frame.image?.error || "Anchor image generation failed."}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <Button
        type="button"
        className="h-10 w-full rounded-2xl bg-slate-950 text-xs font-black uppercase tracking-[0.14em] text-white"
        onClick={() => onGenerateImages()}
        disabled={imageStatus === "loading" || !scriptReady || !storyboardPromptReady || !anchorPromptsReady || framesReady || (isPresenterStyle && !storyboardBoardReady)}
        data-three-d-generate-anchors={isPresenterStyle ? "true" : undefined}
      >
        {imageStatus === "loading" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ImageIcon className="mr-2 size-4" />}
        {framesReady ? (isPresenterStyle ? "Anchors ready" : "Frames ready") : isPresenterStyle ? "Generate anchors" : "Generate frames"}
      </Button>
    </div>
  );
  const clipsContent = (
    <div className="space-y-3">
      {clipPlans.map((clipPlan) => {
        const clipBusy = threeDClipBusyIndex === clipPlan.clipIndex;
        const clipReady = clipPlan.video?.status === "ready";
        const clipFailed = clipPlan.video?.status === "failed";
        return (
          <div key={clipPlan.clipIndex} className="rounded-2xl border border-slate-200 bg-white p-3" data-three-d-clip-plan="true">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Clip {clipPlan.clipIndex} · {clipPlan.durationSeconds}s</p>
                <p className="mt-1 text-xs font-black leading-4 text-slate-950">{clipPlan.label}</p>
              </div>
              <Badge variant={clipReady || (framesReady && !clipPlan.video?.status) ? "default" : "outline"} className="rounded-full text-[10px] font-black uppercase">
                {clipBusy ? "Generating" : clipReady ? "Ready" : clipFailed ? "Failed" : framesReady ? "Plan ready" : "Needs frames"}
              </Badge>
            </div>
            <ThreeDBreakdownMediaPromptEditor
              disabled={scriptEditingDisabled}
              label={`Clip ${clipPlan.clipIndex} motion prompt`}
              onChange={(prompt) => onMediaPromptChanged({ kind: "clip", clipIndex: clipPlan.clipIndex }, prompt)}
              prompt={clipPlan.prompt}
              rows={7}
              target={`clip-${clipPlan.clipIndex}`}
            />
            {clipReady && clipPlan.video?.url ? (
              <video
                src={clipPlan.video.url}
                autoPlay
                loop
                muted
                playsInline
                className="mx-auto mt-3 aspect-[9/16] max-h-72 w-auto rounded-xl bg-slate-950 object-cover"
                data-three-d-clip-preview={clipPlan.clipIndex}
              />
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {(isPresenterStyle ? [clipPlan.frameIndexes[0]] : clipPlan.frameIndexes).map((frameIndex) => {
                  const frame = storyboardFrames.find((item) => item.frameIndex === frameIndex);
                  return frame?.image?.url ? (
                    <img key={frameIndex} src={frame.image.url} alt={`Clip ${clipPlan.clipIndex} frame ${frameIndex}`} className="aspect-[6/7] rounded-lg object-cover" />
                  ) : (
                    <div key={frameIndex} className="flex aspect-[6/7] items-center justify-center rounded-lg bg-slate-50 text-[9px] font-black text-slate-300">
                      {frameIndex}
                    </div>
                  );
                })}
                {isPresenterStyle ? (
                  <div className="col-span-2 flex aspect-[12/7] items-center justify-center rounded-lg bg-slate-50 px-2 text-center text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Frames {clipPlan.frameIndexes.join("-")}
                  </div>
                ) : null}
              </div>
            )}
            <Button
              type="button"
              className="mt-3 h-9 w-full rounded-2xl bg-slate-950 text-[11px] font-black uppercase tracking-[0.12em] text-white disabled:bg-slate-200 disabled:text-slate-400"
              onClick={() => onGenerateClip(clipPlan.clipIndex)}
              disabled={!scriptReady || !clipPlan.prompt.trim() || !framesReady || threeDClipBusyIndex !== null || !getPreviousClipReady(clipPlan.clipIndex)}
              data-three-d-generate-clip={clipPlan.clipIndex}
            >
              {clipBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Film className="mr-2 size-4" />}
              {clipReady
                ? `Regenerate clip ${clipPlan.clipIndex}`
                : !getPreviousClipReady(clipPlan.clipIndex)
                  ? `Generate clip ${clipPlan.clipIndex - 1} first`
                  : `Generate clip ${clipPlan.clipIndex}`}
            </Button>
            {clipFailed ? (
              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-bold leading-4 text-red-700">
                {clipPlan.video?.error || "Seedance clip generation failed."}
              </p>
            ) : null}
          </div>
        );
      })}
      <p className="rounded-2xl bg-slate-950 px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white">
        {videosReady
          ? "All clips ready · build the final MP4"
          : !framesReady
            ? isPresenterStyle && storyboardBoardReady ? "Generate production anchors first" : "Generate storyboard first"
            : nextClipPlan
              ? `Generate clip ${nextClipPlan.clipIndex} next`
              : "Preflight complete · generate clip 1"}
      </p>
    </div>
  );
  const finalContent = (
    <div className="space-y-2">
      <Button
        type="button"
        className="h-10 w-full rounded-2xl bg-slate-950 text-xs font-black uppercase tracking-[0.14em] text-white"
        onClick={hasVoiceover ? onBuildFinalVideo : onAddVoice}
        disabled={!scriptReady || !videosReady || renderBusy}
      >
        {renderBusy
          ? <Loader2 className="mr-2 size-4 animate-spin" />
          : hasVoiceover
            ? <Download className="mr-2 size-4" />
            : <AudioLines className="mr-2 size-4" />}
        {!videosReady ? "Build after clips" : !hasVoiceover ? "Add voice" : "Build final video"}
      </Button>
      <p className="text-xs font-bold leading-5 text-slate-500">
        {finalReady
          ? "Use the global MP4 button above to download it."
          : hasVoiceover
            ? "Build the final video after both clips are ready."
            : "Narration is added here before the final MP4."}
      </p>
    </div>
  );
  const stages = [
    {
      id: "script",
      label: "Script",
      compactLabel: "Script",
      kicker: "narrator story",
      icon: <FileText className="size-4" />,
      status: scriptReady ? "ready" as const : "needs" as const,
      content: scriptContent,
    },
    {
      id: isPresenterStyle ? "storyboard" : "frames",
      label: isPresenterStyle ? "Storyboard" : "Frames",
      compactLabel: isPresenterStyle ? "Board" : "Frames",
      kicker: isPresenterStyle ? "six-frame plan" : "production images",
      icon: <Clapperboard className="size-4" />,
      status: isPresenterStyle ? storyboardStageStatus : anchorsStageStatus,
      content: isPresenterStyle ? storyboardContent : anchorsContent,
    },
    ...(isPresenterStyle ? [{
      id: "anchors",
      label: "Anchors",
      compactLabel: "Anchors",
      kicker: "two video scenes",
      icon: <ImageIcon className="size-4" />,
      status: anchorsStageStatus,
      content: anchorsContent,
    }] : []),
    {
      id: "clips",
      label: "Clips",
      compactLabel: "Clips",
      kicker: "motion and preview",
      icon: <Film className="size-4" />,
      status: clipsStageStatus,
      content: clipsContent,
    },
    {
      id: "final",
      label: "Final Video",
      compactLabel: "Final",
      kicker: "voice and MP4",
      icon: <Download className="size-4" />,
      status: finalStageStatus,
      content: finalContent,
    },
  ];
  const defaultStageId = stages.find((stage) => stage.status !== "ready")?.id || "final";
  return (
    <section data-three-d-breakdown-assembly-card="true">
      <CreateAssemblyLine defaultStageId={defaultStageId} error={error} stages={stages} />
    </section>
  );
}
