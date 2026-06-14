import { AudioLines, Captions, Grid2X2, Palette, Type } from "lucide-react";
import type { PreviewPlatform } from "./CreatePreviewChrome";
import type { AdScene, AdSceneVisualizerStyle, VisualizerAdSceneStyle } from "@/features/scene/types";
import { visualizerSceneVariants } from "@/features/scene/visualizerVariants";
import { visualizerEditorSchema } from "@/features/formats/visualizer/schema";

export type CreatePanelId = "text" | "style" | "format";

const panelOptions: Array<{ id: CreatePanelId; label: string; Icon: typeof Type }> = [
  { id: "text", label: "Text", Icon: Type },
  { id: "style", label: "Style", Icon: Palette },
  { id: "format", label: "Format", Icon: Grid2X2 },
];

const curatedColors = ["#070B1D", "#25D8C4", "#82DFFF", "#F9A8D4", "#F97316", "#8B5CF6", "#22C55E", "#FBFAF5"];

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

const normalizeHex = (value: string) => value.toUpperCase();
const hexColorPattern = /^#[0-9A-F]{6}$/i;

const uniqueColors = (colors: string[]) => [...new Set(colors.filter((color) => hexColorPattern.test(color)).map(normalizeHex))];

export function CreateControlPanel({
  activePanel,
  audioStatus,
  hasGeneratedAudio,
  hasSelectedScene,
  onOpenAudioPanel,
  onOpenCaptionEditor,
  onPanelChange,
  onPreviewPlatformChange,
  onUpdateCreativeField,
  onUpdateStyleColor,
  onUpdateVisualizerPreset,
  previewPlatform,
  selectedScene,
}: {
  activePanel: CreatePanelId | null;
  audioStatus: "idle" | "loading" | "ready" | "error";
  hasGeneratedAudio: boolean;
  hasSelectedScene: boolean;
  onOpenAudioPanel: () => void;
  onOpenCaptionEditor: () => void;
  onPanelChange: (panel: CreatePanelId | null) => void;
  onPreviewPlatformChange: (platform: PreviewPlatform) => void;
  onUpdateCreativeField: (field: "headline" | "subheadline" | "ctaText", value: string) => void;
  onUpdateStyleColor: (field: keyof Pick<VisualizerAdSceneStyle, "backgroundColor" | "textColor" | "accentColor" | "visualizerColor">, value: string) => void;
  onUpdateVisualizerPreset: (visualizer: AdSceneVisualizerStyle) => void;
  previewPlatform: PreviewPlatform;
  selectedScene: AdScene | null;
}) {
  const colorPalette = uniqueColors([
    ...(selectedScene?.brand.colors || []),
    selectedScene?.style.backgroundColor || "",
    selectedScene?.style.textColor || "",
    selectedScene?.style.accentColor || "",
    selectedScene?.style.visualizerColor || "",
    ...curatedColors,
  ]);

  return (
    <section
      className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/8"
      data-create-control-panel="v3"
    >
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1" data-create-format-rail="v3">
        {panelOptions.map(({ id, label, Icon }) => {
          const active = activePanel === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPanelChange(active ? null : id)}
              disabled={!hasSelectedScene}
              className={cx(
                "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-35",
                active ? "bg-slate-950 text-white shadow-md shadow-slate-950/15" : "text-slate-500 hover:bg-white hover:text-slate-950",
              )}
              aria-pressed={active}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </div>

      {!selectedScene ? (
        <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-5 text-sm font-bold leading-6 text-slate-500">
          Generate ads first. Then use Text, Style, or Format to tune a full scene.
        </div>
      ) : !activePanel ? (
        <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-5 text-sm font-bold leading-6 text-slate-500">
          Reroll first, or open a panel when you want to tune this ad.
        </div>
      ) : null}

      {selectedScene && activePanel === "text" ? (
        <div className="mt-4 space-y-3">
          {visualizerEditorSchema.text.map((field) => {
            const value = selectedScene.creative[field.id];
            return (
              <label key={field.id} className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {field.label}
                </span>
                {field.kind === "textarea" ? (
                  <textarea
                    value={value}
                    onChange={(event) => onUpdateCreativeField(field.id, event.target.value)}
                    className="min-h-20 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black leading-5 text-slate-950 outline-none transition focus:border-slate-400"
                  />
                ) : (
                  <input
                    value={value}
                    onChange={(event) => onUpdateCreativeField(field.id, event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 outline-none transition focus:border-slate-400"
                  />
                )}
              </label>
            );
          })}
        </div>
      ) : null}

      {selectedScene && activePanel === "style" ? (
        <div className="mt-4 space-y-4">
          {visualizerEditorSchema.style.map((field) => {
            const value = selectedScene.style[field.id];
            return (
              <div key={field.id}>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {field.label}
                  </span>
                  <input
                    type="color"
                    value={value}
                    onChange={(event) => onUpdateStyleColor(field.id, event.target.value)}
                    className="size-10 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                    aria-label={`${field.label} color`}
                  />
                </label>
                <div className="mt-2 grid grid-cols-8 gap-1.5">
                  {colorPalette.slice(0, 16).map((color) => (
                    <button
                      key={`${field.id}-${color}`}
                      type="button"
                      onClick={() => onUpdateStyleColor(field.id, color)}
                      className={cx(
                        "size-8 rounded-xl border shadow-inner transition hover:scale-105",
                        normalizeHex(value) === color ? "border-slate-950 ring-2 ring-slate-950/15" : "border-slate-200",
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Set ${field.label} to ${color}`}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {selectedScene && activePanel === "format" ? (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              {visualizerEditorSchema.format[0].label}
            </span>
            <select
              value={previewPlatform}
              onChange={(event) => onPreviewPlatformChange(event.target.value as PreviewPlatform)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 outline-none transition focus:border-slate-400"
              aria-label="Choose preview"
            >
              {visualizerEditorSchema.format[0].options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Visualizer style</p>
            <div className="grid grid-cols-2 gap-2">
              {visualizerSceneVariants.map((variant) => {
                const label = visualizerEditorSchema.format[1].options.find((option) => option.value === variant.id)?.label || variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onUpdateVisualizerPreset(variant.visualizer)}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-black leading-4 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start gap-3">
              <AudioLines className="mt-0.5 size-5 shrink-0 text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-950">Audio visualizer input</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  {hasGeneratedAudio ? "Audio is attached. Replace it or edit captions." : "Add audio to animate captions and visualizer bars."}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenAudioPanel}
                disabled={audioStatus === "loading"}
                className="flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-progress disabled:opacity-50"
              >
                {hasGeneratedAudio ? "Replace audio" : "Add audio"}
              </button>
              <button
                type="button"
                onClick={onOpenCaptionEditor}
                disabled={!hasGeneratedAudio}
                className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Captions className="size-4" />
                Captions
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
