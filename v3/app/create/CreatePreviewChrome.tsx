"use client";

import {
  AudioLines,
  Bookmark,
  Grid2X2,
  Heart,
  Lock,
  MessageCircle,
  Send,
  Unlock,
} from "lucide-react";
import { LegacyIdleVisualizer } from "@/features/formats/visualizer/LegacyIdleVisualizer";
import type { RenderFlashState, RenderMotionMode, RenderSelectableSlot } from "@/features/formats/types";
import { AdRenderSurface } from "@/features/render/AdRenderSurface";
import type { AdScene } from "@/features/scene/types";
import { legacyCreateVisualizerStyle } from "@/features/scene/visualizerStyle";
import type { StoredWebsiteResearchResult } from "@/features/research/types";

export function WigglyMark({ size = "md" }: { size?: "sm" | "md" }) {
  const wrapperSize = size === "sm" ? "size-9" : "size-11";
  const dotSize = size === "sm" ? "size-1.5" : "size-2";

  return (
    <div className={`${wrapperSize} grid place-items-center rounded-full bg-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.18)]`}>
      <div className="flex items-center gap-0.5">
        <span className={`${dotSize} rounded-full bg-cyan-300`} />
        <span className="h-1 w-3 rounded-full bg-blue-500" />
        <span className={`${dotSize} rounded-full bg-fuchsia-400`} />
        <span className="h-1 w-3 rounded-full bg-emerald-300" />
        <span className={`${dotSize} rounded-full bg-cyan-300`} />
      </div>
    </div>
  );
}

