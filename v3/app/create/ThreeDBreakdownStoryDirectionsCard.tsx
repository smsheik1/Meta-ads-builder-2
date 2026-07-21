"use client";

import { Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ThreeDBreakdownStoryDirection } from "@/features/formats/three-d-breakdown/storyDirections";

type StoryDirectionStatus = "idle" | "loading" | "ready" | "error";

export function ThreeDBreakdownStoryDirectionsCard({
  directions,
  error,
  onSelectDirection,
  onUseDirection,
  selectedDirectionId,
  status,
}: {
  directions: ThreeDBreakdownStoryDirection[];
  error: string;
  onSelectDirection: (directionId: string) => void;
  onUseDirection: (direction: ThreeDBreakdownStoryDirection) => void;
  selectedDirectionId: string;
  status: StoryDirectionStatus;
}) {
  const selectedDirection = directions.find((direction) => direction.directionId === selectedDirectionId) || directions[0] || null;

  return (
    <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/6" data-three-d-story-directions-card="true">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Story directions</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Pick the premise</h3>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Choose the story before spending on images or video.</p>
        </div>
        <Badge variant="outline" className="rounded-full text-[10px] font-black uppercase">
          {status === "loading" ? "Finding ideas" : `${directions.length || 0} ideas`}
        </Badge>
      </div>

      {status === "loading" ? (
        <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Building story slate
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
          {error}
        </p>
      ) : null}

      {directions.length ? (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-2 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.35fr)]">
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:grid-cols-1" role="tablist" aria-label="Choose a story direction">
            {directions.map((direction, index) => {
              const selected = direction.directionId === selectedDirection?.directionId;
              return (
                <button
                  key={direction.directionId}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="selected-story-direction"
                  onClick={() => onSelectDirection(direction.directionId)}
                  className={`group relative min-h-14 rounded-lg border-2 p-1.5 text-left transition sm:min-h-[4.5rem] sm:rounded-xl sm:px-3 sm:py-2.5 ${selected ? "border-slate-950 bg-[#52D6FF] text-slate-950 shadow-[3px_3px_0_#080817]" : "border-transparent bg-white text-slate-950 hover:border-slate-300 hover:bg-[#F7F8FB]"}`}
                  data-three-d-story-direction={direction.directionId}
                >
                  <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-start sm:gap-2.5">
                    <span className={`grid size-5 shrink-0 place-items-center rounded-md text-[9px] font-black sm:size-6 sm:text-[10px] ${selected ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"}`}>
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-center text-[7px] font-black uppercase leading-3 tracking-[0.08em] text-slate-500 sm:text-left sm:text-[9px] sm:tracking-[0.14em]">
                        {direction.category}
                      </span>
                      <span className="mt-1 hidden line-clamp-2 text-[11px] font-black leading-4 sm:block">{direction.hookLine}</span>
                    </span>
                    {selected ? <Check className="absolute right-1 top-1 size-3 shrink-0 sm:static sm:ml-auto sm:mt-0.5 sm:size-4" strokeWidth={3} /> : null}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedDirection ? (
            <article id="selected-story-direction" role="tabpanel" className="flex min-h-[20rem] flex-col rounded-xl bg-[#080817] p-4 text-white shadow-lg shadow-slate-950/10">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#52D6FF]">Selected direction</p>
                <Badge className="border-white/15 bg-white/10 text-[9px] font-black uppercase text-white hover:bg-white/10">{selectedDirection.category}</Badge>
              </div>
              <h4 className="mt-3 text-xl font-black leading-[1.08] tracking-normal">{selectedDirection.hookLine}</h4>
              <p className="mt-2 text-sm font-bold leading-5 text-white/65">{selectedDirection.subheadline}</p>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.07] p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#C9FF55]">The story</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-white/80">{selectedDirection.shortSummary}</p>
              </div>

              <details className="mt-3 rounded-xl border border-white/10 px-3 py-2.5 text-[11px] font-semibold leading-4 text-white/70">
                <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.12em] text-white">Creative details</summary>
                <p className="mt-2"><span className="font-black text-white">Angle:</span> {selectedDirection.adAngle}</p>
                <p className="mt-2"><span className="font-black text-white">Visual payoff:</span> {selectedDirection.visualEngine}</p>
                <p className="mt-2"><span className="font-black text-white">Why it can work:</span> {selectedDirection.whyCompelling}</p>
              </details>

              <Button
                type="button"
                onClick={() => onUseDirection(selectedDirection)}
                className="mt-auto h-11 w-full rounded-xl border-2 border-slate-950 bg-[#C9FF55] text-xs font-black uppercase tracking-[0.12em] text-slate-950 shadow-[3px_3px_0_#52D6FF] hover:bg-[#B8F044]"
                data-three-d-use-story-direction={selectedDirection.directionId}
              >
                {status === "error" ? "Retry direction" : "Use this direction"}
              </Button>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
