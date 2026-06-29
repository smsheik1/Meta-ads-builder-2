import { Check, Clock3, Loader2, X, XCircle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  CreativePackFormat,
  CreativePackGroupStatus,
  CreativePackStatus,
} from "@/features/create/creativePack";
import {
  CREATIVE_PACK_MONEY_SHOT_READY_COUNT as moneyShotReadyCount,
  isCreativePackAudioFormat,
  isCreativePackTerminalStatus as isTerminalStatus,
} from "@/features/create/creativePack";
import type { StoredWebsiteResearchResult } from "@/features/research/types";
import type { AdScene } from "@/features/scene/types";

type PackResearchFacts = {
  brandName?: string;
  colorCount?: number;
  productCount?: number;
  proofCount?: number;
  buyerMomentCount?: number;
};

export type CreativePackOverviewGroup = {
  format: CreativePackFormat;
  label: string;
  status: CreativePackGroupStatus;
  scenes: AdScene[];
  sceneIds: Array<Id<"adScenes"> | null>;
  researchResult?: StoredWebsiteResearchResult;
  message?: string;
  startedAt?: number;
  elapsedMs?: number;
  actionLabel?: string;
  publicMessage?: string;
  debugMessage?: string;
};

const statusCopy: Record<CreativePackGroupStatus, string> = {
  pending: "Queued",
  generating: "Generating",
  "still-cooking": "Still cooking",
  ready: "Ready",
  "needs-retry": "Needs retry",
  cancelled: "Cancelled",
};

function StatusIcon({ status }: { status: CreativePackGroupStatus }) {
  if (status === "ready") return <Check className="size-4 text-emerald-500" />;
  if (status === "generating" || status === "still-cooking") return <Loader2 className="size-4 animate-spin text-indigo-500" />;
  if (status === "needs-retry" || status === "cancelled") return <XCircle className="size-4 text-slate-400" />;
  return <Clock3 className="size-4 text-slate-300" />;
}

function getCardState({
  ready,
  selected,
  status,
}: {
  ready: boolean;
  selected: boolean;
  status: CreativePackGroupStatus;
}) {
  if (selected) return "opened";
  if (ready) return "ready";
  if (status === "needs-retry") return "needs-retry";
  if (status === "cancelled") return "cancelled";
  return "loading";
}

function getCardStatusLabel({
  ready,
  selected,
  status,
}: {
  ready: boolean;
  selected: boolean;
  status: CreativePackGroupStatus;
}) {
  if (selected) return "Opened";
  if (ready) return "Ready";
  if (status === "generating") return "Cooking";
  return statusCopy[status];
}

function getSceneThumbnailText(scene: AdScene | undefined) {
  if (!scene) return "";
  if (scene.format === "text-message") return scene.layout.messages[0]?.text || scene.creative.headline;
  if (scene.format === "reviews") return scene.layout.proof.text;
  if (scene.format === "video-meme") return scene.layout.slots.caption || scene.layout.slots.setupText || scene.creative.headline;
  if (scene.format === "jingle") return scene.layout.lyrics || scene.creative.headline;
  if (scene.format === "brainrot") return scene.layout.beats[0]?.text || scene.creative.headline;
  return scene.creative.headline || scene.creative.subheadline;
}

function getPackTitle({
  allTerminal,
  readyCount,
  status,
}: {
  allTerminal: boolean;
  readyCount: number;
  status: CreativePackStatus;
}) {
  if (status === "researching") return "Reading your brand";
  if (allTerminal && readyCount === 0) return "Generation had issues";
  if (allTerminal && readyCount > 0) return `${readyCount} directions ready`;
  if (readyCount >= moneyShotReadyCount) return "Pick the strongest direction";
  if (readyCount > 0) return "Ideas are landing";
  return "Building your creative pack";
}

