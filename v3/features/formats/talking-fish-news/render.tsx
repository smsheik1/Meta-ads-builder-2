import type { CSSProperties } from "react";
import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import type { TalkingFishNewsProofScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const rootStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: "#0A7185",
  color: "#F7FFFE",
  containerType: "inline-size",
};

const getActiveBeatIndex = (scene: TalkingFishNewsProofScene, timeSeconds: number) => {
  const timeMs = Math.max(0, timeSeconds * 1000);
  return scene.layout.beats.findIndex((beat) => timeMs >= beat.startMs && timeMs < beat.endMs);
};

export function TalkingFishNewsRenderer({
  scene,
  timeSeconds = 0,
}: FormatRenderProps<TalkingFishNewsProofScene>) {
  const { Image } = useRenderAssetComponents();
  const activeIndex = Math.max(0, getActiveBeatIndex(scene, timeSeconds));
  const beat = scene.layout.beats[activeIndex] ?? scene.layout.beats[scene.layout.beats.length - 1];
  const nextBeat = scene.layout.beats[Math.min(activeIndex + 1, scene.layout.beats.length - 1)];
  const elapsedMs = Math.max(0, timeSeconds * 1000 - beat.startMs);
  const remainingMs = Math.max(0, beat.endMs - timeSeconds * 1000);
  const fadeIn = Math.min(1, elapsedMs / 220);
  const fadeOut = Math.min(1, remainingMs / 220);
  const proofOpacity = Math.min(fadeIn, fadeOut);
  const mouthOpen = timeSeconds * 1000 < scene.layout.durationMs
    && Math.floor((timeSeconds * 1000) / 150) % 2 === 1;

  const anchorStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    filter: "drop-shadow(0 1.2cqw 1.8cqw rgba(0,0,0,0.26))",
  };

  return (
    <div data-format="talking-fish-news" data-talking-fish-news-beat={activeIndex + 1} style={rootStyle}>
      <section
        aria-label="Evidence panel"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          overflow: "hidden",
          background: "#081621",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            background: "#F7FBFF",
          }}
        >
          <Image
            alt="News evidence"
            src={beat.proofSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: proofOpacity,
              transform: `scale(${1 + Math.min(0.02, elapsedMs / 100000)})`,
            }}
          />
          {activeIndex !== scene.layout.beats.length - 1 ? (
            <Image
              alt="Upcoming news evidence"
              src={nextBeat.proofSrc}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: Math.max(0, 1 - proofOpacity),
              }}
            />
          ) : null}
        </div>
      </section>

      <section
        aria-label="Fish report desk"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "50%",
          overflow: "hidden",
          background: "#42ADCA",
          borderTop: "0.4cqw solid rgba(255,255,255,0.9)",
        }}
      >
        <Image
          alt="Underwater studio texture"
          src="/talking-fish-news-assets/underwater-studio-background.png"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 1,
          }}
        />
        <div data-talking-fish-news-mouth={mouthOpen ? "open" : "closed"}>
          <Image
            alt="Fish anchor, mouth closed"
            src={scene.layout.anchorClosedImageSrc}
            style={{ ...anchorStyle, opacity: mouthOpen ? 0 : 1 }}
          />
          <Image
            alt="Fish anchor, mouth open"
            src={scene.layout.anchorOpenImageSrc}
            style={{ ...anchorStyle, opacity: mouthOpen ? 1 : 0 }}
          />
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "12cqw",
            borderTop: "0.45cqw solid rgba(40,25,14,0.78)",
            background: "linear-gradient(180deg, #806839, #4C361D)",
          }}
        />
        <div
          data-talking-fish-news-caption="true"
          style={{
            position: "absolute",
            left: "5cqw",
            right: "5cqw",
            bottom: "39cqw",
            fontSize: "6.4cqw",
            fontWeight: 950,
            lineHeight: 1.02,
            letterSpacing: 0,
            textAlign: "center",
            textWrap: "balance",
            color: "#FFFFFF",
            WebkitTextStroke: "0.38cqw #F06B76",
            paintOrder: "stroke fill",
            textShadow: "0 0.48cqw 0.32cqw rgba(54,19,28,0.78)",
          }}
        >
          {beat.caption}
        </div>
      </section>
    </div>
  );
}
