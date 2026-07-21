import type {
  ThreeDBreakdownAdScene,
  ThreeDBreakdownClipIndex,
  ThreeDBreakdownStoryboardFrameIndex,
} from "../../scene/types";

type StoryboardFrame = NonNullable<NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>["frames"]>[number];
type StoryboardBoard = NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>;

export type ThreeDBreakdownMediaPromptTarget =
  | { kind: "storyboard" }
  | { kind: "anchor"; frameIndex: ThreeDBreakdownStoryboardFrameIndex }
  | { kind: "clip"; clipIndex: ThreeDBreakdownClipIndex };

export const formatThreeDAnchorPrompt = (frame: StoryboardFrame) => [
  `Frame ${frame.frameIndex}: ${frame.label}`,
  `Role: ${frame.role}`,
  frame.visual ? `Visual: ${frame.visual}` : null,
  frame.camera ? `Camera: ${frame.camera}` : null,
  frame.motion ? `Motion: ${frame.motion}` : null,
  frame.overlayText ? `Renderer overlay: ${frame.overlayText}` : null,
  frame.editingNote ? `Editing note: ${frame.editingNote}` : null,
].filter(Boolean).join("\n");

export const getThreeDAnchorPrompt = (frame: StoryboardFrame) => (
  frame.anchorPrompt ?? formatThreeDAnchorPrompt(frame)
);

export const getThreeDStoryboardPrompt = (board: StoryboardBoard) => (
  board.creativePrompt
  ?? board.frames?.map(formatThreeDAnchorPrompt).join("\n\n")
  ?? board.imagePrompt
);

const idleMedia = () => ({ status: "idle" as const });

export function editThreeDBreakdownMediaPrompt(
  scene: ThreeDBreakdownAdScene,
  target: ThreeDBreakdownMediaPromptTarget,
  prompt: string,
): ThreeDBreakdownAdScene {
  const storyboardBoard = scene.layout.storyboardBoard;
  const clipPlans = scene.layout.clipPlans;
  if (!storyboardBoard || !clipPlans) return scene;

  if (target.kind === "storyboard") {
    return {
      ...scene,
      layout: {
        ...scene.layout,
        finalVideo: undefined,
        storyboardBoard: {
          ...storyboardBoard,
          creativePrompt: prompt,
          image: idleMedia(),
          frames: storyboardBoard.frames?.map((frame) => ({ ...frame, image: idleMedia() })),
        },
        clipPlans: clipPlans.map((plan) => ({
          ...plan,
          endFrameImage: undefined,
          video: idleMedia(),
        })),
      },
    };
  }

  if (target.kind === "anchor") {
    const affectedClipIndex = clipPlans.find((plan) => plan.frameIndexes[0] === target.frameIndex)?.clipIndex;
    const affectedAnchorIndexes = new Set(clipPlans
      .filter((plan) => plan.frameIndexes[0] >= target.frameIndex)
      .map((plan) => plan.frameIndexes[0]));
    return {
      ...scene,
      layout: {
        ...scene.layout,
        finalVideo: undefined,
        storyboardBoard: {
          ...storyboardBoard,
          frames: storyboardBoard.frames?.map((frame) => ({
            ...frame,
            ...(frame.frameIndex === target.frameIndex ? { anchorPrompt: prompt } : {}),
            ...(affectedAnchorIndexes.has(frame.frameIndex) ? { image: idleMedia() } : {}),
          })),
        },
        clipPlans: clipPlans.map((plan) => (
          affectedClipIndex && plan.clipIndex >= affectedClipIndex
            ? { ...plan, video: idleMedia() }
            : plan
        )),
      },
    };
  }

  if (!clipPlans.some((plan) => plan.clipIndex === target.clipIndex)) return scene;
  return {
    ...scene,
    layout: {
      ...scene.layout,
      finalVideo: undefined,
      clipPlans: clipPlans.map((plan) => ({
        ...plan,
        ...(plan.clipIndex === target.clipIndex ? { prompt } : {}),
        ...(plan.clipIndex >= target.clipIndex ? { video: idleMedia() } : {}),
      })),
    },
  };
}