function BrandAvatar({
  logoUrl,
  brandName,
  sizeClass = "size-12",
}: {
  brandName: string;
  logoUrl?: string | null;
  sizeClass?: string;
}) {
  return (
    <div className={`${sizeClass} grid shrink-0 place-items-center rounded-full border-2 border-fuchsia-500 bg-white p-1 shadow-[inset_0_0_0_2px_rgba(249,115,22,0.55)]`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="size-full rounded-full object-contain"
          src={logoUrl}
        />
      ) : (
        <span className="grid size-full place-items-center rounded-full bg-slate-950 text-xs font-black text-white">
          {brandName.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

const legacyPlaceholderCanvas = {
  width: 360,
  height: 450,
};

const toPlaceholderPercent = (value: number, axis: "x" | "y") => (
  `${(value / (axis === "x" ? legacyPlaceholderCanvas.width : legacyPlaceholderCanvas.height)) * 100}%`
);

type PreviewSelectionOverlayProps = {
  selectedSlot: RenderSelectableSlot | null;
  lockedSlots: Record<RenderSelectableSlot, boolean>;
  slotColors: Record<RenderSelectableSlot, string>;
  backgroundColor: string;
  onSelectSlot: (slot: RenderSelectableSlot) => void;
  onToggleSlotLock: (slot: RenderSelectableSlot) => void;
  onChangeSlotColor: (slot: RenderSelectableSlot, color: string) => void;
  onChangeBackgroundColor: (color: string) => void;
};

const previewSelectableSlots: Array<{
  slot: RenderSelectableSlot;
  label: string;
  top: number;
  left: number;
  width: number;
  height: number;
}> = [
  {
    slot: "headline",
    label: "Headline",
    top: 118,
    left: 20,
    width: 320,
    height: 120,
  },
  {
    slot: "visualizer",
    label: "Visualizer",
    top: 255,
    left: 0,
    width: 360,
    height: 90,
  },
  {
    slot: "captions",
    label: "Captions",
    top: 336,
    left: 20,
    width: 320,
    height: 62,
  },
];

function PreviewSelectionOverlay({
  selectedSlot,
  lockedSlots,
  slotColors,
  backgroundColor,
  onSelectSlot,
  onToggleSlotLock,
  onChangeSlotColor,
  onChangeBackgroundColor,
}: PreviewSelectionOverlayProps) {
  return (
    <div aria-label="Selectable ad parts" className="group/preview-selector absolute inset-0 z-30">
      {previewSelectableSlots.map(({ slot, label, top, left, width, height }) => {
        const selected = selectedSlot === slot;
        const locked = lockedSlots[slot];
        const color = slotColors[slot];
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
                  ? "border-slate-950 bg-slate-950 text-white opacity-80 shadow-slate-950/30 ring-2 ring-[#00D6B8]/70 hover:opacity-100 group-hover:opacity-100"
                  : "border-slate-300 bg-white/95 text-slate-800 opacity-0 shadow-slate-950/20 hover:border-slate-950 hover:bg-white hover:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
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
              className="absolute left-2 top-1/2 z-40 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 opacity-0 shadow-lg transition hover:bg-white group-hover:opacity-100 focus-within:opacity-100"
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
        className="absolute bottom-3 left-3 z-40 flex size-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 opacity-0 shadow-lg transition hover:bg-white group-hover/preview-selector:opacity-100 focus-within:opacity-100"
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

function PlaceholderAdSurface() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-[#fbfaf5] text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        data-placeholder-slot="logo"
        src="/wiggly-logo.svg"
        style={{
          position: "absolute",
          top: toPlaceholderPercent(70, "y"),
          left: toPlaceholderPercent(120, "x"),
          width: toPlaceholderPercent(120, "x"),
          height: toPlaceholderPercent(48, "y"),
          objectFit: "contain",
        }}
      />
      <h2
        data-placeholder-slot="headline"
        style={{
          position: "absolute",
          top: toPlaceholderPercent(118, "y"),
          left: toPlaceholderPercent(20, "x"),
          width: toPlaceholderPercent(320, "x"),
          height: toPlaceholderPercent(120, "y"),
          display: "grid",
          placeItems: "center",
          margin: 0,
          color: "#0f172a",
          fontSize: "clamp(31px, 9.4cqw, 42px)",
          fontWeight: 900,
          letterSpacing: 0,
          lineHeight: 1.04,
          textAlign: "center",
          textWrap: "balance",
          overflow: "hidden",
          overflowWrap: "break-word",
        }}
      >
        See the angle hiding on your website.
      </h2>
      <div
        data-placeholder-slot="visualizer"
        style={{
          position: "absolute",
          top: toPlaceholderPercent(255, "y"),
          left: toPlaceholderPercent(0, "x"),
          width: toPlaceholderPercent(360, "x"),
          height: toPlaceholderPercent(90, "y"),
        }}
      >
        <LegacyIdleVisualizer
          type={legacyCreateVisualizerStyle.type}
          barCount={legacyCreateVisualizerStyle.barCount}
          color="#00d6b8"
          gap="0.56cqw"
          barMinWidth="0.83cqw"
        />
      </div>
      <div
        data-placeholder-slot="caption-action"
        style={{
          position: "absolute",
          top: toPlaceholderPercent(350, "y"),
          left: toPlaceholderPercent(20, "x"),
          width: toPlaceholderPercent(320, "x"),
          height: toPlaceholderPercent(48, "y"),
          display: "grid",
          placeItems: "center",
        }}
      >
        <div className="inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full bg-white/95 px-5 py-3 text-sm font-black text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.10)]">
          <AudioLines className="size-4 shrink-0" />
          Add audio for this ad
        </div>
      </div>
      <p className="absolute bottom-4 right-8 text-xs font-black uppercase tracking-[0.38em] text-slate-950/25">
        Made with Wiggly
      </p>
    </div>
  );
}

export function PhonePreviewFrame({
  scene,
  result,
  motionMode = "auto",
  rerollFlash = null,
  timeSeconds,
  onOpenAudioPanel,
  selectedSlot = null,
  lockedSlots,
  slotColors,
  backgroundColor,
  onSelectSlot,
  onToggleSlotLock,
  onChangeSlotColor,
  onChangeBackgroundColor,
}: {
  scene: AdScene | null;
  result: StoredWebsiteResearchResult | null;
  motionMode?: RenderMotionMode;
  rerollFlash?: RenderFlashState | null;
  timeSeconds: number;
  onOpenAudioPanel?: () => void;
  selectedSlot?: RenderSelectableSlot | null;
  lockedSlots?: Record<RenderSelectableSlot, boolean>;
  slotColors?: Record<RenderSelectableSlot, string>;
  backgroundColor?: string;
  onSelectSlot?: (slot: RenderSelectableSlot) => void;
  onToggleSlotLock?: (slot: RenderSelectableSlot) => void;
  onChangeSlotColor?: (slot: RenderSelectableSlot, color: string) => void;
  onChangeBackgroundColor?: (color: string) => void;
}) {
  const brandName = scene?.brand.name || result?.brand.name || "Your brand";
  const brandLogoUrl = scene?.brand.logoUrl || scene?.brand.faviconUrl || result?.brand.logoUrl || result?.brand.faviconUrl || "";
  const caption = scene?.creative.subheadline || "Add audio for this ad";
  const showPreviewAudioAction = Boolean(scene && scene.audio.status !== "generated" && onOpenAudioPanel);
  const canSelectSlots = Boolean(scene && lockedSlots && slotColors && backgroundColor && onSelectSlot && onToggleSlotLock && onChangeSlotColor && onChangeBackgroundColor);

  return (
    <div className="mx-auto w-[460px] rounded-[40px] bg-black p-[10px] shadow-[0_34px_90px_rgba(15,23,42,0.24)]">
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-black">
        <div className="flex h-[78px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <BrandAvatar brandName={brandName} logoUrl={brandLogoUrl} sizeClass="size-12" />
            <div>
              <p className="text-sm font-black leading-none text-white">{brandName}</p>
              <p className="mt-1 text-xs font-bold leading-none text-slate-300">Sponsored</p>
            </div>
          </div>
          <span className="text-xl font-black tracking-widest text-white">...</span>
        </div>

        <div className="relative bg-[#fbfaf5]">
          {scene ? (
            <AdRenderSurface
              scene={scene}
              motionMode={motionMode}
              rerollFlash={rerollFlash}
              timeSeconds={timeSeconds}
            />
          ) : (
            <PlaceholderAdSurface />
          )}
          {showPreviewAudioAction ? (
            <button
              type="button"
              aria-label="Add audio for this ad"
              data-preview-audio-action="true"
              onClick={onOpenAudioPanel}
              className="absolute left-1/2 z-20 inline-flex -translate-x-1/2 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-white px-6 py-3 text-[16px] font-black text-slate-600 shadow-[0_18px_45px_rgba(15,23,42,0.10)] transition hover:-translate-x-1/2 hover:-translate-y-0.5 hover:text-slate-950"
              style={{
                top: toPlaceholderPercent(336, "y"),
              }}
            >
              <AudioLines className="size-5 shrink-0" />
              Add audio for this ad
            </button>
          ) : null}
          {canSelectSlots && lockedSlots && slotColors && backgroundColor && onSelectSlot && onToggleSlotLock && onChangeSlotColor && onChangeBackgroundColor ? (
            <PreviewSelectionOverlay
              selectedSlot={selectedSlot}
              lockedSlots={lockedSlots}
              slotColors={slotColors}
              backgroundColor={backgroundColor}
              onSelectSlot={onSelectSlot}
              onToggleSlotLock={onToggleSlotLock}
              onChangeSlotColor={onChangeSlotColor}
              onChangeBackgroundColor={onChangeBackgroundColor}
            />
          ) : null}
        </div>

        <div className="min-h-[160px] bg-black px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Heart className="size-7" strokeWidth={2.4} />
              <MessageCircle className="size-7" strokeWidth={2.4} />
              <Send className="size-7" strokeWidth={2.4} />
            </div>
            <Bookmark className="size-7" strokeWidth={2.4} />
          </div>
          <p className="mt-3 text-sm font-black">1,284 likes</p>
          <p className="mt-2 max-w-[390px] text-sm font-bold leading-5 text-white">
            <span className="font-black">{brandName}</span>{" "}
            <span className="text-slate-200">{caption}</span>
          </p>
          <p className="mt-2 text-sm font-bold text-slate-500">View all 84 comments</p>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600">Sponsored</p>
        </div>
      </div>
    </div>
  );
}

export function FormatRail() {
  return (
    <div className="mt-64 hidden w-16 shrink-0 self-start rounded-[28px] border border-slate-200 bg-white/95 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)] xl:grid xl:content-start">
      <button
        type="button"
        aria-label="Visualizer format"
        className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm"
      >
        <AudioLines className="size-6" />
      </button>
      <button
        type="button"
        aria-label="Future image format"
        className="mt-3 grid size-12 place-items-center rounded-2xl border border-slate-200 text-slate-300"
        disabled
      >
        <Grid2X2 className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Future social format"
        className="mt-3 grid size-12 place-items-center rounded-2xl border border-slate-200 text-slate-300"
        disabled
      >
        <MessageCircle className="size-5" />
      </button>
    </div>
  );
}
