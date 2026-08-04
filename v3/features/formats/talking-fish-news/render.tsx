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
  const timeMs = timeSeconds * 1000;
  const speechSegment = scene.layout.speechSegments.find((segment) => (
    timeMs >= segment.startMs && timeMs < segment.endMs
  ));
  const caption = scene.audio.captions.find((item) => (
    timeMs >= item.startMs && timeMs < item.endMs
  ));
  const mouthOpen = speechSegment
    ? Math.floor((timeMs - speechSegment.startMs) / 150) % 2 === 0
    : false;

  const anchorStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center bottom",
    transform: "translateY(5cqw)",
    filter: "drop-shadow(0 1.2cqw 1.8cqw rgba(0,0,0,0.26))",
  };

  return (
    <div data-format="talking-fish-news" data-talking-fish-news-beat={activeIndex + 1} style={rootStyle}>
      <div
        aria-hidden="true"
        data-talking-fish-news-studio="true"
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(ellipse at 24% 18%, rgba(255,255,255,0.22) 0 5%, transparent 5.4%)",
            "radial-gradient(ellipse at 70% 32%, rgba(255,255,255,0.13) 0 9%, transparent 9.5%)",
            "radial-gradient(ellipse at 38% 58%, rgba(89,55,138,0.2) 0 13%, transparent 13.5%)",
            "linear-gradient(180deg, #A98ADE 0%, #9A76CB 54%, #8763B8 100%)",
          ].join(","),
        }}
      />
      <section
        aria-label="News evidence inset"
        data-talking-fish-news-evidence-inset="true"
        style={{
          position: "absolute",
          top: "22cqw",
          left: "18cqw",
          width: "40cqw",
          height: "35cqw",
          overflow: "hidden",
          border: "0.75cqw solid #29485D",
          borderRadius: "0.7cqw",
          background: "#18293A",
          boxShadow: "0 1.2cqw 2cqw rgba(26,18,50,0.35)",
          zIndex: 3,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            background: "#18293A",
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
          right: "1cqw",
          bottom: 0,
          width: "82cqw",
          height: "128cqw",
          overflow: "hidden",
          zIndex: 4,
        }}
      >
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
            left: "-28cqw",
            right: "-2cqw",
            bottom: 0,
            height: "18cqw",
            borderTop: "0.55cqw solid rgba(18,61,69,0.9)",
            background: "linear-gradient(180deg, #2CBCC3, #168791)",
          }}
        />
        <div
          data-talking-fish-news-caption="true"
          style={{
            position: "absolute",
            left: "-21cqw",
            right: "3cqw",
            bottom: "27cqw",
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
          {caption?.text ?? ""}
        </div>
      </section>

      <Image
        alt="Underwater television frame"
        data-talking-fish-news-tv-frame="true"
        src="/talking-fish-news-assets/tv-frame-overlay.png"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
    </div>
  );
}
