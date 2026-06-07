import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import type { AdScene } from "../features/scene/types";

export function RemotionAdScene({ scene }: { scene: AdScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: scene.style.backgroundColor }}>
      <AdRenderSurface
        scene={scene}
        mode="video"
        timeSeconds={frame / fps}
        style={{ width: "100%" }}
      />
    </AbsoluteFill>
  );
}
