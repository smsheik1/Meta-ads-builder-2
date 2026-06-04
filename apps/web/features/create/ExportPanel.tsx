'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ExportPanelProps = {
  exportDownloadUrl: string;
  exportError: string;
  exportStatus: 'idle' | 'rendering' | 'ready' | 'error';
  shareError: string;
  shareStatus: 'idle' | 'saving' | 'ready' | 'error';
  shareUrl: string;
  onCreateShareLink: () => void;
  onDownloadVideo: () => void;
};

export const RENDER_PROGRESS_STEPS = [
  {
    title: 'Preparing your video',
    detail: 'Freezing the exact scene snapshot from your canvas.',
    buttonLabel: 'Preparing render',
  },
  {
    title: 'Rendering the ad scene',
    detail: 'Drawing the frames and syncing any audio Wiggly can use.',
    buttonLabel: 'Rendering video',
  },
  {
    title: 'Packaging the MP4',
    detail: 'Turning the render into a downloadable video file.',
    buttonLabel: 'Packaging MP4',
  },
  {
    title: 'Almost ready',
    detail: 'Keep this tab open while Wiggly finishes the video.',
    buttonLabel: 'Almost ready',
  },
] as const;

export function ExportPanel({
  exportDownloadUrl,
  exportError,
  exportStatus,
  shareError,
  shareStatus,
  shareUrl,
  onCreateShareLink,
  onDownloadVideo,
}: ExportPanelProps) {
  const [renderStepIndex, setRenderStepIndex] = useState(0);
  const activeRenderStep = RENDER_PROGRESS_STEPS[renderStepIndex] || RENDER_PROGRESS_STEPS[0];

  useEffect(() => {
    if (exportStatus !== 'rendering') {
      setRenderStepIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRenderStepIndex((index) => Math.min(index + 1, RENDER_PROGRESS_STEPS.length - 1));
    }, 3200);

    return () => window.clearInterval(timer);
  }, [exportStatus]);

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Export
        </p>
        <p className="mt-1 text-sm font-bold text-slate-500">
          Download or share the exact scene snapshot on the canvas.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={onDownloadVideo} disabled={exportStatus === 'rendering'}>
          {exportStatus === 'rendering' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exportStatus === 'rendering' ? activeRenderStep.buttonLabel : exportStatus === 'ready' ? 'Save video' : 'Download video'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCreateShareLink} disabled={shareStatus === 'saving'}>
          {shareStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          {shareStatus === 'saving' ? 'Creating link' : 'Create share link'}
        </Button>
      </div>
      {exportStatus === 'rendering' && (
        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-slate-700">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-sky-600" />
            <div>
              <p className="text-sm font-black text-slate-950">{activeRenderStep.title}</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
                {activeRenderStep.detail}
              </p>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">
                This usually takes 10-30 seconds. Keep this tab open.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {RENDER_PROGRESS_STEPS.map((step, index) => (
              <div
                key={step.title}
                className={`h-1.5 rounded-full ${index <= renderStepIndex ? 'bg-sky-500' : 'bg-white'}`}
              />
            ))}
          </div>
        </div>
      )}
      {exportStatus === 'ready' && (
        <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Video is ready.
          </p>
          {exportDownloadUrl && (
            <a
              href={exportDownloadUrl}
              className="mt-1 inline-block underline decoration-emerald-300 underline-offset-4"
            >
              If the Save video button does not download, use this direct MP4 link.
            </a>
          )}
        </div>
      )}
      {exportStatus === 'error' && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {exportError}
        </p>
      )}
      {shareUrl && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="truncate text-sm font-black text-slate-700">{shareUrl}</p>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-sm font-black text-slate-950"
          >
            Open share page
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}
      {shareStatus === 'error' && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {shareError}
        </p>
      )}
    </section>
  );
}
