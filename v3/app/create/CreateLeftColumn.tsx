import { Check, Circle, Loader2, Wand2, XCircle } from "lucide-react";
import {
  NIM_MEME_MODEL_OPTIONS,
  NIM_VISUALIZER_MODEL_OPTIONS,
} from "@/features/llm/nvidiaNimModels";
import { JINGLE_STYLES, type JingleStyleId } from "@/features/formats/jingle/prompt";
import { VIDEO_MEME_TEMPLATES, getVideoMemeTemplate, type VideoMemeTemplateId } from "@/features/formats/video-meme/templates";
import {
  CREATIVE_PACK_FORMATS,
  type CreativePackFormat,
  type CreativePackGroupStatus,
  type CreativePackStatus,
} from "@/features/create/creativePack";
import type { ProductCatalog } from "@/features/research/types";
import { CreateReviewsProductPicker } from "./CreateReviewsProductPicker";
import { PRODUCT_PHOTOSHOOT_FORMAT, type CreateFormatId } from "./createFormats";

type LoadStatus = "idle" | "loading" | "ready" | "error";
export type WebsiteSubmitProgressStage = "reading-site" | "writing-ads" | "preparing-canvas" | null;

export type WebsiteSubmitProgressFacts = {
  brandName: string;
  hasLogo: boolean;
  colorCount: number;
  productCount?: number;
  proofCount: number;
  buyerMomentCount: number;
};

const pillClass = "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm";

type ModelOption = {
  id: string;
  label: string;
};

type CreativePackMiniGroup = {
  format: CreativePackFormat;
  label: string;
  status: CreativePackGroupStatus;
  scenes: unknown[];
  publicMessage?: string;
  message?: string;
};

const creativePackStatusLabel: Record<CreativePackGroupStatus, string> = {
  pending: "Loading",
  generating: "Loading",
  "still-cooking": "Still cooking",
  ready: "Ready",
  "needs-retry": "Needs retry",
  cancelled: "Cancelled",
};

