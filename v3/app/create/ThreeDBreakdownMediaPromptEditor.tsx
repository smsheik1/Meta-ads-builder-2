"use client";

import { Textarea } from "@/components/ui/textarea";

export function ThreeDBreakdownMediaPromptEditor({
  disabled,
  label,
  onChange,
  prompt,
  rows = 6,
  target,
}: {
  disabled: boolean;
  label: string;
  onChange: (prompt: string) => void;
  prompt: string;
  rows?: number;
  target: string;
}) {
  const ready = Boolean(prompt.trim());

  return (
    <div className="mt-2" data-three-d-media-prompt-editor={target}>
      <label htmlFor={`three-d-media-prompt-${target}`} className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </label>
      <Textarea
        id={`three-d-media-prompt-${target}`}
        value={prompt}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={rows}
        className="mt-1 min-h-24 resize-y rounded-xl border-slate-200 bg-white text-[11px] font-semibold leading-4 text-slate-700"
        aria-label={label}
      />
      <p className={`mt-1 text-[10px] font-bold leading-4 ${ready ? "text-slate-400" : "text-amber-700"}`}>
        {ready ? "This creative prompt will be sent with Wiggly’s safety and continuity rules." : "Add a prompt before generating this media."}
      </p>
    </div>
  );
}
