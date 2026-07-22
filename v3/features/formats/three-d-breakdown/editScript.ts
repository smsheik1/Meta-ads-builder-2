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
    creative: beatIndex === 4
      ? { ...scene.creative, ctaText: narration }
      : scene.creative,
    audio: { status: "none", transcript: "", captions: [] },
    layout: {
      ...scene.layout,
      scriptBeats,
      finalVideo: undefined,
      storyContract: {
        ...scene.layout.storyContract,
        ...(beatIndex === 4 ? { ctaLine: narration } : {}),
        referenceScript: scriptBeats
          .map((beat) => beat.narration.trim())
          .filter(Boolean)
          .join(" "),
      },
    },
  };
}