const getProgressRows = (format: CreateFormatId, videoMemeTemplateId: VideoMemeTemplateId = "bear-sniff") => [
  { id: "reading-site", label: "Reading website" },
  { id: "brand-proof", label: "Pulling brand proof" },
  { id: "selling-angle", label: "Finding selling angle" },
  {
    id: "writing-ads",
    label: format === "meme" ? "Writing 12 memes" : format === "were-sorry"
      ? "Writing 8 apologies"
      : format === "video-meme"
        ? `Writing ${getVideoMemeTemplate(videoMemeTemplateId)?.variantCount || 8} video memes`
        : format === "jingle"
          ? "Writing 1 jingle"
          : format === PRODUCT_PHOTOSHOOT_FORMAT
            ? "Generating 6 product shots"
          : format === "reviews"
            ? "Writing 4 proof ads"
            : format === "motion-story"
              ? "Writing 4 motion stories"
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

function CreateResearchProgressCard({ facts, format, showSlowResearchMessage, stage, videoMemeTemplateId }: {
  facts: WebsiteSubmitProgressFacts | null;
  format: CreateFormatId;
  showSlowResearchMessage: boolean;
  stage: WebsiteSubmitProgressStage;
  videoMemeTemplateId: VideoMemeTemplateId;
}) {
  if (!stage) return null;
  const progressRows = getProgressRows(format, videoMemeTemplateId);

  const factRows = facts ? [facts.brandName ? `Found ${facts.brandName}` : "", facts.hasLogo ? "Found logo" : "", facts.colorCount ? `Found ${facts.colorCount} brand colors` : "", facts.proofCount ? `Found ${facts.proofCount} proof points` : "", facts.buyerMomentCount ? `Found ${facts.buyerMomentCount} buyer moments` : ""].filter(Boolean) : [];

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
        suppressHydrationWarning
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

function CreativePackMiniStatus({
  groups,
  onRetryGroup,
  onSelectGroup,
  selectedFormat,
  status,
}: {
  groups: CreativePackMiniGroup[];
  onRetryGroup?: (format: CreativePackFormat) => void;
  onSelectGroup?: (format: CreativePackFormat) => void;
  selectedFormat?: CreativePackFormat | null;
  status: CreativePackStatus;
}) {
  if (!groups.length) return null;

  const groupByFormat = new Map(groups.map((group) => [group.format, group]));
  const packBusy = status === "researching" || status === "generating";

  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3" data-creative-pack-mini-status="true">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Creative pack</p>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {groups.filter((group) => group.status === "ready").length}/{CREATIVE_PACK_FORMATS.length} ready
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CREATIVE_PACK_FORMATS.map(({ format: packFormat, label }) => {
          const group = groupByFormat.get(packFormat);
          const groupStatus = group?.status || "pending";
          const ready = groupStatus === "ready" && Boolean(group?.scenes.length);
          const selected = selectedFormat === packFormat;
          const loading = groupStatus === "pending" || groupStatus === "generating" || groupStatus === "still-cooking";
          const failed = groupStatus === "needs-retry" || groupStatus === "cancelled";
          const statusText = creativePackStatusLabel[groupStatus];
          const retryable = failed && !packBusy && Boolean(onRetryGroup);
          const title = `${label}: ${statusText}${retryable ? ". Retry this format." : ""}`;

          return (
            <button
              key={packFormat}
              type="button"
              title={title}
              aria-label={title}
              disabled={loading || (!ready && !retryable)}
              onClick={() => {
                if (ready) onSelectGroup?.(packFormat);
                else if (retryable) onRetryGroup?.(packFormat);
              }}
              className={`flex h-9 min-w-0 items-center gap-2 rounded-2xl border px-2.5 text-left transition ${
                selected
                  ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                  : ready
                    ? "border-emerald-100 bg-white text-slate-950 hover:border-emerald-200 hover:shadow-sm"
                    : failed
                      ? "border-rose-100 bg-white text-slate-500"
                      : "border-slate-100 bg-white text-slate-500"
              } disabled:cursor-default`}
              data-creative-pack-mini-chip={packFormat}
              data-creative-pack-mini-chip-status={groupStatus}
            >
              <span className="grid size-4 shrink-0 place-items-center">
                {ready ? (
                  <Check className={`size-4 ${selected ? "text-white" : "text-emerald-500"}`} />
                ) : failed ? (
                  <XCircle className="size-4 text-rose-400" />
                ) : loading ? (
                  <Loader2 className="size-4 animate-spin text-indigo-500" />
                ) : (
                  <Circle className="size-3 text-slate-300" />
                )}
              </span>
              <span className="min-w-0 truncate text-xs font-black">{failed ? `${label} · Retry` : label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CreateLeftColumn({
  adScenesCount,
  adStatus,
  creativePackGroups = [],
  creativePackStatus,
  selectedCreativePackFormat,
  error,
  format,
  memeModel,
  productCatalog,
  selectedReviewProductHandles,
  jingleStyleId,
  videoMemeTemplateId,
  visualizerModel,
  onFormatChange,
  onGenerateCreativePack,
  onCancelCreativePack,
  onCreativePackGroupRetry,
  onCreativePackGroupSelect,
  onJingleStyleChange,
  onMemeModelChange,
  onReviewProductSelectionChange,
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
  creativePackGroups?: CreativePackMiniGroup[];
  creativePackStatus: CreativePackStatus;
  selectedCreativePackFormat?: CreativePackFormat | null;
  error: string;
  format: CreateFormatId;
  memeModel: string;
  productCatalog?: ProductCatalog | null;
  selectedReviewProductHandles: string[];
  jingleStyleId: JingleStyleId;
  videoMemeTemplateId: VideoMemeTemplateId;
  visualizerModel: string;
  onFormatChange: (format: CreateFormatId) => void;
  onGenerateCreativePack: () => void;
  onCancelCreativePack: () => void;
  onCreativePackGroupRetry?: (format: CreativePackFormat) => void;
  onCreativePackGroupSelect?: (format: CreativePackFormat) => void;
  onJingleStyleChange: (styleId: JingleStyleId) => void;
  onMemeModelChange: (model: string) => void;
  onReviewProductSelectionChange: (handles: string[]) => void;
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
  const creativePackBusy = creativePackStatus === "researching" || creativePackStatus === "generating";
  const singleSubmitBusy = status === "loading" || adStatus === "loading";
  const submitIsBusy = singleSubmitBusy || creativePackBusy;
  const submitLabel = creativePackBusy
    ? "Creative pack running"
    : status === "loading"
    ? "Reading website"
    : adStatus === "loading"
      ? format === PRODUCT_PHOTOSHOOT_FORMAT
        ? "Generating shots"
        : format === "meme"
        ? "Writing memes"
        : format === "were-sorry"
          ? "Writing apologies"
          : format === "video-meme"
            ? "Writing video memes"
            : format === "jingle"
              ? "Writing jingles"
              : format === "text-message"
                ? "Writing texts"
                : format === "brainrot"
                  ? "Writing brainrot"
                  : format === "reviews"
                    ? "Writing proof ads"
                    : format === "motion-story"
                      ? "Writing stories"
                    : "Writing ideas"
      : format === PRODUCT_PHOTOSHOOT_FORMAT
        ? "Generate product shots"
        : "Generate ads";
  const packLabel = creativePackStatus === "researching"
    ? "Reading site for pack"
    : creativePackStatus === "generating"
      ? "Generating creative pack"
      : "Generate creative pack";
  const formatHelper = format === PRODUCT_PHOTOSHOOT_FORMAT
    ? "Six polished 4:5 product stills for social, website, PDP, email, and organic posts."
    : format === "meme"
    ? "Twelve brand-aligned meme drafts, ready to spacebar through."
    : format === "were-sorry"
      ? "Eight wink-apology posts for the Instagram trend."
      : format === "video-meme"
        ? "Eight reaction captions for the selected video meme."
        : format === "jingle"
          ? "One short hip hop brand jingle. No extra music generations."
          : format === "text-message"
            ? "Six iMessage-style screenshots that feel like a real customer text."
            : format === "brainrot"
              ? "Three two-character Minecraft Brainrot scripts with Fish voices."
              : format === "reviews"
                ? "Eight proof ads across review-card and minimal quote styles."
                : format === "motion-story"
                  ? "Four premium motion-graphics product stories using a real product and real review."
                : "Audio visualizer ads with voice, captions, and MP4 export.";
  const errorPanel = status === "error" || adStatus === "error" ? (
    <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm font-black leading-6 text-red-700">
      {error}
    </div>
  ) : null;

  return (
    <div className="max-w-xl">
      <p className={pillClass}>
        <Wand2 className="size-4 text-[#4F46E5]" />
        {adScenesCount ? "Ads ready to review" : "Add a website first"}
      </p>
      <h1
        className="wiggly-hero-headline mt-4 text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-7xl"
        style={{
          animation: "none",
          background: "none",
          backgroundClip: "border-box",
          color: "#020617",
          textShadow: "none",
          transform: "none",
          WebkitBackgroundClip: "border-box",
        }}
      >
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
            suppressHydrationWarning
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            placeholder="https://yourbrand.com"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Format</span>
          <select
            suppressHydrationWarning
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            aria-label="Ad format"
            value={format}
            onChange={(event) => onFormatChange(event.target.value as CreateFormatId)}
          >
            {[
              ["meme", "Meme Ad"],
              ["were-sorry", "We're Sorry Ad"],
              ["video-meme", "Video Meme"],
              ["jingle", "Brand Jingle"],
              ["text-message", "iMessage Ad"],
              ["brainrot", "Minecraft Brainrot"],
              ["reviews", "Reviews Proof Ad"],
              ["motion-story", "Motion Story"],
              [PRODUCT_PHOTOSHOOT_FORMAT, "Product Photoshoot"],
              ["visualizer", "Visualizer Ad"],
            ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
              suppressHydrationWarning
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

        {format === "jingle" ? (
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Song style</span>
            <select
              suppressHydrationWarning
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              aria-label="Jingle song style"
              value={jingleStyleId}
              onChange={(event) => onJingleStyleChange(event.target.value as JingleStyleId)}
            >
              {JINGLE_STYLES.map((style) => (
                <option key={style.id} value={style.id}>{style.label}</option>
              ))}
            </select>
            <span className="mt-1.5 block min-h-4 text-xs font-semibold text-slate-400">
              {JINGLE_STYLES.find((style) => style.id === jingleStyleId)?.helper || "Pick the music lane for this jingle."}
            </span>
          </label>
        ) : null}

        {format === "reviews" || format === "motion-story" ? (
          <CreateReviewsProductPicker
            catalog={productCatalog}
            selectedHandles={selectedReviewProductHandles}
            onSelectionChange={onReviewProductSelectionChange}
          />
        ) : null}

        <button
          type="submit"
          disabled={submitIsBusy}
          className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800 ${submitIsBusy ? "cursor-progress" : ""} disabled:cursor-not-allowed disabled:opacity-45`}
        >
          {submitIsBusy ? <Loader2 className="size-5 animate-spin" /> : <Wand2 className="size-5" />}
          {submitLabel}
        </button>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            disabled={submitIsBusy}
            onClick={onGenerateCreativePack}
            className={`flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 ${creativePackBusy ? "cursor-progress" : ""} disabled:cursor-not-allowed disabled:opacity-45`}
            data-generate-creative-pack
          >
            {creativePackBusy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4 text-indigo-500" />}
            {packLabel}
          </button>

          {creativePackBusy ? (
            <button
              type="button"
              onClick={onCancelCreativePack}
              className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
              data-cancel-creative-pack
            >
              Cancel
            </button>
          ) : null}
        </div>

        {creativePackGroups.length ? (
          <CreativePackMiniStatus
            groups={creativePackGroups}
            onRetryGroup={onCreativePackGroupRetry}
            onSelectGroup={onCreativePackGroupSelect}
            selectedFormat={selectedCreativePackFormat}
            status={creativePackStatus}
          />
        ) : (
          <CreateResearchProgressCard
            facts={progressFacts}
            format={format}
            showSlowResearchMessage={showSlowResearchMessage}
            stage={progressStage}
            videoMemeTemplateId={videoMemeTemplateId}
          />
        )}
      </form>

      {errorPanel}
    </div>
  );
}
