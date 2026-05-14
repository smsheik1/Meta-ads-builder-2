import React from 'react';
import { AlignCenter, AlignLeft, AlignRight, RotateCcw } from 'lucide-react';
import { useEditorStore, type AdElement } from '../store';

const inputClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10';
const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';

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
    <div className="space-y-3 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:bg-white"
    >
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-indigo-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? 'left-4' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function ColorControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 shadow-sm">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-500">{value}</span>
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
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
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
        className="w-full cursor-pointer accent-indigo-500"
      />
    </div>
  );
}

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
      <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
        <span className="text-sm font-bold text-slate-700">Multiple elements selected</span>
        <span className="text-xs leading-relaxed text-slate-500">Move or resize them together. Select one element to edit its properties.</span>
      </div>
    );
  }

  if (!selectedEl) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Properties</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-500">{selectedEl.componentRole || selectedEl.type}</span>
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
              <Field label="Font size">
                <input type="number" value={selectedEl.fontSize || 16} onChange={(e) => updateElement(selectedEl.id, { fontSize: parseInt(e.target.value) || 16 })} className={inputClass} />
              </Field>
              <Field label="Weight">
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
              <Field label="Align">
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
            <Field label="Line height">
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
              <Field label="Fill">
                <ColorControl value={selectedEl.backgroundColor || '#4f46e5'} onChange={(value) => updateElement(selectedEl.id, { backgroundColor: value })} />
              </Field>
              <Field label="Radius">
                <input type="number" value={selectedEl.borderRadius || 0} onChange={(e) => updateElement(selectedEl.id, { borderRadius: parseInt(e.target.value) || 0 })} className={inputClass} />
              </Field>
              <Field label="Font size">
                <input type="number" value={selectedEl.fontSize || 16} onChange={(e) => updateElement(selectedEl.id, { fontSize: parseInt(e.target.value) || 16 })} className={inputClass} />
              </Field>
            </div>
          </Section>
        )}

        {selectedEl.type === 'visualizer' && (
          <Section title="Visualizer">
            <Field label="Style">
              <select value={selectedEl.visualizerType || 'bars-bottom'} onChange={(e) => updateElement(selectedEl.id, { visualizerType: e.target.value as any })} className={inputClass}>
                <option value="bars-bottom">Bars, bottom</option>
                <option value="bars-center">Bars, center</option>
                <option value="ai-orb">AI orb</option>
                <option value="siri-wave">Siri wave</option>
                <option value="ai-blob">3D blob</option>
                <option value="elevenlabs-v1">11Labs orb, blue</option>
                <option value="elevenlabs-v2">11Labs orb, peach</option>
                <option value="elevenlabs-v3">11Labs orb, silver</option>
                <option value="chatgpt-orb">ChatGPT aura</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <ToggleRow label="Mirror" checked={selectedEl.visualizerMirror || false} onChange={(checked) => updateElement(selectedEl.id, { visualizerMirror: checked })} />
              <ToggleRow label="Split speaker" checked={selectedEl.visualizerSplitSpeakers || false} onChange={(checked) => updateElement(selectedEl.id, { visualizerSplitSpeakers: checked })} />
            </div>
            <Field label="Color">
              <ColorControl value={selectedEl.barColor || '#00ffcc'} onChange={(value) => updateElement(selectedEl.id, { barColor: value })} />
            </Field>
            <SliderRow label="Bar count" value={selectedEl.barCount || 8} displayValue={`${selectedEl.barCount || 8}`} min={3} max={32} step={1} onChange={(value) => updateElement(selectedEl.id, { barCount: value })} />
            <SliderRow label="Sensitivity" value={selectedEl.visualizerSensitivity ?? 1} displayValue={`${(selectedEl.visualizerSensitivity ?? 1).toFixed(1)}x`} min={0.1} max={5} step={0.1} onChange={(value) => updateElement(selectedEl.id, { visualizerSensitivity: value })} onReset={() => updateElement(selectedEl.id, { visualizerSensitivity: 1 })} />
            <SliderRow label="Smoothing" value={selectedEl.visualizerSmoothing ?? 0.8} displayValue={`${selectedEl.visualizerSmoothing ?? 0.8}`} min={0.05} max={0.95} step={0.05} onChange={(value) => updateElement(selectedEl.id, { visualizerSmoothing: value })} onReset={() => updateElement(selectedEl.id, { visualizerSmoothing: 0.8 })} />
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
            <Field label="Radius">
              <input type="number" value={selectedEl.borderRadius || 0} onChange={(e) => updateElement(selectedEl.id, { borderRadius: parseInt(e.target.value) || 0 })} className={inputClass} />
            </Field>
          </Section>
        )}
      </div>
    </div>
  );
};
