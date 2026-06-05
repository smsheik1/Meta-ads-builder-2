'use client';

import { useEffect, useState, type FocusEvent } from 'react';
import { BookmarkPlus, CheckCircle2, Clock3, Trash2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHeadlineScale, isStoredSceneAudio } from '@/features/render/adSceneRender';
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
  const previewBarCount = Math.min(14, scene.creative.visualizer.barCount || 14);
  const headlineScale = getHeadlineScale(scene.creative.headline);

  return (
    <div
      className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner"
      data-testid="saved-template-preview"
      style={{ backgroundColor: scene.creative.backgroundColor }}
    >
      <div className="absolute inset-x-0 top-[8%] flex justify-center">
        <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-white text-[9px] font-black text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.12)]">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : scene.brand.name.slice(0, 1).toUpperCase()}
        </span>
      </div>

      <div className="absolute inset-x-3 top-[20%] flex min-h-[58px] items-center justify-center text-center">
        <p
          className="line-clamp-4 text-center font-black leading-[0.95]"
          style={{
            color: scene.creative.headlineColor || '#07111f',
            fontSize: `${Math.max(11, Math.round(16 * headlineScale))}px`,
          }}
        >
          {scene.creative.headline}
        </p>
      </div>

      <div className="absolute inset-x-3 top-[52%] flex h-8 items-center gap-[2px]">
        {Array.from({ length: previewBarCount }).map((_, index) => (
          <span
            key={index}
            className="flex-1 rounded-full"
            style={{
              height: `${28 + ((index * 9) % 46)}%`,
              backgroundColor: scene.creative.visualizer.color,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-x-5 bottom-[17%] flex justify-center">
        <span
          className="h-2 w-20 rounded-full"
          style={{ backgroundColor: scene.creative.accentColor }}
        />
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
              <div className="relative rounded-[28px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl">
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
                      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-[#fbf7ef]/70 p-2 text-left shadow-[0_10px_24px_rgba(17,24,39,0.06)] transition hover:border-indigo-200 hover:shadow-[0_18px_34px_rgba(17,24,39,0.10)] active:scale-[0.99]"
                      data-testid="saved-template-card"
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
                      <span className="pointer-events-none absolute inset-2 rounded-lg bg-indigo-500/0 transition group-hover:bg-indigo-500/5" />
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
