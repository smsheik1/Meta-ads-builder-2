"use client";
import {
  AudioLines,
  BookmarkPlus,
  Check,
  Clapperboard,
  CircleHelp,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Loader2,
  Play,
  RefreshCw,
  Share2,
  Sparkles,
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
import type { ThreeDBreakdownStoryDirection } from "@/features/formats/three-d-breakdown/storyDirections";
import type { AdFormatId, ThreeDBreakdownAdScene, ThreeDBreakdownClipIndex } from "@/features/scene/types";
import { CreateBrickStoryboardSheet } from "./CreateBrickStoryboardSheet";

type SaveStatus = "idle" | "loading" | "ready" | "error";
type BrickStoryboardStatus = "idle" | "loading" | "ready" | "error";
type ThreeDImageGenerationMode = "storyboard" | "anchors" | "regenerate-anchors" | "all";
type ThreeDStoryboardFrame = NonNullable<NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>["frames"]>[number];

const statusBannerBaseClass = "rounded-2xl border px-4 py-3 text-xs font-black leading-5";

const formatSavedDate = (timestamp: number) => new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
}).format(new Date(timestamp));

const formatStoryboardFramePrompt = (frame: ThreeDStoryboardFrame) => [
  `Frame ${frame.frameIndex}: ${frame.label}`,
  `Role: ${frame.role}`,
  frame.visual ? `Visual: ${frame.visual}` : null,
  frame.camera ? `Camera: ${frame.camera}` : null,
  frame.motion ? `Motion: ${frame.motion}` : null,
  frame.overlayText ? `Renderer overlay: ${frame.overlayText}` : null,
  frame.editingNote ? `Editing note: ${frame.editingNote}` : null,
].filter(Boolean).join("\n");

function PromptHelp({ label, prompt, className = "" }: { label: string; prompt?: string; className?: string }) {
  const cleanPrompt = prompt?.trim();
  if (!cleanPrompt) {
    return null;
  }

  return (
    <div className={`group/prompt text-left ${className}`} data-three-d-prompt-help="true" data-three-d-prompt-label={label}>
      <button
        type="button"
        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-300"
        title={cleanPrompt}
        aria-label={`Show ${label}`}
      >
        <CircleHelp className="size-3.5" />
        Prompt
      </button>
      <div className="mt-2 hidden rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl group-hover/prompt:block group-focus-within/prompt:block">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[10px] font-semibold leading-4 text-slate-100">
          {cleanPrompt}
        </pre>
      </div>
    </div>
  );
}

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
  onTogglePreviewPlayback,
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
  staticPngDownloadBusy,
  onSelectThreeDStoryDirection,
  onUseThreeDStoryDirection,
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
  onTogglePreviewPlayback: () => void;
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
  staticPngDownloadBusy: boolean;
  onSelectThreeDStoryDirection: (directionId: string) => void;
  onUseThreeDStoryDirection: (direction: ThreeDBreakdownStoryDirection) => void;
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
  const generatedAudioPending = !hasPlayableAudio && audioStatus === "loading";
  const visualizerAudioReady = selectedFormat === "visualizer" && hasPlayableAudio;
  const shareSupported = selectedFormat === "visualizer" || selectedFormat === "text-message" || selectedFormat === "motion-story" || ((selectedFormat === "jingle" || selectedFormat === "brainrot" || selectedFormat === "three-d-breakdown") && hasPlayableAudio);
  const showBrickStoryboard = selectedFormat === "jingle";
  const showThreeDStorySlateStage = threeDStorySlateActive;
  const showThreeDStoryDirections = showThreeDStorySlateStage && (threeDStoryDirections.length > 0 || threeDStoryDirectionStatus === "loading" || Boolean(threeDStoryDirectionError));
  const showThreeDBreakdownAssembly = selectedFormat === "three-d-breakdown" && threeDScene;
  const threeDClipPlans = threeDScene?.layout.clipPlans || [];
  const threeDClipsReady = threeDClipPlans.length > 0 && threeDClipPlans.every((clipPlan) => clipPlan.video?.status === "ready");
  const threeDVoiceoverBlocked = selectedFormat === "three-d-breakdown" && !hasPlayableAudio;
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
          onClick={hasPlayableAudio ? onTogglePreviewPlayback : onOpenAudioPanel}
          disabled={(hasPlayableAudio && !hasSelectedScene) || generatedAudioPending}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={hasPlayableAudio ? (isAudioPlaying ? "Stop audio preview" : "Play audio preview") : generatedAudioPending ? "Audio pending" : "Add audio for this ad"}
          title={hasPlayableAudio ? (isAudioPlaying ? "Stop audio preview" : "Play audio preview") : generatedAudioPending ? "Generated audio is still being created." : "Add audio for this ad"}
        >
          {hasPlayableAudio ? <Play className="size-4" /> : <AudioLines className="size-4" />}
          {hasPlayableAudio ? (isAudioPlaying ? "Stop" : "Play") : generatedAudioPending ? "Audio pending" : "Add audio"}
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
          hasVoiceover={hasPlayableAudio}
          imageStatus={threeDImageStatus}
          onAddVoice={onOpenAudioPanel}
          onBuildFinalVideo={onCreateRenderJob}
          onGenerateClip={onGenerateThreeDClip}
          onGenerateImages={onGenerateThreeDImages}
          renderBusy={renderBusy}
          scene={threeDScene}
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

