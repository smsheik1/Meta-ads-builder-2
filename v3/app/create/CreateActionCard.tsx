import {
  Check,
  Download,
  ExternalLink,
  Loader2,
  Play,
  Shuffle,
  Upload,
} from "lucide-react";
import { previewPlatformOptions, type PreviewPlatform } from "./CreatePreviewChrome";

export function CreateActionCard({
  currentRenderStatus,
  hasGeneratedAudio,
  isAudioPlaying,
  onCreateRenderJob,
  onCreateShareLink,
  onOpenAudioPanel,
  onOpenCaptionEditor,
  onTogglePreviewPlayback,
  playableAudioUrl,
  previewPlatform,
  renderBusy,
  renderDownloadUrl,
  renderErrorMessage,
  renderStatusLabel,
  renderWorkerHealthy,
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
  onOpenAudioPanel: () => void;
  onOpenCaptionEditor: () => void;
  onPreviewPlatformChange: (platform: PreviewPlatform) => void;
  onTogglePreviewPlayback: () => void;
  playableAudioUrl: string;
  previewPlatform: PreviewPlatform;
  renderBusy: boolean;
  renderDownloadUrl: string;
  renderErrorMessage: string;
  renderStatusLabel: string;
  renderWorkerHealthy: boolean | null;
  shareError: string;
  shareStatus: "idle" | "loading" | "ready" | "error";
  shareUrl: string;
  hasSelectedScene: boolean;
}) {
  const renderWorkerOffline = renderWorkerHealthy === false;
  const renderButtonDisabled = !hasSelectedScene || renderBusy || renderWorkerOffline;

  return (
    <section
      className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8"
      data-create-action-card="legacy"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">Generated ads</h2>
          <p className="mt-1 max-w-[14rem] text-xs font-semibold leading-5 text-slate-500">
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
        disabled={renderButtonDisabled}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        title={renderWorkerOffline ? "Start npm run dev from the repo root to run the render worker." : "Download this ad as an MP4"}
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

      <div className="mt-2">
        <button
          type="button"
          onClick={onTogglePreviewPlayback}
          disabled={!playableAudioUrl}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="size-4" />
          {isAudioPlaying ? "Stop" : "Play"}
        </button>
      </div>

      {shareError ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700">
          {shareError}
        </p>
      ) : null}

      {renderBusy ? (
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
          Render worker is turning this frozen scene into an MP4.
        </p>
      ) : null}

      {renderWorkerOffline ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-800">
          Render worker is offline. Start <span className="font-black">npm run dev</span> from the repo root before downloading videos.
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
          onClick={onOpenAudioPanel}
          disabled={!hasSelectedScene}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          title={hasGeneratedAudio ? "Replace or rewrite this ad's audio" : "Add audio to this ad"}
        >
          <Upload className="size-4" />
          {hasGeneratedAudio ? "Replace audio" : "Add audio"}
        </button>
      </div>
    </section>
  );
}
