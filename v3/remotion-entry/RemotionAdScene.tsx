import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { buildWigglyFontFaceCss } from "../features/render/fontStack";
import type { AdScene } from "../features/scene/types";

const remotionFontFaceCss = buildWigglyFontFaceCss((path) => staticFile(path.replace(/^\//, "")));

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
        fontFaceCss={remotionFontFaceCss}
        style={{ width: "100%" }}
      />
    </AbsoluteFill>
  );
}
