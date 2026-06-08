import type { FocusEvent } from "react";
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  Download,
  ExternalLink,
  Loader2,
  Play,
  Shuffle,
} from "lucide-react";
import type { SavedAdSceneDesign } from "@/features/create/savedDesigns";
import { previewPlatformOptions, type PreviewPlatform } from "./CreatePreviewChrome";

type SaveStatus = "idle" | "loading" | "ready" | "error";

export function CreateActionCard({
  currentRenderStatus,
  hasGeneratedAudio,
  isAudioPlaying,
  onCreateRenderJob,
  onCreateShareLink,
  onOpenCaptionEditor,
  onOpenSavedDesign,
  onSaveSelectedDesign,
  onSavedDesignsBlur,
  onSavedDesignsOpenChange,
  onTogglePreviewPlayback,
  playableAudioUrl,
  previewPlatform,
  renderBusy,
  renderDownloadUrl,
  renderErrorMessage,
  renderStatusLabel,
  saveError,
  savedDesignItems,
  savedDesignsOpen,
  saveStatus,
  saveStatusLabel,
  selectedDesignIsSaved,
  shareError,
  shareStatus,
  shareUrl,
  hasSelectedScene,
  onPreviewPlatformChange,
}: {
  currentRenderStatus: string;
  hasGeneratedAudio: boolean;
  isAudioPlaying: boolean;
  onCreateRenderJob: () => void;
  onCreateShareLink: () => void;
  onOpenCaptionEditor: () => void;
  onOpenSavedDesign: (design: SavedAdSceneDesign) => void;
  onPreviewPlatformChange: (platform: PreviewPlatform) => void;
  onSaveSelectedDesign: () => void;
  onSavedDesignsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onSavedDesignsOpenChange: (open: boolean) => void;
  onTogglePreviewPlayback: () => void;
  playableAudioUrl: string;
  previewPlatform: PreviewPlatform;
  renderBusy: boolean;
  renderDownloadUrl: string;
  renderErrorMessage: string;
  renderStatusLabel: string;
  saveError: string;
  savedDesignItems: SavedAdSceneDesign[];
  savedDesignsOpen: boolean;
  saveStatus: SaveStatus;
  saveStatusLabel: string;
  selectedDesignIsSaved: boolean;
  shareError: string;
  shareStatus: "idle" | "loading" | "ready" | "error";
  shareUrl: string;
  hasSelectedScene: boolean;
}) {
  return (
    <section
      className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8"
      data-create-action-card="legacy"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">Generated ads</h2>
          <p className="mt-1 max-w-[14rem] text-xs font-black leading-5 text-slate-500">
            Your generated ads appear on the canvas.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateShareLink}
          disabled={!hasSelectedScene || shareStatus === "loading"}
          className="grid size-9 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-slate-50 hover:text-slate-500 disabled:cursor-not-allowed disabled:opacity-30"
          title="Share link"
          aria-label={shareStatus === "ready" ? "Share link copied" : "Create share link"}
        >
          {shareStatus === "loading" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : shareStatus === "ready" ? (
            <Check className="size-5" />
          ) : (
            <Shuffle className="size-5" />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onCreateRenderJob}
        disabled={!hasSelectedScene || renderBusy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
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
          onMouseEnter={() => onSavedDesignsOpenChange(true)}
          onMouseLeave={() => onSavedDesignsOpenChange(false)}
          onFocus={() => onSavedDesignsOpenChange(true)}
          onBlur={onSavedDesignsBlur}
        >
          <button
            type="button"
            onClick={onSaveSelectedDesign}
            disabled={!hasSelectedScene || saveStatus === "loading"}
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
                  {savedDesignItems.slice(0, 4).map((design, index) => (
                    <button
                      key={`${design.id}-${index}`}
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

      {shareError ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700">
          {shareError}
        </p>
      ) : null}

      {renderBusy ? (
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black leading-5 text-slate-500">
          Render worker is turning this frozen scene into an MP4.
        </p>
      ) : null}

      {renderErrorMessage ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700">
          {renderErrorMessage}
        </p>
      ) : null}

      <label className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
        <span>Preview</span>
        <select
          value={previewPlatform}
          onChange={(event) => onPreviewPlatformChange(event.target.value as PreviewPlatform)}
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
          onClick={onOpenCaptionEditor}
          disabled={!hasGeneratedAudio}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          title={hasGeneratedAudio ? "Edit this ad's captions" : "Generate or upload audio before editing captions"}
        >
          Edit captions
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
  );
}
