import type { RefObject } from "react";

export function CreateAudioCard({
  audioError,
  audioRef,
  onAudioEnded,
  onAudioPause,
  onAudioPlay,
  onAudioTimeUpdate,
  playableAudioUrl,
}: {
  audioError: string;
  audioRef: RefObject<HTMLAudioElement | null>;
  onAudioEnded: () => void;
  onAudioPause: (currentTime: number) => void;
  onAudioPlay: () => void;
  onAudioTimeUpdate: (currentTime: number) => void;
  playableAudioUrl: string;
}) {
  if (!playableAudioUrl && !audioError) return null;

  return (
    <section
      className="mt-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/8"
      data-create-audio-card="v3"
    >
      {audioError ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700">
          {audioError}
        </p>
      ) : null}

      {playableAudioUrl ? (
        <div className={audioError ? "mt-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3" : "rounded-[20px] border border-slate-200 bg-slate-50 p-3"}>
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
