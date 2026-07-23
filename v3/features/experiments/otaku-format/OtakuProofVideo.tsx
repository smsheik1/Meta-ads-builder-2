import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  OtakuFormatRenderer,
  type OtakuAssetLibrary,
  type OtakuScene,
} from "../../../public/format-repositories/otaku-explainer-v1/renderer/OtakuFormatRenderer";

export type OtakuProofRun = {
  id: string;
  title: string;
  input: {
    topic: string;
    storyWorld: string;
    cast: string[];
  };
  rendererVersion: string;
  musicPath: string;
  musicLoop?: boolean;
  musicVolume: number;
  scenes: OtakuScene[];
};

export const sceneDuration = (scene: OtakuScene) => scene.durationMs || scene.estimatedDurationMs;

export const proofDurationMs = (run: OtakuProofRun) => (
  run.scenes.reduce((total, scene) => total + sceneDuration(scene), 0)
);

export function OtakuProofVideo({ assets, run }: { assets: OtakuAssetLibrary; run: OtakuProofRun }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  let sceneStartMs = 0;
  let activeScene = run.scenes[run.scenes.length - 1];
  let activeSceneStartMs = Math.max(0, proofDurationMs(run) - sceneDuration(activeScene));

  for (const scene of run.scenes) {
    const durationMs = sceneDuration(scene);
    if (timeMs < sceneStartMs + durationMs) {
      activeScene = scene;
      activeSceneStartMs = sceneStartMs;
      break;
    }
    sceneStartMs += durationMs;
  }

  let audioStartMs = 0;
  const audio = run.scenes.map((scene) => {
    const durationMs = sceneDuration(scene);
    const from = Math.round((audioStartMs / 1000) * fps);
    audioStartMs += durationMs;
    if (!scene.audioPath) return null;
    return (
      <Sequence key={scene.id} from={from} durationInFrames={Math.ceil((durationMs / 1000) * fps)}>
        <Audio src={staticFile(scene.audioPath)} volume={1} />
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ background: "#101827" }}>
      <Audio src={staticFile(run.musicPath)} volume={run.musicVolume} loop={run.musicLoop !== false} />
      {audio}
      <OtakuFormatRenderer
        assets={assets}
        scene={activeScene}
        durationMs={sceneDuration(activeScene)}
        timeInSceneMs={timeMs - activeSceneStartMs}
        resolveAsset={(localPath) => staticFile(`format-repositories/otaku-explainer-v1/${localPath}`)}
      />
    </AbsoluteFill>
  );
}
