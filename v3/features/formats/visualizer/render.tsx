import type { CSSProperties } from "react";
import { getVisibleCaptionText } from "../../audio/sceneAudio";
import { getVisualizerBarCount, getVisualizerBars, normalizeVisualizerType } from "../../audio/visualizer";
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

const brandMarkStyle: CSSProperties = {
  width: 64,
  height: 64,
  objectFit: "contain",
  borderRadius: 16,
  margin: "0 auto 18px",
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
  const type = normalizeVisualizerType("waveform-strip");
  const count = getVisualizerBarCount(type, 36);
  const bars = getVisualizerBars({
    type,
    count,
    frame,
    height: 152,
    scale: 1,
    mirror: true,
    audioLevel: analysisFrame !== null ? analysis?.levels[analysisFrame] : null,
    frequencyBands: analysisFrame !== null ? analysis?.bands[analysisFrame] : null,
    currentSpeaker: activeCaption?.speaker ?? null,
    splitSpeakers: Boolean(activeCaption?.speaker),
    sensitivity: 1.58,
    heightScale: 0.96,
    baseline: 14,
    gain: 1.88,
    compression: 2.4,
    floor: scene.audio.status === "generated" ? 0.08 : 0,
    ceiling: 0.96,
    curve: "sqrt",
    bandFocus: "voice",
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
      <div
        style={{
          position: "absolute",
          inset: "9% 6% 6%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {logoSource ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={logoSource}
            style={brandMarkStyle}
          />
        ) : (
          <div
            style={{
              ...brandMarkStyle,
              display: "grid",
              placeItems: "center",
              background: textColor,
              color: scene.style.backgroundColor,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            {scene.brand.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <p
          style={{
            margin: 0,
            color: textColor,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 0,
            textTransform: "uppercase",
          }}
        >
          {scene.brand.name}
        </p>
        <h2
          style={{
            margin: "24px 0 0",
            maxWidth: "96%",
            color: textColor,
            fontSize: "clamp(30px, 7.2cqw, 72px)",
            fontWeight: 950,
            letterSpacing: 0,
            lineHeight: 0.96,
            textWrap: "balance",
            overflowWrap: "break-word",
          }}
        >
          {trimHeadline(scene.creative.headline)}
        </h2>
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            height: "clamp(92px, 19cqw, 152px)",
            margin: "40px -10% 0",
            width: "120%",
          }}
        >
          {bars.map((bar, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                minWidth: 9,
                height: bar.height,
                maxHeight: "100%",
                borderRadius: 999,
                background: bar.color,
                opacity: bar.opacity,
              }}
            />
          ))}
        </div>
        {captionText ? (
          <p
            style={{
              margin: "38px auto 0",
              maxWidth: "84%",
              color: scene.style.accentColor,
              fontSize: "clamp(22px, 4.8cqw, 34px)",
              fontWeight: 900,
              lineHeight: 1.08,
              textWrap: "balance",
              overflowWrap: "break-word",
            }}
          >
            {captionText}
          </p>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 38,
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
