import type { RefObject } from "react";
import { Check, Loader2, Mic } from "lucide-react";

type AudioStatus = "idle" | "loading" | "ready" | "error";

export function CreateAudioCard({
  audioError,
  audioRef,
  audioStatus,
  audioStatusLabel,
  hasGeneratedAudio,
  hasSelectedScene,
  onAudioEnded,
  onAudioPause,
  onAudioPlay,
  onAudioTimeUpdate,
  onOpenAudioPanel,
  playableAudioUrl,
}: {
  audioError: string;
  audioRef: RefObject<HTMLAudioElement | null>;
  audioStatus: AudioStatus;
  audioStatusLabel: string;
  hasGeneratedAudio: boolean;
  hasSelectedScene: boolean;
  onAudioEnded: () => void;
  onAudioPause: (currentTime: number) => void;
  onAudioPlay: () => void;
  onAudioTimeUpdate: (currentTime: number) => void;
  onOpenAudioPanel: () => void;
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
    </section>
  );
}