function ResearchBeat({
  facts,
  url,
}: {
  facts?: PackResearchFacts | null;
  url?: string;
}) {
  const chips = [
    {
      label: "Colors",
      value: facts?.colorCount ? `${facts.colorCount} found` : "Scanning",
    },
    {
      label: "Products",
      value: facts?.productCount ? `${facts.productCount} found` : "Looking",
    },
    {
      label: "Proof",
      value: facts?.proofCount ? `${facts.proofCount} signals` : "Finding",
    },
    {
      label: "Buyer moments",
      value: facts?.buyerMomentCount ? `${facts.buyerMomentCount} found` : "Mapping",
    },
  ];

  return (
    <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-50">
          <Loader2 className="size-5 animate-spin text-indigo-500" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{facts?.brandName || url || "Reading website"}</p>
          <p className="truncate text-xs font-bold text-slate-500">Finding the raw material before the pack wave.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {chips.map((chip) => (
          <div key={chip.label} className="rounded-2xl bg-white px-3 py-2 shadow-sm shadow-slate-950/5">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{chip.label}</p>
            <p className="mt-1 text-xs font-black text-slate-700">{chip.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AudioSkeleton({ selected }: { selected: boolean }) {
  return (
    <div className="flex h-5 items-end justify-start gap-0.5">
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className={`w-0.5 rounded-full ${selected ? "bg-white/55" : "bg-slate-300"} animate-pulse`}
          style={{
            height: `${6 + ((index * 7) % 13)}px`,
            animationDelay: `${index * 70}ms`,
          }}
        />
      ))}
    </div>
  );
}

function TextSkeleton({ selected }: { selected: boolean }) {
  const color = selected ? "bg-white/25" : "bg-slate-200";
  return (
    <div className="space-y-1">
      <span className={`block h-2 w-11/12 rounded-full ${color}`} />
      <span className={`block h-2 w-2/3 rounded-full ${color}`} />
    </div>
  );
}

export function CreateCreativePackOverview({
  debug,
  groups,
  moneyShotActive,
  onCancel,
  onSelectGroup,
  researchFacts,
  researchUrl,
  selectedFormat,
  status,
}: {
  debug?: boolean;
  groups: CreativePackOverviewGroup[];
  moneyShotActive?: boolean;
  onCancel?: () => void;
  onSelectGroup: (format: CreativePackFormat) => void;
  researchFacts?: PackResearchFacts | null;
  researchUrl?: string;
  selectedFormat: CreativePackFormat | null;
  status: CreativePackStatus;
}) {
  if (!groups.length && status !== "researching") return null;

  const readyCount = groups.filter((group) => group.status === "ready").length;
  const busy = status === "researching" || status === "generating";
  const allTerminal = Boolean(groups.length) && groups.every((group) => isTerminalStatus(group.status));
  const title = getPackTitle({ allTerminal, readyCount, status });
  const pillCopy = status === "researching"
    ? "Reading"
    : groups.length
      ? `${readyCount} ready`
      : "Starting";

  return (
    <section
      className={`w-full rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-950/8 backdrop-blur ${moneyShotActive ? "animate-[creativePackPulse_900ms_ease-out_1]" : ""}`}
      data-creative-pack-overview="true"
      data-creative-pack-dock="true"
      data-creative-pack-status={status}
      data-creative-pack-ready-count={readyCount}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">Creative Pack</p>
          <h2 className="mt-1 text-xl font-black leading-tight text-slate-950">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {busy && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-950"
              aria-label="Cancel creative pack"
              data-cancel-creative-pack-header
            >
              <X className="size-4" />
            </button>
          ) : null}
          <div className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
            {pillCopy}
          </div>
        </div>
      </div>

      {status === "researching" ? (
        <ResearchBeat facts={researchFacts} url={researchUrl} />
      ) : null}

      {groups.length ? <div className="grid gap-2">
        {groups.map((group, index) => {
          const firstScene = group.scenes[0];
          const selected = selectedFormat === group.format;
          const ready = group.status === "ready" && group.scenes.length > 0;
          const cardState = getCardState({ ready, selected, status: group.status });
          const statusLabel = getCardStatusLabel({ ready, selected, status: group.status });
          const thumbnailText = getSceneThumbnailText(firstScene);
          const logoUrl = firstScene?.brand.logoUrl || firstScene?.brand.faviconUrl || "";
          const publicMessage = group.publicMessage || group.message || (busy ? "Waiting its turn." : statusCopy[group.status]);
          const waiting = group.status === "pending" || group.status === "generating" || group.status === "still-cooking";
          const failed = group.status === "needs-retry" || group.status === "cancelled";

          return (
            <button
              key={group.format}
              type="button"
              onClick={() => ready && onSelectGroup(group.format)}
              disabled={!ready}
              className={`rounded-[18px] border px-3 py-2.5 text-left transition duration-300 ${
                selected
                  ? "border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-950/15"
                  : ready
                    ? "border-emerald-100 bg-white text-slate-950 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/10"
                    : group.status === "needs-retry"
                      ? "border-rose-100 bg-rose-50/60 text-slate-500"
                      : "border-slate-100 bg-slate-50 text-slate-500"
              } ${ready ? "scale-100 opacity-100" : "scale-[0.99] opacity-90"} ${moneyShotActive && ready ? "animate-[creativePackReadyGlow_760ms_ease-out_both]" : "animate-[creativePackCardIn_420ms_ease-out_both]"}`}
              style={{
                animationDelay: `${index * 110}ms`,
                transitionDelay: ready ? `${index * 45}ms` : "0ms",
              }}
              data-creative-pack-card={group.format}
              data-creative-pack-card-status={group.status}
              data-creative-pack-card-state={cardState}
              data-creative-pack-card-ready={ready ? "true" : "false"}
              data-creative-pack-card-selected={selected ? "true" : "false"}
              data-creative-pack-action={group.actionLabel || ""}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full ${selected ? "bg-white/15" : "bg-slate-100"}`}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="size-6 rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-black">{group.label.slice(0, 1)}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{group.label}</p>
                    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${selected ? "text-white/55" : "text-slate-400"}`}>
                      {ready ? `${group.scenes.length} ${group.scenes.length === 1 ? "ad" : "ads"} · ${statusLabel}` : statusLabel}
                    </p>
                  </div>
                </div>
                <StatusIcon status={group.status} />
              </div>

              {selected ? (
                <div className="mt-2 rounded-[16px] bg-white/10 px-3 py-2.5">
                  <p className="line-clamp-2 text-sm font-black leading-5">
                    {thumbnailText || "Ready to preview"}
                  </p>
                </div>
              ) : ready ? (
                <p className="mt-1 line-clamp-1 text-xs font-black leading-4 text-slate-500">
                  {thumbnailText || "Ready to preview"}
                </p>
              ) : waiting ? (
                <div className="mt-2 rounded-[14px] bg-slate-100 px-3 py-2">
                  {isCreativePackAudioFormat(group.format) ? <AudioSkeleton selected={selected} /> : <TextSkeleton selected={selected} />}
                  <p className="mt-1 line-clamp-1 text-[11px] font-bold leading-4 text-slate-500">
                    {publicMessage}
                  </p>
                </div>
              ) : failed ? (
                <div className="mt-1">
                  <p className="line-clamp-1 text-xs font-black leading-4 text-slate-500">
                    {publicMessage}
                  </p>
                  {debug && group.debugMessage ? (
                    <p className="mt-1 line-clamp-2 rounded-xl bg-white/70 px-2 py-1 text-[10px] font-bold leading-4 text-slate-500">
                      Details: {group.debugMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div> : null}
    </section>
  );
}
