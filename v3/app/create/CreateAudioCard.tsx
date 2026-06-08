import type { RefObject } from "react";
import { Check, Loader2, Mic } from "lucide-react";
import type { AdSceneCaption } from "@/features/scene/types";

type AudioStatus = "idle" | "loading" | "ready" | "error";

export function CreateAudioCard({
  audioError,
  audioRef,
  audioStatus,
  audioStatusLabel,
  captions,
  hasEmptyEditedCaption,
  hasGeneratedAudio,
  hasSelectedScene,
  onAudioEnded,
  onAudioPause,
  onAudioPlay,
  onAudioTimeUpdate,
  onOpenAudioPanel,
  onUpdateCaptionText,
  playableAudioUrl,
}: {
  audioError: string;
  audioRef: RefObject<HTMLAudioElement | null>;
  audioStatus: AudioStatus;
  audioStatusLabel: string;
  captions: AdSceneCaption[];
  hasEmptyEditedCaption: boolean;
  hasGeneratedAudio: boolean;
  hasSelectedScene: boolean;
  onAudioEnded: () => void;
  onAudioPause: (currentTime: number) => void;
  onAudioPlay: () => void;
  onAudioTimeUpdate: (currentTime: number) => void;
  onOpenAudioPanel: () => void;
  onUpdateCaptionText: (captionIndex: number, text: string) => void;
  playableAudioUrl: string;
}) {
  return (
    <section
      className="mt-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8"
      data-create-audio-card="v3"
    >
      <button
        type="button"
        onClick={onOpenAudioPanel}
        disabled={!hasSelectedScene || audioStatus === "loading" || hasGeneratedAudio}
        className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {audioStatus === "loading" ? (
          <Loader2 className="size-5 animate-spin" />
        ) : hasGeneratedAudio ? (
          <Check className="size-5" />
        ) : (
          <Mic className="size-5" />
        )}
        {audioStatusLabel}
      </button>

      {audioError ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700">
          {audioError}
        </p>
      ) : null}

      {playableAudioUrl ? (
        <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          <audio
            ref={audioRef}
            aria-label="Audio preview"
            className="w-full"
            controls
            preload="metadata"
            src={playableAudioUrl}
            onPlay={onAudioPlay}
            onPause={(event) => {
              onAudioPause(event.currentTarget.currentTime || 1.1);
            }}
            onTimeUpdate={(event) => {
              onAudioTimeUpdate(event.currentTarget.currentTime);
            }}
            onEnded={onAudioEnded}
          />
          <p className="mt-2 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Audio preview syncs captions and visualizer
          </p>
        </div>
      ) : null}

      {hasGeneratedAudio ? (
        <div className="mt-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Captions
              </p>
              <p className="mt-1 text-xs font-black leading-5 text-slate-500">
                Fix typos or wording. Timing stays the same.
              </p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Text only
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {captions.map((caption, index) => (
              <label key={`${caption.startMs}-${caption.endMs}`} className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Line {index + 1}
                </span>
                <textarea
                  value={caption.text}
                  onChange={(event) => onUpdateCaptionText(index, event.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black leading-5 text-slate-700 outline-none transition focus:border-slate-950 focus:bg-white"
                />
              </label>
            ))}
          </div>
          {hasEmptyEditedCaption ? (
            <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-700">
              Empty caption lines will disappear from the preview.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