function ThreeDBreakdownStoryDirectionsCard({
  directions,
  error,
  onSelectDirection,
  onUseDirection,
  selectedDirectionId,
  status,
}: {
  directions: ThreeDBreakdownStoryDirection[];
  error: string;
  onSelectDirection: (directionId: string) => void;
  onUseDirection: (direction: ThreeDBreakdownStoryDirection) => void;
  selectedDirectionId: string;
  status: BrickStoryboardStatus;
}) {
  const selectedDirection = directions.find((direction) => direction.directionId === selectedDirectionId) || directions[0] || null;

  return (
    <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/6" data-three-d-story-directions-card="true">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Story directions</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Pick the premise</h3>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">
            Choose the story before spending on images or video.
          </p>
        </div>
        <Badge variant="outline" className="rounded-full text-[10px] font-black uppercase">
          {status === "loading" ? "Finding ideas" : `${directions.length || 0} ideas`}
        </Badge>
      </div>

      {status === "loading" ? (
        <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Building story slate
        </div>
      ) : null}

      {directions.length ? (
        <div className="space-y-2">
          {directions.map((direction) => {
            const selected = direction.directionId === selectedDirectionId;
            return (
              <article
                key={direction.directionId}
                className={`rounded-2xl border p-3 transition ${selected ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/12" : "border-slate-200 bg-slate-50 text-slate-950"}`}
                data-three-d-story-direction={direction.directionId}
              >
                <button
                  type="button"
                  onClick={() => onSelectDirection(direction.directionId)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${selected ? "text-white/55" : "text-slate-400"}`}>
                        {direction.category}
                      </p>
                      <h4 className="mt-1 text-sm font-black leading-4">{direction.hookLine}</h4>
                      <p className={`mt-1 text-[11px] font-bold leading-4 ${selected ? "text-white/70" : "text-slate-500"}`}>
                        {direction.subheadline}
                      </p>
                    </div>
                    {selected ? <Check className="mt-1 size-4 shrink-0" /> : <Sparkles className="mt-1 size-4 shrink-0 text-slate-400" />}
                  </div>
                </button>
                <details className={`mt-3 rounded-xl border px-3 py-2 text-[11px] font-semibold leading-4 ${selected ? "border-white/15 bg-white/10 text-white/75" : "border-slate-200 bg-white text-slate-600"}`}>
                  <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.12em]">
                    Why this works
                  </summary>
                  <p className="mt-2">{direction.shortSummary}</p>
                  <p className="mt-2"><span className="font-black">Angle:</span> {direction.adAngle}</p>
                  <p className="mt-2"><span className="font-black">3D reveal:</span> {direction.visualEngine}</p>
                  <p className="mt-2"><span className="font-black">Why compelling:</span> {direction.whyCompelling}</p>
                </details>
                <Button
                  type="button"
                  onClick={() => onUseDirection(direction)}
                  className={`mt-3 h-9 w-full rounded-2xl text-[11px] font-black uppercase tracking-[0.12em] ${selected ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-slate-950 text-white hover:bg-slate-800"}`}
                  data-three-d-use-story-direction={direction.directionId}
                >
                  Use direction
                </Button>
              </article>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function statusPill(status: BrickStoryboardStatus) {
  if (status === "ready") return "Ready";
  if (status === "loading") return "Building";
  if (status === "error") return "Failed";
  return "Needs work";
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
  hasVoiceover,
  renderBusy,
  scene,
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
  hasVoiceover: boolean;
  renderBusy: boolean;
  scene: ThreeDBreakdownAdScene;
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
  const imageButtonLabel = imageStatus === "loading"
    ? "Generating..."
    : isPresenterStyle && !storyboardBoardReady
      ? "Generate storyboard"
      : isPresenterStyle && !framesReady
        ? "Generate anchors"
        : isPresenterStyle
          ? "Anchors ready"
        : "Generate frames";
  const storyboardHelperCopy = isPresenterStyle
    ? storyboardBoardReady
      ? framesReady
        ? "Storyboard and production anchors are ready for animation."
        : "Storyboard is ready. Generate production anchors only after the board looks right."
      : "Generate the six-panel storyboard first. Stop here until it matches the reference."
    : "Generate the production frames before animation.";
  const finalStatus = renderBusy ? "Building" : finalReady ? "Final ready" : !hasVoiceover ? "Needs voice" : videosReady ? "Needs MP4" : framesReady ? "Ready for Seedance" : "Needs frames";
  const assemblyStatusLabel = videosReady
    ? "Clips ready"
    : framesReady
      ? (isPresenterStyle ? "Anchors ready" : "Frames ready")
      : "Script ready";
  const storyDirectionNumber = (scene.metadata.candidateIndex ?? 0) + 1;
  const stepClass = "rounded-2xl border border-slate-200 bg-slate-50 p-3";

  return (
    <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/6" data-three-d-breakdown-assembly-card="true">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Assembly line</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">3D Breakdown</h3>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">
            Story direction {storyDirectionNumber}. Press Spacebar to compare before generating images.
          </p>
        </div>
        <Badge variant="outline" className="rounded-full text-[10px] font-black uppercase">
          {assemblyStatusLabel}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className={stepClass}>
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <Clapperboard className="size-4" />
            Script
            <Badge className="ml-auto rounded-full bg-emerald-50 text-[10px] font-black text-emerald-700">Ready</Badge>
          </div>
          <div className="mt-2 space-y-1.5">
            {scene.layout.storyContract.referenceScript ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2" data-three-d-reference-script="true">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Narrator script</p>
                <p className="mt-1 max-h-40 overflow-y-auto text-xs font-semibold leading-5 text-slate-600">
                  {scene.layout.storyContract.referenceScript}
                </p>
              </div>
            ) : null}
            {scene.layout.scriptBeats.map((beat) => (
              <div key={`${beat.role}-${beat.startMs}`} className="rounded-xl bg-white px-3 py-2" data-three-d-script-beat="true">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{beat.role.replace(/-/g, " ")}</p>
                <p className="mt-1 text-xs font-semibold leading-4 text-slate-600">{beat.narration}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={stepClass}>
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <ImageIcon className="size-4" />
            {isPresenterStyle ? "Storyboard & anchors" : "Storyboard frames"}
            <Badge variant="outline" className="ml-auto rounded-full text-[10px] font-black uppercase">
              {statusPill(imageStatus)}
            </Badge>
          </div>
          {storyboardBoard ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white" data-three-d-storyboard-board="true">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Storyboard board</p>
                  <p className="mt-0.5 text-xs font-black leading-4 text-slate-950">{storyboardHelperCopy}</p>
                </div>
                <Badge variant={storyboardBoardStatus === "ready" ? "default" : "outline"} className="rounded-full text-[10px] font-black uppercase">
                  {storyboardBoardStatus}
                </Badge>
              </div>
              <PromptHelp
                label="Storyboard image prompt"
                prompt={storyboardBoard.imagePrompt}
                className="px-3 pb-2"
              />
              {storyboardBoard.image?.url ? (
                <img src={storyboardBoard.image.url} alt="3D Breakdown storyboard board" className="aspect-[9/16] w-full object-cover" />
              ) : null}
            </div>
          ) : null}
          {requiredFrames.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2" data-three-d-storyboard-frames="true">
              {requiredFrames.map((frame) => {
                const clipPlan = clipPlans.find((plan) => plan.frameIndexes[0] === frame.frameIndex);
                const frameLabel = isPresenterStyle && clipPlan
                  ? `Anchor ${clipPlan.clipIndex}`
                  : `Frame ${frame.frameIndex}`;
                const detailLabel = isPresenterStyle && clipPlan
                  ? `Frames ${clipPlan.frameIndexes.join("-")}`
                  : frame.label;
                return (
                <div key={frame.frameIndex} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{frameLabel}</p>
                      <p className="text-[10px] font-black leading-3 text-slate-950">{detailLabel}</p>
                    </div>
                    <Badge variant={frame.image?.status === "ready" ? "default" : "outline"} className="rounded-full px-2 text-[9px] font-black uppercase">
                      {frame.image?.status || (requiredFrameIndexes.includes(frame.frameIndex) ? "idle" : "plan")}
                    </Badge>
                  </div>
                  <PromptHelp
                    label={`${frameLabel} image prompt`}
                    prompt={formatStoryboardFramePrompt(frame)}
                    className="px-2.5 pb-2"
                  />
                  {frame.image?.url ? (
                    <img src={frame.image.url} alt={`Storyboard frame ${frame.frameIndex}`} className="aspect-[6/7] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[6/7] items-center justify-center bg-slate-50 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                      {frame.image?.status === "generating" ? <Loader2 className="size-4 animate-spin" /> : "Pending"}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          ) : null}
          {storyboardBoardFailed ? (
            <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
              Storyboard generation failed. Generate the storyboard again before production anchors.
            </p>
          ) : framesFailed ? (
            <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
              <p>One or more production anchors failed. Generate anchors again.</p>
              {failedFrames.length ? (
                <div className="mt-2 space-y-1" data-three-d-anchor-errors="true">
                  {failedFrames.map((frame) => (
                    <p key={frame.frameIndex}>
                      Frame {frame.frameIndex}: {frame.image?.error || "Anchor image generation failed."}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {isPresenterStyle && storyboardBoardReady ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-10 w-full rounded-2xl border-slate-300 bg-white text-xs font-black uppercase tracking-[0.12em] text-slate-700"
              onClick={() => onGenerateImages("storyboard")}
              disabled={imageStatus === "loading"}
              data-three-d-regenerate-storyboard="true"
            >
              <RefreshCw className="mr-2 size-4" />
              Regenerate storyboard
            </Button>
          ) : null}
          {isPresenterStyle && framesReady ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-10 w-full rounded-2xl border-slate-300 bg-white text-xs font-black uppercase tracking-[0.12em] text-slate-700"
              onClick={() => onGenerateImages("regenerate-anchors")}
              disabled={imageStatus === "loading"}
              data-three-d-regenerate-anchors="true"
            >
              <RefreshCw className="mr-2 size-4" />
              Regenerate anchors
            </Button>
          ) : null}
          <Button
            type="button"
            className="mt-3 h-10 w-full rounded-2xl bg-slate-950 text-xs font-black uppercase tracking-[0.14em] text-white"
            onClick={() => onGenerateImages()}
            disabled={imageStatus === "loading" || (isPresenterStyle && storyboardBoardReady && framesReady)}
          >
            {imageStatus === "loading" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ImageIcon className="mr-2 size-4" />}
            {imageButtonLabel}
          </Button>
        </div>

        <div className={stepClass}>
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <Film className="size-4" />
            Video clip plan
            <Badge variant="outline" className="ml-auto rounded-full text-[10px] font-black uppercase">
              {videosReady ? "Clips ready" : framesReady ? "Ready" : statusPill(animationStatus)}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2">
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
                  <Badge
                    variant={clipReady || (framesReady && !clipPlan.video?.status) ? "default" : "outline"}
                    className="rounded-full text-[10px] font-black uppercase"
                  >
                    {clipBusy
                      ? "Generating"
                      : clipReady
                      ? "Ready"
                      : clipFailed
                        ? "Failed"
                        : framesReady
                          ? "Plan ready"
                          : "Needs frames"}
                  </Badge>
                </div>
                <PromptHelp
                  label={`Clip ${clipPlan.clipIndex} video prompt`}
                  prompt={clipPlan.prompt}
                  className="mt-3"
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
                  disabled={!framesReady || threeDClipBusyIndex !== null || !getPreviousClipReady(clipPlan.clipIndex)}
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
          </div>
          <p className="mt-3 rounded-2xl bg-slate-950 px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white">
            {videosReady
              ? "All clips ready · build the final MP4"
              : !framesReady
                ? isPresenterStyle && storyboardBoardReady ? "Generate production anchors first" : "Generate storyboard first"
                : nextClipPlan
                  ? `Generate clip ${nextClipPlan.clipIndex} next`
                  : "Preflight complete · generate clip 1"}
          </p>
        </div>

        <div className={stepClass}>
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <Download className="size-4" />
            Final Video
            <Badge variant={finalReady ? "default" : "outline"} className="ml-auto rounded-full text-[10px] font-black uppercase">
              {finalStatus}
            </Badge>
          </div>
          <Button
            type="button"
            className="mt-3 h-10 w-full rounded-2xl bg-slate-950 text-xs font-black uppercase tracking-[0.14em] text-white"
            onClick={hasVoiceover ? onBuildFinalVideo : onAddVoice}
            disabled={!videosReady || renderBusy}
          >
            {renderBusy
              ? <Loader2 className="mr-2 size-4 animate-spin" />
              : hasVoiceover
                ? <Download className="mr-2 size-4" />
                : <AudioLines className="mr-2 size-4" />}
            {!videosReady ? "Build after clips" : !hasVoiceover ? "Add voice" : "Build final video"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
