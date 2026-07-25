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
      storyboardBoard: scene.layout.storyboardBoard
        ? {
            ...scene.layout.storyboardBoard,
            image: { status: "idle" },
            frames: scene.layout.storyboardBoard.frames?.map((frame) => ({
              ...frame,
              image: { status: "idle" },
            })),
          }
        : undefined,
      clipPlans: scene.layout.clipPlans?.map((clip) => ({
        ...clip,
        endFrameImage: undefined,
        video: { status: "idle" },
      })),
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
