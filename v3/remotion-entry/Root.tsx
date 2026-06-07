import { Composition } from "remotion";
import { defaultRenderScene } from "./fixture";
import { RemotionAdScene } from "./RemotionAdScene";

export const adSceneCompositionId = "AdSceneMp4";
export const adSceneFps = 60;
export const adSceneDurationInFrames = adSceneFps * 5;

export function RemotionRoot() {
  return (
    <Composition
      id={adSceneCompositionId}
      component={RemotionAdScene}
      width={1080}
      height={1350}
      fps={adSceneFps}
      durationInFrames={adSceneDurationInFrames}
      defaultProps={{
        scene: defaultRenderScene,
      }}
    />
  );
}
