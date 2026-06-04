'use client';

import { useMemo, useReducer } from 'react';
import { AudioLines, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ogToolScene } from './fixtures';
import { reduceAdScene } from './sceneReducer';

const rerollPayloads = [
  {
    headline: 'Why AI recommends your competitors',
    subheadline: 'Fully managed Reddit and ChatGPT visibility campaigns that secure front-page rankings.',
    accentColor: '#7dd3fc',
    visualizer: { color: '#93c5fd' },
  },
  {
    headline: 'Show up where buyers ask',
    subheadline: 'Turn Reddit proof into the answer ChatGPT remembers.',
    accentColor: '#f472b6',
    visualizer: { color: '#f9a8d4' },
  },
  {
    headline: 'Get mentioned before the click',
    subheadline: 'Build the off-site signals that make AI tools point back to your brand.',
    accentColor: '#34d399',
    visualizer: { color: '#6ee7b7' },
  },
];

export function CreateFoundation() {
  const [scene, dispatch] = useReducer(reduceAdScene, ogToolScene);
  const rerollIndex = useMemo(() => (
    Math.abs(scene.updatedAt) % rerollPayloads.length
  ), [scene.updatedAt]);

  const reroll = () => {
    const next = rerollPayloads[(rerollIndex + 1) % rerollPayloads.length];
    dispatch({
      type: 'rerollCreative',
      creative: {
        angleId: `fixture-${rerollIndex + 1}`,
        ...next,
      },
      now: scene.updatedAt + 1,
    });
  };

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
              This is the clean-room shell for the new Wiggly product path. For now
              it proves scene state, locks, and reroll behavior without touching the
              legacy app.
            </p>
          </div>

          <div className="min-w-0 rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Website fixture
            </label>
            <div className="mt-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950">
              {scene.brand.websiteUrl}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={reroll}>
                <Sparkles className="h-4 w-4" />
                Reroll scene
              </Button>
              <Button
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
          </div>
        </section>

        <section className="mx-auto min-w-0 w-full max-w-full rounded-[34px] border border-slate-200 bg-black p-3 shadow-[0_30px_80px_rgba(15,23,42,0.20)] sm:max-w-[390px]">
          <div className="overflow-hidden rounded-[26px] bg-white">
            <div className="flex items-center gap-3 bg-black px-4 py-3 text-white">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-black text-slate-950">
                {scene.brand.name.slice(0, 2).toUpperCase()}
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
