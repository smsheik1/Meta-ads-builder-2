"use client";

import { AlertTriangle, Type, Upload, X } from "lucide-react";
import type { AdSceneCaption } from "@/features/scene/types";

export function CreateCaptionModal({
  captions,
  hasEmptyEditedCaption,
  onClose,
  onOpenAudioPanel,
  onUpdateCaptionText,
}: {
  captions: AdSceneCaption[];
  hasEmptyEditedCaption: boolean;
  onClose: () => void;
  onOpenAudioPanel: () => void;
  onUpdateCaptionText: (captionIndex: number, text: string) => void;
}) {
  const openAudioPanel = () => {
    onClose();
    onOpenAudioPanel();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-6 py-8">
      <section className="flex max-h-[84vh] w-full max-w-2xl flex-col rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-950/25">
        <header className="flex items-start justify-between gap-5 border-b border-slate-100 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white">
              <Type className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Captions</p>
              <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950">Edit captions</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                Fix typos or wording. Timing stays attached to the existing audio.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Close caption editor"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {captions.length ? (
            <div className="space-y-4">
              {captions.map((caption, index) => (
                <label key={`${caption.startMs}-${caption.endMs}-${index}`} className="block">
                  <span className="flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <span>Caption {index + 1}</span>
                    <span>{Math.round(caption.startMs / 100) / 10}s - {Math.round(caption.endMs / 100) / 10}s</span>
                  </span>
                  <textarea
                    suppressHydrationWarning
                    value={caption.text}
                    onChange={(event) => onUpdateCaptionText(index, event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-800 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-5">
              <p className="text-sm font-black text-slate-700">No editable captions yet.</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Replace this audio once and Wiggly will transcribe it with Deepgram.
              </p>
              <button
                type="button"
                onClick={openAudioPanel}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
              >
                <Upload className="size-4" />
                Replace audio
              </button>
            </div>
          )}
        </div>

        <footer className="border-t border-slate-100 px-6 py-5">
          {hasEmptyEditedCaption ? (
            <p className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-800">
              <AlertTriangle className="size-4 shrink-0" />
              Empty captions will be skipped in the transcript.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
