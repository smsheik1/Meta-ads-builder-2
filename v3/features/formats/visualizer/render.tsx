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
  const type = normalizeVisualizerType("waveform-strip");
  const count = getVisualizerBarCount(type, 34);
  const bars = getVisualizerBars({
    type,
    count,
    frame,
    height: 152,
    scale: 1,
    mirror: true,
    sensitivity: 1.46,
    heightScale: 0.9,
    baseline: 14,
    gain: 1.78,
    compression: 3,
    floor: 0.1,
    ceiling: 0.9,
    curve: "sqrt",
    bandFocus: "voice",
    color: scene.style.visualizerColor,
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
              key={`${index}-${Math.round(bar.height)}`}
              style={{
                flex: 1,
                minWidth: 10,
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
