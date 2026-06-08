"use client";

import {
  AudioLines,
  Bookmark,
  Battery,
  ChevronUp,
  Grid2X2,
  Heart,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Play,
  Send,
  Share2,
  Signal,
  Square,
  ThumbsUp,
  Unlock,
  VolumeX,
  Wifi,
} from "lucide-react";
import { LegacyIdleVisualizer } from "@/features/formats/visualizer/LegacyIdleVisualizer";
import type { RenderFlashState, RenderMotionMode, RenderSelectableSlot } from "@/features/formats/types";
import { AdRenderSurface } from "@/features/render/AdRenderSurface";
import type { AdScene } from "@/features/scene/types";
import { legacyCreateVisualizerStyle } from "@/features/scene/visualizerStyle";
import type { StoredWebsiteResearchResult } from "@/features/research/types";

export type PreviewPlatform = "facebook-feed" | "instagram-feed" | "reels" | "stories" | "youtube";

export const previewPlatformOptions: Array<{ label: string; value: PreviewPlatform }> = [
  { label: "FB Feed", value: "facebook-feed" },
  { label: "IG Feed", value: "instagram-feed" },
  { label: "Reels", value: "reels" },
  { label: "Stories", value: "stories" },
  { label: "YouTube", value: "youtube" },
];

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

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

