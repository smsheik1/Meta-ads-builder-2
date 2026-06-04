'use client';

import { useEffect, useRef, useState } from 'react';
import { AudioLines, Pause, Play } from 'lucide-react';
import type { AdScene } from '@/features/create/scene';
import {
  getActiveCaptionText,
  getVisualizerBarHeight,
  isGeneratedSceneAudio,
} from './adSceneRender';

type AdSceneCanvasProps = {
  scene: AdScene;
  addAudioLabel?: string;
  className?: string;
  onAddAudio?: () => void;
};

export function AdSceneCanvas({
  scene,
  addAudioLabel = 'Add audio for this ad',
  className = '',
  onAddAudio,
}: AdSceneCanvasProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioTimeMs, setAudioTimeMs] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const avatarUrl = scene.brand.logoUrl || scene.brand.faviconUrl;
  const playableAudio = isGeneratedSceneAudio(scene);
  const captionText = playableAudio && (isPlaying || audioTimeMs > 0)
    ? getActiveCaptionText(scene.audio, audioTimeMs)
    : '';
  const visualizerTimeMs = playableAudio && isPlaying ? audioTimeMs : 0;

  useEffect(() => {
    setIsPlaying(false);
    setAudioTimeMs(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [scene.id, scene.audio.url]);

  const togglePlayback = async () => {
    if (!playableAudio || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    await audioRef.current.play();
    setIsPlaying(true);
  };

  return (
    <section className={`mx-auto min-w-0 w-full max-w-full self-start rounded-[34px] border border-slate-200 bg-black p-3 shadow-[0_30px_80px_rgba(15,23,42,0.20)] sm:max-w-[390px] ${className}`}>
      <div className="overflow-hidden rounded-[26px] bg-white">
        <div className="flex items-center gap-3 bg-black px-4 py-3 text-white">
          <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white text-sm font-black text-slate-950">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
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
            {Array.from({ length: 21 }).map((_, index) => (
              <span
                key={index}
                className="w-3 rounded-full"
                style={{
                  height: getVisualizerBarHeight(index, 21, visualizerTimeMs, 74),
                  backgroundColor: scene.creative.visualizer.color,
                }}
              />
            ))}
          </div>
          {captionText && (
            <p className="max-w-[290px] text-base font-black leading-6 text-slate-600">
              {captionText}
            </p>
          )}
          {playableAudio ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-[0_18px_44px_rgba(15,23,42,0.20)]"
                onClick={togglePlayback}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? 'Pause audio' : 'Play audio'}
              </button>
              {onAddAudio && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.12)]"
                  onClick={onAddAudio}
                >
                  Change audio
                </button>
              )}
            </div>
          ) : onAddAudio ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.14)]"
              onClick={onAddAudio}
            >
              <AudioLines className="h-4 w-4" />
              {addAudioLabel}
            </button>
          ) : null}
        </div>
      </div>
      {playableAudio && (
        <audio
          ref={audioRef}
          src={scene.audio.url || undefined}
          onTimeUpdate={(event) => setAudioTimeMs(Math.round(event.currentTarget.currentTime * 1000))}
          onEnded={() => {
            setIsPlaying(false);
            setAudioTimeMs(0);
          }}
        />
      )}
    </section>
  );
}
