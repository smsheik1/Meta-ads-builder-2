import {
  AudioLines,
  BookmarkPlus,
  Check,
  Download,
  ExternalLink,
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
import type { AdFormatId } from "@/features/scene/types";
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
  brickStoryboardStatus,
  canGenerateBrickStoryboard,
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
  brickStoryboardStatus: BrickStoryboardStatus;
  canGenerateBrickStoryboard: boolean;
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
  const shareSupported = selectedFormat === "visualizer" || selectedFormat === "text-message" || selectedFormat === "motion-story" || ((selectedFormat === "jingle" || selectedFormat === "brainrot") && hasPlayableAudio);
  const showBrickStoryboard = selectedFormat === "jingle" && hasPlayableAudio;
  const renderWorkerOffline = !staticPngSelected && renderWorkerHealthy === false;
  const renderButtonDisabled = !hasSelectedScene || renderBusy || renderWorkerOffline;
  const activeRenderDownloadUrl = staticPngSelected ? "" : renderDownloadUrl;
  const downloadLabel = staticPngSelected ? "PNG" : "MP4";
  const downloadTitle = staticPngSelected
    ? "Download this static ad as a PNG"
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
          brickStoryboardStatus={brickStoryboardStatus}
          canGenerateBrickStoryboard={canGenerateBrickStoryboard}
          onAnimateBrickStoryboard={onAnimateBrickStoryboard}
          onBuildBrickMusicVideo={onBuildBrickMusicVideo}
          onGenerateBrickStoryboard={onGenerateBrickStoryboard}
          onRegenerateBrickShot={onRegenerateBrickShot}
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
