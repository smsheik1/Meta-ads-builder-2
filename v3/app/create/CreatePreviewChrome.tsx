"use client";

import {
  AudioLines,
  Bookmark,
  Grid2X2,
  Heart,
  MessageCircle,
  Send,
} from "lucide-react";
import { AdRenderSurface } from "@/features/render/AdRenderSurface";
import type { AdScene } from "@/features/scene/types";
import type { StoredWebsiteResearchResult } from "@/features/research/types";

export function WigglyMark({ size = "md" }: { size?: "sm" | "md" }) {
  const wrapperSize = size === "sm" ? "size-9" : "size-11";
  const dotSize = size === "sm" ? "size-1.5" : "size-2";

  return (
    <div className={`${wrapperSize} grid place-items-center rounded-full bg-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.18)]`}>
      <div className="flex items-center gap-0.5">
        <span className={`${dotSize} rounded-full bg-cyan-300`} />
        <span className="h-1 w-3 rounded-full bg-blue-500" />
        <span className={`${dotSize} rounded-full bg-fuchsia-400`} />
        <span className="h-1 w-3 rounded-full bg-emerald-300" />
        <span className={`${dotSize} rounded-full bg-cyan-300`} />
      </div>
    </div>
  );
}

function BrandAvatar({
  logoUrl,
  brandName,
  sizeClass = "size-12",
}: {
  brandName: string;
  logoUrl?: string | null;
  sizeClass?: string;
}) {
  return (
    <div className={`${sizeClass} grid shrink-0 place-items-center rounded-full border-2 border-fuchsia-500 bg-white p-1 shadow-[inset_0_0_0_2px_rgba(249,115,22,0.55)]`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="size-full rounded-full object-contain"
          src={logoUrl}
        />
      ) : (
        <span className="grid size-full place-items-center rounded-full bg-slate-950 text-xs font-black text-white">
          {brandName.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function PlaceholderAdSurface() {
  const placeholderBars = [
    22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 64, 70, 76, 82, 76, 70, 64, 58, 54, 50, 46, 42, 38, 34,
  ];

  return (
    <div className="relative flex aspect-[4/5] flex-col items-center justify-center overflow-hidden bg-[#fbfaf5] px-9 text-center">
      <WigglyMark />
      <h2 className="mt-8 max-w-[330px] text-[40px] font-black leading-[0.95] tracking-normal text-slate-950">
        Drop in your website and watch the magic happen.
      </h2>
      <div className="mt-12 flex w-[118%] items-center justify-center gap-2">
        {placeholderBars.map((height, index) => (
          <span
            aria-hidden="true"
            className="w-3 rounded-full bg-[#25d8c4]"
            key={`${height}-${index}`}
            style={{ height }}
          />
        ))}
      </div>
      <div className="mt-14 inline-flex items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-base font-black text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <AudioLines className="size-5" />
        Add audio for this ad
      </div>
      <p className="absolute bottom-8 right-8 text-xs font-black uppercase tracking-[0.38em] text-slate-950/25">
        Made with Wiggly
      </p>
    </div>
  );
}

export function PhonePreviewFrame({
  scene,
  result,
  timeSeconds,
}: {
  scene: AdScene | null;
  result: StoredWebsiteResearchResult | null;
  timeSeconds: number;
}) {
  const brandName = scene?.brand.name || result?.brand.name || "Your brand";
  const brandLogoUrl = scene?.brand.logoUrl || scene?.brand.faviconUrl || result?.brand.logoUrl || result?.brand.faviconUrl || "";
  const caption = scene?.creative.subheadline || "Add audio for this ad";

  return (
    <div className="mx-auto w-[460px] rounded-[40px] bg-black p-[10px] shadow-[0_34px_90px_rgba(15,23,42,0.24)]">
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-black">
        <div className="flex h-[78px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <BrandAvatar brandName={brandName} logoUrl={brandLogoUrl} sizeClass="size-12" />
            <div>
              <p className="text-sm font-black leading-none text-white">{brandName}</p>
              <p className="mt-1 text-xs font-bold leading-none text-slate-300">Sponsored</p>
            </div>
          </div>
          <span className="text-xl font-black tracking-widest text-white">...</span>
        </div>

        <div className="bg-[#fbfaf5]">
          {scene ? (
            <AdRenderSurface scene={scene} timeSeconds={timeSeconds} />
          ) : (
            <PlaceholderAdSurface />
          )}
        </div>

        <div className="min-h-[160px] bg-black px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Heart className="size-7" strokeWidth={2.4} />
              <MessageCircle className="size-7" strokeWidth={2.4} />
              <Send className="size-7" strokeWidth={2.4} />
            </div>
            <Bookmark className="size-7" strokeWidth={2.4} />
          </div>
          <p className="mt-3 text-sm font-black">1,284 likes</p>
          <p className="mt-2 max-w-[390px] text-sm font-bold leading-5 text-white">
            <span className="font-black">{brandName}</span>{" "}
            <span className="text-slate-200">{caption}</span>
          </p>
          <p className="mt-2 text-sm font-bold text-slate-500">View all 84 comments</p>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600">Sponsored</p>
        </div>
      </div>
    </div>
  );
}

export function FormatRail() {
  return (
    <div className="mt-64 hidden w-16 rounded-[28px] border border-slate-200 bg-white/95 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)] xl:grid">
      <button
        type="button"
        aria-label="Visualizer format"
        className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm"
      >
        <AudioLines className="size-6" />
      </button>
      <button
        type="button"
        aria-label="Future image format"
        className="mt-3 grid size-12 place-items-center rounded-2xl border border-slate-200 text-slate-300"
        disabled
      >
        <Grid2X2 className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Future social format"
        className="mt-3 grid size-12 place-items-center rounded-2xl border border-slate-200 text-slate-300"
        disabled
      >
        <MessageCircle className="size-5" />
      </button>
    </div>
  );
}
