import { Lock, Unlock } from "lucide-react";
import type {
  FormatSelectableSlotDefinition,
  RenderSelectableSlot,
} from "@/features/formats/types";
import { toPlaceholderPercent } from "./createPreviewGeometry";

export type PreviewSelectionOverlayProps = {
  selectedSlot: RenderSelectableSlot | null;
  selectableSlots: readonly FormatSelectableSlotDefinition[];
  lockedSlots: Partial<Record<RenderSelectableSlot, boolean>>;
  slotColors: Partial<Record<RenderSelectableSlot, string>>;
  backgroundColor: string;
  onSelectSlot: (slot: RenderSelectableSlot) => void;
  onClearSlot: () => void;
  onToggleSlotLock: (slot: RenderSelectableSlot) => void;
  onChangeSlotColor: (slot: RenderSelectableSlot, color: string) => void;
  onChangeBackgroundColor: (color: string) => void;
};

export function PreviewSelectionOverlay({
  selectedSlot,
  selectableSlots,
  lockedSlots,
  slotColors,
  backgroundColor,
  onSelectSlot,
  onClearSlot,
  onToggleSlotLock,
  onChangeSlotColor,
  onChangeBackgroundColor,
}: PreviewSelectionOverlayProps) {
  return (
    <div
      aria-label="Selectable ad parts"
      className="group/preview-selector absolute inset-0 z-30"
      data-preview-selection-overlay="true"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClearSlot();
      }}
    >
      {selectableSlots.map(({ slot, label, top, left, width, height }) => {
        const selected = selectedSlot === slot;
        const locked = Boolean(lockedSlots[slot]);
        const color = slotColors[slot] || "#0f172a";
        return (
          <div
            key={slot}
            data-preview-selectable-slot={slot}
            className="group absolute rounded-2xl ring-1 ring-transparent transition hover:ring-slate-300 focus-within:ring-slate-300"
            style={{
              top: toPlaceholderPercent(top, "y"),
              left: toPlaceholderPercent(left, "x"),
              width: toPlaceholderPercent(width, "x"),
              height: toPlaceholderPercent(height, "y"),
            }}
          >
            <button
              type="button"
              aria-label={`Select ${label}`}
              aria-pressed={selected}
              className="absolute inset-0 rounded-2xl"
              onClick={() => onSelectSlot(slot)}
            >
              <span className="sr-only">{label}</span>
            </button>
            <button
              type="button"
              className={`absolute right-1 top-1 z-40 grid size-14 place-items-center rounded-full border-2 shadow-xl transition duration-150 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/25 ${
                locked
                  ? "pointer-events-auto border-slate-950 bg-slate-950 text-white opacity-80 shadow-slate-950/30 ring-2 ring-[#00D6B8]/70 hover:opacity-100 group-hover:opacity-100"
                  : "pointer-events-none border-slate-300 bg-white/95 text-slate-800 opacity-0 shadow-slate-950/20 hover:border-slate-950 hover:bg-white hover:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
              }`}
              aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
              aria-pressed={locked}
              onClick={(event) => {
                event.stopPropagation();
                onToggleSlotLock(slot);
              }}
            >
              {locked ? <Lock className="size-6" strokeWidth={3} /> : <Unlock className="size-6" strokeWidth={2.5} />}
            </button>
            <label
              className="pointer-events-none absolute left-2 top-1/2 z-40 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 opacity-0 shadow-lg transition hover:bg-white group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100"
              title={`${label} color`}
              onClick={(event) => event.stopPropagation()}
            >
              <span
                className="size-6 rounded-full border border-slate-200 shadow-inner"
                style={{ backgroundColor: color }}
              />
              <input
                type="color"
                value={color}
                aria-label={`${label} color`}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                onChange={(event) => onChangeSlotColor(slot, event.target.value)}
              />
            </label>
          </div>
        );
      })}
      <label
        className={`absolute bottom-3 left-3 z-40 flex size-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 shadow-lg transition hover:bg-white ${
          selectedSlot
            ? "pointer-events-none opacity-0"
            : "pointer-events-none opacity-0 group-hover/preview-selector:pointer-events-auto group-hover/preview-selector:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100"
        }`}
        title="Background color"
        data-preview-background-color="true"
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className="size-6 rounded-full border border-slate-200 shadow-inner"
          style={{ backgroundColor }}
        />
        <input
          type="color"
          value={backgroundColor}
          aria-label="Background color"
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          onChange={(event) => onChangeBackgroundColor(event.target.value)}
        />
      </label>
    </div>
  );
}
