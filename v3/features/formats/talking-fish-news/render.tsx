import type { CSSProperties } from "react";
import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import type { TalkingFishNewsProofScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const rootStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: "#052437",
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

  return (
    <div data-format="talking-fish-news" data-talking-fish-news-beat={activeIndex + 1} style={rootStyle}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 72% 10%, rgba(99,228,210,0.25), transparent 36%), linear-gradient(180deg, #0A5267 0%, #06283A 100%)",
        }}
      />
      <section
        aria-label="Evidence panel"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "65%",
          padding: "4.5cqw 4.5cqw 2.4cqw",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2cqw", fontSize: "2.35cqw", fontWeight: 900, letterSpacing: "0.13em" }}>
          <span>{scene.layout.stationName}</span>
          <span style={{ border: "0.28cqw solid #63E4D2", borderRadius: "999px", padding: "0.8cqw 1.8cqw", color: "#63E4D2" }}>REPORT</span>
        </div>
        <div
          style={{
            position: "absolute",
            top: "11cqw",
            left: "4.5cqw",
            right: "4.5cqw",
            bottom: "2.2cqw",
            display: "grid",
            placeItems: "center",
            border: "0.38cqw solid rgba(247,255,254,0.9)",
            borderRadius: "2.2cqw",
            overflow: "hidden",
            background: "rgba(4, 20, 34, 0.66)",
            boxShadow: "0 2.2cqw 5cqw rgba(0,0,0,0.24)",
          }}
        >
          <Image
            alt="Wiggly evidence"
            src={beat.proofSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity: proofOpacity,
              transform: `scale(${1 + Math.min(0.035, elapsedMs / 70000)})`,
            }}
          />
          {activeIndex !== scene.layout.beats.length - 1 ? (
            <Image
              alt="Upcoming Wiggly evidence"
              src={nextBeat.proofSrc}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
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
          height: "35%",
          overflow: "hidden",
          background: "linear-gradient(180deg, rgba(7,47,64,0.96), #031623 72%)",
          borderTop: "0.45cqw solid #63E4D2",
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
            opacity: 0.3,
          }}
        />
        <div style={{ position: "absolute", inset: 0, opacity: 0.28, backgroundImage: "linear-gradient(90deg, transparent 49.5%, rgba(99,228,210,0.45) 50%, transparent 50.5%), linear-gradient(0deg, transparent 49.5%, rgba(99,228,210,0.34) 50%, transparent 50.5%)", backgroundSize: "8cqw 8cqw" }} />
        <Image
          alt="Fixed fish anchor"
          src={scene.layout.anchorImageSrc}
          style={{
            position: "absolute",
            left: "50%",
            bottom: "-4cqw",
            width: "50cqw",
            height: "54cqw",
            objectFit: "contain",
            transform: "translateX(-50%)",
            filter: "drop-shadow(0 1.2cqw 1.8cqw rgba(0,0,0,0.35))",
          }}
        />
        <div style={{ position: "absolute", left: "-4cqw", right: "-4cqw", bottom: "5.4cqw", height: "8.8cqw", borderTop: "0.35cqw solid rgba(247,255,254,0.45)", borderRadius: "50% 50% 0 0", background: "linear-gradient(180deg, #184D65, #0B2A3D)" }} />
        <div
          data-talking-fish-news-caption="true"
          style={{
            position: "absolute",
            left: "4.5cqw",
            right: "4.5cqw",
            bottom: "7.2cqw",
            borderLeft: "1.4cqw solid #63E4D2",
            background: "rgba(1, 12, 22, 0.86)",
            padding: "1.5cqw 2.1cqw",
            fontSize: "4cqw",
            fontWeight: 950,
            lineHeight: 0.98,
            letterSpacing: 0,
            textAlign: "center",
            textWrap: "balance",
            boxShadow: "0 1.1cqw 2.8cqw rgba(0,0,0,0.25)",
          }}
        >
          {beat.caption}
        </div>
        <div style={{ position: "absolute", left: "4.5cqw", right: "4.5cqw", bottom: "1.7cqw", display: "flex", justifyContent: "space-between", gap: "2cqw", color: "#B9F6ED", fontSize: "1.85cqw", fontWeight: 800, letterSpacing: "0.09em" }}>
          <span>BREAKING NEWS</span>
          <span>{scene.layout.linkText}</span>
        </div>
      </section>
    </div>
  );
}
