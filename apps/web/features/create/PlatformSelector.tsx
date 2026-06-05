'use client';

import { Instagram, PanelTop, Smartphone, Youtube } from 'lucide-react';
import type { ComponentType } from 'react';
import type { AdPlatform } from './scene';
import { AD_SCENE_RENDER_SPECS } from '@/features/render/adSceneRender';

type PlatformSelectorProps = {
  platform: AdPlatform;
  onPlatformChange: (platform: AdPlatform) => void;
};

type PlatformOption = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  meta: string;
  value: AdPlatform;
};

const PLATFORM_OPTIONS: PlatformOption[] = [
  { value: 'instagram-feed', label: 'IG Feed', meta: '4:5 post', icon: Instagram },
  { value: 'reels', label: 'Reels', meta: '9:16 scroll', icon: Smartphone },
  { value: 'stories', label: 'Stories', meta: '9:16 story', icon: PanelTop },
  { value: 'youtube', label: 'YouTube', meta: '16:9 video', icon: Youtube },
];

export function PlatformSelector({
  platform,
  onPlatformChange,
}: PlatformSelectorProps) {
  return (
    <section
      className="mx-auto mt-4 w-full max-w-[min(100%,32rem)] rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
      data-testid="platform-selector"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PLATFORM_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = option.value === platform;
          const spec = AD_SCENE_RENDER_SPECS[option.value];

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              title={`${spec.label} ${spec.width}x${spec.height}`}
              className={`grid min-h-16 place-items-center rounded-[18px] px-3 py-2 text-center transition ${
                active
                  ? 'bg-slate-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.20)]'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
              }`}
              onClick={() => onPlatformChange(option.value)}
            >
              <Icon className="h-4 w-4" />
              <span className="mt-1 text-xs font-black leading-none">{option.label}</span>
              <span className={`mt-1 text-[10px] font-bold leading-none ${active ? 'text-white/60' : 'text-slate-400'}`}>
                {option.meta}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
