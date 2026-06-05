'use client';

import type { FormEvent } from 'react';
import { Globe2, Loader2, Lock, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type WebsiteSceneFormProps = {
  error: string;
  headlineLocked: boolean;
  status: 'idle' | 'researching' | 'ready' | 'error';
  websiteUrl: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleHeadlineLock: () => void;
  onWebsiteUrlChange: (value: string) => void;
};

export function WebsiteSceneForm({
  error,
  headlineLocked,
  status,
  websiteUrl,
  onSubmit,
  onToggleHeadlineLock,
  onWebsiteUrlChange,
}: WebsiteSceneFormProps) {
  return (
    <form
      className="min-w-0 rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
      onSubmit={onSubmit}
    >
      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        Website
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
        <Globe2 className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={websiteUrl}
          onChange={(event) => onWebsiteUrlChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-950 outline-none"
          placeholder="https://yourbrand.com"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit" disabled={status === 'researching'}>
          {status === 'researching' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {status === 'researching' ? 'Reading website' : 'Generate ad scene'}
        </Button>
        <Button type="button" variant="secondary" onClick={onToggleHeadlineLock}>
          <Lock className="h-4 w-4" />
          {headlineLocked ? 'Unlock headline' : 'Lock headline'}
        </Button>
      </div>
      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
