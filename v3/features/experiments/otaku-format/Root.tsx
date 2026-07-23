import { Composition } from "remotion";
import assets from "../../../public/format-repositories/otaku-explainer-v1/assets.json";
import { OtakuProofVideo, proofDurationMs, type OtakuProofRun } from "./OtakuProofVideo";

export const otakuCompositionId = "OtakuFormatProof";
export const otakuFps = 30;

const defaultRun = {
  id: "otaku-format-preview",
  title: "Otaku Format preview",
  input: {
    topic: "How APIs work",
    storyWorld: "naruto",
    cast: ["naruto", "kakashi"],
  },
  rendererVersion: "otaku-format-renderer@1.1.0-experiment",
  musicPath: "format-repositories/otaku-explainer-v1/assets/audio/background-music.mp3",
  musicLoop: true,
  musicVolume: 0.1,
  scenes: [{
    id: "preview",
    speaker: "naruto",
    dialogue: "A request goes to an API and brings a response back.",
    background: "bg-konoha",
    estimatedDurationMs: 4_000,
    characters: [
      { asset: "naruto", x: 6, bottom: 2, width: 42, rotate: -1 },
      { asset: "kakashi", x: 53, bottom: 2, width: 41, rotate: 1 },
    ],
    callout: { label: "REQUEST", theme: "cool" as const },
  }],
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
