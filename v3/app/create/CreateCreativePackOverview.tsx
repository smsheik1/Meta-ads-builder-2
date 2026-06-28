import { Check, Clock3, Loader2, XCircle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  CreativePackFormat,
  CreativePackGroupStatus,
  CreativePackStatus,
} from "@/features/create/creativePack";
import type { StoredWebsiteResearchResult } from "@/features/research/types";
import type { AdScene } from "@/features/scene/types";

export type CreativePackOverviewGroup = {
  format: CreativePackFormat;
  label: string;
  status: CreativePackGroupStatus;
  scenes: AdScene[];
  sceneIds: Array<Id<"adScenes"> | null>;
  researchResult?: StoredWebsiteResearchResult;
  message?: string;
  readyAt?: number;
};

const statusCopy: Record<CreativePackGroupStatus, string> = {
  pending: "Queued",
  generating: "Generating",
  ready: "Ready",
  unavailable: "Unavailable",
  cancelled: "Cancelled",
};

function StatusIcon({ status }: { status: CreativePackGroupStatus }) {
  if (status === "ready") return <Check className="size-4 text-emerald-500" />;
  if (status === "generating") return <Loader2 className="size-4 animate-spin text-indigo-500" />;
  if (status === "unavailable" || status === "cancelled") return <XCircle className="size-4 text-slate-400" />;
  return <Clock3 className="size-4 text-slate-300" />;
}

function getSceneThumbnailText(scene: AdScene | undefined) {
  if (!scene) return "";
  if (scene.format === "text-message") return scene.layout.messages[0]?.text || scene.creative.headline;
  if (scene.format === "reviews") return scene.layout.proof.text;
  if (scene.format === "video-meme") return scene.layout.slots.caption || scene.layout.slots.setupText || scene.creative.headline;
  return scene.creative.headline || scene.creative.subheadline;
}

export function CreateCreativePackOverview({
  groups,
  onSelectGroup,
  selectedFormat,
  status,
}: {
  groups: CreativePackOverviewGroup[];
  onSelectGroup: (format: CreativePackFormat) => void;
  selectedFormat: CreativePackFormat | null;
  status: CreativePackStatus;
}) {
  if (!groups.length) return null;

  const readyCount = groups.filter((group) => group.status === "ready").length;
  const busy = status === "researching" || status === "generating";

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-xl shadow-slate-950/8"
      data-creative-pack-overview="true"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">Creative Pack</p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950">Pick the strongest direction</h2>
        </div>
        <div className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
          {readyCount}/{groups.length}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {groups.map((group, index) => {
          const firstScene = group.scenes[0];
          const selected = selectedFormat === group.format;
          const ready = group.status === "ready" && group.scenes.length > 0;
          const thumbnailText = getSceneThumbnailText(firstScene);
          const logoUrl = firstScene?.brand.logoUrl || firstScene?.brand.faviconUrl || "";

          return (
            <button
              key={group.format}
              type="button"
              onClick={() => ready && onSelectGroup(group.format)}
              disabled={!ready}
              className={`min-h-[154px] rounded-[22px] border p-3 text-left transition duration-300 ${
                selected
                  ? "border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-950/15"
                  : ready
                    ? "border-slate-200 bg-white text-slate-950 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-950/10"
                    : "border-slate-100 bg-slate-50 text-slate-500"
              } ${ready ? "scale-100 opacity-100" : "scale-[0.98] opacity-80"}`}
              style={{ transitionDelay: ready ? `${index * 70}ms` : "0ms" }}
              data-creative-pack-card={group.format}
              data-creative-pack-card-status={group.status}
              data-creative-pack-card-ready={ready ? "true" : "false"}
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
                      {ready ? `${group.scenes.length} ads` : statusCopy[group.status]}
                    </p>
                  </div>
                </div>
                <StatusIcon status={group.status} />
              </div>

              <div className={`mt-3 min-h-[72px] rounded-[18px] px-3 py-3 ${selected ? "bg-white/10" : "bg-slate-100"}`}>
                {ready ? (
                  <p className="line-clamp-3 text-sm font-black leading-5">
                    {thumbnailText || "Ready to preview"}
                  </p>
                ) : (
                  <p className="text-xs font-bold leading-5">
                    {group.message || (busy ? "Waiting its turn." : statusCopy[group.status])}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
