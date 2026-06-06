import React, { useRef, useState } from 'react';
import { Image, MessageCircle, MessagesSquare, Mic2, MousePointer2, Twitter, Upload, Waves } from 'lucide-react';

export type CreateFormatMode = 'visualizer' | 'conversation';

type RailFormatId = 'visualizer' | 'meme' | 'text-message' | 'tweet' | 'conversation-card';

type RailFormat = {
  id: RailFormatId;
  label: string;
  description: string;
  status: 'active' | 'planned';
};

type CreateCanvasFormatRailProps = {
  activeFormatId: CreateFormatMode;
  onSelectFormat: (format: CreateFormatMode) => void;
  onMakeVoiceAudio: () => void;
  onUploadVoiceAudio: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const CANVAS_RAIL_FORMATS: RailFormat[] = [
  {
    id: 'visualizer',
    label: 'Visualizer',
    description: 'Audio-reactive visual ads.',
    status: 'active',
  },
  {
    id: 'meme',
    label: 'Meme',
    description: 'Image-led meme ads will live in their own format module.',
    status: 'planned',
  },
  {
    id: 'text-message',
    label: 'Text',
    description: 'Message-style ads will get a separate renderer and editor.',
    status: 'planned',
  },
  {
    id: 'tweet',
    label: 'Tweet',
    description: 'Social-post ads will not share visualizer editing state.',
    status: 'planned',
  },
  {
    id: 'conversation-card',
    label: 'Chat',
    description: 'Conversation-card ads stay isolated until the format is real.',
    status: 'planned',
  },
];

const formatIcons = {
  visualizer: Waves,
  meme: Image,
  'text-message': MessageCircle,
  tweet: Twitter,
  'conversation-card': MessagesSquare,
} satisfies Record<RailFormatId, typeof Waves>;

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
  onClick,
}: {
  active: boolean;
  format: RailFormat;
  onClick?: () => void;
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
      onClick={disabled ? undefined : onClick}
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

export function CreateCanvasFormatRail({
  activeFormatId,
  onSelectFormat,
  onMakeVoiceAudio,
  onUploadVoiceAudio,
}: CreateCanvasFormatRailProps) {
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const activeFormats = CANVAS_RAIL_FORMATS.filter((format) => format.status === 'active');
  const plannedFormats = CANVAS_RAIL_FORMATS.filter((format) => format.status === 'planned');

  return (
    <nav
      className="absolute left-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-[24px] border border-slate-200 bg-white/95 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
      aria-label="Ad formats"
      data-testid="canvas-format-rail"
      onMouseEnter={() => setVoiceMenuOpen(true)}
      onMouseLeave={() => setVoiceMenuOpen(false)}
    >
      {activeFormats.map((format) => (
        <FormatButton
          key={format.id}
          active={format.id === activeFormatId}
          format={format}
          onClick={() => {
            onSelectFormat('visualizer');
            setVoiceMenuOpen((open) => !open);
          }}
        />
      ))}
      {voiceMenuOpen && (
        <div
          className="absolute left-[calc(100%+10px)] top-2 w-56 rounded-[24px] border border-slate-200 bg-white p-3 text-left shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
          data-testid="visualizer-voice-menu"
        >
          <span className="absolute -left-2 top-6 h-4 w-4 rotate-45 border-b border-l border-slate-200 bg-white" />
          <p className="px-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
            Visualizer audio
          </p>
          <button
            type="button"
            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
            onClick={() => {
              setVoiceMenuOpen(false);
              onMakeVoiceAudio();
            }}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-white">
              <Mic2 className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-black text-slate-950">Make voice audio</span>
              <span className="mt-0.5 block text-xs font-bold text-slate-500">Generate options for this ad.</span>
            </span>
          </button>
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
            onClick={() => uploadInputRef.current?.click()}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700">
              <Upload className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-black text-slate-950">Upload voice audio</span>
              <span className="mt-0.5 block text-xs font-bold text-slate-500">Use a clip you already have.</span>
            </span>
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="audio/*,video/mp4"
            onChange={(event) => {
              onUploadVoiceAudio(event);
              setVoiceMenuOpen(false);
            }}
            className="sr-only"
            title="Upload voice audio"
          />
        </div>
      )}
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
