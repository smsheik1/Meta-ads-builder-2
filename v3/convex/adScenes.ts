import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";
import { generateAdCandidatesFromResearch } from "../features/ad-generation/generate";
import { createVisualizerAdScene } from "../features/scene/createVisualizerScene";

const createGenerationBatchId = () => (
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
);

export const generateFromResearch: ReturnType<typeof action> = action({
  args: {
    researchRunId: v.id("researchRuns"),
    count: v.optional(v.number()),
  },
  handler: async (ctx, { researchRunId, count }) => {
    const research = await ctx.runQuery(internal.adSceneStorage.loadResearchForGeneration, {
      researchRunId,
    });
    const generationBatchId = createGenerationBatchId();
    const generation = await generateAdCandidatesFromResearch(research, { count });
    const scenes = generation.candidates.map((candidate, index) => createVisualizerAdScene({
      research,
      candidate,
      candidateIndex: index,
      generationBatchId,
      model: generation.model,
      provider: generation.provider,
    }));

    const { sceneIds } = await ctx.runMutation(internal.adSceneStorage.saveGeneratedScenes, {
      sessionId: research.sessionId,
      researchRunId,
      brandSnapshotId: research.brandSnapshotId,
      scenes,
    });

    return {
      generationBatchId,
      sceneIds,
      scenes,
      providerStatus: generation.providerStatus,
    };
  },
});

export const listForResearchRun: ReturnType<typeof query> = query({
  args: {
    researchRunId: v.id("researchRuns"),
  },
  handler: async (ctx, { researchRunId }) => ctx.db
    .query("adScenes")
    .withIndex("by_researchRunId", (q) => q.eq("researchRunId", researchRunId))
    .order("desc")
    .take(100),
});
