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
import type { AdFormatId } from "@/features/scene/types";

type SaveStatus = "idle" | "loading" | "ready" | "error";

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
  onDownloadMemePng,
  onLoadSavedDesign,
  onOpenAudioPanel,
  onSaveSelectedDesign,
  onTogglePreviewPlayback,
  playableAudioUrl,
  renderBusy,
  renderDownloadUrl,
  renderErrorMessage,
  renderStatusLabel,
  renderWorkerHealthy,
  memeDownloadBusy,
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
  onDownloadMemePng: () => void;
  onLoadSavedDesign: (design: SavedAdSceneDesign) => void;
  onOpenAudioPanel: () => void;
  onSaveSelectedDesign: () => void;
  onTogglePreviewPlayback: () => void;
  playableAudioUrl: string;
  renderBusy: boolean;
  renderDownloadUrl: string;
  renderErrorMessage: string;
  renderStatusLabel: string;
  renderWorkerHealthy: boolean | null;
  memeDownloadBusy: boolean;
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
  const memeSceneSelected = selectedFormat === "meme";
  const renderWorkerOffline = !memeSceneSelected && renderWorkerHealthy === false;
  const renderButtonDisabled = !hasSelectedScene || renderBusy || renderWorkerOffline;
  const downloadLabel = memeSceneSelected ? "PNG" : "MP4";
  const downloadTitle = memeSceneSelected
    ? "Download this meme as a PNG"
    : renderWorkerOffline
      ? "Start npm run dev from the repo root to run the render worker."
      : "Download this ad as an MP4";
  const hasAudio = Boolean(playableAudioUrl);
  const banners = [
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
          onClick={hasAudio ? onTogglePreviewPlayback : onOpenAudioPanel}
          disabled={hasAudio && !hasSelectedScene}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={hasAudio ? (isAudioPlaying ? "Stop audio preview" : "Play audio preview") : "Add audio for this ad"}
          title={hasAudio ? (isAudioPlaying ? "Stop audio preview" : "Play audio preview") : "Add audio for this ad"}
        >
          {hasAudio ? <Play className="size-4" /> : <AudioLines className="size-4" />}
          {hasAudio ? (isAudioPlaying ? "Stop" : "Play") : "Add audio"}
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
            disabled={!hasSelectedScene || shareStatus === "loading" || memeSceneSelected}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={shareStatus === "ready" ? "Share link copied" : "Create share link"}
            title={memeSceneSelected ? "Meme share pages are coming next." : "Create share link"}
          >
            {shareStatus === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
            Share
          </button>
        )}

        {renderDownloadUrl ? (
          <a
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-950 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-slate-800"
            href={renderDownloadUrl}
            download
            aria-label="Download MP4"
            title="Download MP4"
          >
            <ExternalLink className="size-4" />
            MP4
          </a>
        ) : (
          <button
            type="button"
            onClick={memeSceneSelected ? onDownloadMemePng : onCreateRenderJob}
            disabled={memeSceneSelected ? !hasSelectedScene || memeDownloadBusy : renderButtonDisabled}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-950 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={memeSceneSelected ? "Download PNG" : renderStatusLabel}
            title={downloadTitle}
          >
            {memeDownloadBusy || renderBusy || currentRenderStatus === "loading" ? (
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

      {banners.map((banner) => (
        <p
          key={banner.id}
          className={`${statusBannerBaseClass} ${banner.className}`}
          data-create-status-banner={banner.id}
        >
          {banner.message}
        </p>
      ))}

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