function StatusBar({ isDark = true }: { isDark?: boolean }) {
  return (
    <div className={cx("flex items-center justify-between text-[12px] font-black", isDark ? "text-white" : "text-slate-900")}>
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <Signal className="size-3.5" strokeWidth={2.5} />
        <Wifi className="size-3.5" strokeWidth={2.5} />
        <Battery className="size-4" strokeWidth={2.5} />
      </div>
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
  platform = "instagram-feed",
  motionMode = "auto",
  rerollFlash = null,
  timeSeconds,
  onOpenAudioPanel,
  onTogglePlayback,
  previewReady = false,
  isAudioPlaying = false,
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
  platform?: PreviewPlatform;
  motionMode?: RenderMotionMode;
  rerollFlash?: RenderFlashState | null;
  timeSeconds: number;
  onOpenAudioPanel?: () => void;
  onTogglePlayback?: () => void;
  previewReady?: boolean;
  isAudioPlaying?: boolean;
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
  const feedPlatform = platform === "facebook-feed" || platform === "instagram-feed";
  const instagramFeed = platform === "instagram-feed";
  const storiesPlatform = platform === "stories";
  const reelsPlatform = platform === "reels";
  const youtubePlatform = platform === "youtube";
  const verticalPlatform = reelsPlatform || storiesPlatform;
  const isDark = true;
  const frameClassName = youtubePlatform
    ? "relative mx-auto h-[420px] w-[640px] overflow-hidden rounded-[30px] border border-slate-800 bg-black text-white shadow-2xl shadow-slate-950/25"
    : "relative mx-auto h-[720px] w-[360px] overflow-hidden rounded-[30px] border border-slate-800 bg-black text-white shadow-2xl shadow-slate-950/25";
  const previewFrameId = `legacy-${platform}`;

  const renderAdViewport = (className: string) => (
    <div
      className={cx("relative overflow-hidden bg-[#fbfaf5]", className)}
      data-preview-ad-viewport={previewFrameId}
    >
      {scene ? (
        <AdRenderSurface
          className="h-full"
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
          className="absolute left-1/2 z-50 inline-flex -translate-x-1/2 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-white px-6 py-3 text-[16px] font-black text-slate-600 shadow-[0_18px_45px_rgba(15,23,42,0.10)] transition hover:-translate-x-1/2 hover:-translate-y-0.5 hover:text-slate-950"
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
  );

  return (
    <div
      className={frameClassName}
      data-preview-phone-frame={previewFrameId}
    >
      {feedPlatform ? (
        <div className="flex h-full flex-col overflow-hidden">
          <div
            className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-900 bg-black px-3 py-2.5"
            data-preview-phone-header={platform}
          >
            <div className="flex min-w-0 items-center gap-2">
              <BrandAvatar brandName={brandName} logoUrl={brandLogoUrl} sizeClass="size-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black leading-tight text-white">{brandName}</p>
                <p className="text-[11px] font-bold leading-tight text-slate-400">
                  {instagramFeed ? "Sponsored" : "Sponsored · Public"}
                </p>
              </div>
            </div>
            <MoreHorizontal className="size-5 shrink-0 text-white" />
          </div>

          {renderAdViewport("h-[450px] shrink-0")}

          <div
            className="relative h-[210px] shrink-0 border-t border-slate-900 bg-black px-3 py-3 text-white"
            data-preview-phone-footer={platform}
          >
            {instagramFeed ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Heart className="size-6" strokeWidth={2.4} />
                    <MessageCircle className="size-6" strokeWidth={2.4} />
                    <Send className="size-6" strokeWidth={2.4} />
                  </div>
                  <Bookmark className="size-6" strokeWidth={2.4} />
                </div>
                <p className="mt-2 text-[12px] font-black">1,284 likes</p>
                <p className="mt-1 max-w-[330px] text-[12px] font-bold leading-snug text-white">
                  <span className="font-black">{brandName}</span>{" "}
                  <span className="text-slate-200">{caption.substring(0, 92)}{caption.length > 92 ? "..." : ""}</span>
                </p>
                <p className="mt-1 text-[12px] font-bold text-slate-500">View all 84 comments</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">Sponsored</p>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 text-[12px] leading-snug text-white">
                  <div className="min-w-0">
                    <span className="mr-2 font-black">{brandName}</span>
                    <span className="text-slate-300">{caption.substring(0, 72)}{caption.length > 72 ? "..." : ""}</span>
                  </div>
                  <button className="shrink-0 rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-black text-white">
                    Learn More
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between border-y border-slate-900 py-2 text-[11px] font-bold text-slate-400">
                  <span>1.2K reactions</span>
                  <span>84 comments · 19 shares</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {[
                    { label: "Like", icon: ThumbsUp },
                    { label: "Comment", icon: MessageCircle },
                    { label: "Share", icon: Share2 },
                  ].map(({ label, icon: Icon }) => (
                    <button key={label} className="flex items-center justify-center gap-1 rounded-md py-1 text-[12px] font-black text-slate-300">
                      <Icon className="size-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {verticalPlatform ? (
        <div className="absolute inset-0 overflow-hidden bg-black">
          <div className="absolute inset-0 flex items-center justify-center">
            {renderAdViewport("h-[450px] w-full")}
          </div>
          {storiesPlatform ? (
            <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between">
              <div className="px-3 pt-3">
                <div className="mb-3 grid grid-cols-3 gap-1">
                  {[0, 1, 2].map((segment) => (
                    <div key={segment} className="h-0.5 overflow-hidden rounded-full bg-white/35">
                      <div className={cx("h-full rounded-full", segment === 0 ? "w-[72%]" : "w-0", isDark ? "bg-white" : "bg-slate-900")} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-white drop-shadow-md">
                  <div className="flex min-w-0 items-center gap-2">
                    <BrandAvatar brandName={brandName} logoUrl={brandLogoUrl} sizeClass="size-8" />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-black">{brandName}</div>
                      <div className="text-[11px] font-bold opacity-80">Sponsored</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <VolumeX className="size-5" />
                    <MoreHorizontal className="size-5" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-t from-black/60 via-black/20 to-transparent px-3 pb-4 pt-20">
                <div className="mb-3 flex justify-center">
                  <button className="pointer-events-auto rounded-full bg-white/95 px-8 py-3 text-[14px] font-black text-black shadow-lg backdrop-blur-md">
                    Learn More
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-full border border-white/70 px-4 py-3 text-[13px] font-bold text-white backdrop-blur-md">
                    Send message
                  </div>
                  <Heart className="size-7 shrink-0 text-white" />
                  <Send className="size-7 shrink-0 text-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between">
              <div className="px-4 pt-2">
                <StatusBar />
                <div className="mt-2 flex items-start justify-between text-white drop-shadow-md">
                  <h2 className="text-[18px] font-black">Reels</h2>
                  <VolumeX className="size-5" />
                </div>
              </div>
              <div className="relative flex flex-col justify-end bg-gradient-to-t from-black/65 via-black/20 to-transparent pb-4 pt-32">
                <div className="pointer-events-auto absolute bottom-[100%] left-4 right-4 mb-4 flex items-center justify-between rounded-full bg-white/95 px-6 py-[14px] text-black shadow-lg backdrop-blur-md">
                  <span className="ml-4 flex-1 text-center text-[14px] font-black">Learn More</span>
                  <ChevronUp className="size-5 opacity-80" />
                </div>
                <div className="relative z-10 flex w-full flex-col px-4 pr-[64px]">
                  <div className="max-w-[240px]">
                    <div className="mb-2 flex items-center gap-2">
                      <BrandAvatar brandName={brandName} logoUrl={brandLogoUrl} sizeClass="size-8" />
                      <div className="flex flex-col">
                        <span className="text-[14px] font-black text-white drop-shadow-md">{brandName}</span>
                        <span className="text-[12px] font-bold text-white/80">Ad</span>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-[13px] font-bold leading-snug text-white drop-shadow-md">{caption}</p>
                  </div>
                </div>
                <div className="pointer-events-auto absolute bottom-4 right-4 z-20 flex flex-col items-center gap-5 text-white drop-shadow-md">
                  <Heart className="size-7" />
                  <MessageCircle className="size-7" />
                  <Send className="size-7" />
                  <MoreHorizontal className="size-6" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                  <div className="h-full w-[30%] bg-white" />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {youtubePlatform ? (
        <div className="flex h-full flex-col overflow-hidden bg-black">
          <div
            className="flex h-[360px] shrink-0 items-center justify-center bg-[#0f1117]"
            data-youtube-editor-canvas="true"
          >
            {renderAdViewport("h-full aspect-[4/5]")}
          </div>
          <div
            className="relative h-[60px] shrink-0 border-t border-slate-800 bg-black px-5 py-3 text-white"
            data-preview-phone-footer={platform}
          >
            <div className="absolute inset-x-5 top-0 h-1 overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-[38%] rounded-full bg-red-600" />
            </div>
            <div className="flex h-full items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{brandName}</p>
                <p className="truncate text-xs font-bold text-slate-300">Sponsored video</p>
              </div>
              <button className="shrink-0 rounded-full bg-white px-5 py-2 text-sm font-black text-black">Learn More</button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        data-preview-play-overlay={previewFrameId}
        onClick={onTogglePlayback}
        disabled={!previewReady || !onTogglePlayback}
        className={cx(
          "absolute left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-950/95 px-5 py-3 text-sm font-black text-white shadow-2xl shadow-slate-950/30 transition hover:-translate-x-1/2 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50",
          youtubePlatform ? "bottom-1" : "bottom-[86px]",
        )}
      >
        {isAudioPlaying ? <Square className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
        {isAudioPlaying ? "Stop preview" : "Play this ad"}
      </button>
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
