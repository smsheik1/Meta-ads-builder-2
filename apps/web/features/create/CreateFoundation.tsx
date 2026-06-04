'use client';

import { FormEvent, useReducer, useState } from 'react';
import { AudioLines, Globe2, Loader2, Lock, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdCopyResult } from '@/features/research/adCopy';
import type { ResearchQuality } from '@/features/research/researchQuality';
import type { WebsiteResearch } from '@/features/research/websiteResearch';
import type { AdScene } from './scene';
import { ogToolScene } from './fixtures';
import { reduceAdScene } from './sceneReducer';

type CreateSceneResponse = {
  scene?: AdScene;
  research?: WebsiteResearch;
  quality?: ResearchQuality;
  adCopy?: AdCopyResult;
  error?: string;
};

export function CreateFoundation() {
  const [scene, dispatch] = useReducer(reduceAdScene, ogToolScene);
  const [websiteUrl, setWebsiteUrl] = useState(scene.brand.websiteUrl);
  const [research, setResearch] = useState<WebsiteResearch | null>(null);
  const [quality, setQuality] = useState<ResearchQuality | null>(null);
  const [status, setStatus] = useState<'idle' | 'researching' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');

  const generateScene = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('researching');
    setError('');

    try {
      const response = await fetch('/api/create-scene', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ websiteUrl }),
      });
      const payload = await response.json() as CreateSceneResponse;

      if (!response.ok || !payload.scene || !payload.research) {
        setResearch(payload.research ?? null);
        setQuality(payload.quality ?? null);
        throw new Error(payload.error || 'Something broke while researching that website.');
      }

      dispatch({ type: 'loadScene', scene: payload.scene });
      setWebsiteUrl(payload.scene.brand.websiteUrl);
      setResearch(payload.research);
      setQuality(payload.quality ?? null);
      setStatus('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something broke while researching that website.');
      setStatus('error');
    }
  };

  const firstReceipt = scene.brand.receipts.specificClaims[0] ||
    scene.brand.receipts.exactSiteLanguage[0] ||
    scene.brand.receipts.buyerMoments[0] ||
    'No specific receipt found yet.';
  const avatarUrl = scene.brand.logoUrl || scene.brand.faviconUrl;

  return (
    <main className="min-h-screen px-5 py-8 md:px-10">
      <div className="mx-auto grid min-w-0 max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <section className="flex min-w-0 flex-col justify-center gap-6">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
              Create v2 foundation
            </p>
            <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-normal text-slate-950 md:text-6xl">
              Drop in your website and watch the magic happen.
            </h1>
            <p className="max-w-xl text-base font-semibold leading-7 text-slate-600">
              Wiggly reads the page, pulls real selling evidence, and turns it into
              one clean ad scene without touching the frozen legacy app.
            </p>
          </div>

          <form
            className="min-w-0 rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
            onSubmit={generateScene}
          >
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Website
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
              <Globe2 className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => dispatch({
                  type: 'setLock',
                  field: 'headline',
                  locked: !scene.locks.headline,
                })}
              >
                <Lock className="h-4 w-4" />
                {scene.locks.headline ? 'Unlock headline' : 'Lock headline'}
              </Button>
            </div>
            {error && (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                {error}
              </p>
            )}
          </form>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Creative brief
            </p>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs font-black uppercase tracking-wide text-slate-400">Offer</dt>
                <dd className="mt-1 text-sm font-black leading-6 text-slate-950">{scene.brand.offer}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-wide text-slate-400">Audience</dt>
                <dd className="mt-1 text-sm font-black leading-6 text-slate-950">{scene.brand.audience}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-wide text-slate-400">Receipt</dt>
                <dd className="mt-1 text-sm font-black leading-6 text-slate-950">{firstReceipt}</dd>
              </div>
            </dl>
            {research && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-bold text-slate-500">
                  Read {research.headings.length} headings and {research.paragraphs.length} page snippets from {research.host}
                  {quality ? ` · ${quality.level} research (${quality.score}/100)` : ''}.
                </p>
                <div className="flex flex-wrap gap-2">
                  {research.providerStatus.map((provider) => (
                    <span
                      key={`${provider.provider}-${provider.status}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500"
                      title={provider.reason}
                    >
                      {provider.provider} {provider.status}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </section>

        <section className="mx-auto min-w-0 w-full max-w-full rounded-[34px] border border-slate-200 bg-black p-3 shadow-[0_30px_80px_rgba(15,23,42,0.20)] sm:max-w-[390px]">
          <div className="overflow-hidden rounded-[26px] bg-white">
            <div className="flex items-center gap-3 bg-black px-4 py-3 text-white">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-black text-slate-950">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  scene.brand.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-black leading-none">{scene.brand.name}</p>
                <p className="mt-1 text-xs font-semibold text-white/70">Sponsored</p>
              </div>
            </div>

            <div
              className="flex min-h-[510px] flex-col items-center justify-center gap-7 px-8 text-center"
              style={{ backgroundColor: scene.creative.backgroundColor }}
            >
              <p className="text-sm font-black uppercase tracking-wide text-slate-950">
                {scene.brand.name}
              </p>
              <h2 className="text-4xl font-black leading-[1.02] text-slate-950">
                {scene.creative.headline}
              </h2>
              <div className="flex h-20 w-full items-center justify-center gap-1">
                {Array.from({ length: 21 }).map((_, index) => {
                  const center = Math.abs(index - 10);
                  const height = 18 + (10 - center) * 4;
                  return (
                    <span
                      // Static fixture bars are enough for Child Issue #1. The
                      // Remotion renderer owns the canonical animation contract.
                      key={index}
                      className="w-3 rounded-full"
                      style={{
                        height,
                        backgroundColor: scene.creative.visualizer.color,
                      }}
                    />
                  );
                })}
              </div>
              {scene.audio.status === 'none' && (
                <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.14)]">
                  <AudioLines className="h-4 w-4" />
                  Add audio for this ad
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
