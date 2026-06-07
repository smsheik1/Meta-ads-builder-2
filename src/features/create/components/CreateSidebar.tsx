import React, { useEffect, useState } from 'react';
import {
  AudioLines,
  Captions,
  CheckCircle2,
  ClipboardList,
  Database,
  Image as ImageIcon,
  Layers,
  Loader2,
  Moon,
  MousePointerClick,
  Sun,
  Type,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { DevTuningPanel } from '../../../components/DevTuningPanel';
import { PropertiesPanel } from '../../../components/PropertiesPanel';
import type { IntroDuration } from '../createSavedDesigns';

type RenderDurationCap = 30 | 60 | 'full';
type CreateTab = 'single' | 'batch';
type PlatformTheme = 'light' | 'dark';
type BgMedia = { url: string; type: string } | null;

const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const shortHex = withHash.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHex) {
    return `#${shortHex[1].split('').map((char) => `${char}${char}`).join('')}`.toUpperCase();
  }
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
};

const HexColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const normalizedValue = normalizeHexColor(value) || '#000000';
  const commit = (nextDraft: string) => {
    const normalized = normalizeHexColor(nextDraft);
    if (normalized) {
      onChange(normalized);
      setDraft(normalized);
    } else {
      setDraft(value);
    }
  };

  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="flex items-center gap-2">
        <span className="relative h-7 w-7 overflow-hidden rounded border border-slate-200 shadow-inner" style={{ backgroundColor: normalizedValue }}>
          <input
            type="color"
            value={normalizedValue}
            onChange={(event) => {
              onChange(event.target.value.toUpperCase());
              setDraft(event.target.value.toUpperCase());
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} color picker`}
          />
        </span>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          spellCheck={false}
          className="h-8 w-[92px] rounded-md border border-slate-200 bg-white px-2 text-right font-mono text-xs uppercase text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
          aria-label={`${label} hex color`}
          placeholder="#00FFCC"
        />
      </span>
    </label>
  );
};

type CreateSidebarProps = {
  activeTab: CreateTab;
  renderAudioPanel: () => React.ReactNode;
  headlineCount: number;
  subheadlineCount: number;
  visualizerCount: number;
  captionCount: number;
  ctaCount: number;
  logoCount: number;
  visualizerColor: string;
  accentColor: string;
  bgColor: string;
  bgMedia: BgMedia;
  bgShadow: boolean;
  bgShadowOpacity: number;
  introImage: string | null;
  introFileName: string;
  introDuration: IntroDuration;
  renderDurationCap: RenderDurationCap;
  selectedTimelineDuration: number;
  introTimelineWidth: string;
  mainTimelineSeconds: number;
  platformTheme: PlatformTheme;
  showSafeZones: boolean;
  showRedGuides: boolean;
  brandName: string;
  brandLogo: string | null;
  autoCta: string;
  ctaUrl: string;
  simulatedCaption: string;
  csvData: any[];
  batchStatus: 'idle' | 'processing' | 'done';
  renderProgress: number;
  onAddHeadline: () => void;
  onAddSubheadline: () => void;
  onAddVisualizer: () => void;
  onAddCaptions: () => void;
  onAddCta: () => void;
  onAddLogo: () => void;
  onAddImageElement: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVisualizerColorChange: (value: string) => void;
  onAccentColorChange: (value: string) => void;
  onBgColorChange: (value: string) => void;
  onBackgroundUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearBackground: () => void;
  onBgShadowChange: (value: boolean) => void;
  onBgShadowOpacityChange: (value: number) => void;
  onIntroImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearIntroImage: () => void;
  onIntroDurationChange: (duration: IntroDuration) => void;
  onOpenIntroCrop: () => void;
  onRenderDurationCapChange: (duration: RenderDurationCap) => void;
  onPlatformThemeChange: (theme: PlatformTheme) => void;
  onShowSafeZonesChange: (value: boolean) => void;
  onShowRedGuidesChange: (value: boolean) => void;
  onBrandNameChange: (value: string) => void;
  onBrandLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearBrandLogo: () => void;
  onAutoCtaChange: (value: string) => void;
  onCtaUrlChange: (value: string) => void;
  onSimulatedCaptionChange: (value: string) => void;
  onCsvUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRunBatch: () => void;
  onOpenCreativeBrief: () => void;
  onReplayGuidedJourney: () => void;
};

export const CreateSidebar = ({
  activeTab,
  renderAudioPanel,
  headlineCount,
  subheadlineCount,
  visualizerCount,
  captionCount,
  ctaCount,
  logoCount,
  visualizerColor,
  accentColor,
  bgColor,
  bgMedia,
  bgShadow,
  bgShadowOpacity,
  introImage,
  introFileName,
  introDuration,
  renderDurationCap,
  selectedTimelineDuration,
  introTimelineWidth,
  mainTimelineSeconds,
  platformTheme,
  showSafeZones,
  showRedGuides,
  brandName,
  brandLogo,
  autoCta,
  ctaUrl,
  simulatedCaption,
  csvData,
  batchStatus,
  renderProgress,
  onAddHeadline,
  onAddSubheadline,
  onAddVisualizer,
  onAddCaptions,
  onAddCta,
  onAddLogo,
  onAddImageElement,
  onVisualizerColorChange,
  onAccentColorChange,
  onBgColorChange,
  onBackgroundUpload,
  onClearBackground,
  onBgShadowChange,
  onBgShadowOpacityChange,
  onIntroImageUpload,
  onClearIntroImage,
  onIntroDurationChange,
  onOpenIntroCrop,
  onRenderDurationCapChange,
  onPlatformThemeChange,
  onShowSafeZonesChange,
  onShowRedGuidesChange,
  onBrandNameChange,
  onBrandLogoUpload,
  onClearBrandLogo,
  onAutoCtaChange,
  onCtaUrlChange,
  onSimulatedCaptionChange,
  onCsvUpload,
  onRunBatch,
  onOpenCreativeBrief,
  onReplayGuidedJourney,
}: CreateSidebarProps) => (
  <div className="wiggly-sidebar hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto overflow-x-hidden lg:flex">
    {activeTab === 'single' ? (
      <>
        <div className="wiggly-panel p-4">
          {renderAudioPanel()}
        </div>

        <PropertiesPanel />

        <details className="wiggly-panel group p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <span className="wiggly-panel-title block uppercase">Edit Parts</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">Add logos, images, captions, and buttons.</span>
            </span>
            <span className="text-lg font-black text-slate-400 transition group-open:rotate-90">›</span>
          </summary>
          <div className="mt-4 space-y-2">
            {[
              { label: 'Headline', description: headlineCount > 0 ? 'Add another big line' : 'Main ad message', icon: Type, action: onAddHeadline, added: false, count: headlineCount },
              { label: 'Sub-headline', description: subheadlineCount > 0 ? 'Add another small line' : 'Extra line under the headline', icon: Type, action: onAddSubheadline, added: false, count: subheadlineCount },
              { label: 'Moving Bars', description: visualizerCount > 0 ? 'Add another audio bar' : 'Bars that move with the voice', icon: AudioLines, action: onAddVisualizer, added: false, count: visualizerCount },
              { label: 'Captions', description: captionCount > 0 ? 'Add another caption box' : 'Words shown as the audio plays', icon: Captions, action: onAddCaptions, added: false, count: captionCount },
              { label: 'Button', description: ctaCount > 0 ? 'Add another button' : 'Call-to-action button', icon: MousePointerClick, action: onAddCta, added: false, count: ctaCount },
              { label: 'Logo', description: logoCount > 0 ? 'Add another logo' : 'Brand logo', icon: ImageIcon, action: onAddLogo, added: false, count: logoCount },
            ].map((component) => {
              const Icon = component.icon;
              const componentCount = 'count' in component ? component.count : 0;
              return (
                <button
                  key={component.label}
                  type="button"
                  onClick={component.action}
                  disabled={component.added}
                  className="wiggly-item-row flex w-full items-center justify-between gap-3 px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="wiggly-icon-tile">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">{component.label}</span>
                      <span className="block text-xs text-slate-500">{component.description}</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{component.added ? 'Added' : componentCount > 0 ? `${componentCount} added` : 'Add'}</span>
                </button>
              );
            })}
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  onAddImageElement(event);
                  if (event.target) event.target.value = '';
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="Add image"
              />
              <div className="wiggly-item-row flex w-full items-center justify-between gap-3 border-dashed px-3 py-3 text-left">
                <span className="flex items-center gap-3">
                  <span className="wiggly-icon-tile">
                    <Layers className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">Image</span>
                    <span className="block text-xs text-slate-500">Upload product or proof image</span>
                  </span>
                </span>
                <span className="text-xs font-semibold text-slate-400">Upload</span>
              </div>
            </div>
          </div>
        </details>

        <details className="wiggly-panel group p-4">
          <summary className="mb-4 flex cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <span className="wiggly-panel-title block uppercase">Advanced</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">Style, media, labels, and post settings.</span>
            </span>
            <span className="text-lg font-black text-slate-400 transition group-open:rotate-90">›</span>
          </summary>
          <div className="space-y-2">
            {[
              { label: 'Visualizer', value: visualizerColor, onChange: onVisualizerColorChange },
              { label: 'Captions + button', value: accentColor, onChange: onAccentColorChange },
              { label: 'Background', value: bgColor, onChange: onBgColorChange },
            ].map((colorControl) => (
              <HexColorInput
                key={colorControl.label}
                label={colorControl.label}
                value={colorControl.value}
                onChange={colorControl.onChange}
              />
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex min-w-0 gap-2">
              <div className="relative group min-w-0 flex-1">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => {
                    onBackgroundUpload(event);
                    if (event.target) event.target.value = '';
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Upload background"
                />
                <div className="wiggly-item-row flex h-full w-full items-center justify-between border-dashed px-3 py-3 text-sm text-slate-600">
                  <span className="flex items-center gap-3">
                    <span className="wiggly-icon-tile">
                      <Upload className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-semibold text-slate-700">Background image/video</span>
                      <span className="block text-xs text-slate-500">Image or video</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {bgMedia ? 'Loaded' : 'Upload'}
                  </span>
                </div>
              </div>
              {bgMedia && (
                <button
                  onClick={onClearBackground}
                  title="Remove Background"
                  className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {bgMedia && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-semibold text-slate-700">Dark overlay</span>
                    <span className="block text-xs text-slate-500">Darken media behind the ad text</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={bgShadow}
                    onChange={(event) => onBgShadowChange(event.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </label>
                <div className={bgShadow ? 'mt-3 space-y-1.5' : 'mt-3 space-y-1.5 opacity-40'}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600">Intensity</label>
                    <span className="text-xs font-semibold text-slate-500">{Math.round(bgShadowOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.75"
                    step="0.05"
                    value={bgShadowOpacity}
                    disabled={!bgShadow}
                    onChange={(event) => onBgShadowOpacityChange(parseFloat(event.target.value))}
                    className="w-full cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative group flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    onIntroImageUpload(event);
                    if (event.target) event.target.value = '';
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Upload intro image"
                />
                <div className="wiggly-item-row flex h-full w-full min-w-0 items-center justify-between gap-2 border-dashed px-3 py-3 text-sm text-slate-600">
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="wiggly-icon-tile">
                      <ImageIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="block font-semibold text-slate-700">Intro image</span>
                      <span className="block truncate text-xs text-slate-500">{introImage ? introFileName || `Shows first ${introDuration}s` : 'No intro image'}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    {introImage ? 'Loaded' : 'Upload'}
                  </span>
                </div>
              </div>
              {introImage && (
                <button
                  onClick={onClearIntroImage}
                  title="Remove intro image"
                  className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {introImage && (
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">How long to show it</span>
                  <span className="text-xs font-semibold text-slate-400">{introDuration}s then fade</span>
                </div>
                <div className="grid grid-cols-3 rounded-md bg-slate-100 p-1">
                  {([0, 1, 2, 3] as const).map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => onIntroDurationChange(duration)}
                      className={`rounded px-2 py-1.5 text-xs font-bold transition ${
                        introDuration === duration
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {duration}s
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onOpenIntroCrop}
                  className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white hover:text-slate-900"
                >
                  Check feed preview
                </button>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600">Audio in the video</span>
                <span className="text-xs font-semibold text-slate-400">
                  {renderDurationCap === 'full' ? 'Whole recording' : `First ${renderDurationCap}s`}
                </span>
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => onRenderDurationCapChange('full')}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    renderDurationCap === 'full'
                      ? 'border-indigo-200 bg-indigo-50 text-slate-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>
                    <span className="block text-xs font-bold">Use the whole recording</span>
                    <span className="mt-0.5 block text-[11px] font-medium text-slate-500">Best default. No silence gets added.</span>
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wide text-indigo-500">Default</span>
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onRenderDurationCapChange(30)}
                    className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                      renderDurationCap === 30
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Cut to first 30s
                  </button>
                  <button
                    type="button"
                    onClick={() => onRenderDurationCapChange(60)}
                    className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                      renderDurationCap === 60
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Cut to first 60s
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[11px] font-medium leading-snug text-slate-400">
                Shorten only when a platform needs a shorter ad.
              </p>
            </div>

            <div className="wiggly-timeline w-full p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Timing</span>
                <span className="text-xs font-semibold text-slate-500">
                  {renderDurationCap === 'full' ? 'Full voice audio' : `${selectedTimelineDuration}s`}
                </span>
              </div>
              <div className="flex h-8 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                {introImage && (
                  <div
                    className="flex min-w-[46px] items-center justify-center border-r border-white bg-indigo-500 text-[10px] font-bold text-white"
                    style={{ width: introTimelineWidth }}
                    title={`Intro image: ${introDuration}s`}
                  >
                    Intro {introDuration}s
                  </div>
                )}
                <div className="flex flex-1 items-center justify-center bg-slate-900 text-[10px] font-bold text-white">
                  Main ad {mainTimelineSeconds}s
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-400">
                <span>0s</span>
                {introImage ? <span>Fade after {introDuration}s</span> : <span>No intro</span>}
                <span>{renderDurationCap === 'full' ? 'End' : `${selectedTimelineDuration}s`}</span>
              </div>
            </div>
          </div>
        </details>

        <details className="wiggly-panel group p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <span className="wiggly-panel-title block uppercase">Post Settings</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">Preview theme, profile, CTA, and caption.</span>
            </span>
            <span className="text-lg font-black text-slate-400 transition group-open:rotate-90">›</span>
          </summary>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onPlatformThemeChange('dark')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${platformTheme === 'dark' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-950/15' : 'border-slate-200 bg-white/75 text-slate-700 hover:border-indigo-200 hover:bg-white hover:shadow-sm'}`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => onPlatformThemeChange('light')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${platformTheme === 'light' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-950/15' : 'border-slate-200 bg-white/75 text-slate-700 hover:border-indigo-200 hover:bg-white hover:shadow-sm'}`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
            </div>

            <div className="space-y-2">
              {[
                { id: 'safeZonesToggle', label: 'Show safe area', checked: showSafeZones, onChange: onShowSafeZonesChange },
                { id: 'redGuidesToggle', label: 'Show guide labels', checked: showRedGuides, onChange: onShowRedGuidesChange },
              ].map((toggle) => (
                <label key={toggle.id} htmlFor={toggle.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/75 px-3 py-2 shadow-sm">
                  <span className="text-sm font-semibold text-slate-700">{toggle.label}</span>
                  <span className="relative inline-block h-5 w-9">
                    <input
                      type="checkbox"
                      id={toggle.id}
                      checked={toggle.checked}
                      onChange={(event) => toggle.onChange(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-slate-900" />
                    <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                  </span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Account name</span>
                <input
                  type="text"
                  value={brandName}
                  onChange={(event) => onBrandNameChange(event.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                />
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1 group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onBrandLogoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full px-3 py-3 border border-slate-200 border-dashed rounded-lg bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-between pointer-events-none">
                    <span>
                      <span className="block text-sm font-semibold text-slate-700">Profile picture or logo</span>
                      <span className="block text-xs text-slate-500">Shows next to the ad</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {brandLogo ? 'Uploaded' : 'Upload'}
                    </span>
                  </div>
                </div>
                {brandLogo && (
                  <button
                    onClick={onClearBrandLogo}
                    title="Remove Logo"
                    className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Ad button text</label>
              <select
                value={autoCta}
                onChange={(event) => onAutoCtaChange(event.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              >
                <option value="Learn More">Learn More</option>
                <option value="Get Quote">Get Quote</option>
                <option value="Book Now">Book Now</option>
                <option value="Shop Now">Shop Now</option>
                <option value="Sign Up">Sign Up</option>
              </select>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Ad button link</span>
              <input
                type="url"
                value={ctaUrl}
                onChange={(event) => onCtaUrlChange(event.target.value)}
                placeholder="https://example.com/book"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
              />
              <span className="block text-[11px] font-semibold text-slate-400">Used on Wiggly share pages. The MP4 itself is still just a video.</span>
            </label>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                Post caption
              </label>
              <textarea
                value={simulatedCaption}
                onChange={(event) => onSimulatedCaptionChange(event.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 resize-none"
              />
              <div className="flex justify-end text-[10px] text-slate-400 font-medium">
                {simulatedCaption.length > 125 ? <span className="flex items-center gap-1 text-orange-500">This may get shortened in the feed</span> : `${125 - simulatedCaption.length} characters before it may shorten`}
              </div>
            </div>
          </div>
        </details>

        <details className="wiggly-panel group p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <span className="wiggly-panel-title block uppercase">Visualizer Tuning</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">Fine-tune how the bars move.</span>
            </span>
            <span className="text-lg font-black text-slate-400 transition group-open:rotate-90">›</span>
          </summary>
          <div className="mt-4">
            <DevTuningPanel />
          </div>
        </details>
      </>
    ) : (
      <div className="bg-indigo-900 rounded-xl border border-indigo-800 shadow-sm p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Make Many Ads</h2>
          <Database className="w-4 h-4 text-indigo-400" />
        </div>

        <p className="text-[11px] leading-relaxed text-indigo-200 mb-4">
          Upload a spreadsheet with a <strong>headline</strong> and <strong>audio link</strong> for each ad.
        </p>

        <div className="relative group mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={onCsvUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-indigo-500/50 hover:bg-indigo-800/50 rounded-lg p-4 bg-indigo-950/20 transition-colors">
            <Upload className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-200">
              Upload spreadsheet
            </span>
          </div>
        </div>

        {csvData.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] leading-relaxed text-indigo-200 mb-2">
              Ads to make: <span className="text-white font-semibold">{csvData.length}</span>
            </p>
            <div className="bg-indigo-950/50 rounded-lg border border-indigo-800 max-h-32 overflow-y-auto">
              <table className="w-full text-left text-[10px]">
                <thead className="sticky top-0 bg-indigo-900">
                  <tr>
                    <th className="px-2 py-1.5 font-medium text-indigo-300">#</th>
                    <th className="px-2 py-1.5 font-medium text-indigo-300">Headline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-800/50">
                  {csvData.map((row, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 text-indigo-400">{i + 1}</td>
                      <td className="px-2 py-1.5 text-indigo-200 truncate max-w-[120px]">{row.headline || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={onRunBatch}
          disabled={batchStatus === 'processing' || csvData.length === 0}
          className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold shadow-lg transition-colors flex justify-center items-center gap-2"
        >
          {batchStatus === 'processing' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Making videos {Math.round(renderProgress)}%</>
          ) : batchStatus === 'done' ? (
            <><CheckCircle2 className="w-4 h-4" /> Videos ready</>
          ) : (
            'Make videos'
          )}
        </button>
      </div>
    )}
    {activeTab === 'single' && (
      <div className="wiggly-panel p-3">
        <button
          type="button"
          onClick={onOpenCreativeBrief}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <ClipboardList className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-800">Ad details</span>
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
            Change
          </span>
        </button>
      </div>
    )}
    <div className="flex justify-end px-2 pb-2">
      <button
        type="button"
        onClick={onReplayGuidedJourney}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
        title="Replay guided journey"
        aria-label="Replay guided journey"
      >
        <Wand2 className="h-4 w-4" />
      </button>
    </div>
  </div>
);
