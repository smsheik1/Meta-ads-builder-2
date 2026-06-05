'use client';

import { AD_COPY_MODEL_CHOICES, DEFAULT_AD_COPY_MODEL_CHOICE } from '@/features/research/adCopyModels';

export function AdWritingModelSelect() {
  return (
    <div className="mt-4">
      <label
        className="mb-2 block text-sm font-black text-slate-800"
        htmlFor="ad-writing-model"
      >
        Ad writing model
      </label>
      <select
        id="ad-writing-model"
        name="adModel"
        defaultValue={DEFAULT_AD_COPY_MODEL_CHOICE}
        className="h-[3.25rem] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-950 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
      >
        {AD_COPY_MODEL_CHOICES.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
      <span className="mt-1.5 block min-h-4 text-xs font-semibold text-slate-400">
        Auto is best for users. Pick a model when testing headline quality.
      </span>
    </div>
  );
}
