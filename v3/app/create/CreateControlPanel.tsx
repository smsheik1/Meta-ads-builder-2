import { AudioLines, Captions, Grid2X2, Palette, Type } from "lucide-react";
import type { PreviewPlatform } from "./CreatePreviewChrome";
import type { CanvasInteractionPanel } from "@/features/create/canvasInteractionStore";
import { getFormatModule } from "@/features/formats/registry";
import type { FormatSpecificEditorField } from "@/features/formats/types";
import type { AdScene } from "@/features/scene/types";

export type CreatePanelId = CanvasInteractionPanel;

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
  onUpdateFormatPreset,
  onUpdateCreativeField,
  onUpdateStyleColor,
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
  onUpdateFormatPreset: (fieldId: string, value: string) => void;
  onUpdateCreativeField: (field: string, value: string) => void;
  onUpdateStyleColor: (field: string, value: string) => void;
  previewPlatform: PreviewPlatform;
  selectedScene: AdScene | null;
}) {
  const editorSchema = selectedScene ? getFormatModule(selectedScene.format).editorSchema : null;
  const colorPalette = uniqueColors([
    ...(selectedScene?.brand.colors || []),
    selectedScene?.style.backgroundColor || "",
    selectedScene?.style.textColor || "",
    selectedScene?.style.accentColor || "",
    selectedScene?.format === "visualizer" ? selectedScene.style.visualizerColor : "",
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

      {selectedScene && editorSchema && activePanel === "text" ? (
        <div className="mt-4 space-y-3">
          {editorSchema.text.map((field) => {
            const value = String(selectedScene.creative[field.id as keyof typeof selectedScene.creative] || "");
            return (
              <label key={field.id} className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {field.label}
                </span>
                {field.kind === "textarea" ? (
                  <textarea
                    suppressHydrationWarning
                    value={value}
                    onChange={(event) => onUpdateCreativeField(field.id, event.target.value)}
                    className="min-h-20 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black leading-5 text-slate-950 outline-none transition focus:border-slate-400"
                  />
                ) : (
                  <input
                    suppressHydrationWarning
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

      {selectedScene && editorSchema && activePanel === "style" ? (
        <div className="mt-4 space-y-4">
          {editorSchema.style.map((field) => {
            const value = String(selectedScene.style[field.id as keyof typeof selectedScene.style] || "#000000");
            return (
              <div key={field.id}>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {field.label}
                  </span>
                  <input
                    suppressHydrationWarning
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

      {selectedScene && editorSchema && activePanel === "format" ? (
        <div className="mt-4 space-y-4">
          {editorSchema.format.map((field) => (
            <FormatField
              key={field.id}
              audioStatus={audioStatus}
              field={field}
              hasGeneratedAudio={hasGeneratedAudio}
              onOpenAudioPanel={onOpenAudioPanel}
              onOpenCaptionEditor={onOpenCaptionEditor}
              onPreviewPlatformChange={onPreviewPlatformChange}
              onUpdateFormatPreset={onUpdateFormatPreset}
              previewPlatform={previewPlatform}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FormatField({
  audioStatus,
  field,
  hasGeneratedAudio,
  onOpenAudioPanel,
  onOpenCaptionEditor,
  onPreviewPlatformChange,
  onUpdateFormatPreset,
  previewPlatform,
}: {
  audioStatus: "idle" | "loading" | "ready" | "error";
  field: FormatSpecificEditorField;
  hasGeneratedAudio: boolean;
  onOpenAudioPanel: () => void;
  onOpenCaptionEditor: () => void;
  onPreviewPlatformChange: (platform: PreviewPlatform) => void;
  onUpdateFormatPreset: (fieldId: string, value: string) => void;
  previewPlatform: PreviewPlatform;
}) {
  if (field.kind === "select") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {field.label}
        </span>
        <select
          suppressHydrationWarning
          value={field.id === "previewPlatform" ? previewPlatform : ""}
          onChange={(event) => {
            if (field.id === "previewPlatform") onPreviewPlatformChange(event.target.value as PreviewPlatform);
          }}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 outline-none transition focus:border-slate-400"
          aria-label={field.label}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === "preset") {
    return (
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {field.label}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {field.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onUpdateFormatPreset(field.id, option.value)}
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-black leading-4 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.kind === "audio") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start gap-3">
          <AudioLines className="mt-0.5 size-5 shrink-0 text-slate-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-950">{field.label}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              {hasGeneratedAudio ? "Audio is attached. Replace it or edit captions." : "Add audio to animate captions and visualizer bars."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenAudioPanel}
          disabled={audioStatus === "loading"}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-progress disabled:opacity-50"
        >
          {hasGeneratedAudio ? "Replace audio" : "Add audio"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenCaptionEditor}
      disabled={!hasGeneratedAudio}
      className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Captions className="size-4" />
      {field.label}
    </button>
  );
}
