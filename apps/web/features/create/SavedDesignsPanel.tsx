'use client';

import { useEffect, useState, type FocusEvent } from 'react';
import { BookmarkPlus, CheckCircle2, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SavedDesignCard } from './SavedDesignCard';
import { SavedDesignLibrary } from './SavedDesignLibrary';
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
  const [libraryOpen, setLibraryOpen] = useState(false);
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
    <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
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
                    <SavedDesignCard
                      key={design.id}
                      design={design}
                      hydrated={hydrated}
                      onDeleteDesign={onDeleteDesign}
                      onLoadDesign={(nextDesign) => {
                        onLoadDesign(nextDesign);
                        setPopoverOpen(false);
                      }}
                    />
                  ))}
                </div>
                {savedDesigns.length > recentDesigns.length && (
                  <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                    Showing the latest four. Older saved ads stay synced.
                  </p>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => {
                    setPopoverOpen(false);
                    setLibraryOpen(true);
                  }}
                  data-testid="saved-design-library-open"
                >
                  <LayoutGrid className="h-4 w-4" />
                  View all
                </Button>
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-sm font-bold text-slate-500">
            {savedDesigns.length === 1 ? '1 saved ad is ready to reopen.' : `${savedDesigns.length} saved ads are ready to reopen.`}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setLibraryOpen(true)}
            data-testid="saved-design-library-open"
          >
            <LayoutGrid className="h-4 w-4" />
            View all
          </Button>
        </div>
      )}
      <SavedDesignLibrary
        hydrated={hydrated}
        open={libraryOpen}
        savedDesigns={savedDesigns}
        savedError={savedError}
        savedLoading={savedLoading}
        onClose={() => setLibraryOpen(false)}
        onDeleteDesign={onDeleteDesign}
        onLoadDesign={onLoadDesign}
      />
    </section>
  );
}
