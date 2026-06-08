import { AudioLines, Grid2X2 } from "lucide-react";

export function FormatRail() {
  return (
    <div
      className="flex rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg shadow-slate-950/10 lg:absolute lg:-left-14 lg:top-1/2 lg:z-50 lg:-translate-y-1/2 lg:flex-col"
      data-create-format-rail="legacy"
    >
      <button
        type="button"
        aria-label="Current ad format"
        className="flex size-11 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md shadow-slate-950/20 transition"
      >
        <Grid2X2 className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Audio visualizer format"
        className="flex size-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
        disabled
      >
        <AudioLines className="size-5" />
      </button>
    </div>
  );
}
