'use client';

import { Image, MessageCircle, MessagesSquare, MousePointer2, Twitter, Waves } from 'lucide-react';
import { AD_FORMAT_REGISTRY, ACTIVE_AD_FORMAT_ID } from '@/features/formats/formatRegistry';
import type { AdFormatDefinition, AdFormatId } from '@/features/formats/formatTypes';

type CanvasFormatRailProps = {
  activeFormatId?: AdFormatId;
};

const formatIcons = {
  visualizer: Waves,
  meme: Image,
  'text-message': MessageCircle,
  tweet: Twitter,
  'conversation-card': MessagesSquare,
} satisfies Record<AdFormatId, typeof Waves>;

const buttonClass = (active: boolean, disabled: boolean) => (
  `group relative grid h-11 w-11 place-items-center rounded-2xl border text-sm transition ${
    active
      ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.22)]'
      : disabled
        ? 'cursor-not-allowed border-slate-200 bg-white/70 text-slate-300'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
  }`
);

function FormatButton({
  active,
  format,
}: {
  active: boolean;
  format: AdFormatDefinition;
}) {
  const Icon = formatIcons[format.id];
  const disabled = format.status !== 'active';

  return (
    <button
      type="button"
      className={buttonClass(active, disabled)}
      aria-current={active ? 'true' : undefined}
      aria-label={format.label}
      data-format-id={format.id}
      data-format-status={format.status}
      disabled={disabled}
      title={disabled ? `${format.label} is on the roadmap` : format.description}
    >
      <Icon className="h-5 w-5" />
      {active && (
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border border-white bg-emerald-400">
          <MousePointer2 className="h-2.5 w-2.5 text-slate-950" />
        </span>
      )}
    </button>
  );
}

export function CanvasFormatRail({
  activeFormatId = ACTIVE_AD_FORMAT_ID,
}: CanvasFormatRailProps) {
  const activeFormats = AD_FORMAT_REGISTRY.filter((format) => format.status === 'active');
  const plannedFormats = AD_FORMAT_REGISTRY.filter((format) => format.status === 'planned');

  return (
    <nav
      className="absolute left-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-[24px] border border-slate-200 bg-white/95 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
      aria-label="Ad formats"
      data-testid="canvas-format-rail"
    >
      {activeFormats.map((format) => (
        <FormatButton
          key={format.id}
          active={format.id === activeFormatId}
          format={format}
        />
      ))}
      <span className="my-1 h-px w-8 bg-slate-200" />
      {plannedFormats.map((format) => (
        <FormatButton
          key={format.id}
          active={false}
          format={format}
        />
      ))}
    </nav>
  );
}
