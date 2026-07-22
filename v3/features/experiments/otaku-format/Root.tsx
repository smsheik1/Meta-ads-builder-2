import { Composition } from "remotion";
import assets from "../../../public/format-repositories/otaku-explainer-v1/assets.json";
import sourceRun from "../../../public/format-repositories/otaku-explainer-v1/scenes/naruto-compilers.json";
import { OtakuProofVideo, proofDurationMs, type OtakuProofRun } from "./OtakuProofVideo";

export const otakuCompositionId = "OtakuFormatProof";
export const otakuFps = 30;

const defaultRun = {
  ...sourceRun,
  rendererVersion: "otaku-format-renderer@1.0.0-experiment",
  musicPath: "format-repositories/otaku-explainer-v1/assets/audio/background-music.mp3",
  musicVolume: 0.1,
} as OtakuProofRun;

export function OtakuFormatRoot() {
  return (
    <Composition
      id={otakuCompositionId}
      component={OtakuProofVideo}
      width={720}
      height={1280}
      fps={otakuFps}
      durationInFrames={Math.ceil((proofDurationMs(defaultRun) / 1000) * otakuFps)}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.ceil((proofDurationMs(props.run) / 1000) * otakuFps),
      })}
      defaultProps={{ assets, run: defaultRun }}
    />
  );
}
