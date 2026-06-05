'use client';

import { Bookmark, ChevronUp, Heart, MessageCircle, MoreHorizontal, Play, Send, VolumeX } from 'lucide-react';
import type { AdScene } from '@/features/create/scene';

type PlatformChromeProps = {
  avatarUrl: string | null;
  logoLocked?: boolean;
  rerollTick?: number;
  scene: AdScene;
};

const PlatformAvatar = ({
  avatarUrl,
  brandName,
  logoLocked = false,
  rerollTick = 0,
  sizeClass = 'h-9 w-9',
}: {
  avatarUrl: string | null;
  brandName: string;
  logoLocked?: boolean;
  rerollTick?: number;
  sizeClass?: string;
}) => (
  <span className={`${sizeClass} grid shrink-0 place-items-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]`}>
    <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-black bg-white text-[10px] font-black text-slate-950">
      {rerollTick > 0 && !logoLocked && (
        <span
          key={`platform-logo-${rerollTick}`}
          className="wiggly-reroll-shine pointer-events-none absolute inset-0"
          data-testid="reroll-shine-logo"
        />
      )}
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : brandName.slice(0, 2).toUpperCase()}
    </span>
  </span>
);

export function PlatformAccountBar({ avatarUrl, rerollTick = 0, scene }: PlatformChromeProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black px-4 py-3 text-white"
      data-testid="platform-preview-account-bar"
    >
      <div className="flex min-w-0 items-center gap-3">
        <PlatformAvatar
          avatarUrl={avatarUrl}
          brandName={scene.brand.name}
          logoLocked={scene.locks.logo}
          rerollTick={rerollTick}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-black leading-none">{scene.brand.name}</p>
          <p className="mt-1 text-xs font-semibold text-white/70">Sponsored</p>
        </div>
      </div>
      <MoreHorizontal className="h-5 w-5 shrink-0" />
    </div>
  );
}

export function FeedPreviewFooter({ scene }: { scene: AdScene }) {
  return (
    <div className="shrink-0 bg-black px-4 pb-4 pt-3 text-white" data-testid="feed-preview-footer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Heart className="h-5 w-5" />
          <MessageCircle className="h-5 w-5" />
          <Send className="h-5 w-5" />
        </div>
        <Bookmark className="h-5 w-5" />
      </div>
      <p className="mt-2 text-xs font-black">1,284 likes</p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-white/90">
        <span className="font-black">{scene.brand.name}</span> {scene.creative.subheadline}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">Sponsored</p>
    </div>
  );
}

function ReelsChrome({ avatarUrl, scene }: PlatformChromeProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between" data-testid="reels-preview-chrome">
      <div className="flex items-center justify-between px-4 pt-4 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
        <p className="text-lg font-black">Reels</p>
        <VolumeX className="h-5 w-5" />
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-4 pb-4 pt-28 text-white">
        <div className="mr-14">
          <a className="mb-4 flex h-12 items-center justify-center gap-2 rounded-full bg-white/95 px-5 text-sm font-black text-slate-950 shadow-[0_18px_44px_rgba(0,0,0,0.24)]">
            {scene.creative.ctaText || 'Learn More'}
            <ChevronUp className="h-4 w-4" />
          </a>
          <div className="flex items-center gap-2">
            <PlatformAvatar avatarUrl={avatarUrl} brandName={scene.brand.name} sizeClass="h-8 w-8" />
            <div>
              <p className="text-sm font-black leading-none">{scene.brand.name}</p>
              <p className="mt-1 text-xs font-semibold text-white/70">Sponsored</p>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-4 text-white/90">
            {scene.creative.subheadline}
          </p>
        </div>
        <div className="absolute bottom-5 right-4 flex flex-col items-center gap-4">
          <Heart className="h-6 w-6" />
          <MessageCircle className="h-6 w-6" />
          <Send className="h-6 w-6" />
          <MoreHorizontal className="h-5 w-5" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/20">
        <div className="h-full w-[34%] bg-white" />
      </div>
    </div>
  );
}

function StoriesChrome({ avatarUrl, scene }: PlatformChromeProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between" data-testid="stories-preview-chrome">
      <div className="px-3 pt-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
        <div className="mb-3 grid grid-cols-3 gap-1">
          {[0, 1, 2].map((segment) => (
            <span key={segment} className="h-0.5 overflow-hidden rounded-full bg-white/35">
              <span className={`block h-full rounded-full bg-white ${segment === 0 ? 'w-[72%]' : 'w-0'}`} />
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <PlatformAvatar avatarUrl={avatarUrl} brandName={scene.brand.name} sizeClass="h-8 w-8" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black leading-none">{scene.brand.name}</p>
              <p className="mt-1 text-xs font-semibold text-white/75">Sponsored</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <VolumeX className="h-5 w-5" />
            <MoreHorizontal className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 pb-5 pt-24 text-white">
        <a className="mx-auto mb-4 flex h-12 max-w-[260px] items-center justify-center rounded-full bg-white/95 px-8 text-sm font-black text-slate-950 shadow-[0_18px_44px_rgba(0,0,0,0.24)]">
          {scene.creative.ctaText || 'Learn More'}
        </a>
        <div className="flex items-center gap-3">
          <span className="flex-1 rounded-full border border-white/70 px-4 py-3 text-xs font-semibold text-white/90 backdrop-blur">
            Send message
          </span>
          <Heart className="h-6 w-6" />
          <Send className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function YouTubeChrome({ avatarUrl, scene }: PlatformChromeProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between" data-testid="youtube-preview-chrome">
      <div className="flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <PlatformAvatar avatarUrl={avatarUrl} brandName={scene.brand.name} sizeClass="h-8 w-8" />
          <div className="min-w-0">
            <p className="truncate text-xs font-black leading-none">{scene.brand.name}</p>
            <p className="mt-1 text-[10px] font-semibold text-white/70">Sponsored video</p>
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5" />
      </div>
      <div className="bg-gradient-to-t from-black/70 via-black/20 to-transparent px-4 pb-3 pt-16 text-white">
        <div className="flex items-center gap-3">
          <Play className="h-5 w-5 fill-white" />
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <span className="block h-full w-[42%] rounded-full bg-red-500" />
          </div>
          <span className="text-[10px] font-black">0:05</span>
        </div>
        <p className="mt-2 line-clamp-1 text-xs font-black">{scene.creative.headline}</p>
      </div>
    </div>
  );
}

export function PlatformSurfaceChrome({ avatarUrl, scene }: PlatformChromeProps) {
  if (scene.platform === 'reels') return <ReelsChrome avatarUrl={avatarUrl} scene={scene} />;
  if (scene.platform === 'stories') return <StoriesChrome avatarUrl={avatarUrl} scene={scene} />;
  if (scene.platform === 'youtube') return <YouTubeChrome avatarUrl={avatarUrl} scene={scene} />;
  return null;
}
