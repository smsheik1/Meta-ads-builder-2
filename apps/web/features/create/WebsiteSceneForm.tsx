'use client';

import type { FormEvent } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdWritingModelSelect } from './AdWritingModelSelect';

type WebsiteSceneFormProps = {
  error: string;
  status: 'idle' | 'researching' | 'ready' | 'error';
  websiteUrl: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onWebsiteUrlChange: (value: string) => void;
};

export function WebsiteSceneForm({
  error,
  status,
  websiteUrl,
  onSubmit,
  onWebsiteUrlChange,
}: WebsiteSceneFormProps) {
  return (
    <form
      className="mt-10 min-w-0 rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
      onSubmit={onSubmit}
    >
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-800">Website</span>
        <input
          value={websiteUrl}
          onChange={(event) => onWebsiteUrlChange(event.target.value)}
          className="h-14 w-full rounded-full border border-slate-200 bg-slate-50 px-5 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          placeholder="https://yourbrand.com"
        />
      </label>
      <AdWritingModelSelect />
      <Button type="submit" disabled={status === 'researching'} className="mt-5 h-14 w-full rounded-full text-base shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
        {status === 'researching' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Wand2 className="h-5 w-5" />
        )}
        {status === 'researching' ? 'Reading website' : 'Generate ads'}
      </Button>
      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
