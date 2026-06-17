import type { CSSProperties } from "react";
import { getVisibleCaptionText } from "../../audio/sceneAudio";
import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import type { JingleAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const fill: CSSProperties = {
  position: "absolute",
  inset: 0,
};

export function JingleFormatRenderer({
  scene,
  timeSeconds = 0,
  rerollFlash,
}: FormatRenderProps<JingleAdScene>) {
  const { Image } = useRenderAssetComponents();
  const activeLyric = getVisibleCaptionText(scene.audio, timeSeconds)
    || scene.layout.lyrics[0]
    || scene.creative.headline;
  const analysis = scene.audio.status === "generated" ? scene.audio.analysis : null;
  const frameIndex = Math.max(0, Math.floor(timeSeconds * (analysis?.fps || 60)));
  const audioLevel = analysis?.levels[Math.min(analysis.levels.length - 1, frameIndex)] || 0;
  const pulse = 0.65 + (audioLevel * 0.55);
  const brandMark = scene.brand.logoUrl || scene.brand.faviconUrl || "";
  const flashHeadline = rerollFlash?.roles.includes("headline")
    ? "wiggly-reroll-shine wiggly-reroll-shine-headline"
    : "";

  return (
    <div
      data-format="jingle"
      data-jingle-brand-phonetic={scene.layout.brandPhonetic}
      data-jingle-music-length-ms={scene.layout.musicLengthMs}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: `radial-gradient(circle at 18% 18%, ${scene.style.accentColor}55, transparent 34%), linear-gradient(145deg, ${scene.style.backgroundColor}, #050816 72%)`,
        color: scene.style.textColor,
        containerType: "inline-size",
      }}
    >
      <div style={{
        ...fill,
        backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "8cqw 100%",
        opacity: 0.3,
        transform: `translateX(${-(timeSeconds % 1) * 8}cqw)`,
      }} />
      <div
        style={{
          background: scene.style.accentColor,
          borderRadius: "9999px",
          filter: "blur(8cqw)",
          height: "46cqw",
          left: "10cqw",
          opacity: 0.22,
          position: "absolute",
          top: "12cqw",
          transform: `scale(${pulse})`,
          width: "46cqw",
        }}
      />
      <div style={{
        alignItems: "center",
        display: "flex",
        gap: "2.6cqw",
        left: "6cqw",
        position: "absolute",
        right: "6cqw",
        top: "6cqw",
      }}>
        {brandMark ? (
          <Image
            alt=""
            src={brandMark}
            style={{
              background: "#FFFFFF",
              borderRadius: "9999px",
              height: "9cqw",
              objectFit: "contain",
              padding: "1.2cqw",
              width: "9cqw",
            }}
          />
        ) : (
          <div style={{
            alignItems: "center",
            background: "#FFFFFF",
            borderRadius: "9999px",
            color: "#020617",
            display: "grid",
            fontSize: "4cqw",
            fontWeight: 900,
            height: "9cqw",
            justifyItems: "center",
            lineHeight: 1,
            placeItems: "center",
            width: "9cqw",
          }}>
            {scene.brand.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{
            color: "#FFFFFF",
            fontSize: "3.8cqw",
            fontWeight: 900,
            lineHeight: 1,
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>{scene.brand.name}</p>
          <p style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "2.1cqw",
            fontWeight: 900,
            letterSpacing: "0.18em",
            lineHeight: 1,
            margin: "0.6cqw 0 0",
            textTransform: "uppercase",
          }}>Brand jingle</p>
        </div>
      </div>

      <div style={{
        left: "7cqw",
        position: "absolute",
        right: "7cqw",
        top: "32%",
      }}>
        <p
          className={flashHeadline || undefined}
          data-jingle-active-lyric="true"
          style={{
            color: "#FFFFFF",
            fontSize: "8.2cqw",
            fontWeight: 900,
            letterSpacing: 0,
            lineHeight: 0.98,
            margin: 0,
            textAlign: "center",
            textShadow: "0 0.7cqw 0 rgba(0,0,0,0.35)",
            textWrap: "balance",
          }}
        >
          {activeLyric}
        </p>
      </div>

      <div
        data-jingle-waveform="true"
        style={{
          alignItems: "flex-end",
          bottom: "10cqw",
          display: "flex",
          gap: "1.2cqw",
          height: "14cqw",
          justifyContent: "center",
          left: "9cqw",
          position: "absolute",
          right: "9cqw",
        }}
      >
        {Array.from({ length: 18 }, (_, index) => {
          const height = 22 + (((index * 17) % 41) * pulse);
          return (
            <span
              key={index}
              style={{
                background: "rgba(255,255,255,0.8)",
                borderRadius: "9999px",
                height: `${Math.min(92, height)}%`,
                width: "1.8cqw",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
