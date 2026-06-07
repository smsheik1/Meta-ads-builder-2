import { Audio } from "@remotion/media";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import type { AdScene } from "../features/scene/types";

export function RemotionAdScene({ scene }: { scene: AdScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audio = scene.audio.status === "generated" && scene.audio.url
    ? scene.audio
    : null;

  return (
    <AbsoluteFill style={{ background: scene.style.backgroundColor }}>
      {audio ? <Audio src={audio.url} /> : null}
      <AdRenderSurface
        scene={scene}
        mode="video"
        timeSeconds={frame / fps}
        style={{ width: "100%" }}
      />
    </AbsoluteFill>
  );
}
