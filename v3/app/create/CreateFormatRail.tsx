import { AudioLines, Grid2X2, MessageCircle } from "lucide-react";

export function FormatRail() {
  return (
    <div className="mt-64 hidden w-16 shrink-0 self-start rounded-[28px] border border-slate-200 bg-white/95 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)] xl:grid xl:content-start">
      <button
        type="button"
        aria-label="Visualizer format"
        className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm"
      >
        <AudioLines className="size-6" />
      </button>
      <button
        type="button"
        aria-label="Future image format"
        className="mt-3 grid size-12 place-items-center rounded-2xl border border-slate-200 text-slate-300"
        disabled
      >
        <Grid2X2 className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Future social format"
        className="mt-3 grid size-12 place-items-center rounded-2xl border border-slate-200 text-slate-300"
        disabled
      >
        <MessageCircle className="size-5" />
      </button>
    </div>
  );
}
