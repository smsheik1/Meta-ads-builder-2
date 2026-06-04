'use client';

import { useEffect, useState } from 'react';
import { BookmarkPlus, CheckCircle2, Clock3, Trash2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdScene } from './scene';
import type { SavedDesign } from './sceneAdapters';

type SavedDesignsPanelProps = {
  currentSceneSaved: boolean;
  savedDesigns: SavedDesign[];
  savedError: string;
  savedLoading: boolean;
  onDeleteDesign: (designId: string) => void;
  onLoadDesign: (design: SavedDesign) => void;
  onSaveDesign: () => void;
};

const formatSavedTime = (value: number) => (
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
);

function SavedDesignPreview({ scene }: { scene: AdScene }) {
  const avatarUrl = scene.brand.logoUrl || scene.brand.faviconUrl;
  const hasAudio = scene.audio.status === 'generated' && scene.audio.sourceSceneId === scene.id;

  return (
    <div
      className="relative aspect-[4/5] overflow-hidden rounded-xl border border-slate-200 bg-white"
      style={{ backgroundColor: scene.creative.backgroundColor }}
    >
      <div className="flex items-center gap-2 bg-black px-2 py-1.5 text-white">
        <span className="grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-white text-[9px] font-black text-slate-950">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : scene.brand.name.slice(0, 1)}
        </span>
        <span className="min-w-0 truncate text-[10px] font-black">{scene.brand.name}</span>
      </div>
      <div className="flex h-[calc(100%-32px)] flex-col items-center justify-center gap-3 px-3 text-center">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-950">
          {scene.brand.name}
        </p>
        <p className="line-clamp-3 text-lg font-black leading-[0.98] text-slate-950">
          {scene.creative.headline}
        </p>
        <div className="flex h-8 w-full items-center justify-center gap-0.5">
          {Array.from({ length: 13 }).map((_, index) => {
            const center = Math.abs(index - 6);
            return (
              <span
                key={index}
                className="w-1.5 rounded-full"
                style={{
                  height: 8 + (6 - center) * 3,
                  backgroundColor: scene.creative.visualizer.color,
                }}
              />
            );
          })}
        </div>
      </div>
      {hasAudio && (
        <span className="absolute bottom-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-slate-950 text-white shadow-lg">
          <Volume2 className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

export function SavedDesignsPanel({
  currentSceneSaved,
  savedDesigns,
  savedError,
  savedLoading,
  onDeleteDesign,
  onLoadDesign,
  onSaveDesign,
}: SavedDesignsPanelProps) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Saved designs
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Synced to this session. Open one without leaving the page.
          </p>
        </div>
        <Button type="button" variant={currentSceneSaved ? 'secondary' : 'primary'} onClick={onSaveDesign}>
          {currentSceneSaved ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <BookmarkPlus className="h-4 w-4" />}
          {currentSceneSaved ? 'Saved' : 'Save design'}
          {savedDesigns.length > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-black">
              {savedDesigns.length}
            </span>
          )}
        </Button>
      </div>

      {savedError && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {savedError}
        </p>
      )}

      {savedLoading ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
          Loading saved ads...
        </div>
      ) : savedDesigns.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
          The ads you save will appear here as reusable snapshots.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {savedDesigns.map((design) => (
            <button
              key={design.id}
              type="button"
              onClick={() => onLoadDesign(design)}
              className="group relative min-w-0 rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:shadow-[0_18px_34px_rgba(15,23,42,0.10)]"
              title={`Open ${design.title}`}
            >
              <SavedDesignPreview scene={design.scene} />
              <p className="mt-2 truncate text-xs font-black text-slate-800">{design.title}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <Clock3 className="h-3 w-3" />
                {hydrated ? formatSavedTime(design.updatedAt) : 'Saved locally'}
              </p>
              <span
                role="button"
                tabIndex={0}
                className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-slate-400 opacity-0 shadow-sm transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                title="Delete saved design"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteDesign(design.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onDeleteDesign(design.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
