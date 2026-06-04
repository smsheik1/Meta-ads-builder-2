import { Download, ExternalLink, Link2, Loader2 } from 'lucide-react';
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
          {exportStatus === 'rendering' ? 'Rendering video' : exportStatus === 'ready' ? 'Save video' : 'Download video'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCreateShareLink} disabled={shareStatus === 'saving'}>
          {shareStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          {shareStatus === 'saving' ? 'Creating link' : 'Create share link'}
        </Button>
      </div>
      {exportStatus === 'ready' && (
        <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
          <p>Video is ready.</p>
          {exportDownloadUrl && (
            <a
              href={exportDownloadUrl}
              className="mt-1 inline-block underline decoration-emerald-300 underline-offset-4"
            >
              Click Save video, or use this direct download link.
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
