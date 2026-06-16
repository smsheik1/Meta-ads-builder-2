import { Check, Circle, Loader2, Wand2 } from "lucide-react";
import {
  NIM_MEME_MODEL_OPTIONS,
  NIM_VISUALIZER_MODEL_OPTIONS,
} from "@/features/llm/nvidiaNimModels";
import { VIDEO_MEME_TEMPLATES, getVideoMemeTemplate, type VideoMemeTemplateId } from "@/features/formats/video-meme/templates";
import type { AdFormatId } from "@/features/scene/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";
export type WebsiteSubmitProgressStage = "reading-site" | "writing-ads" | "preparing-canvas" | null;

export type WebsiteSubmitProgressFacts = {
  brandName: string;
  hasLogo: boolean;
  colorCount: number;
  proofCount: number;
  buyerMomentCount: number;
};

const pillClass = "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm";

type ModelOption = {
  id: string;
  label: string;
};

const getProgressRows = (format: AdFormatId, videoMemeTemplateId: VideoMemeTemplateId = "bear-sniff") => [
  { id: "reading-site", label: "Reading website" },
  { id: "brand-proof", label: "Pulling brand proof" },
  { id: "selling-angle", label: "Finding selling angle" },
  {
    id: "writing-ads",
    label: format === "meme"
      ? "Writing 12 memes"
      : format === "were-sorry"
        ? "Writing 8 apologies"
        : format === "video-meme"
          ? `Writing ${getVideoMemeTemplate(videoMemeTemplateId)?.variantCount || 8} video memes`
          : format === "jingle"
            ? "Writing 1 jingle"
          : "Writing 50 ads",
  },
  { id: "preparing-canvas", label: "Preparing canvas" },
] as const;

function getProgressState(
  rowId: ReturnType<typeof getProgressRows>[number]["id"],
  stage: WebsiteSubmitProgressStage,
) {
  if (stage === "reading-site") return rowId === "reading-site" ? "active" : "pending";
  if (stage === "writing-ads") {
    if (rowId === "writing-ads") return "active";
    return rowId === "preparing-canvas" ? "pending" : "complete";
  }
  if (stage === "preparing-canvas") return rowId === "preparing-canvas" ? "active" : "complete";
  return "pending";
}

