import type { ThreeDBreakdownAdScene } from "../../scene/types";

export function editThreeDBreakdownScriptBeat(
  scene: ThreeDBreakdownAdScene,
  beatIndex: number,
  narration: string,
): ThreeDBreakdownAdScene {
  if (!scene.layout.scriptBeats[beatIndex]) return scene;

  const scriptBeats = scene.layout.scriptBeats.map((beat, index) => (
    index === beatIndex ? { ...beat, narration } : beat
  )) as ThreeDBreakdownAdScene["layout"]["scriptBeats"];

  return {
    ...scene,
    audio: { status: "none", transcript: "", captions: [] },
    layout: {
      ...scene.layout,
      scriptBeats,
      finalVideo: undefined,
      storyContract: {
        ...scene.layout.storyContract,
        referenceScript: scriptBeats
          .map((beat) => beat.narration.trim())
          .filter(Boolean)
          .join(" "),
      },
    },
  };
}
