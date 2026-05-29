import React from 'react';
import { AlignCenter, AlignLeft, AlignRight, RotateCcw } from 'lucide-react';
import { useEditorStore, type AdElement } from '../store';

const inputClass = 'h-9 w-full rounded-xl border border-slate-200 bg-white/85 px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10';
const labelClass = 'text-[11px] font-black uppercase tracking-[0.12em] text-slate-500';

const getSelectedItemName = (element: AdElement) => {
  if (element.componentRole === 'cta') return 'button';
  if (element.componentRole === 'captions') return 'captions';
  if (element.componentRole) return element.componentRole.replace('-', ' ');
  if (element.type === 'visualizer') return 'moving bars';
  return element.type;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-slate-100/80 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white/75 px-3 py-2.5 text-left shadow-sm transition hover:border-indigo-200 hover:bg-white"
    >
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-slate-950' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? 'left-4' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function ColorControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const normalizeHexColor = (nextValue: string) => {
    const trimmed = nextValue.trim();
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    const shortHex = withHash.match(/^#([0-9a-fA-F]{3})$/);
    if (shortHex) {
      return `#${shortHex[1].split('').map((char) => `${char}${char}`).join('')}`.toUpperCase();
    }
    return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
  };

  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const normalizedValue = normalizeHexColor(value) || '#000000';
  const commit = () => {
    const normalized = normalizeHexColor(draft);
    if (normalized) {
      onChange(normalized);
      setDraft(normalized);
      return;
    }
    setDraft(value);
  };

  return (
    <div className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-2 shadow-sm">
      <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded border border-slate-200 shadow-inner" style={{ backgroundColor: normalizedValue }}>
        <input
          type="color"
          value={normalizedValue}
          onChange={(e) => {
            const nextValue = e.target.value.toUpperCase();
            onChange(nextValue);
            setDraft(nextValue);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent font-mono text-xs font-semibold uppercase text-slate-600 outline-none"
        placeholder="#00FFCC"
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onReset?: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white/75 px-3 py-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          {onReset && (
            <button type="button" onClick={onReset} className="text-slate-400 transition hover:text-slate-700" title={`Reset ${label}`}>
              <RotateCcw size={12} />
            </button>
          )}
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer accent-slate-950"
      />
    </div>
  );
}

function PresetRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white/75 px-3 py-2.5 shadow-sm">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="grid grid-cols-3 gap-1 rounded-full bg-slate-100/90 p-1 shadow-inner">
        {options.map(option => (
          <button
            key={`${option.value}`}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-8 rounded text-xs font-bold transition ${
              value === option.value
                ? 'rounded-full bg-slate-950 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const nearestPresetValue = (value: number | undefined, options: ReadonlyArray<{ value: number }>, fallback: number) => {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return options.reduce((nearest, option) => (
    Math.abs(option.value - value) < Math.abs(nearest - value) ? option.value : nearest
  ), fallback);
};

const MOTION_PRESETS = [
  { label: 'Snappy', value: 0.35 },
  { label: 'Balanced', value: 0.65 },
  { label: 'Smooth', value: 0.85 },
] as const;

const HEIGHT_PRESETS = [
  { label: 'Small', value: 0.55 },
  { label: 'Medium', value: 0.75 },
  { label: 'Big', value: 0.9 },
] as const;

const BASELINE_PRESETS = [
  { label: 'Flat', value: 4 },
  { label: 'Subtle', value: 8 },
  { label: 'Visible', value: 14 },
] as const;

const BAR_DETAIL_PRESETS = [
  { label: 'Simple', value: 12 },
  { label: 'Normal', value: 16 },
  { label: 'Dense', value: 24 },
] as const;

const WAVEFORM_DETAIL_PRESETS = [
  { label: 'Simple', value: 48 },
  { label: 'Normal', value: 72 },
  { label: 'Dense', value: 96 },
] as const;

const barLikeVisualizerTypes = new Set(['bars-bottom', 'bars-center', 'waveform-strip']);

function LayoutFields({ selectedEl, updateElement }: { selectedEl: AdElement; updateElement: (id: string, updates: Partial<AdElement>) => void }) {
  return (
    <Section title="Layout">
      <div className="grid grid-cols-2 gap-3">
        <Field label="X">
          <input type="number" value={Math.round(selectedEl.x)} onChange={(e) => updateElement(selectedEl.id, { x: parseInt(e.target.value) || 0 })} className={inputClass} />
        </Field>
        <Field label="Y">
          <input type="number" value={Math.round(selectedEl.y)} onChange={(e) => updateElement(selectedEl.id, { y: parseInt(e.target.value) || 0 })} className={inputClass} />
        </Field>
        <Field label="Width">
          <input type="number" value={parseInt(selectedEl.width as string)} onChange={(e) => updateElement(selectedEl.id, { width: parseInt(e.target.value) || 0 })} className={inputClass} />
        </Field>
        <Field label="Height">
          <input type="number" value={parseInt(selectedEl.height as string)} onChange={(e) => updateElement(selectedEl.id, { height: parseInt(e.target.value) || 0 })} className={inputClass} />
        </Field>
      </div>
    </Section>
  );
}

export const PropertiesPanel: React.FC = () => {
  const { selectedIds, elements, updateElement } = useEditorStore();
  const selectedEl = selectedIds.length === 1 ? elements.find(el => el.id === selectedIds[0]) : null;

  if (selectedIds.length > 1) {
    return (
      <div className="wiggly-panel flex h-[220px] flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="text-sm font-bold text-slate-700">Multiple elements selected</span>
        <span className="text-xs leading-relaxed text-slate-500">Move or resize them together. Select one item to change its text, color, or size.</span>
      </div>
    );
  }

  if (!selectedEl) return null;
  const visualizerType = selectedEl.visualizerType || 'bars-center';
  const showBarControls = selectedEl.type === 'visualizer' && barLikeVisualizerTypes.has(visualizerType);
  const detailPresets = visualizerType === 'waveform-strip' ? WAVEFORM_DETAIL_PRESETS : BAR_DETAIL_PRESETS;
  const detailFallback = visualizerType === 'waveform-strip' ? 72 : 16;

  return (
    <div className="wiggly-panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="wiggly-panel-title uppercase">Edit Selected</h2>
        <span className="rounded-full bg-[#d9fff6] px-2 py-1 text-[11px] font-black capitalize text-slate-900">{getSelectedItemName(selectedEl)}</span>
      </div>

      <div className="space-y-4">
        <LayoutFields selectedEl={selectedEl} updateElement={updateElement} />

        {selectedEl.type === 'text' && (
          <Section title="Text">
            <Field label="Content">
              <textarea
                value={selectedEl.content || ''}
                onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                rows={3}
                className={`${inputClass} h-auto min-h-[74px] resize-none py-2`}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Text size">
                <input type="number" value={selectedEl.fontSize || 16} onChange={(e) => updateElement(selectedEl.id, { fontSize: parseInt(e.target.value) || 16 })} className={inputClass} />
              </Field>
              <Field label="Thickness">
                <select value={selectedEl.fontWeight || 'normal'} onChange={(e) => updateElement(selectedEl.id, { fontWeight: e.target.value })} className={inputClass}>
                  <option value="normal">Normal</option>
                  <option value="500">Medium</option>
                  <option value="600">Semibold</option>
                  <option value="bold">Bold</option>
                  <option value="800">Extra bold</option>
                  <option value="900">Black</option>
                </select>
              </Field>
            </div>

            {(selectedEl.componentRole === 'headline' || selectedEl.componentRole === 'subheadline') && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'B', active: Number.parseInt(String(selectedEl.fontWeight || '400'), 10) >= 700, action: () => updateElement(selectedEl.id, { fontWeight: Number.parseInt(String(selectedEl.fontWeight || '400'), 10) >= 700 ? '500' : '900' }), className: 'font-black' },
                  { label: 'I', active: selectedEl.fontStyle === 'italic', action: () => updateElement(selectedEl.id, { fontStyle: selectedEl.fontStyle === 'italic' ? 'normal' : 'italic' }), className: 'italic' },
                  { label: 'U', active: selectedEl.textDecoration === 'underline', action: () => updateElement(selectedEl.id, { textDecoration: selectedEl.textDecoration === 'underline' ? 'none' : 'underline' }), className: 'underline' },
                ].map(control => (
                  <button
                    key={control.label}
                    type="button"
                    onClick={control.action}
                    className={`h-9 rounded-lg border text-sm transition ${control.className} ${control.active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    {control.label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Text position">
                <div className="grid h-9 grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  {[
                    { value: 'left', icon: AlignLeft },
                    { value: 'center', icon: AlignCenter },
                    { value: 'right', icon: AlignRight },
                  ].map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateElement(selectedEl.id, { textAlign: value as any })}
                      className={`flex items-center justify-center transition ${selectedEl.textAlign === value ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Color">
                <ColorControl value={selectedEl.color || '#000000'} onChange={(value) => updateElement(selectedEl.id, { color: value })} />
              </Field>
            </div>
            <Field label="Line spacing">
              <input type="number" step="0.05" value={selectedEl.lineHeight || 1.2} onChange={(e) => updateElement(selectedEl.id, { lineHeight: parseFloat(e.target.value) || 1.2 })} className={inputClass} />
            </Field>
          </Section>
        )}

        {selectedEl.type === 'button' && (
          <Section title="Button">
            <Field label="Text">
              <input type="text" value={selectedEl.content || ''} onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Text color">
                <ColorControl value={selectedEl.color || '#000000'} onChange={(value) => updateElement(selectedEl.id, { color: value })} />
              </Field>
              <Field label="Button color">
                <ColorControl value={selectedEl.backgroundColor || '#4f46e5'} onChange={(value) => updateElement(selectedEl.id, { backgroundColor: value })} />
              </Field>
              <Field label="Round corners">
                <input type="number" value={selectedEl.borderRadius || 0} onChange={(e) => updateElement(selectedEl.id, { borderRadius: parseInt(e.target.value) || 0 })} className={inputClass} />
              </Field>
              <Field label="Text size">
                <input type="number" value={selectedEl.fontSize || 16} onChange={(e) => updateElement(selectedEl.id, { fontSize: parseInt(e.target.value) || 16 })} className={inputClass} />
              </Field>
            </div>
          </Section>
        )}

        {selectedEl.type === 'visualizer' && (
          <Section title="Moving Bars">
            <Field label="Look">
              <select value={visualizerType} onChange={(e) => updateElement(selectedEl.id, { visualizerType: e.target.value as any })} className={inputClass}>
                <option value="bars-bottom">Bars, bottom</option>
                <option value="bars-center">Bars, center</option>
                <option value="waveform-strip">Waveform strip</option>
                <option value="ai-orb">Glowing orb</option>
                <option value="siri-wave">Siri wave</option>
                <option value="ai-blob">3D blob</option>
                <option value="elevenlabs-v1">Blue orb</option>
                <option value="elevenlabs-v2">Peach orb</option>
                <option value="elevenlabs-v3">Silver orb</option>
                <option value="chatgpt-orb">Soft aura</option>
              </select>
            </Field>
            <Field label="Color">
              <ColorControl value={selectedEl.barColor || '#00ffcc'} onChange={(value) => updateElement(selectedEl.id, { barColor: value })} />
            </Field>
            <SliderRow label="Energy" value={selectedEl.visualizerSensitivity ?? 1.5} displayValue={`${(selectedEl.visualizerSensitivity ?? 1.5).toFixed(1)}x`} min={0.1} max={5} step={0.1} onChange={(value) => updateElement(selectedEl.id, { visualizerSensitivity: value })} onReset={() => updateElement(selectedEl.id, { visualizerSensitivity: 1.5 })} />
            <PresetRow
              label="Motion"
              value={nearestPresetValue(selectedEl.visualizerSmoothing, MOTION_PRESETS, 0.85)}
              options={MOTION_PRESETS}
              onChange={(value) => updateElement(selectedEl.id, { visualizerSmoothing: value })}
            />
            <PresetRow
              label="Height"
              value={nearestPresetValue(selectedEl.visualizerHeight, HEIGHT_PRESETS, 0.9)}
              options={HEIGHT_PRESETS}
              onChange={(value) => updateElement(selectedEl.id, { visualizerHeight: value })}
            />
            <PresetRow
              label="Minimum height"
              value={nearestPresetValue(selectedEl.visualizerBaseline, BASELINE_PRESETS, 4)}
              options={BASELINE_PRESETS}
              onChange={(value) => updateElement(selectedEl.id, { visualizerBaseline: value })}
            />
            {showBarControls && (
              <>
                <PresetRow
                  label="Number of bars"
                  value={nearestPresetValue(selectedEl.barCount, detailPresets, detailFallback)}
                  options={detailPresets}
                  onChange={(value) => updateElement(selectedEl.id, { barCount: value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <ToggleRow label="Mirror sides" checked={selectedEl.visualizerMirror || false} onChange={(checked) => updateElement(selectedEl.id, { visualizerMirror: checked })} />
                  <ToggleRow label="Two speakers" checked={selectedEl.visualizerSplitSpeakers || false} onChange={(checked) => updateElement(selectedEl.id, { visualizerSplitSpeakers: checked })} />
                </div>
              </>
            )}
          </Section>
        )}

        {selectedEl.type === 'caption' && (
          <Section title="Captions">
            <Field label="Color">
              <ColorControl value={selectedEl.color || '#4f46e5'} onChange={(value) => updateElement(selectedEl.id, { color: value })} />
            </Field>
          </Section>
        )}

        {selectedEl.type === 'image' && (
          <Section title="Image">
            <ToggleRow
              label="Shadow overlay"
              checked={selectedEl.imageShadow || false}
              onChange={(checked) => updateElement(selectedEl.id, { imageShadow: checked, imageShadowOpacity: selectedEl.imageShadowOpacity ?? 0.42 })}
            />
            <SliderRow
              label="Shadow"
              value={selectedEl.imageShadowOpacity ?? 0.42}
              displayValue={`${Math.round((selectedEl.imageShadowOpacity ?? 0.42) * 100)}%`}
              min={0.1}
              max={0.75}
              step={0.05}
              onChange={(value) => updateElement(selectedEl.id, { imageShadowOpacity: value })}
            />
            <Field label="Round corners">
              <input type="number" value={selectedEl.borderRadius || 0} onChange={(e) => updateElement(selectedEl.id, { borderRadius: parseInt(e.target.value) || 0 })} className={inputClass} />
            </Field>
          </Section>
        )}
      </div>
    </div>
  );
};
