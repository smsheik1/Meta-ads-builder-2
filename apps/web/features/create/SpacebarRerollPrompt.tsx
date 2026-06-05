'use client';

type SpacebarRerollPromptProps = {
  onReroll: () => void;
};

export function SpacebarRerollPrompt({ onReroll }: SpacebarRerollPromptProps) {
  return (
    <div className="mx-auto mt-4 flex max-w-[390px] items-center justify-center">
      <button
        type="button"
        className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-black text-slate-600 shadow-[0_16px_42px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 hover:shadow-[0_22px_52px_rgba(15,23,42,0.14)]"
        onClick={onReroll}
      >
        <span>Press</span>
        <span className="rounded-lg border border-slate-300 bg-slate-950 px-4 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white shadow-[inset_0_-2px_0_rgba(255,255,255,0.18)] transition group-hover:bg-slate-800">
          Spacebar
        </span>
        <span>to generate more</span>
      </button>
    </div>
  );
}
