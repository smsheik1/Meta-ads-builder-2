import type { CSSProperties } from "react";
import { getVisibleCaptionText } from "../../audio/sceneAudio";
import { getVisualizerBarCount, getVisualizerBars, normalizeVisualizerType } from "../../audio/visualizer";
import { legacyCreateVisualizerStyle } from "../../scene/visualizerStyle";
import type { FormatRenderProps } from "../types";

const frameRate = 60;

const getReadableTextColor = (color: string) => (
  /^#[0-9A-F]{6}$/i.test(color) ? color : "#070B1D"
);

const getLogoSource = (scene: FormatRenderProps["scene"]) => (
  scene.brand.logoUrl || scene.brand.faviconUrl || scene.brand.ogImageUrl || ""
);

const trimHeadline = (headline: string) => headline
  .replace(/\s+/g, " ")
  .trim();

const getHeadlineFontSize = (headline: string) => {
  const length = trimHeadline(headline).length;
  if (length > 42) return "clamp(28px, 8.6cqw, 48px)";
  if (length > 28) return "clamp(30px, 10cqw, 56px)";
  return "clamp(34px, 12.2cqw, 64px)";
};

const legacyCanvas = {
  width: 360,
  height: 450,
  visualizerHeight: 90,
};

const toCanvasPercent = (value: number, axis: "x" | "y") => (
  `${(value / (axis === "x" ? legacyCanvas.width : legacyCanvas.height)) * 100}%`
);

const brandMarkStyle: CSSProperties = {
  position: "absolute",
  top: toCanvasPercent(70, "y"),
  left: "50%",
  transform: "translateX(-50%)",
  width: toCanvasPercent(120, "x"),
  height: toCanvasPercent(48, "y"),
  objectFit: "contain",
  borderRadius: 16,
};

export function VisualizerFormatRenderer({
  scene,
  timeSeconds = 0,
}: FormatRenderProps) {
  const frame = Math.max(0, Math.floor(timeSeconds * frameRate));
  const analysis = scene.audio.status === "generated" ? scene.audio.analysis : null;
  const analysisFrame = analysis?.levels.length
    ? Math.min(analysis.levels.length - 1, Math.max(0, Math.floor(timeSeconds * analysis.fps)))
    : null;
  const timeMs = Math.max(0, timeSeconds * 1000);
  const activeCaption = scene.audio.status === "generated"
    ? scene.audio.captions.find((caption) => timeMs >= caption.startMs && timeMs <= caption.endMs)
    : null;
  const visualizerStyle = scene.style.visualizer || legacyCreateVisualizerStyle;
  const type = normalizeVisualizerType(visualizerStyle.type);
  const count = getVisualizerBarCount(type, visualizerStyle.barCount);
  const splitSpeakers = Boolean(visualizerStyle.splitSpeakers && activeCaption?.speaker);
  const bars = getVisualizerBars({
    type,
    count,
    frame,
    height: legacyCanvas.visualizerHeight,
    scale: 1,
    mirror: visualizerStyle.mirror,
    audioLevel: analysisFrame !== null ? analysis?.levels[analysisFrame] : null,
    frequencyBands: analysisFrame !== null ? analysis?.bands[analysisFrame] : null,
    currentSpeaker: activeCaption?.speaker ?? null,
    splitSpeakers,
    sensitivity: visualizerStyle.sensitivity,
    heightScale: visualizerStyle.heightScale,
    baseline: visualizerStyle.baseline,
    gain: visualizerStyle.gain,
    compression: visualizerStyle.compression,
    floor: visualizerStyle.floor,
    ceiling: visualizerStyle.ceiling,
    curve: visualizerStyle.curve,
    bandFocus: visualizerStyle.bandFocus,
    color: scene.style.visualizerColor,
    speaker2Color: scene.style.accentColor,
  });
  const logoSource = getLogoSource(scene);
  const textColor = getReadableTextColor(scene.style.textColor);
  const captionText = getVisibleCaptionText(scene.audio, timeSeconds);

  return (
    <div
      data-format="visualizer"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "4 / 5",
        overflow: "hidden",
        background: scene.style.backgroundColor,
        color: textColor,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div>
        {logoSource ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={logoSource}
            style={brandMarkStyle}
          />
        ) : (
          <p
            style={{
              ...brandMarkStyle,
              display: "grid",
              placeItems: "center",
              margin: 0,
              color: textColor,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 0,
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            {scene.brand.name}
          </p>
        )}
        <h2
          style={{
            position: "absolute",
            top: toCanvasPercent(118, "y"),
            left: toCanvasPercent(20, "x"),
            width: toCanvasPercent(320, "x"),
            minHeight: toCanvasPercent(120, "y"),
            display: "grid",
            placeItems: "center",
            margin: 0,
            color: textColor,
            fontSize: getHeadlineFontSize(scene.creative.headline),
            fontWeight: 950,
            letterSpacing: 0,
            lineHeight: 1.04,
            textAlign: "center",
            textWrap: "balance",
            overflowWrap: "break-word",
          }}
        >
          {trimHeadline(scene.creative.headline)}
        </h2>
        <div
          aria-hidden="true"
          data-visualizer-kind="legacy-create-waveform-strip"
          style={{
            position: "absolute",
            top: toCanvasPercent(255, "y"),
            left: 0,
            width: "100%",
            height: toCanvasPercent(90, "y"),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.56cqw",
          }}
        >
          {bars.map((bar, index) => {
            const barHeightPercent = Math.min(100, Math.max(0, (bar.height / legacyCanvas.visualizerHeight) * 100));
            return (
              <div
                className={scene.audio.status === "generated" ? undefined : "wiggly-idle-bar wiggly-idle-bar-strong"}
                data-visualizer-bar="true"
                key={index}
                style={{
                  flex: 1,
                  minWidth: "0.83cqw",
                  height: `${barHeightPercent}%`,
                  maxHeight: "100%",
                  borderRadius: 999,
                  background: bar.color,
                  opacity: bar.opacity,
                  animationDelay: scene.audio.status === "generated" ? undefined : `${index * 28}ms`,
                }}
              />
            );
          })}
        </div>
        {captionText ? (
          <p
            style={{
              position: "absolute",
              top: toCanvasPercent(350, "y"),
              left: toCanvasPercent(20, "x"),
              width: toCanvasPercent(320, "x"),
              margin: 0,
              color: scene.style.accentColor,
              fontSize: "clamp(20px, 6.7cqw, 34px)",
              fontWeight: 900,
              lineHeight: 1.08,
              textAlign: "center",
              textWrap: "balance",
              overflowWrap: "break-word",
            }}
          >
            {captionText}
          </p>
        ) : (
          <div
            style={{
              position: "absolute",
              top: toCanvasPercent(350, "y"),
              left: "50%",
              transform: "translateX(-50%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 26px",
              borderRadius: 999,
              background: "#FFFFFF",
              color: "#52627A",
              fontSize: "clamp(18px, 3.5cqw, 28px)",
              fontWeight: 900,
              boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
              gap: 12,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              {[9, 15, 22, 15, 9].map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  style={{
                    width: 3,
                    height,
                    borderRadius: 999,
                    background: "#52627A",
                    opacity: 0.8,
                  }}
                />
              ))}
            </span>
            Add audio for this ad
          </div>
        )}
      </div>
      <p
        style={{
          position: "absolute",
          right: "7%",
          bottom: "5.8%",
          margin: 0,
          color: textColor,
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: 8,
          opacity: 0.28,
          textTransform: "uppercase",
        }}
      >
        Made with Wiggly
      </p>
    </div>
  );
}
