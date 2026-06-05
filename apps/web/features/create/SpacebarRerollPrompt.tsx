'use client';

import { Lock, MousePointer2, Sparkles } from 'lucide-react';
import type { AdSceneLayoutElement } from './scene';

type SpacebarRerollPromptProps = {
  onReroll: () => void;
  rerollTick: number;
  selectedElement: AdSceneLayoutElement | null;
};

const elementLabels: Record<AdSceneLayoutElement, string> = {
  brand: 'logo',
  caption: 'caption',
  headline: 'headline',
  visualizer: 'wave',
};

export function SpacebarRerollPrompt({
  onReroll,
  rerollTick,
  selectedElement,
}: SpacebarRerollPromptProps) {
  const helperText = selectedElement
    ? `Editing ${elementLabels[selectedElement]}. Lock it if you want it to survive the next wish.`
    : rerollTick > 0
      ? 'Lock any keeper, then make another wish.'
      : 'Start here. Make a fresh version in one tap.';

  return (
    <section
      className="mx-auto mt-4 w-full max-w-[390px] rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-[0_20px_54px_rgba(15,23,42,0.12)] backdrop-blur"
      data-testid="spacebar-reroll-coach"
    >
      <button
        type="button"
        className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(15,23,42,0.20)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_22px_52px_rgba(15,23,42,0.18)]"
        data-testid="spacebar-reroll-button"
        onClick={onReroll}
      >
        <Sparkles className="h-4 w-4" />
        <span>Press</span>
        <span className="rounded-lg border border-white/20 bg-white px-5 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-950 shadow-[inset_0_-2px_0_rgba(15,23,42,0.10)] transition group-hover:bg-slate-100">
          Spacebar
        </span>
        <span>make a wish</span>
      </button>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <span className="rounded-2xl bg-slate-50 px-2 py-2 text-[11px] font-black text-slate-600">
          <Sparkles className="mx-auto mb-1 h-3.5 w-3.5" />
          Reroll
        </span>
        <span className="rounded-2xl bg-slate-50 px-2 py-2 text-[11px] font-black text-slate-600">
          <MousePointer2 className="mx-auto mb-1 h-3.5 w-3.5" />
          Tweak
        </span>
        <span className="rounded-2xl bg-slate-50 px-2 py-2 text-[11px] font-black text-slate-600">
          <Lock className="mx-auto mb-1 h-3.5 w-3.5" />
          Lock
        </span>
      </div>
      <p className="mt-3 text-center text-xs font-black leading-5 text-slate-500">
        {helperText}
      </p>
    </section>
  );
}
