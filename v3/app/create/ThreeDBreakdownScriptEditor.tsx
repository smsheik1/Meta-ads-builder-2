"use client";

import { Clapperboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { ThreeDBreakdownAdScene } from "@/features/scene/types";

export function ThreeDBreakdownScriptEditor({
  disabled,
  onBeatChanged,
  scriptBeats,
}: {
  disabled: boolean;
  onBeatChanged: (beatIndex: number, narration: string) => void;
  scriptBeats: ThreeDBreakdownAdScene["layout"]["scriptBeats"];
}) {
  const ready = scriptBeats.every((beat) => beat.narration.trim());

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-sm font-black text-slate-950">
        <Clapperboard className="size-4" />
        Script
        <Badge className={`ml-auto rounded-full text-[10px] font-black ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {ready ? "Ready" : "Needs words"}
        </Badge>
      </div>
      <p className="mt-2 text-[11px] font-bold leading-4 text-slate-500">
        Edit any part below. These exact words will be used for the narrator and captions.
      </p>
      <div className="mt-2 space-y-1.5">
        {scriptBeats.map((beat, beatIndex) => (
          <div key={`${beat.role}-${beat.startMs}`} className="rounded-xl bg-white px-3 py-2" data-three-d-script-beat="true">
            <label htmlFor={`three-d-script-beat-${beatIndex}`} className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
              {beat.role.replace(/-/g, " ")}
            </label>
            <Textarea
              id={`three-d-script-beat-${beatIndex}`}
              value={beat.narration}
              onChange={(event) => onBeatChanged(beatIndex, event.target.value)}
              disabled={disabled}
              rows={3}
              className="mt-1 min-h-20 resize-y rounded-xl border-slate-200 bg-white text-xs font-semibold leading-5 text-slate-700"
              aria-label={`${beat.role.replace(/-/g, " ")} script`}
              data-three-d-script-beat-editor={beat.role}
            />
          </div>
        ))}
      </div>
      {!ready ? (
        <p role="alert" className="mt-2 text-[11px] font-bold leading-4 text-amber-700">
          Add words to every section before generating media.
        </p>
      ) : disabled ? (
        <p className="mt-2 text-[11px] font-bold leading-4 text-slate-500">
          Finish the current generation before editing the script.
        </p>
      ) : null}
    </div>
  );
}
