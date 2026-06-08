import { AudioLines } from "lucide-react";
import { LegacyIdleVisualizer } from "@/features/formats/visualizer/LegacyIdleVisualizer";
import { legacyCreateVisualizerStyle } from "@/features/scene/visualizerStyle";
import { toPlaceholderPercent } from "./createPreviewGeometry";

export function PlaceholderAdSurface() {
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
