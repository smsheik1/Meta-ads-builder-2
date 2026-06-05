'use client';

import { Clock3, Trash2, Volume2 } from 'lucide-react';
import { getHeadlineScale, isStoredSceneAudio } from '@/features/render/adSceneRender';
import type { AdScene } from './scene';
import type { SavedDesign } from './sceneAdapters';

export const formatSavedTime = (value: number) => (
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
);

export function SavedDesignPreview({ scene }: { scene: AdScene }) {
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

type SavedDesignCardProps = {
  design: SavedDesign;
  hydrated: boolean;
  onDeleteDesign: (designId: string) => void;
  onLoadDesign: (design: SavedDesign) => void;
};

export function SavedDesignCard({
  design,
  hydrated,
  onDeleteDesign,
  onLoadDesign,
}: SavedDesignCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-[#fbf7ef]/70 p-2 text-left shadow-[0_10px_24px_rgba(17,24,39,0.06)] transition hover:border-indigo-200 hover:shadow-[0_18px_34px_rgba(17,24,39,0.10)] active:scale-[0.99]"
      data-testid="saved-template-card"
    >
      <button
        type="button"
        onClick={() => onLoadDesign(design)}
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
  );
}
