import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";
import { generateAdCandidatesFromResearch } from "../features/ad-generation/generate";
import { generateMemeVariantsFromResearch } from "../features/formats/meme/generate";
import { generateVideoMemeVariantsFromResearch } from "../features/formats/video-meme/generate";
import { generateWereSorryVariantsFromResearch } from "../features/formats/were-sorry/generate";
import { buildFallbackBrandBrief } from "../features/research/brandCurator";
import { createMemeAdScene } from "../features/scene/createMemeScene";
import { createVideoMemeAdScene } from "../features/scene/createVideoMemeScene";
import { createVisualizerAdScene } from "../features/scene/createVisualizerScene";
import { createWereSorryAdScene } from "../features/scene/createWereSorryScene";
import type { StoredWebsiteResearchResult } from "../features/research/types";
import type { AdScene } from "../features/scene/types";

const createGenerationBatchId = () => (
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
);

export const generateFromResearch: ReturnType<typeof action> = action({
  args: {
    researchRunId: v.id("researchRuns"),
    count: v.optional(v.number()),
    format: v.optional(v.union(v.literal("visualizer"), v.literal("meme"), v.literal("were-sorry"), v.literal("video-meme"))),
    memeModel: v.optional(v.string()),
    videoMemeTemplateId: v.optional(v.union(v.literal("bear-sniff"), v.literal("pingu-noot-noot"), v.literal("darwin-journey"))),
    visualizerModel: v.optional(v.string()),
  },
  handler: async (ctx, { researchRunId, count, format = "visualizer", memeModel, videoMemeTemplateId, visualizerModel }) => {
    const research = await ctx.runQuery(internal.adSceneStorage.loadResearchForGeneration, {
      researchRunId,
    });
    const generationBatchId = createGenerationBatchId();
    if (format === "meme") {
      const generation = await generateMemeVariantsFromResearch(research, { nvidiaNimModel: memeModel });
      const scenes = generation.variants.map((variant, index) => createMemeAdScene({
        research,
        variant,
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
    }

    if (format === "were-sorry") {
      const generation = await generateWereSorryVariantsFromResearch(research, { count });
      const scenes = generation.variants.map((variant, index) => createWereSorryAdScene({
        research,
        variant,
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
    }

    if (format === "video-meme") {
      const generation = await generateVideoMemeVariantsFromResearch(research, { count, templateId: videoMemeTemplateId });
      const scenes = generation.variants.map((variant, index) => createVideoMemeAdScene({
        research,
        variant,
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
    }

    const generation = await generateAdCandidatesFromResearch(research, {
      count,
      nvidiaNimModel: visualizerModel,
    });
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

export const latestForAnonymousId: ReturnType<typeof query> = query({
  args: {
    anonymousId: v.string(),
  },
  handler: async (ctx, { anonymousId }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", anonymousId))
      .first();
    if (!session) return null;

    const latestRows = await ctx.db
      .query("adScenes")
      .withIndex("by_sessionId_and_updatedAt", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(100);
    const latestBatchId = latestRows[0]?.generationBatchId;
    if (!latestBatchId) return null;

    const batchRows = latestRows
      .filter((row) => row.generationBatchId === latestBatchId)
      .sort((a, b) => (a.candidateIndex ?? 0) - (b.candidateIndex ?? 0));
    const firstRow = batchRows[0];
    if (!firstRow?.researchRunId) return null;

    const researchRun = await ctx.db.get(firstRow.researchRunId);
    if (!researchRun || researchRun.status !== "ready") return null;

    const brandSnapshot = await ctx.db
      .query("brandSnapshots")
      .withIndex("by_researchRunId", (q) => q.eq("researchRunId", firstRow.researchRunId!))
      .first();
    if (!brandSnapshot || !researchRun.evidence) return null;

    const research = {
      sessionId: researchRun.sessionId,
      researchRunId: firstRow.researchRunId,
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
      adAngles: researchRun.adAngles || [],
      providerStatus: researchRun.providerStatus || [],
    };

    return {
      result: {
        ...research,
        brandBrief: researchRun.brandBrief || buildFallbackBrandBrief(research),
      } satisfies StoredWebsiteResearchResult,
      scenes: batchRows.map((row) => row.scene as AdScene),
    };
  },
});
