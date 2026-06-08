import { AudioLines } from "lucide-react";
import type { RenderFlashState } from "@/features/formats/types";
import { LegacyIdleVisualizer } from "@/features/formats/visualizer/LegacyIdleVisualizer";
import { legacyCreateVisualizerStyle } from "@/features/scene/visualizerStyle";
import { toPlaceholderPercent } from "./createPreviewGeometry";

const placeholderVariants = [
  {
    headline: "Drop in your website and watch the magic happen.",
    color: "#00d6b8",
    background: "#fbfaf5",
  },
  {
    headline: "Turn your homepage into a ready-to-test ad.",
    color: "#82dfff",
    background: "#f2fbff",
  },
  {
    headline: "Your next ad starts with one URL.",
    color: "#f9a8d4",
    background: "#fff7fb",
  },
  {
    headline: "Make the first draft less painful.",
    color: "#8b5cf6",
    background: "#f7f3ff",
  },
  {
    headline: "See the angle hiding on your website.",
    color: "#22c55e",
    background: "#f3fff7",
  },
  {
    headline: "From brand page to video ad in minutes.",
    color: "#f59e0b",
    background: "#fff8ed",
  },
];

export const placeholderAdSurfaceVariantCount = placeholderVariants.length;

export function PlaceholderAdSurface({
  rerollFlash = null,
  variantIndex = 0,
}: {
  rerollFlash?: RenderFlashState | null;
  variantIndex?: number;
}) {
  const variant = placeholderVariants[Math.abs(variantIndex) % placeholderVariants.length] || placeholderVariants[0]!;
  const getRerollFlashClassName = (role: "headline" | "visualizer" | "captions") => (
    rerollFlash?.roles.includes(role)
      ? `wiggly-reroll-shine wiggly-reroll-shine-${role}`
      : undefined
  );

  return (
    <div className="relative aspect-[4/5] overflow-hidden text-center" style={{ background: variant.background }}>
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
        className={getRerollFlashClassName("headline")}
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
        {variant.headline}
      </h2>
      <div
        className={getRerollFlashClassName("visualizer")}
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
          key={`placeholder-idle-wave-${variantIndex}`}
          type={legacyCreateVisualizerStyle.type}
          barCount={legacyCreateVisualizerStyle.barCount}
          color={variant.color}
          gap="0.56cqw"
          barMinWidth="0.83cqw"
          waveKey={variantIndex}
        />
      </div>
      <div
        className={getRerollFlashClassName("captions")}
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
