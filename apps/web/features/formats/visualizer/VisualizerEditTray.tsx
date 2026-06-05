'use client';

import { useRef, type ChangeEvent } from 'react';
import { AlignCenter, AlignLeft, AlignRight, ImagePlus, Lock, SlidersHorizontal, Type, Unlock, Waves, X } from 'lucide-react';
import type { AdScene, AdSceneLayoutElement } from '@/features/create/scene';
import type { FormatEditTrayProps } from '../formatTypes';

const lockFieldForElement = (element: AdSceneLayoutElement): keyof AdScene['locks'] => {
  if (element === 'brand') return 'logo';
  if (element === 'headline') return 'headline';
  if (element === 'visualizer') return 'visualizer';
  return 'audio';
};

const titleForElement = (element: AdSceneLayoutElement) => {
  if (element === 'brand') return 'Logo';
  if (element === 'headline') return 'Headline';
  if (element === 'visualizer') return 'Visualizer';
  return 'Audio caption';
};

const iconForElement = (element: AdSceneLayoutElement) => {
  if (element === 'brand') return ImagePlus;
  if (element === 'headline') return Type;
  if (element === 'visualizer') return Waves;
  return SlidersHorizontal;
};

const headlineSizes = [
  { value: 'compact', label: 'Compact' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'hero', label: 'Hero' },
] as const;

const headlineAlignments = [
  { value: 'left', label: 'Left', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'right', label: 'Right', icon: AlignRight },
] as const;

const visualizerMotions = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'snappy', label: 'Snappy' },
] as const;

const chipClass = (active: boolean) => (
  `rounded-full px-3 py-2 text-xs font-black transition ${
    active
      ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`
);

const iconChipClass = (active: boolean) => (
  `grid h-9 w-9 place-items-center rounded-full transition ${
    active
      ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`
);

