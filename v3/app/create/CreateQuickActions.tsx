import {
  AudioLines,
  BookmarkPlus,
  Check,
  Clapperboard,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Loader2,
  Play,
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
import type { AdFormatId, ThreeDBreakdownAdScene } from "@/features/scene/types";
import { CreateBrickStoryboardSheet } from "./CreateBrickStoryboardSheet";

type SaveStatus = "idle" | "loading" | "ready" | "error";
type BrickStoryboardStatus = "idle" | "loading" | "ready" | "error";

const statusBannerBaseClass = "rounded-2xl border px-4 py-3 text-xs font-black leading-5";

const formatSavedDate = (timestamp: number) => new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
}).format(new Date(timestamp));

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
  onRegenerateBrickShot,
  onRegenerateBrickShotVideo,
  onGenerateThreeDImages,
  onRegenerateThreeDImage,
  onAnimateThreeDClips,
  onRegenerateThreeDClip,
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
  threeDError,
  threeDImageBusyIndex,
  threeDImageStatus,
  threeDScene,
  threeDVideoBusyIndex,
  staticPngDownloadBusy,
  saveCounterLabel,
  saveError,
  savedDesigns,
  saveStatus,
  saveStatusLabel,
  selectedFormat,
  selectedDesignIsSaved,
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
  onRegenerateBrickShot: (shotIndex: number) => void;
  onRegenerateBrickShotVideo: (shotIndex: number) => void;
  onGenerateThreeDImages: () => void;
  onRegenerateThreeDImage: (shotIndex: number) => void;
  onAnimateThreeDClips: () => void;
  onRegenerateThreeDClip: (shotIndex: number) => void;
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
  threeDError: string;
  threeDImageBusyIndex: number | null;
  threeDImageStatus: BrickStoryboardStatus;
  threeDScene: ThreeDBreakdownAdScene | null;
  threeDVideoBusyIndex: number | null;
  staticPngDownloadBusy: boolean;
  saveCounterLabel: string;
  saveError: string;
  savedDesigns: SavedAdSceneDesign[];
  saveStatus: SaveStatus;
  saveStatusLabel: string;
  selectedFormat: AdFormatId | null;
  selectedDesignIsSaved: boolean;
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
  const showThreeDBreakdownAssembly = selectedFormat === "three-d-breakdown" && threeDScene;
  const threeDClipsReady = Boolean(threeDScene?.layout.shots.every((shot) => shot.video?.status === "ready"));
  const threeDRenderBlocked = selectedFormat === "three-d-breakdown" && !threeDClipsReady;
  const renderWorkerOffline = !staticPngSelected && renderWorkerHealthy === false;
  const renderButtonDisabled = !hasSelectedScene || renderBusy || renderWorkerOffline || threeDRenderBlocked;
  const activeRenderDownloadUrl = staticPngSelected ? "" : renderDownloadUrl;
  const downloadLabel = staticPngSelected ? "PNG" : "MP4";
  const downloadTitle = staticPngSelected
    ? "Download this static ad as a PNG"
    : threeDRenderBlocked
      ? "Generate 3D images and animate clips before building the MP4."
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
      <div className="grid grid-cols-4 gap-2 rounded-[1.35rem] border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/8">
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

      {showThreeDBreakdownAssembly ? (
        <ThreeDBreakdownAssemblyCard
          animationStatus={threeDAnimationStatus}
          currentRenderStatus={currentRenderStatus}
          error={threeDError}
          imageBusyIndex={threeDImageBusyIndex}
          imageStatus={threeDImageStatus}
          onAnimateClips={onAnimateThreeDClips}
          onBuildFinalVideo={onCreateRenderJob}
          onGenerateImages={onGenerateThreeDImages}
          onRegenerateClip={onRegenerateThreeDClip}
          onRegenerateImage={onRegenerateThreeDImage}
          renderBusy={renderBusy}
          scene={threeDScene}
          videoBusyIndex={threeDVideoBusyIndex}
        />
      ) : null}

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
  imageBusyIndex,
  imageStatus,
  onAnimateClips,
  onBuildFinalVideo,
  onGenerateImages,
  onRegenerateClip,
  onRegenerateImage,
  renderBusy,
  scene,
  videoBusyIndex,
}: {
  animationStatus: BrickStoryboardStatus;
  currentRenderStatus: string;
  error: string;
  imageBusyIndex: number | null;
  imageStatus: BrickStoryboardStatus;
  onAnimateClips: () => void;
  onBuildFinalVideo: () => void;
  onGenerateImages: () => void;
  onRegenerateClip: (shotIndex: number) => void;
  onRegenerateImage: (shotIndex: number) => void;
  renderBusy: boolean;
  scene: ThreeDBreakdownAdScene;
  videoBusyIndex: number | null;
}) {
  const imagesReady = scene.layout.shots.every((shot) => shot.image?.status === "ready");
  const videosReady = scene.layout.shots.every((shot) => shot.video?.status === "ready");
  const finalReady = currentRenderStatus === "ready";
  const storyboardBoard = scene.layout.storyboardBoard;
  const storyboardBoardStatus = storyboardBoard?.image?.status || "idle";
  const finalStatus = renderBusy ? "Building" : finalReady ? "Final ready" : videosReady ? "Needs MP4" : "Needs clips";
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
          {videosReady ? "Clips ready" : imagesReady ? "Images ready" : "Script ready"}
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
            Images
            <Badge variant="outline" className="ml-auto rounded-full text-[10px] font-black uppercase">
              {statusPill(imageStatus)}
            </Badge>
          </div>
          {storyboardBoard ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3" data-three-d-storyboard-board="true">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Storyboard board</p>
                  <p className="mt-1 text-xs font-black leading-4 text-slate-950">One six-frame visual plan for the whole ad.</p>
                </div>
                <Badge variant={storyboardBoardStatus === "ready" ? "default" : "outline"} className="rounded-full text-[10px] font-black uppercase">
                  {storyboardBoardStatus}
                </Badge>
              </div>
              {storyboardBoard.image?.url ? (
                <img
                  src={storyboardBoard.image.url}
                  alt="Six-frame 3D Breakdown storyboard board"
                  className="mt-3 aspect-[9/16] w-full rounded-2xl border border-slate-100 object-cover"
                />
              ) : storyboardBoardStatus === "generating" ? (
                <div className="mt-3 flex aspect-[9/16] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Drawing board
                </div>
              ) : storyboardBoardStatus === "failed" ? (
                <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
                  {storyboardBoard.image?.error || "Storyboard board failed. Production shots may still be available."}
                </p>
              ) : (
                <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-500">
                  Generate 3D images to draw the storyboard board and production stills.
                </p>
              )}
            </div>
          ) : null}
          <div className="mt-3 grid gap-2">
            {scene.layout.shots.map((shot) => (
              <div key={shot.shotIndex} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Shot {shot.shotIndex}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-black leading-4 text-slate-950">{shot.sceneDescription}</p>
                  </div>
                  <Badge variant={shot.image?.status === "ready" ? "default" : "outline"} className="rounded-full text-[10px] font-black uppercase">
                    {shot.image?.status || "idle"}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-9 w-full rounded-xl text-[10px] font-black uppercase tracking-[0.14em]"
                  onClick={() => onRegenerateImage(shot.shotIndex)}
                  disabled={imageBusyIndex !== null || imageStatus === "loading"}
                >
                  {imageBusyIndex === shot.shotIndex ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
                  New image
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            className="mt-3 h-10 w-full rounded-2xl bg-slate-950 text-xs font-black uppercase tracking-[0.14em] text-white"
            onClick={onGenerateImages}
            disabled={imageStatus === "loading"}
          >
            {imageStatus === "loading" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ImageIcon className="mr-2 size-4" />}
            Generate 3D images
          </Button>
        </div>

        <div className={stepClass}>
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <Film className="size-4" />
            Animation
            <Badge variant="outline" className="ml-auto rounded-full text-[10px] font-black uppercase">
              {statusPill(animationStatus)}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2">
            {scene.layout.shots.map((shot) => (
              <div key={shot.shotIndex} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black text-slate-950">Shot {shot.shotIndex}</p>
                  <Badge variant={shot.video?.status === "ready" ? "default" : "outline"} className="rounded-full text-[10px] font-black uppercase">
                    {shot.video?.status || "idle"}
                  </Badge>
                </div>
                {shot.video?.status === "failed" && shot.video.error ? (
                  <p className="mt-2 line-clamp-3 text-[11px] font-bold leading-4 text-red-600">{shot.video.error}</p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-9 w-full rounded-xl text-[10px] font-black uppercase tracking-[0.14em]"
                  onClick={() => onRegenerateClip(shot.shotIndex)}
                  disabled={videoBusyIndex !== null || animationStatus === "loading" || shot.image?.status !== "ready"}
                >
                  {videoBusyIndex === shot.shotIndex ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
                  Retry animation
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            className="mt-3 h-10 w-full rounded-2xl bg-slate-950 text-xs font-black uppercase tracking-[0.14em] text-white"
            onClick={onAnimateClips}
            disabled={!imagesReady || animationStatus === "loading"}
          >
            {animationStatus === "loading" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Film className="mr-2 size-4" />}
            Animate clips
          </Button>
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
            onClick={onBuildFinalVideo}
            disabled={!videosReady || renderBusy}
          >
            {renderBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
            Build final video
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
