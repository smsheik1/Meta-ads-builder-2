import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { generateAdCandidatesFromResearch } from "../features/ad-generation/generate";
import { generateMemeVariantsFromResearch } from "../features/formats/meme/generate";
import { generateJingleVariantsFromResearch } from "../features/formats/jingle/generate";
import { generateBrainrotVariantsFromResearch } from "../features/formats/brainrot/generate";
import { removeProductBackground } from "../features/formats/motion-story/cutout";
import { generateMotionStoryVariantsFromResearch, pickMotionStoryProduct } from "../features/formats/motion-story/generate";
import { generateReviewsVariantsFromResearch } from "../features/formats/reviews/generate";
import { normalizeReviewProductHandles, productCatalogHasProductImage } from "../features/formats/reviews/productSelection";
import { generateTextMessageVariantsFromResearch } from "../features/formats/text-message/generate";
import {
  generateThreeDBreakdownStoryDirectionsFromResearch,
  generateThreeDBreakdownVariantsFromResearch,
} from "../features/formats/three-d-breakdown/generate";
import { generateVideoMemeVariantsFromResearch } from "../features/formats/video-meme/generate";
import { generateWereSorryVariantsFromResearch } from "../features/formats/were-sorry/generate";
import { fetchEcommerceProductCatalog } from "../features/research/productCatalog";
import { createMemeAdScene } from "../features/scene/createMemeScene";
import { createJingleAdScene } from "../features/scene/createJingleScene";
import { createBrainrotAdScene } from "../features/scene/createBrainrotScene";
import { createMotionStoryAdScene } from "../features/scene/createMotionStoryScene";
import { createReviewsAdScenes, REVIEWS_SCENE_TEMPLATES } from "../features/scene/createReviewsScene";
import { createVideoMemeAdScene } from "../features/scene/createVideoMemeScene";
import { createTextMessageAdScene } from "../features/scene/createTextMessageScene";
import { createThreeDBreakdownAdScene } from "../features/scene/createThreeDBreakdownScene";
import { createVisualizerAdScene } from "../features/scene/createVisualizerScene";
import { createWereSorryAdScene } from "../features/scene/createWereSorryScene";
import type { StoredWebsiteResearchResult } from "../features/research/types";
import type { AdScene } from "../features/scene/types";
import { toStoredResearchResult } from "./researchStorage";

const createGenerationBatchId = () => (
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
);

const threeDStoryDirectionValidator = v.object({
  directionId: v.string(),
  hookLine: v.string(),
  subheadline: v.string(),
  shortSummary: v.string(),
  category: v.string(),
  whyCompelling: v.string(),
  adAngle: v.string(),
  visualEngine: v.string(),
  evidenceIndex: v.number(),
  evidenceUseType: v.union(v.literal("feature"), v.literal("mechanism"), v.literal("offer"), v.literal("review"), v.literal("material"), v.literal("process"), v.literal("guarantee"), v.literal("shipping"), v.literal("proof"), v.literal("category"), v.literal("claim")),
  possibleRevealPatterns: v.array(v.union(v.literal("exploded-product"), v.literal("xray-cutaway"), v.literal("chaos-to-order"), v.literal("physicalized-ui"), v.literal("invisible-problem"), v.literal("miniature-world"), v.literal("process-pipeline"), v.literal("proof-blocks"), v.literal("before-after-reconstruction"), v.literal("impact-chain"))),
});

export const generateThreeDStoryDirections: ReturnType<typeof action> = action({
  args: {
    researchRunId: v.id("researchRuns"),
  },
  handler: async (ctx, { researchRunId }) => {
    const startedAt = Date.now();
    console.log("[wiggly:ad-generation] 3d-story-slate:start", {
      researchRunId: String(researchRunId),
    });
    const research = await ctx.runQuery(internal.adSceneStorage.loadResearchForGeneration, {
      researchRunId,
    });
    const generation = await generateThreeDBreakdownStoryDirectionsFromResearch(research);
    console.log("[wiggly:ad-generation] 3d-story-slate:ready", {
      elapsedMs: Date.now() - startedAt,
      storyDirectionCount: generation.directions.length,
    });
    return generation;
  },
});

