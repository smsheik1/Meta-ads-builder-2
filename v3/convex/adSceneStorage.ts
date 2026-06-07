import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { StoredWebsiteResearchResult } from "../features/research/types";
import type { AdScene } from "../features/scene/types";

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

    return {
      sessionId: researchRun.sessionId,
      researchRunId,
      brandSnapshotId: brandSnapshot._id,
      websiteUrl: researchRun.url,
      finalUrl: researchRun.finalUrl || brandSnapshot.url,
      host: researchRun.host || brandSnapshot.host || "",
      brand: {
        name: brandSnapshot.name,
        url: brandSnapshot.url,
        host: brandSnapshot.host || "",
        title: brandSnapshot.title || "",
        description: brandSnapshot.description || "",
        faviconUrl: brandSnapshot.faviconUrl || null,
        logoUrl: brandSnapshot.logoUrl || null,
        ogImageUrl: brandSnapshot.ogImageUrl || null,
        screenshotUrl: brandSnapshot.screenshotUrl || null,
        colors: brandSnapshot.colors,
        fonts: brandSnapshot.fonts,
        vibeTags: brandSnapshot.vibeTags,
      },
      evidence: researchRun.evidence,
      metadata: researchRun.metadata || {},
      branding: researchRun.branding || {},
      providerStatus: researchRun.providerStatus || [],
    } satisfies StoredWebsiteResearchResult;
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
