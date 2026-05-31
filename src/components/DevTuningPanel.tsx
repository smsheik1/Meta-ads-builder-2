import React from 'react';
import { Clipboard, RotateCcw } from 'lucide-react';
import { useEditorStore, type AdElement } from '../store';
import { VOICE_VISUALIZER_PRESET } from '../lib/visualizer-presets';

const isDevTuningEnabled = () => {
  return true;
};

const fieldClass = 'h-9 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10';

const DEFAULT_TUNING = {
  ...VOICE_VISUALIZER_PRESET,
  visualizerGain: VOICE_VISUALIZER_PRESET.visualizerGain ?? 1.7,
  visualizerCompression: VOICE_VISUALIZER_PRESET.visualizerCompression ?? 3,
  visualizerFloor: VOICE_VISUALIZER_PRESET.visualizerFloor ?? 0.08,
  visualizerCeiling: VOICE_VISUALIZER_PRESET.visualizerCeiling ?? 0.86,
  visualizerAttack: VOICE_VISUALIZER_PRESET.visualizerAttack ?? 0.45,
  visualizerRelease: VOICE_VISUALIZER_PRESET.visualizerRelease ?? 0.1,
  visualizerSmoothing: VOICE_VISUALIZER_PRESET.visualizerSmoothing ?? 0.78,
  visualizerCurve: VOICE_VISUALIZER_PRESET.visualizerCurve ?? 'sqrt',
  visualizerBandFocus: VOICE_VISUALIZER_PRESET.visualizerBandFocus ?? 'voice',
};

function getSelectedVisualizer(elements: AdElement[], selectedIds: string[]) {
  const selected = selectedIds.length === 1 ? elements.find((element) => element.id === selectedIds[0]) : null;
  if (selected?.type === 'visualizer') return selected;
  return elements.find((element) => element.type === 'visualizer') || null;
}

function DevSlider({
  label,
  tooltip,
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
}: {
  label: string;
  tooltip?: readonly [string, string, string];
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 shadow-sm">
      <span className="mb-2 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
            {label}
            {tooltip ? (
              <span className="wiggly-tuning-tooltip-trigger relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
                ?
                <span className="wiggly-tuning-tooltip pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-[174px] -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2 text-left font-sans text-[10px] font-bold leading-relaxed text-white opacity-0 shadow-xl">
                  <span className="block">{tooltip[0]}</span>
                  <span className="block text-slate-300">{tooltip[1]}</span>
                  <span className="block text-slate-300">{tooltip[2]}</span>
                  <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-slate-950" />
                </span>
              </span>
            ) : null}
          </span>
        </span>
        <span className="font-mono text-xs font-black text-slate-500">{value.toFixed(step < 0.05 ? 2 : 1)}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-slate-950"
      />
    </label>
  );
}

function DevSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/70 bg-white/45 p-3">
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function DevTuningPanel() {
  const [enabled] = React.useState(isDevTuningEnabled);
  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'failed'>('idle');
  const { elements, selectedIds, updateElement } = useEditorStore();
  const visualizer = getSelectedVisualizer(elements, selectedIds);

  if (!enabled || !visualizer) return null;

  const update = (updates: Partial<AdElement>) => updateElement(visualizer.id, updates);
  const config = {
    gain: visualizer.visualizerGain ?? DEFAULT_TUNING.visualizerGain,
    compression: visualizer.visualizerCompression ?? DEFAULT_TUNING.visualizerCompression,
    floor: visualizer.visualizerFloor ?? DEFAULT_TUNING.visualizerFloor,
    ceiling: visualizer.visualizerCeiling ?? DEFAULT_TUNING.visualizerCeiling,
    attack: visualizer.visualizerAttack ?? DEFAULT_TUNING.visualizerAttack,
    release: visualizer.visualizerRelease ?? DEFAULT_TUNING.visualizerRelease,
    smoothing: visualizer.visualizerSmoothing ?? DEFAULT_TUNING.visualizerSmoothing,
    curve: visualizer.visualizerCurve ?? DEFAULT_TUNING.visualizerCurve,
    bandFocus: visualizer.visualizerBandFocus ?? DEFAULT_TUNING.visualizerBandFocus,
  };

  const copyConfig = async () => {
    const json = JSON.stringify(config, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1400);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 1800);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/35 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="wiggly-panel-title uppercase text-indigo-950">Dev Visualizer Tuning</h2>
        </div>
        <button
          type="button"
          onClick={() => update(DEFAULT_TUNING)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-950"
          title="Reset tuning"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <div className="space-y-3">
        <DevSection title="Tune these">
          <DevSlider
            label="Attack"
            tooltip={[
              'ATTACK — how fast bars rise on sound',
              '← calmer, slower reactions',
              '→ snappier, instant pop',
            ]}
            value={config.attack}
            min={0.05}
            max={1}
            step={0.01}
            onChange={(value) => update({ visualizerAttack: value })}
          />
          <DevSlider
            label="Smoothing"
            tooltip={[
              'SMOOTHING — how much bars glide',
              '← jittery, twitchy',
              '→ liquid, cinematic',
            ]}
            value={config.smoothing}
            min={0.05}
            max={0.95}
            step={0.01}
            onChange={(value) => update({ visualizerSmoothing: value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <DevSlider
              label="Ceiling"
              tooltip={[
                'CEILING — max bar height',
                '← caps loud peaks',
                '→ lets peaks hit full',
              ]}
              value={config.ceiling}
              min={0.35}
              max={1}
              step={0.01}
              onChange={(value) => update({ visualizerCeiling: value })}
            />
            <DevSlider
              label="Floor"
              tooltip={[
                'FLOOR — min bar height in silence',
                '← bars can flatten',
                '→ bars stay alive',
              ]}
              value={config.floor}
              min={0}
              max={0.4}
              step={0.01}
              onChange={(value) => update({ visualizerFloor: value })}
            />
          </div>
          <DevSlider
            label="Gain"
            tooltip={[
              'GAIN — input volume',
              '← quieter, less motion',
              '→ louder, more motion',
            ]}
            value={config.gain}
            min={0.25}
            max={4}
            step={0.05}
            suffix="x"
            onChange={(value) => update({ visualizerGain: value })}
          />
        </DevSection>

        <DevSection title="Touch carefully">
          <DevSlider label="Compression" value={config.compression} min={1} max={8} step={0.1} suffix=":1" onChange={(value) => update({ visualizerCompression: value })} />
          <DevSlider label="Release" value={config.release} min={0.02} max={1} step={0.01} onChange={(value) => update({ visualizerRelease: value })} />

          <label className="block space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Curve</span>
            <select value={config.curve} onChange={(event) => update({ visualizerCurve: event.target.value as AdElement['visualizerCurve'] })} className={fieldClass}>
              <option value="default">Default</option>
              <option value="linear">Linear</option>
              <option value="sqrt">Sqrt voice lift</option>
              <option value="log">Log loudness</option>
            </select>
          </label>
        </DevSection>

        <DevSection title="Protected reading layer">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Band focus</span>
            <select value={config.bandFocus} onChange={(event) => update({ visualizerBandFocus: event.target.value as AdElement['visualizerBandFocus'] })} className={fieldClass}>
              <option value="full">Full range</option>
              <option value="voice">Voice 200Hz-4kHz-ish</option>
              <option value="low">Low punch</option>
              <option value="high">High sparkle</option>
            </select>
          </label>
        </DevSection>

        <button
          type="button"
          onClick={copyConfig}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
        >
          <Clipboard size={15} />
          {copyState === 'copied' ? 'Copied config' : copyState === 'failed' ? 'Copy failed' : 'Copy config'}
        </button>
      </div>
    </div>
  );
}
