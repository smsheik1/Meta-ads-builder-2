import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { generateAdCandidatesFromResearch } from "../features/ad-generation/generate";
import { generateReplicateNanoBanana2Image } from "../features/formats/jingle/storyboard";
import { generateMemeVariantsFromResearch } from "../features/formats/meme/generate";
import { generateJingleVariantsFromResearch } from "../features/formats/jingle/generate";
import { generateBrainrotVariantsFromResearch } from "../features/formats/brainrot/generate";
import { removeProductBackground } from "../features/formats/motion-story/cutout";
import { generateMotionStoryVariantsFromResearch, pickMotionStoryProduct } from "../features/formats/motion-story/generate";
import { generateReviewsVariantsFromResearch } from "../features/formats/reviews/generate";
import { normalizeReviewProductHandles, productCatalogHasProductImage } from "../features/formats/reviews/productSelection";
import { generateTextMessageVariantsFromResearch } from "../features/formats/text-message/generate";
import { generateThreeDBreakdownVariantsFromResearch } from "../features/formats/three-d-breakdown/generate";
import { createThreeDStoryboardFrames, cropThreeDStoryboardFrames } from "../features/formats/three-d-breakdown/storyboardFrames";
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
import type { AdScene, ThreeDBreakdownAdScene } from "../features/scene/types";
import { toStoredResearchResult } from "./researchStorage";

const createGenerationBatchId = () => (
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
);

const THREE_D_BREAKDOWN_STYLE_REFERENCE_PATH = "/three-d-breakdown/references/procedural-3d-style-frame-v1.png";

const getThreeDPublicBaseUrl = () => {
  const raw = process.env.WIGGLY_PUBLIC_BASE_URL || process.env.APP_URL || process.env.VERCEL_URL || "";
  if (!raw.trim()) return "";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
};

const getThreeDStyleReferenceUrl = () => {
  const baseUrl = getThreeDPublicBaseUrl();
  return baseUrl ? `${baseUrl}${THREE_D_BREAKDOWN_STYLE_REFERENCE_PATH}` : "";
};

const assertThreeDBreakdownScene = (scene: AdScene): ThreeDBreakdownAdScene => {
  if (scene.format !== "three-d-breakdown") throw new Error("3D Breakdown action received the wrong scene format.");
  return scene;
};

const patchThreeDScene = async (
  ctx: any,
  sceneId: Id<"adScenes">,
  scene: ThreeDBreakdownAdScene,
) => ctx.runMutation(internal.adSceneStorage.patchScene, { sceneId, scene });

const getThreeDImageInput = (scene: ThreeDBreakdownAdScene) => [
  getThreeDStyleReferenceUrl(),
  ...(scene.layout.referenceImages?.productImageUrls || []),
  ...((scene.layout.referenceImages?.productImageUrls || []).length
    ? []
    : (scene.layout.referenceImages?.brandImageUrls || [])),
].filter(Boolean).slice(0, 4);

const withUpdatedThreeDStoryboardBoard = (
  scene: ThreeDBreakdownAdScene,
  update: (board: NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>) => NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>,
): ThreeDBreakdownAdScene => {
  const board = scene.layout.storyboardBoard;
  if (!board) return scene;
  return {
    ...scene,
    layout: {
      ...scene.layout,
      storyboardBoard: update(board),
    },
  };
};

const storeThreeDBytes = async (
  ctx: {
    storage: {
      store: (blob: Blob) => Promise<Id<"_storage">>;
      getUrl: (storageId: Id<"_storage">) => Promise<string | null>;
    };
  },
  bytes: Uint8Array,
  mimeType: string,
) => {
  const storageId = await ctx.storage.store(new Blob([bytes], { type: mimeType }));
  const url = await ctx.storage.getUrl(storageId);
  if (!url) throw new Error("3D Breakdown media storage returned no URL.");
  return { storageId: String(storageId), url, mimeType };
};

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
  },
  handler: async (ctx, { researchRunId, count, format = "visualizer", memeModel, videoMemeTemplateId, visualizerModel, jingleStyleId, selectedProductHandles }) => {
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
      const generation = await generateThreeDBreakdownVariantsFromResearch(research, { count });
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

export const generateThreeDImages: ReturnType<typeof action> = action({
  args: {
    sceneId: v.id("adScenes"),
    scene: v.any(),
  },
  handler: async (ctx, { sceneId, scene }) => {
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiToken) throw new Error("Replicate image generation is not configured for 3D Breakdown.");
    let nextScene = assertThreeDBreakdownScene(scene as AdScene);
    const imageInput = getThreeDImageInput(nextScene);

    const storyboardBoard = nextScene.layout.storyboardBoard;
    if (storyboardBoard?.imagePrompt) {
      nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
        ...board,
        image: { status: "generating" },
        frames: (board.frames?.length === 6 ? board.frames : createThreeDStoryboardFrames()).map((frame) => ({
          ...frame,
          image: { status: "generating" as const },
        })),
      }));
      await patchThreeDScene(ctx, sceneId, nextScene);
      try {
        const image = await generateReplicateNanoBanana2Image({
          replicateApiToken,
          prompt: storyboardBoard.imagePrompt,
          imageInput,
          aspectRatio: "9:16",
        });
        const stored = await storeThreeDBytes(ctx, image.bytes, image.mimeType);
        const frameCrops = cropThreeDStoryboardFrames(image.bytes, image.mimeType);
        const baseFrames = storyboardBoard.frames?.length === 6
          ? storyboardBoard.frames
          : createThreeDStoryboardFrames();
        const storedFrames = await Promise.all(frameCrops.map(async (frameCrop) => {
          const frameStored = await storeThreeDBytes(ctx, frameCrop.bytes, frameCrop.mimeType);
          const frame = baseFrames.find((item) => item.frameIndex === frameCrop.frameIndex)
            || createThreeDStoryboardFrames().find((item) => item.frameIndex === frameCrop.frameIndex)!;
          return {
            ...frame,
            image: { status: "ready" as const, ...frameStored },
          };
        }));
        nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
          ...board,
          image: { status: "ready", ...stored },
          frames: storedFrames as NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>["frames"],
        }));
      } catch (error) {
        nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
          ...board,
          image: {
            status: "failed",
            error: error instanceof Error ? error.message : "3D storyboard board generation failed.",
          },
          frames: (board.frames?.length === 6 ? board.frames : createThreeDStoryboardFrames()).map((frame) => ({
            ...frame,
            image: {
              status: "failed" as const,
              error: error instanceof Error ? error.message : "3D storyboard board generation failed.",
            },
          })),
        }));
      }
      await patchThreeDScene(ctx, sceneId, nextScene);
    }

    return { scene: nextScene };
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
