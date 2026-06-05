'use client';

import { Database, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SavedDesignCard } from './SavedDesignCard';
import type { SavedDesign } from './sceneAdapters';

type SavedDesignLibraryProps = {
  hydrated: boolean;
  open: boolean;
  savedDesigns: SavedDesign[];
  savedError: string;
  savedLoading: boolean;
  onClose: () => void;
  onDeleteDesign: (designId: string) => void;
  onLoadDesign: (design: SavedDesign) => void;
};

export function SavedDesignLibrary({
  hydrated,
  open,
  savedDesigns,
  savedError,
  savedLoading,
  onClose,
  onDeleteDesign,
  onLoadDesign,
}: SavedDesignLibraryProps) {
  if (!open) return null;

  const loadDesign = (design: SavedDesign) => {
    onLoadDesign(design);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-sm"
      data-testid="saved-design-library"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close design library"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_34px_90px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Design Library
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
                Saved ad snapshots
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#d9fff6] px-3 py-1.5 text-xs font-black text-slate-950">
                {savedDesigns.length}
              </span>
              <Button type="button" variant="secondary" size="icon" onClick={onClose} aria-label="Close design library">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {savedError && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
              {savedError}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {savedLoading ? (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
              Loading saved ads...
            </div>
          ) : savedDesigns.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <div>
                <Database className="mx-auto mb-3 h-6 w-6 text-slate-400" />
                <p className="text-sm font-black text-slate-800">No saved designs yet</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Saved ads will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" data-testid="saved-design-library-grid">
              {savedDesigns.map((design) => (
                <SavedDesignCard
                  key={design.id}
                  design={design}
                  hydrated={hydrated}
                  onDeleteDesign={onDeleteDesign}
                  onLoadDesign={loadDesign}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
