'use client';

import { BrainCircuit } from 'lucide-react';
import { AD_COPY_MODEL_CHOICES, DEFAULT_AD_COPY_MODEL_CHOICE } from '@/features/research/adCopyModels';

export function AdWritingModelSelect() {
  return (
    <div className="mt-4">
      <label
        className="text-xs font-black uppercase tracking-[0.16em] text-slate-400"
        htmlFor="ad-writing-model"
      >
        Ad writing model
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
        <BrainCircuit className="h-4 w-4 shrink-0 text-slate-400" />
        <select
          id="ad-writing-model"
          name="adModel"
          defaultValue={DEFAULT_AD_COPY_MODEL_CHOICE}
          className="min-w-0 flex-1 appearance-none bg-transparent text-sm font-black text-slate-950 outline-none"
        >
          {AD_COPY_MODEL_CHOICES.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