export function VisualizerEditTray({
  scene,
  selectedElement,
  onClearSelection,
  onEditCreative,
  onReplaceLogo,
  onToggleLock,
}: FormatEditTrayProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!selectedElement) {
    return (
      <aside className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-white/70 p-4 text-sm font-bold text-slate-500">
        Click a canvas element to edit it without leaving this page.
      </aside>
    );
  }

  const lockField = lockFieldForElement(selectedElement);
  const locked = scene.locks[lockField];
  const Icon = iconForElement(selectedElement);
  const avatarUrl = scene.brand.logoUrl || scene.brand.faviconUrl;

  const replaceLogoFromFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onReplaceLogo(reader.result);
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <aside
      className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
      data-testid="visualizer-edit-tray"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-950 text-white">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Editing
            </p>
            <p className="truncate text-base font-black text-slate-950">
              {titleForElement(selectedElement)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            title={locked ? 'Unlock element' : 'Lock element'}
            onClick={() => onToggleLock(lockField)}
          >
            {locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            title="Close editor"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {selectedElement === 'brand' && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-sm font-black text-slate-950">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : scene.brand.name.slice(0, 2)}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={locked}
            onChange={replaceLogoFromFile}
          />
          <button
            type="button"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={locked}
            onClick={() => fileInputRef.current?.click()}
          >
            Replace logo
          </button>
          <button
            type="button"
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={locked || !scene.brand.logoUrl}
            onClick={() => onReplaceLogo(null)}
          >
            Use favicon
          </button>
        </div>
      )}

      {selectedElement === 'headline' && (
        <div className="mt-4 space-y-3">
          <textarea
            value={scene.creative.headline}
            disabled={locked}
            rows={3}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-black leading-tight text-slate-950 outline-none transition focus:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(event) => onEditCreative({ headline: event.target.value })}
          />
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <span className="text-sm font-black text-slate-600">Headline color</span>
            <input
              type="color"
              value={scene.creative.headlineColor || '#07111f'}
              disabled={locked}
              className="h-9 w-12 rounded-lg border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(event) => onEditCreative({ headlineColor: event.target.value })}
            />
          </label>
          <div className="rounded-2xl border border-slate-200 px-4 py-3">
            <span className="block text-sm font-black text-slate-600">Headline size</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {headlineSizes.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  className={chipClass((scene.creative.headlineSize || 'balanced') === size.value)}
                  disabled={locked}
                  onClick={() => onEditCreative({ headlineSize: size.value })}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
            <div className="rounded-2xl border border-slate-200 px-4 py-3">
              <span className="block text-sm font-black text-slate-600">Align</span>
              <div className="mt-3 flex gap-2">
                {headlineAlignments.map((alignment) => {
                  const AlignIcon = alignment.icon;
                  return (
                    <button
                      key={alignment.value}
                      type="button"
                      className={iconChipClass((scene.creative.headlineAlign || 'center') === alignment.value)}
                      disabled={locked}
                      title={alignment.label}
                      onClick={() => onEditCreative({ headlineAlign: alignment.value })}
                    >
                      <AlignIcon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="rounded-2xl border border-slate-200 px-4 py-3">
              <span className="flex items-center justify-between gap-3 text-sm font-black text-slate-600">
                Line height
                <span className="text-xs text-slate-400">{(scene.creative.headlineLineHeight || 1.02).toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={0.94}
                max={1.16}
                step={0.01}
                value={scene.creative.headlineLineHeight || 1.02}
                disabled={locked}
                className="mt-3 w-full accent-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={(event) => onEditCreative({ headlineLineHeight: Number(event.target.value) })}
              />
            </label>
          </div>
        </div>
      )}

      {selectedElement === 'visualizer' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="rounded-2xl border border-slate-200 px-4 py-3">
            <span className="block text-sm font-black text-slate-600">Wave color</span>
            <input
              type="color"
              value={scene.creative.visualizer.color}
              disabled={locked}
              className="mt-3 h-10 w-full rounded-lg border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(event) => onEditCreative({ accentColor: event.target.value }, { color: event.target.value })}
            />
          </label>
          <label className="rounded-2xl border border-slate-200 px-4 py-3">
            <span className="block text-sm font-black text-slate-600">Bar density</span>
            <select
              value={scene.creative.visualizer.barCount || 21}
              disabled={locked}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(event) => onEditCreative({}, { barCount: Number(event.target.value) })}
            >
              <option value={17}>Airy</option>
              <option value={21}>Balanced</option>
              <option value={25}>Dense</option>
              <option value={29}>Ultra dense</option>
            </select>
          </label>
          <label className="rounded-2xl border border-slate-200 px-4 py-3">
            <span className="block text-sm font-black text-slate-600">Motion</span>
            <select
              value={scene.creative.visualizer.motion || 'balanced'}
              disabled={locked}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(event) => onEditCreative({}, { motion: event.target.value as AdScene['creative']['visualizer']['motion'] })}
            >
              {visualizerMotions.map((motion) => (
                <option key={motion.value} value={motion.value}>{motion.label}</option>
              ))}
            </select>
          </label>
          <label className="rounded-2xl border border-slate-200 px-4 py-3">
            <span className="flex items-center justify-between gap-3 text-sm font-black text-slate-600">
              Wave height
              <span className="text-xs text-slate-400">{Math.round((scene.creative.visualizer.heightScale || 1) * 100)}%</span>
            </span>
            <input
              type="range"
              min={0.72}
              max={1.28}
              step={0.02}
              value={scene.creative.visualizer.heightScale || 1}
              disabled={locked}
              className="mt-3 w-full accent-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(event) => onEditCreative({}, { heightScale: Number(event.target.value) })}
            />
          </label>
          <label className="rounded-2xl border border-slate-200 px-4 py-3">
            <span className="flex items-center justify-between gap-3 text-sm font-black text-slate-600">
              Baseline
              <span className="text-xs text-slate-400">{Math.round((scene.creative.visualizer.baseline || 0.28) * 100)}%</span>
            </span>
            <input
              type="range"
              min={0.16}
              max={0.44}
              step={0.02}
              value={scene.creative.visualizer.baseline || 0.28}
              disabled={locked}
              className="mt-3 w-full accent-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(event) => onEditCreative({}, { baseline: Number(event.target.value) })}
            />
          </label>
        </div>
      )}

      {selectedElement === 'caption' && (
        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <span className="text-sm font-black text-slate-600">Caption color</span>
            <input
              type="color"
              value={scene.creative.captionColor || '#475569'}
              disabled={locked}
              className="h-9 w-12 rounded-lg border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(event) => onEditCreative({ captionColor: event.target.value })}
            />
          </label>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
            Captions come from the selected audio. Lock this element to keep audio and caption timing from changing.
          </p>
        </div>
      )}
    </aside>
  );
}
