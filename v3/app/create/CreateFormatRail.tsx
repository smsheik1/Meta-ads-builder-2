import { AudioLines, Grid2X2 } from "lucide-react";

export function FormatRail() {
  return (
    <div
      className="mt-64 hidden w-[58px] shrink-0 self-start rounded-full border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)] xl:grid xl:content-start xl:gap-2"
      data-create-format-rail="legacy"
    >
      <button
        type="button"
        aria-label="Current ad format"
        className="grid size-11 place-items-center rounded-[18px] bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
      >
        <Grid2X2 className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Audio visualizer format"
        className="grid size-11 place-items-center rounded-[18px] text-slate-400 transition hover:bg-slate-50"
        disabled
      >
        <AudioLines className="size-6" />
      </button>
    </div>
  );
}
