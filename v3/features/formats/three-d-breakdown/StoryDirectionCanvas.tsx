import { Box, Eye, Loader2 } from "lucide-react";
import type { ThreeDBreakdownStoryDirection } from "./storyDirections";

type StoryDirectionCanvasStatus = "idle" | "loading" | "ready" | "error";

export function ThreeDBreakdownStoryDirectionCanvas({
  direction,
  directionCount,
  directionIndex,
  status,
}: {
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
      <div
        className="relative flex h-full flex-col p-6"
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
                Direction {directionIndex + 1} of {directionCount}
              </span>
            </div>

            <div className="flex flex-1 items-center py-6">
              <h2 className="text-3xl font-black leading-[1.02]">
                {direction.hookLine}
              </h2>
            </div>

            <div className="border-t border-slate-300 pt-4">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                <Eye className="size-3.5 text-cyan-600" />
                3D reveal
              </div>
              <p className="mt-2 line-clamp-4 text-sm font-bold leading-5 text-slate-700">{direction.visualEngine}</p>
            </div>
            <p className="mt-5 text-center text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Your final video will appear here
            </p>
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