function CreateResearchProgressCard({
  facts,
  format,
  showSlowResearchMessage,
  stage,
  videoMemeTemplateId,
}: {
  facts: WebsiteSubmitProgressFacts | null;
  format: AdFormatId;
  showSlowResearchMessage: boolean;
  stage: WebsiteSubmitProgressStage;
  videoMemeTemplateId: VideoMemeTemplateId;
}) {
  if (!stage) return null;
  const progressRows = getProgressRows(format, videoMemeTemplateId);

  const factRows = facts
    ? [
        facts.brandName ? `Found ${facts.brandName}` : "",
        facts.hasLogo ? "Found logo" : "",
        facts.colorCount ? `Found ${facts.colorCount} brand colors` : "",
        facts.proofCount ? `Found ${facts.proofCount} proof points` : "",
        facts.buyerMomentCount ? `Found ${facts.buyerMomentCount} buyer moments` : "",
      ].filter(Boolean)
    : [];

  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3">
      <div className="space-y-2">
        {progressRows.map((row) => {
          const rowState = getProgressState(row.id, stage);
          return (
            <div
              key={row.id}
              className={`flex items-center gap-2 text-xs font-black ${rowState === "pending" ? "text-slate-400" : "text-slate-800"}`}
            >
              <span className="grid size-5 shrink-0 place-items-center">
                {rowState === "complete" ? (
                  <Check className="size-4 text-emerald-500" />
                ) : rowState === "active" ? (
                  <Loader2 className="size-4 animate-spin text-indigo-500" />
                ) : (
                  <Circle className="size-3 text-slate-300" />
                )}
              </span>
              {row.label}
            </div>
          );
        })}
      </div>

      {showSlowResearchMessage ? (
        <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
          Still reading. Some sites take longer, but your canvas will update when ads are ready.
        </p>
      ) : null}

      {factRows.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {factRows.map((fact) => (
            <span
              key={fact}
              className="rounded-full border border-emerald-100 bg-white px-2.5 py-1 text-[11px] font-black text-emerald-700"
            >
              {fact}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ModelSelect({
  ariaLabel,
  helper,
  label,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  helper: string;
  label: string;
  onChange: (model: string) => void;
  options: readonly ModelOption[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((model) => (
          <option key={model.id} value={model.id}>{model.label}</option>
        ))}
      </select>
      <span className="mt-1.5 block min-h-4 text-xs font-semibold text-slate-400">
        {helper}
      </span>
    </label>
  );
}

export function CreateLeftColumn({
  adScenesCount,
  adStatus,
  error,
  format,
  freeRunsLabel,
  memeModel,
  videoMemeTemplateId,
  visualizerModel,
  onFormatChange,
  onMemeModelChange,
  onVideoMemeTemplateChange,
  onVisualizerModelChange,
  onSubmit,
  onUrlChange,
  progressFacts,
  progressStage,
  showSlowResearchMessage,
  status,
  url,
}: {
  adScenesCount: number;
  adStatus: LoadStatus;
  error: string;
  format: AdFormatId;
  freeRunsLabel?: string;
  memeModel: string;
  videoMemeTemplateId: VideoMemeTemplateId;
  visualizerModel: string;
  onFormatChange: (format: AdFormatId) => void;
  onMemeModelChange: (model: string) => void;
  onVideoMemeTemplateChange: (templateId: VideoMemeTemplateId) => void;
  onVisualizerModelChange: (model: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onUrlChange: (url: string) => void;
  progressFacts: WebsiteSubmitProgressFacts | null;
  progressStage: WebsiteSubmitProgressStage;
  showSlowResearchMessage: boolean;
  status: LoadStatus;
  url: string;
}) {
  const submitIsBusy = status === "loading" || adStatus === "loading";
  const submitLabel = status === "loading"
    ? "Reading website"
    : adStatus === "loading"
      ? format === "meme"
        ? "Writing memes"
        : format === "were-sorry"
          ? "Writing apologies"
          : format === "video-meme"
            ? "Writing video memes"
            : format === "jingle"
              ? "Writing jingles"
            : "Writing ideas"
      : "Generate ads";
  const formatHelper = format === "meme"
    ? "Twelve brand-aligned meme drafts, ready to spacebar through."
    : format === "were-sorry"
      ? "Eight wink-apology posts for the Instagram trend."
      : format === "video-meme"
        ? "Eight reaction captions for the selected video meme."
        : format === "jingle"
          ? "One short hip hop brand jingle. No extra music generations."
        : "Audio visualizer ads with voice, captions, and MP4 export.";

  return (
    <div className="max-w-xl">
      <p className={pillClass}>
        <Wand2 className="size-4 text-[#4F46E5]" />
        {adScenesCount ? "Ads ready to review" : "Add a website first"}
      </p>
      <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-7xl">
        Make ads without learning editing.
      </h1>
      <p className="mt-4 max-w-full text-base font-semibold leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8 md:max-w-lg">
        Wiggly reads the site, finds the selling angle, and fills the canvas with polished ads you can preview, save, download, or edit.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8"
      >
        <label className="block" htmlFor="website-url">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Website</span>
          <input
            id="website-url"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            placeholder="https://yourbrand.com"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Format</span>
          <select
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            aria-label="Ad format"
            value={format}
            onChange={(event) => onFormatChange(event.target.value as AdFormatId)}
          >
            <option value="meme">Meme Ad</option>
            <option value="were-sorry">We're Sorry Ad</option>
            <option value="video-meme">Video Meme</option>
            <option value="jingle">Brand Jingle</option>
            <option value="visualizer">Visualizer Ad</option>
          </select>
          <span className="mt-1.5 block min-h-4 text-xs font-semibold text-slate-400">
            {formatHelper}
          </span>
        </label>

        {format === "visualizer" ? (
          <ModelSelect
            ariaLabel="Visualizer generation model"
            helper="Development picker for comparing visualizer copy models."
            label="Visualizer model"
            onChange={onVisualizerModelChange}
            options={NIM_VISUALIZER_MODEL_OPTIONS}
            value={visualizerModel}
          />
        ) : null}

        {format === "meme" ? (
          <ModelSelect
            ariaLabel="Meme generation model"
            helper="Development picker for comparing meme copy models."
            label="Meme model"
            onChange={onMemeModelChange}
            options={NIM_MEME_MODEL_OPTIONS}
            value={memeModel}
          />
        ) : null}

        {format === "video-meme" ? (
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Video meme</span>
            <select
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              aria-label="Video meme template"
              value={videoMemeTemplateId}
              onChange={(event) => onVideoMemeTemplateChange(event.target.value as VideoMemeTemplateId)}
            >
              {VIDEO_MEME_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
            <span className="mt-1.5 block min-h-4 text-xs font-semibold text-slate-400">
              Bear sniffs secrets. Pingu noot-noots urgent moments. Darwin stays calm through chaos.
            </span>
          </label>
        ) : null}

        <button
          type="submit"
          disabled={submitIsBusy}
          className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800 ${submitIsBusy ? "cursor-progress" : ""} disabled:cursor-not-allowed disabled:opacity-45`}
        >
          {submitIsBusy ? <Loader2 className="size-5 animate-spin" /> : <Wand2 className="size-5" />}
          {submitLabel}
        </button>

        {freeRunsLabel ? (
          <p className="text-center text-xs font-black uppercase tracking-wide text-slate-400">
            {freeRunsLabel}
          </p>
        ) : null}

        <CreateResearchProgressCard
          facts={progressFacts}
          format={format}
          showSlowResearchMessage={showSlowResearchMessage}
          stage={progressStage}
          videoMemeTemplateId={videoMemeTemplateId}
        />
      </form>

      {status === "error" || adStatus === "error" ? (
        <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm font-black leading-6 text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
