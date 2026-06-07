"use client";

import { useQuery } from "convex/react";
import { ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AdRenderSurface } from "@/features/render/AdRenderSurface";
import type { AdScene } from "@/features/scene/types";

type ShareRecord = {
  slug: string;
  ctaUrl?: string;
  createdAt: number;
  sceneId: string;
  scene: AdScene;
};

export function ShareSceneClient({ slug }: { slug: string }) {
  const share = useQuery(api.sharePages.getBySlug, { slug }) as ShareRecord | null | undefined;

  if (share === undefined) {
    return (
      <section className="grid min-h-[520px] place-items-center rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_28px_90px_rgba(15,23,42,0.10)]">
        <div className="inline-flex items-center gap-3 rounded-full bg-slate-50 px-5 py-3 text-sm font-black text-slate-500">
          <Loader2 className="size-5 animate-spin" />
          Loading share page
        </div>
      </section>
    );
  }

  if (share === null) {
    return (
      <section className="max-w-xl rounded-[32px] border border-red-100 bg-white p-8 shadow-[0_28px_90px_rgba(15,23,42,0.10)]">
        <ShieldAlert className="size-8 text-red-600" />
        <h1 className="mt-5 text-4xl font-black leading-tight">Share page not found.</h1>
        <p className="mt-4 text-base font-bold leading-7 text-slate-500">
          This link may have been deleted, or the slug is wrong.
        </p>
      </section>
    );
  }

  const scene = share.scene;

  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-[0.9fr_1fr] items-center gap-10">
      <div className="rounded-[34px] bg-slate-950 p-3 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="overflow-hidden rounded-[26px] bg-white">
          <AdRenderSurface scene={scene} mode="poster" timeSeconds={1.1} />
        </div>
      </div>

      <aside className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_28px_90px_rgba(15,23,42,0.10)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Wiggly share page
        </p>
        <div className="mt-5 flex items-center gap-4">
          {scene.brand.logoUrl || scene.brand.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="size-14 rounded-2xl border border-slate-200 object-contain p-2"
              src={scene.brand.logoUrl || scene.brand.faviconUrl || ""}
            />
          ) : null}
          <div>
            <p className="text-2xl font-black leading-tight">{scene.brand.name}</p>
            <p className="mt-1 text-sm font-bold text-slate-500">{scene.brand.host}</p>
          </div>
        </div>
        <h1 className="mt-8 text-5xl font-black leading-[0.98] tracking-normal">
          {scene.creative.headline}
        </h1>
        <p className="mt-5 text-lg font-bold leading-8 text-slate-500">
          {scene.creative.subheadline}
        </p>
        {share.ctaUrl ? (
          <a
            href={share.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
          >
            {scene.creative.ctaText}
            <ExternalLink className="size-5" />
          </a>
        ) : null}
      </aside>
    </section>
  );
}
