'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { AudioLines, Captions, Lock, Pause, Play, Unlock } from 'lucide-react';
import type { AdScene, AdSceneLayoutElement } from '@/features/create/scene';
import {
  getActiveCaptionText,
  getHeadlineScale,
  getVisualizerBarHeight,
  isStoredSceneAudio,
} from './adSceneRender';
import { getCanvasLayoutStyle, getLayoutBox, layoutLockForElement } from './adSceneLayout';

type AdSceneCanvasProps = {
  scene: AdScene;
  addAudioLabel?: string;
  className?: string;
  onAddAudio?: () => void;
  onEditCaptions?: () => void;
  onMoveElement?: (element: AdSceneLayoutElement, x: number, y: number) => void;
  onSelectElement?: (element: AdSceneLayoutElement | null) => void;
  onToggleLock?: (field: keyof AdScene['locks']) => void;
  rerollTick?: number;
  selectedElement?: AdSceneLayoutElement | null;
  showGuides?: boolean;
};

type DragState = {
  element: AdSceneLayoutElement;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

export function AdSceneCanvas({
  scene,
  addAudioLabel = 'Add audio for this ad',
  className = '',
  onAddAudio,
  onEditCaptions,
  onMoveElement,
  onSelectElement,
  onToggleLock,
  rerollTick = 0,
  selectedElement = null,
  showGuides = false,
}: AdSceneCanvasProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioTimeMs, setAudioTimeMs] = useState(0);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const avatarUrl = scene.brand.logoUrl || scene.brand.faviconUrl;
  const playableAudio = isStoredSceneAudio(scene);
  const visualizerBarCount = scene.creative.visualizer.barCount ?? 21;
  const headlineFontSizePx = Math.round(36 * getHeadlineScale(scene.creative.headline));
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

  const startDrag = (element: AdSceneLayoutElement) => (event: PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select')) return;
    onSelectElement?.(element);
    if (!onMoveElement || layoutLockForElement(scene, element) || event.button !== 0) return;

    const box = getLayoutBox(scene, element);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging({
      element,
      startX: event.clientX,
      startY: event.clientY,
      originX: box.x,
      originY: box.y,
    });
  };

  const updateDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !surfaceRef.current || !onMoveElement) return;

    const bounds = surfaceRef.current.getBoundingClientRect();
    onMoveElement(
      dragging.element,
      dragging.originX + ((event.clientX - dragging.startX) / bounds.width),
      dragging.originY + ((event.clientY - dragging.startY) / bounds.height),
    );
  };

  const dragClass = (element: AdSceneLayoutElement) => {
    const selectedClass = selectedElement === element
      ? 'ring-2 ring-slate-950/35 shadow-[0_0_0_6px_rgba(15,23,42,0.05)]'
      : 'ring-1 ring-transparent';
    if (!onMoveElement) return '';
    if (layoutLockForElement(scene, element)) return `cursor-pointer opacity-70 ${selectedClass}`;
    return `cursor-move touch-none select-none rounded-2xl transition hover:ring-slate-300 ${selectedClass}`;
  };

  const lockFieldForElement = (element: AdSceneLayoutElement): keyof AdScene['locks'] => {
    if (element === 'brand') return 'logo';
    if (element === 'headline') return 'headline';
    if (element === 'visualizer') return 'visualizer';
    return 'audio';
  };

  const renderElementLock = (element: AdSceneLayoutElement) => {
    const field = lockFieldForElement(element);
    const locked = scene.locks[field];
    if (!onToggleLock || selectedElement !== element) return null;

    return (
      <button
        type="button"
        className="absolute right-1 top-1 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.16)] transition hover:bg-slate-950 hover:text-white"
        title={locked ? 'Unlock element' : 'Lock element'}
        onClick={(event) => {
          event.stopPropagation();
          onToggleLock(field);
        }}
      >
        {locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </button>
    );
  };

  return (
    <section className={`mx-auto min-w-0 w-full max-w-full self-start rounded-[34px] border border-slate-200 bg-black p-3 shadow-[0_30px_80px_rgba(15,23,42,0.20)] sm:max-w-[390px] ${className}`}>
      <div className="overflow-hidden rounded-[26px] bg-white">
        <div className="flex items-center gap-3 bg-black px-4 py-3 text-white">
          <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white text-sm font-black text-slate-950">
            {rerollTick > 0 && !scene.locks.logo && (
              <span
                key={`logo-${rerollTick}`}
                className="wiggly-reroll-shine pointer-events-none absolute inset-0"
                data-testid="reroll-shine-logo"
              />
            )}
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
          ref={surfaceRef}
          className="relative min-h-[510px] px-8 text-center"
          style={{ backgroundColor: scene.creative.backgroundColor }}
          onPointerMove={updateDrag}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
        >
          <div
            className={`relative grid place-items-center px-2 py-1 ${dragClass('brand')}`}
            data-testid="ad-scene-element-brand"
            style={getCanvasLayoutStyle(scene, 'brand')}
            onPointerDown={startDrag('brand')}
          >
            {renderElementLock('brand')}
            <p className="text-sm font-black uppercase tracking-wide text-slate-950">
              {scene.brand.name}
            </p>
          </div>
          <div
            className={`relative grid place-items-center overflow-hidden px-2 py-1 ${dragClass('headline')}`}
            data-testid="ad-scene-element-headline"
            style={getCanvasLayoutStyle(scene, 'headline')}
            onPointerDown={startDrag('headline')}
          >
            {rerollTick > 0 && !scene.locks.headline && (
              <span
                key={`headline-${rerollTick}`}
                className="wiggly-reroll-shine pointer-events-none absolute inset-0"
                data-testid="reroll-shine-headline"
              />
            )}
            {renderElementLock('headline')}
            <h2
              className="font-black leading-[1.02]"
              style={{
                color: scene.creative.headlineColor || '#07111f',
                fontSize: `${headlineFontSizePx}px`,
                overflowWrap: 'break-word',
              }}
            >
              {scene.creative.headline}
            </h2>
          </div>
          <div
            className={`relative flex items-center justify-center gap-1 overflow-hidden ${dragClass('visualizer')}`}
            data-testid="ad-scene-element-visualizer"
            style={getCanvasLayoutStyle(scene, 'visualizer')}
            onPointerDown={startDrag('visualizer')}
          >
            {renderElementLock('visualizer')}
            {rerollTick > 0 && !scene.locks.visualizer && (
              <span
                key={`visualizer-${rerollTick}`}
                className="wiggly-reroll-shine pointer-events-none absolute inset-0"
                data-testid="reroll-shine-visualizer"
              />
            )}
            {Array.from({ length: visualizerBarCount }).map((_, index) => (
              <span
                key={index}
                className="w-3 rounded-full"
                style={{
                  height: getVisualizerBarHeight(index, visualizerBarCount, visualizerTimeMs, 74),
                  backgroundColor: scene.creative.visualizer.color,
                }}
              />
            ))}
          </div>
          <div
            className={`relative grid place-items-center ${dragClass('caption')}`}
            data-testid="ad-scene-element-caption"
            style={getCanvasLayoutStyle(scene, 'caption')}
            onPointerDown={startDrag('caption')}
          >
            {renderElementLock('caption')}
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
                {onEditCaptions && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.12)] disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={scene.locks.audio}
                    onClick={onEditCaptions}
                  >
                    <Captions className="h-4 w-4" />
                    Edit captions
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
          {showGuides && (
            <div
              className="pointer-events-none absolute inset-0 z-40 grid place-items-center"
              data-testid="scene-safe-guides"
            >
              <div className="relative aspect-square w-full border border-dashed border-slate-950/30 bg-slate-950/[0.025] shadow-[0_0_0_999px_rgba(15,23,42,0.04)]">
                <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-sm">
                  Feed safe area
                </span>
              </div>
            </div>
          )}
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
