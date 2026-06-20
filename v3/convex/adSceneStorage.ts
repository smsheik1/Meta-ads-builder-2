import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { AdScene } from "../features/scene/types";
import { toStoredResearchResult } from "./researchStorage";

export const loadResearchForGeneration: ReturnType<typeof internalQuery> = internalQuery({
  args: {
    researchRunId: v.id("researchRuns"),
  },
  handler: async (ctx, { researchRunId }) => {
    const researchRun = await ctx.db.get(researchRunId);
    if (!researchRun) throw new Error("Research run not found.");
    if (researchRun.status !== "ready") throw new Error("Research run is not ready yet.");

    const brandSnapshot = await ctx.db
      .query("brandSnapshots")
      .withIndex("by_researchRunId", (q) => q.eq("researchRunId", researchRunId))
      .first();
    if (!brandSnapshot) throw new Error("Brand snapshot not found.");
    if (!researchRun.evidence || !researchRun.receipts) {
      throw new Error("Research run is missing website evidence.");
    }

    return toStoredResearchResult(researchRun, brandSnapshot, researchRunId);
  },
});

export const saveGeneratedScenes: ReturnType<typeof internalMutation> = internalMutation({
  args: {
    sessionId: v.string(),
    researchRunId: v.id("researchRuns"),
    brandSnapshotId: v.id("brandSnapshots"),
    scenes: v.array(v.any()),
  },
  handler: async (ctx, { sessionId, researchRunId, brandSnapshotId, scenes }) => {
    const now = Date.now();
    const sceneIds = [];

    for (const scene of scenes as AdScene[]) {
      const sceneId = await ctx.db.insert("adScenes", {
        sessionId,
        researchRunId,
        brandSnapshotId,
        format: scene.format,
        generationBatchId: scene.metadata.generationBatchId,
        candidateIndex: scene.metadata.candidateIndex,
        model: scene.metadata.model,
        provider: scene.metadata.provider,
        scene,
        createdAt: now,
        updatedAt: now,
      });
      sceneIds.push(sceneId);
    }

    return { sceneIds };
  },
});

export const patchScene: ReturnType<typeof internalMutation> = internalMutation({
  args: {
    sceneId: v.id("adScenes"),
    scene: v.any(),
  },
  handler: async (ctx, { sceneId, scene }) => {
    await ctx.db.patch(sceneId, {
      scene,
      updatedAt: Date.now(),
    });
  },
});
