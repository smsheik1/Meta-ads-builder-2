import { Composition } from "remotion";
import type { AdScene } from "../features/scene/types";
import { defaultRenderScene } from "./fixture";
import { RemotionAdScene } from "./RemotionAdScene";

export const adSceneCompositionId = "AdSceneMp4";
export const adSceneFps = 60;
export const adSceneDurationInFrames = adSceneFps * 5;

export const getAdSceneDurationInFrames = (
  scene: AdScene,
  fps = adSceneFps,
) => {
  const audioDurationSeconds = scene.audio.status === "generated"
    ? scene.audio.durationSeconds
    : 0;
  const durationSeconds = Math.max(5, audioDurationSeconds + 0.35);
  return Math.ceil(durationSeconds * fps);
};

export function RemotionRoot() {
  return (
    <Composition
      id={adSceneCompositionId}
      component={RemotionAdScene}
      width={1080}
      height={1350}
      fps={adSceneFps}
      durationInFrames={adSceneDurationInFrames}
      calculateMetadata={({ props }) => ({
        durationInFrames: getAdSceneDurationInFrames(props.scene),
      })}
      defaultProps={{
        scene: defaultRenderScene,
      }}
    />
  );
}
