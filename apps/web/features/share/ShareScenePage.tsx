'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { AdSceneCanvas } from '@/features/render/AdSceneCanvas';
import type { ShareSceneRecord } from './shareSceneStore';

type ShareScenePageProps = {
  record: ShareSceneRecord;
};

export function ShareScenePage({ record }: ShareScenePageProps) {
  const scene = record.scene;

  return (
    <main className="min-h-screen px-5 py-8 md:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <AdSceneCanvas scene={scene} className="lg:order-1" />

        <section className="flex min-w-0 flex-col justify-center gap-5 lg:order-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white">
                {scene.brand.logoUrl || scene.brand.faviconUrl ? (
                  <img
                    src={scene.brand.logoUrl || scene.brand.faviconUrl || ''}
                    alt=""
                    className="h-full w-full bg-white object-cover"
                  />
                ) : (
                  scene.brand.name.slice(0, 2).toUpperCase()
                )}
              </span>
              <div>
                <p className="text-sm font-black text-slate-950">{scene.brand.name}</p>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Sponsored
                </p>
              </div>
            </div>

            <h1 className="mt-8 max-w-xl text-4xl font-black leading-[1.02] tracking-normal text-slate-950 md:text-5xl">
              {scene.creative.headline}
            </h1>
            <p className="mt-5 max-w-xl text-base font-black leading-7 text-slate-600">
              {scene.creative.subheadline}
            </p>
          </div>

          {scene.creative.ctaUrl && (
            <a
              href={scene.creative.ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-black text-white shadow-[0_18px_44px_rgba(15,23,42,0.20)] transition hover:bg-slate-800"
            >
              {scene.creative.ctaText || 'Learn More'}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <Link
            href="/create"
            className="text-sm font-black text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950"
          >
            Made with Wiggly
          </Link>
        </section>
      </div>
    </main>
  );
}
