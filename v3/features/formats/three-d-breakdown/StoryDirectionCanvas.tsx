import { Box, Eye, Loader2 } from "lucide-react";
import type { ThreeDBreakdownStoryDirection } from "./storyDirections";

type StoryDirectionCanvasStatus = "idle" | "loading" | "ready" | "error";

export function ThreeDBreakdownStoryDirectionCanvas({
  brandName,
  direction,
  directionCount,
  directionIndex,
  status,
}: {
  brandName: string;
  direction: ThreeDBreakdownStoryDirection | null;
  directionCount: number;
  directionIndex: number;
  status: StoryDirectionCanvasStatus;
}) {
  const ready = status === "ready" && direction;

  return (
    <section
      className="relative mx-auto aspect-[1/2] h-[clamp(470px,calc(100vh-15rem),720px)] w-auto max-w-full overflow-hidden rounded-lg border border-slate-300 bg-[#f7f8f6] text-slate-950 shadow-2xl shadow-slate-950/15"
      data-three-d-story-slate-canvas="true"
    >
      <div className="flex h-[10%] items-center justify-between border-b border-slate-900 bg-slate-950 px-5 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{brandName || "3D Breakdown"}</p>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">Story lab</p>
        </div>
        <span className="rounded-full border border-white/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/80">
          {ready ? `${directionIndex + 1} / ${directionCount}` : "Premise"}
        </span>
      </div>

      <div
        className="relative flex h-[90%] flex-col p-5"
        style={{
          backgroundImage: "linear-gradient(rgba(15,23,42,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.055) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        {status === "loading" ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center" data-three-d-story-slate-loading="true">
            <img src="/wiggly-wordmark-3d-crop.png" alt="" className="wiggly-preview-bounce h-14 w-auto" />
            <Loader2 className="mt-6 size-5 animate-spin text-slate-500" />
            <h2 className="mt-4 text-xl font-black">Finding five story angles</h2>
            <p className="mt-2 max-w-[250px] text-sm font-bold leading-5 text-slate-500">
              Reading the offer, hidden problem, mechanism, and proof.
            </p>
          </div>
        ) : ready ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-cyan-300 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-950">
                {direction.category}
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                Selected treatment
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-center py-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">The premise</p>
              <h2 className="mt-3 text-2xl font-black leading-[1.02]">
                {direction.hookLine}
              </h2>
              <p className="mt-4 text-sm font-bold leading-5 text-slate-600">{direction.subheadline}</p>
            </div>

            <div className="space-y-3 border-t border-slate-300 pt-4">
              <div className="bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  <Eye className="size-3.5 text-cyan-600" />
                  Visual reveal
                </div>
                <p className="mt-2 line-clamp-3 text-xs font-bold leading-4 text-slate-700">{direction.visualEngine}</p>
              </div>
              <div className="flex items-center justify-between gap-3 bg-slate-950 px-3 py-3 text-white">
                <div className="flex items-center gap-2">
                  <Box className="size-4 text-cyan-300" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/50">Evidence</p>
                    <p className="text-xs font-black capitalize">{direction.evidenceUseType}</p>
                  </div>
                </div>
                <p className="text-right text-[9px] font-black uppercase tracking-[0.12em] text-cyan-300">
                  Direction selected<br />Next: script
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-center gap-1.5" aria-label={`${directionIndex + 1} of ${directionCount} story directions`}>
              {Array.from({ length: directionCount }, (_, index) => (
                <span
                  key={index}
                  className={index === directionIndex ? "h-1.5 w-6 bg-slate-950" : "size-1.5 bg-slate-300"}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Box className="size-10 text-cyan-600" />
            <h2 className="mt-5 text-2xl font-black">
              {status === "error" ? "Story slate needs another pass." : "Start with a product page."}
            </h2>
            <p className="mt-3 max-w-[260px] text-sm font-bold leading-5 text-slate-500">
              {status === "error"
                ? "Retry the story directions before generating any media."
                : "Wiggly will uncover five evidence-backed premises before generating images or video."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
