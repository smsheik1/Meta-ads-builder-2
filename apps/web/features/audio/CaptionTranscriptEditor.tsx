'use client';

import { useEffect, useMemo, useState } from 'react';
import { Captions, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdSceneAudio, AdSceneCaption } from '@/features/create/scene';
import { mergeCaptionTextIntoTranscript } from './captionTranscript';

export type CaptionTranscriptDraft = {
  transcript: string;
  captions: AdSceneCaption[];
};

type CaptionTranscriptEditorProps = {
  audio: AdSceneAudio;
  open: boolean;
  onClose: () => void;
  onSave: (draft: CaptionTranscriptDraft) => void;
};

const formatCaptionTime = (milliseconds: number) => (
  `${(milliseconds / 1000).toFixed(1)}s`
);

export function CaptionTranscriptEditor({
  audio,
  open,
  onClose,
  onSave,
}: CaptionTranscriptEditorProps) {
  const [transcriptDraft, setTranscriptDraft] = useState(audio.transcript);
  const [captionDrafts, setCaptionDrafts] = useState<string[]>([]);
  const captionSignature = useMemo(
    () => audio.captions.map((caption) => `${caption.startMs}:${caption.endMs}:${caption.text}`).join('|'),
    [audio.captions],
  );

  useEffect(() => {
    if (!open) return;
    setTranscriptDraft(audio.transcript);
    setCaptionDrafts(audio.captions.map((caption) => caption.text));
  }, [audio.transcript, captionSignature, open, audio.captions]);

  if (!open) return null;

  const saveDraft = () => {
    const captions = audio.captions.map((caption, index) => ({
      ...caption,
      text: (captionDrafts[index] ?? caption.text).trim() || caption.text,
    }));
    const transcript = transcriptDraft.trim() === audio.transcript.trim()
      ? mergeCaptionTextIntoTranscript(audio.transcript, captions)
      : transcriptDraft.trim();

    onSave({
      transcript,
      captions,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
      data-testid="caption-transcript-editor"
      role="dialog"
      aria-modal="true"
      aria-label="Edit captions and transcript"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close caption transcript editor"
        onClick={onClose}
      />
      <section className="relative flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_34px_90px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <header className="border-b border-slate-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Audio words
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
                Edit transcript
              </h2>
            </div>
            <Button type="button" variant="secondary" size="icon" onClick={onClose} aria-label="Close editor">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Full transcript
            </span>
            <textarea
              value={transcriptDraft}
              rows={5}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
              onChange={(event) => setTranscriptDraft(event.target.value)}
            />
          </label>

          {audio.captions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <Captions className="h-4 w-4" />
                Captions
              </div>
              {audio.captions.map((caption, index) => (
                <label key={`${caption.startMs}-${caption.endMs}-${index}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="mb-2 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    <span>Line {index + 1}</span>
                    <span>{formatCaptionTime(caption.startMs)} - {formatCaptionTime(caption.endMs)}</span>
                  </span>
                  <textarea
                    value={captionDrafts[index] ?? caption.text}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold leading-6 text-slate-900 outline-none transition focus:border-slate-300"
                    onChange={(event) => {
                      const nextDrafts = [...captionDrafts];
                      nextDrafts[index] = event.target.value;
                      setCaptionDrafts(nextDrafts);
                    }}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={saveDraft} data-testid="caption-transcript-save">
            Save words
          </Button>
        </footer>
      </section>
    </div>
  );
}