export const generateFromResearch: ReturnType<typeof action> = action({
  args: {
    researchRunId: v.id("researchRuns"),
    count: v.optional(v.number()),
    format: v.optional(v.union(v.literal("visualizer"), v.literal("meme"), v.literal("were-sorry"), v.literal("video-meme"), v.literal("jingle"), v.literal("text-message"), v.literal("brainrot"), v.literal("reviews"), v.literal("motion-story"), v.literal("three-d-breakdown"))),
    memeModel: v.optional(v.string()),
    videoMemeTemplateId: v.optional(v.union(v.literal("bear-sniff"), v.literal("pingu-noot-noot"), v.literal("darwin-journey"))),
    visualizerModel: v.optional(v.string()),
    jingleStyleId: v.optional(v.union(v.literal("modern-hip-hop"), v.literal("cinematic-trap-diss"), v.literal("pop-rap-hook"), v.literal("retail-dance"), v.literal("funky-commercial"))),
    selectedProductHandles: v.optional(v.array(v.string())),
    threeDStoryDirection: v.optional(threeDStoryDirectionValidator),
  },
  handler: async (ctx, { researchRunId, count, format = "visualizer", memeModel, videoMemeTemplateId, visualizerModel, jingleStyleId, selectedProductHandles, threeDStoryDirection }) => {
    const startedAt = Date.now();
    const generationBatchId = createGenerationBatchId();
    console.log("[wiggly:ad-generation] action:start", {
      count,
      format,
      generationBatchId,
      researchRunId: String(researchRunId),
    });
    console.log("[wiggly:ad-generation] research:load:start", {
      generationBatchId,
      researchRunId: String(researchRunId),
    });
    const research = await ctx.runQuery(internal.adSceneStorage.loadResearchForGeneration, {
      researchRunId,
    });
    console.log("[wiggly:ad-generation] research:load:ready", {
      brand: research.brand.name,
      elapsedMs: Date.now() - startedAt,
      format,
      generationBatchId,
      host: research.host,
    });
    console.log("[wiggly:ad-generation] format:start", {
      count,
      format,
      generationBatchId,
    });
    if (format === "meme") {
      const generation = await generateMemeVariantsFromResearch(research, { count, nvidiaNimModel: memeModel });
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

    if (format === "jingle") {
      const generation = await generateJingleVariantsFromResearch(research, { jingleStyleId });
      const scenes = generation.variants.map((variant, index) => createJingleAdScene({
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

    if (format === "text-message") {
      const generation = await generateTextMessageVariantsFromResearch(research, { count });
      const scenes = generation.variants.map((variant, index) => createTextMessageAdScene({
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

    if (format === "brainrot") {
      const generation = await generateBrainrotVariantsFromResearch(research);
      const scenes = generation.variants.map((variant, index) => createBrainrotAdScene({
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

    if (format === "reviews") {
      const reviewProductHandles = normalizeReviewProductHandles(selectedProductHandles || []);
      const requestedSceneCount = Math.max(1, count || 8);
      const proofVariantCount = Math.max(1, Math.ceil(requestedSceneCount / REVIEWS_SCENE_TEMPLATES.length));
      const generation = await generateReviewsVariantsFromResearch(research, {
        count: proofVariantCount,
        selectedProductHandles: reviewProductHandles,
      });
      const scenes = createReviewsAdScenes({
        proofItems: generation.proofItems,
        research,
        variants: generation.variants,
        requestedSceneCount,
        generationBatchId,
        model: generation.model,
        provider: generation.provider,
        selectedProductHandles: reviewProductHandles,
      });
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

    if (format === "motion-story") {
      const replicateApiToken = process.env.REPLICATE_API_TOKEN;
      if (!replicateApiToken) throw new Error("Replicate background removal is not configured for Motion Story product cutouts.");
      const reviewProductHandles = normalizeReviewProductHandles(selectedProductHandles || []);
      let motionStoryResearch = research;
      if (!productCatalogHasProductImage(motionStoryResearch.productCatalog)) {
        const refreshedCatalog = await fetchEcommerceProductCatalog(
          motionStoryResearch.finalUrl || motionStoryResearch.websiteUrl || motionStoryResearch.brand.url,
        );
        if (productCatalogHasProductImage(refreshedCatalog.catalog)) {
          motionStoryResearch = {
            ...motionStoryResearch,
            productCatalog: refreshedCatalog.catalog,
            providerStatus: [...motionStoryResearch.providerStatus, refreshedCatalog.providerStatus],
          };
        }
      }
      const product = pickMotionStoryProduct(motionStoryResearch, reviewProductHandles);
      const cutout = await removeProductBackground({
        replicateApiToken,
        imageUrl: product.imageUrl || "",
      });
      const cutoutStorageId = await ctx.storage.store(new Blob([cutout.bytes], { type: cutout.mimeType }));
      const cutoutUrl = await ctx.storage.getUrl(cutoutStorageId);
      if (!cutoutUrl) throw new Error("Motion Story product cutout storage returned no URL.");
      const generation = await generateMotionStoryVariantsFromResearch(motionStoryResearch, {
        count,
        selectedProductHandles: reviewProductHandles,
      });
      const scenes = generation.variants.map((variant, index) => createMotionStoryAdScene({
        count: generation.variants.length,
        cutoutUrl,
        product: generation.product,
        proofItems: generation.proofItems,
        research: motionStoryResearch,
        variant,
        candidateIndex: index,
        generationBatchId,
        model: generation.model,
        provider: generation.provider,
        selectedProductHandles: reviewProductHandles,
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

    if (format === "three-d-breakdown") {
      const generation = await generateThreeDBreakdownVariantsFromResearch(research, {
        count,
        selectedStoryDirection: threeDStoryDirection || null,
      });
      const scenes = generation.variants.map((variant, index) => createThreeDBreakdownAdScene({
        evidenceItems: generation.evidenceItems,
        research,
        siteContract: generation.siteContract,
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

    return {
      result: toStoredResearchResult(researchRun, brandSnapshot, firstRow.researchRunId),
      sceneIds: batchRows.map((row) => row._id),
      scenes: batchRows.map((row) => row.scene as AdScene),
    };
  },
});
