import { v } from "convex/values";
import { action } from "./_generated/server";
import { generateDialogueScriptsForScene } from "../features/dialogue/dialogueScripts";
import { assertShareableAdScene } from "../features/share/shareScene";

export const generateForScene: ReturnType<typeof action> = action({
  args: {
    scene: v.any(),
    count: v.optional(v.number()),
  },
  handler: async (_ctx, { scene, count }) => {
    const audioScene = assertShareableAdScene(scene);
    return generateDialogueScriptsForScene(audioScene, { count });
  },
});
