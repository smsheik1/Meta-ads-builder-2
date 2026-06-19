import type { CSSProperties } from "react";
import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import { WIGGLY_FONT_STACK } from "../../render/fontStack";
import type { BrainrotAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const rootStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  backgroundColor: "#000000",
  color: "#FFFFFF",
  fontFamily: WIGGLY_FONT_STACK,
  containerType: "inline-size",
};
const videoStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
};
const shadeStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(to bottom, rgba(0,0,0,0.18), transparent 28%, rgba(0,0,0,0.55))",
  pointerEvents: "none",
};
const spriteBaseStyle: CSSProperties = {
  position: "absolute",
  bottom: "4cqw",
  width: "32cqw",
  maxHeight: "38cqw",
  objectFit: "contain",
  filter: "drop-shadow(0 1.2cqw 0.8cqw rgba(0,0,0,0.35))",
  transition: "opacity 120ms linear, transform 120ms linear",
};
const captionStyle: CSSProperties = {
  position: "absolute",
  left: "4cqw",
  right: "4cqw",
  bottom: "30cqw",
  margin: 0,
  color: "#FFFFFF",
  fontSize: "7.1cqw",
  fontWeight: 950,
  lineHeight: 0.95,
  letterSpacing: 0,
  textAlign: "center",
  textTransform: "uppercase",
  textWrap: "balance",
  textShadow: "0.14em 0.14em 0 #000000, -0.05em -0.05em 0 #000000, 0.05em -0.05em 0 #000000, -0.05em 0.05em 0 #000000, 0.05em 0.05em 0 #000000",
};
const ctaStyle: CSSProperties = {
  ...captionStyle,
  top: "35cqw",
  bottom: "auto",
  fontSize: "8cqw",
};

export const brainrotCtaDurationMs = 2000;

const sceneAudioDurationMs = (scene: BrainrotAdScene) => (
  scene.audio.status === "generated"
    ? scene.audio.durationMs
    : Math.max(...scene.layout.beats.map((beat) => (beat.startMs || 0) + (beat.durationMs || 0)), 0)
);

const activeBeatIndex = (scene: BrainrotAdScene, timeSeconds: number) => {
  const timeMs = Math.max(0, timeSeconds * 1000);
  const index = scene.layout.beats.findIndex((beat) => (
    typeof beat.startMs === "number" &&
    typeof beat.durationMs === "number" &&
    timeMs >= beat.startMs &&
    timeMs < beat.startMs + beat.durationMs
  ));
  if (index >= 0) return index;
  const previousIndex = scene.layout.beats.findLastIndex((beat) => (
    typeof beat.startMs === "number" &&
    timeMs >= beat.startMs
  ));
  return Math.max(0, previousIndex);
};

export function BrainrotFormatRenderer({
  scene,
  timeSeconds = 0,
  rerollFlash,
}: FormatRenderProps<BrainrotAdScene>) {
  const { Image, Video } = useRenderAssetComponents();
  const beat = scene.layout.beats[activeBeatIndex(scene, timeSeconds)] || scene.layout.beats[0];
  const activeSpeaker = beat?.speaker || "left";
  const audioDurationMs = sceneAudioDurationMs(scene);
  const showCta = audioDurationMs > 0 &&
    timeSeconds * 1000 >= audioDurationMs &&
    timeSeconds * 1000 < audioDurationMs + brainrotCtaDurationMs;
  const ctaText = scene.layout.ctaText || scene.creative.ctaText || "Learn more";
  const flashHeadline = rerollFlash?.roles.includes("headline")
    ? "wiggly-reroll-shine wiggly-reroll-shine-headline"
    : "";

  return (
    <div
      data-format="brainrot"
      data-brainrot-active-speaker={activeSpeaker}
      style={rootStyle}
    >
      <Video
        src={scene.layout.backgroundVideoSrc}
        style={videoStyle}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <div style={shadeStyle} />
      <Image
        alt=""
        src={scene.layout.characters.leftSpriteSrc}
        style={{
          ...spriteBaseStyle,
          left: "3.4cqw",
          opacity: activeSpeaker === "left" ? 1 : 0.42,
          transform: activeSpeaker === "left" ? "translateY(-1.1cqw) scale(1.05)" : "none",
        }}
      />
      <Image
        alt=""
        src={scene.layout.characters.rightSpriteSrc}
        style={{
          ...spriteBaseStyle,
          right: "3.4cqw",
          opacity: activeSpeaker === "right" ? 1 : 0.42,
          transform: activeSpeaker === "right" ? "translateY(-1.1cqw) scale(1.05)" : "none",
        }}
      />
      {showCta ? (
        <p
          className={flashHeadline}
          data-brainrot-cta="true"
          style={ctaStyle}
        >
          {ctaText}
        </p>
      ) : (
        <p
          className={flashHeadline}
          data-brainrot-caption="true"
          style={captionStyle}
        >
          {beat?.text || scene.creative.headline}
        </p>
      )}
    </div>
  );
}
