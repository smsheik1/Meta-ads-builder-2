import { Composition } from "remotion";
import { brainrotCtaDurationMs } from "../features/formats/brainrot/render";
import type { AdScene } from "../features/scene/types";
import { defaultRenderScene } from "./fixture";
import { RemotionAdScene } from "./RemotionAdScene";

export const adSceneCompositionId = "AdSceneMp4";
export const adSceneFps = 60;
export const adSceneDurationInFrames = adSceneFps * 5;

export const getAdSceneDimensions = (scene: AdScene) => (
  scene.format === "three-d-breakdown"
    ? { width: 1080, height: 1920 }
    : { width: 1080, height: 1350 }
);

export const getAdSceneDurationInFrames = (
  scene: AdScene,
  fps = adSceneFps,
) => {
  const audioDurationSeconds = scene.audio.status === "generated"
    ? scene.audio.durationSeconds
    : 0;
  if (scene.format === "video-meme") {
    return Math.ceil(Math.max(1, scene.layout.durationSeconds, audioDurationSeconds + 0.35) * fps);
  }
  if (scene.format === "motion-story" || scene.format === "three-d-breakdown") {
    return Math.ceil((scene.layout.durationMs / 1000) * fps);
  }
  const extraSeconds = scene.format === "brainrot" ? brainrotCtaDurationMs / 1000 : 0.35;
  const durationSeconds = Math.max(5, audioDurationSeconds + extraSeconds);
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
        ...getAdSceneDimensions(props.scene),
      })}
      defaultProps={{
        scene: defaultRenderScene,
      }}
    />
  );
}
