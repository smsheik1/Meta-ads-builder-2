'use client';

import { useEffect, useState, type FocusEvent } from 'react';
import { BookmarkPlus, CheckCircle2, Clock3, Trash2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isStoredSceneAudio } from '@/features/render/adSceneRender';
import { getCanvasLayoutStyle } from '@/features/render/adSceneLayout';
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
  const hasAudio = isStoredSceneAudio(scene);

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
      <div className="relative h-[calc(100%-32px)] px-3 text-center">
        <p
          className="grid place-items-center text-[10px] font-black uppercase tracking-wide text-slate-950"
          style={getCanvasLayoutStyle(scene, 'brand')}
        >
          {scene.brand.name}
        </p>
        <p
          className="line-clamp-3 grid place-items-center text-lg font-black leading-[0.98] text-slate-950"
          style={getCanvasLayoutStyle(scene, 'headline')}
        >
          {scene.creative.headline}
        </p>
        <div
          className="flex items-center justify-center gap-0.5"
          style={getCanvasLayoutStyle(scene, 'visualizer')}
        >
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
  const [popoverOpen, setPopoverOpen] = useState(false);
  const recentDesigns = savedDesigns.slice(0, 4);
  const hasSavedDesigns = savedDesigns.length > 0;

  useEffect(() => {
    setHydrated(true);
  }, []);

  const closeOnBlur = (event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setPopoverOpen(false);
  };

  const openPopover = () => {
    if (hasSavedDesigns) setPopoverOpen(true);
  };

  const saveOrShowDesigns = () => {
    if (currentSceneSaved && hasSavedDesigns) {
      setPopoverOpen(true);
      return;
    }
    onSaveDesign();
  };

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Saved designs
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Synced to this session. Hover Save to glance through them.
          </p>
        </div>
        <div
          className="relative"
          onMouseEnter={openPopover}
          onMouseLeave={() => setPopoverOpen(false)}
          onFocus={openPopover}
          onBlur={closeOnBlur}
        >
          <Button
            type="button"
            variant={currentSceneSaved ? 'secondary' : 'primary'}
            onClick={saveOrShowDesigns}
            data-testid="saved-designs-save-button"
          >
            {currentSceneSaved ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <BookmarkPlus className="h-4 w-4" />}
            {currentSceneSaved ? 'Saved' : 'Save'}
            {hasSavedDesigns && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${currentSceneSaved ? 'bg-slate-100 text-slate-500' : 'bg-white/20 text-white'}`}>
                {Math.min(savedDesigns.length, 9)}
              </span>
            )}
          </Button>

          {popoverOpen && hasSavedDesigns && (
            <div
              className="absolute right-0 top-full z-50 w-[min(20rem,calc(100vw-2rem))] pt-2"
              data-testid="saved-designs-popover"
            >
              <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                <span className="absolute -top-2 right-8 h-3 w-5 rounded-t-md border-x border-t border-slate-200 bg-white" />
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Recent saved ads
                  </p>
                  <span className="text-[10px] font-black text-slate-400">
                    {savedDesigns.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recentDesigns.map((design) => (
                    <div
                      key={design.id}
                      className="group relative rounded-xl border border-slate-200 bg-white p-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onLoadDesign(design);
                          setPopoverOpen(false);
                        }}
                        className="block w-full min-w-0 text-left"
                        title={`Open ${design.title}`}
                      >
                        <SavedDesignPreview scene={design.scene} />
                        <span className="mt-2 block truncate text-[11px] font-black text-slate-800">
                          {design.title}
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Clock3 className="h-3 w-3" />
                          {hydrated ? formatSavedTime(design.updatedAt) : 'Saved'}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-slate-400 opacity-0 shadow-sm transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        title="Delete saved design"
                        onClick={() => onDeleteDesign(design.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {savedDesigns.length > recentDesigns.length && (
                  <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                    Showing the latest four. Older saved ads stay synced.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
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
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">
          The ads you save will appear here as reusable snapshots.
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
          {savedDesigns.length === 1 ? '1 saved ad is ready to reopen.' : `${savedDesigns.length} saved ads are ready to reopen.`}
        </p>
      )}
    </section>
  );
}
