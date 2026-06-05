'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { GenerationFeedbackRating, GenerationFeedbackStatus } from './generationFeedbackPayload';

type GenerationFeedbackProps = {
  error: string;
  rating: GenerationFeedbackRating | null;
  status: GenerationFeedbackStatus;
  onRate: (rating: GenerationFeedbackRating) => void;
};

const options: Array<{
  label: string;
  rating: GenerationFeedbackRating;
  testId: string;
  Icon: typeof ThumbsUp;
}> = [
  { label: 'Good', rating: 'up', testId: 'generation-feedback-up', Icon: ThumbsUp },
  { label: 'Bad', rating: 'down', testId: 'generation-feedback-down', Icon: ThumbsDown },
];

export function GenerationFeedback({
  error,
  rating,
  status,
  onRate,
}: GenerationFeedbackProps) {
  const statusText = status === 'saving'
    ? 'Saving'
    : status === 'saved'
      ? 'Saved'
      : status === 'error'
        ? error || 'Could not save'
        : '';

  return (
    <section
      className="mx-auto mt-3 flex w-full max-w-[390px] flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white/85 px-4 py-3 shadow-[0_16px_44px_rgba(15,23,42,0.08)] backdrop-blur"
      data-testid="generation-feedback"
    >
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Generation
        </p>
        <p className="text-sm font-black text-slate-950">
          Was this one useful?
        </p>
      </div>
      <div className="flex items-center gap-2">
        {options.map(({ Icon, label, rating: optionRating, testId }) => {
          const active = rating === optionRating;
          return (
            <button
              key={optionRating}
              type="button"
              aria-pressed={active}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-wait disabled:opacity-70 ${
                active
                  ? 'border-slate-950 bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.20)] hover:bg-slate-900 hover:text-white'
                  : 'border-slate-200 bg-white'
              }`}
              data-testid={testId}
              disabled={status === 'saving'}
              title={label}
              onClick={() => onRate(optionRating)}
            >
              <Icon className="h-4 w-4" />
              <span className="sr-only">{label}</span>
            </button>
          );
        })}
      </div>
      {statusText && (
        <p
          className={`w-full text-right text-xs font-black ${
            status === 'error' ? 'text-red-600' : 'text-slate-400'
          }`}
        >
          {statusText}
        </p>
      )}
    </section>
  );
}
