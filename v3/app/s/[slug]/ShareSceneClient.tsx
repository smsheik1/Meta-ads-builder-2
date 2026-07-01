"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { ExternalLink, Loader2, Play, ShieldAlert, Square } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { AdScene } from "@/features/scene/types";
import { PhonePreviewFrame, type PreviewPlatform } from "../../create/CreatePreviewChrome";

export type ShareRecord = {
  slug: string;
  ctaUrl?: string;
  createdAt: number;
  previewPlatform?: PreviewPlatform;
  sceneId: string;
  scene: AdScene;
};

export function ShareSceneClient({
  slug,
  initialShare,
}: {
  slug: string;
  initialShare?: ShareRecord | null;
}) {
  const liveShare = useQuery(api.sharePages.getBySlug, { slug }) as ShareRecord | null | undefined;
  const share = liveShare === undefined ? initialShare : liveShare;
  const scene = share?.scene || null;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [previewTimeSeconds, setPreviewTimeSeconds] = useState(1.1);
  const playableAudioUrl = scene?.audio.status === "generated"
    ? scene.audio.url
    : scene?.format === "motion-story"
      ? scene.layout.musicBed.src
      : "";
  const hasPlayableAudio = Boolean(playableAudioUrl);

  useEffect(() => {
    setIsAudioPlaying(false);
    setPreviewTimeSeconds(1.1);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [playableAudioUrl, scene?.metadata.generationBatchId, scene?.metadata.candidateIndex]);

  useEffect(() => {
    if (!hasPlayableAudio || !isAudioPlaying) return;

    let animationFrame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        setPreviewTimeSeconds(audio.currentTime);
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [hasPlayableAudio, isAudioPlaying]);

  const onTogglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !hasPlayableAudio) return;

    if (audio.paused) {
      void audio.play();
      return;
    }

    audio.pause();
  }, [hasPlayableAudio]);

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

  const activeScene = share.scene;

  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-[0.9fr_1fr] items-center gap-10">
      <div className="grid justify-center">
        <PhonePreviewFrame
          scene={activeScene}
          result={null}
          platform={share.previewPlatform || "instagram-feed"}
          motionMode={isAudioPlaying ? "audio" : "idle"}
          timeSeconds={previewTimeSeconds}
        />
        {hasPlayableAudio ? (
          <audio
            ref={audioRef}
            src={playableAudioUrl}
            preload="metadata"
            onEnded={() => {
              setIsAudioPlaying(false);
              setPreviewTimeSeconds(1.1);
              if (audioRef.current) audioRef.current.currentTime = 0;
            }}
            onPause={(event) => {
              setIsAudioPlaying(false);
              setPreviewTimeSeconds(event.currentTarget.currentTime || 1.1);
            }}
            onPlay={() => setIsAudioPlaying(true)}
            onTimeUpdate={(event) => setPreviewTimeSeconds(event.currentTarget.currentTime || 1.1)}
          />
        ) : null}
      </div>

      <aside className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_28px_90px_rgba(15,23,42,0.10)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Wiggly share page
        </p>
        <div className="mt-5 flex items-center gap-4">
          {activeScene.brand.logoUrl || activeScene.brand.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="size-14 rounded-2xl border border-slate-200 object-contain p-2"
              src={activeScene.brand.logoUrl || activeScene.brand.faviconUrl || ""}
            />
          ) : null}
          <div>
            <p className="text-2xl font-black leading-tight">{activeScene.brand.name}</p>
            <p className="mt-1 text-sm font-bold text-slate-500">{activeScene.brand.host}</p>
          </div>
        </div>
        <h1 className="mt-8 text-5xl font-black leading-[0.98] tracking-normal">
          {activeScene.creative.headline}
        </h1>
        <p className="mt-5 text-lg font-bold leading-8 text-slate-500">
          {activeScene.creative.subheadline}
        </p>
        {hasPlayableAudio ? (
          <button
            type="button"
            onClick={onTogglePlayback}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-6 py-4 text-base font-black text-slate-800 shadow-[0_18px_40px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            {isAudioPlaying ? <Square className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
            {isAudioPlaying ? "Stop preview" : "Play this ad"}
          </button>
        ) : null}
        {share.ctaUrl ? (
          <a
            href={share.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
          >
            {activeScene.creative.ctaText}
            <ExternalLink className="size-5" />
          </a>
        ) : null}
        <a
          href="/create"
          className="mt-6 inline-flex text-sm font-black text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950"
        >
          Made with Wiggly
        </a>
      </aside>
    </section>
  );
}
