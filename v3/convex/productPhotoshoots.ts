import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  PRODUCT_PHOTOSHOOT_ASPECT_RATIO,
  PRODUCT_PHOTOSHOOT_FULL_GENERATION_LIMIT,
  PRODUCT_PHOTOSHOOT_IMAGE_MODEL,
  createProductPhotoshootPromptPlan,
  findPhotoshootProduct,
  findLatestUsableProductPhotoshoot,
  type ProductPhotoshootBoard,
  type ProductPhotoshootImage,
} from "../features/product-photoshoot/photoshoot";
import { generateReplicateNanoBanana2Image } from "../features/formats/jingle/storyboard";

const replicateThrottleDelayMs = 12_000;
const sleep = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));
const isReplicateThrottleError = (error: unknown) => /throttled|rate limit|rate-limit|too many requests/i.test(
  error instanceof Error ? error.message : String(error || ""),
);
const isReplicateHardStopError = (error: unknown) => /insufficient credit|purchase credit|billing|quota/i.test(
  error instanceof Error ? error.message : String(error || ""),
);

async function storePhotoshootImage({
  ctx,
  replicateApiToken,
  prompt,
  productImageUrl,
}: {
  ctx: {
    storage: {
      store: (blob: Blob) => Promise<Id<"_storage">>;
      getUrl: (storageId: Id<"_storage">) => Promise<string | null>;
    };
  };
  replicateApiToken: string;
  prompt: string;
  productImageUrl: string;
}): Promise<ProductPhotoshootImage> {
  const run = () => generateReplicateNanoBanana2Image({
    replicateApiToken,
    prompt,
    imageInput: [productImageUrl],
    aspectRatio: PRODUCT_PHOTOSHOOT_ASPECT_RATIO,
  });
  let result;
  try {
    result = await run();
  } catch (error) {
    if (!isReplicateThrottleError(error)) throw error;
    await sleep(replicateThrottleDelayMs);
    result = await run();
  }

  const storageId = await ctx.storage.store(new Blob([result.bytes], {
    type: result.mimeType,
  }));
  return {
    storageId: String(storageId),
    url: await ctx.storage.getUrl(storageId),
    mimeType: result.mimeType,
  };
}

export const saveGenerated: ReturnType<typeof internalMutation> = internalMutation({
  args: {
    sessionId: v.string(),
    researchRunId: v.id("researchRuns"),
    productHandle: v.string(),
    imageModel: v.string(),
    aspectRatio: v.string(),
    board: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const photoshootId = await ctx.db.insert("productPhotoshoots", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return { photoshootId };
  },
});

export const patchBoard: ReturnType<typeof internalMutation> = internalMutation({
  args: {
    photoshootId: v.id("productPhotoshoots"),
    board: v.any(),
  },
  handler: async (ctx, { photoshootId, board }) => {
    await ctx.db.patch(photoshootId, {
      board,
      updatedAt: Date.now(),
    });
  },
});

export const latestForResearch: ReturnType<typeof query> = query({
  args: {
    researchRunId: v.id("researchRuns"),
  },
  handler: async (ctx, { researchRunId }) => {
    const recentBoards = await ctx.db
      .query("productPhotoshoots")
      .withIndex("by_researchRunId_and_updatedAt", (q) => q.eq("researchRunId", researchRunId))
      .order("desc")
      .collect();
    return findLatestUsableProductPhotoshoot(recentBoards.map((item) => ({
      ...item,
      board: item.board as ProductPhotoshootBoard,
    })));
  },
});

export const countForSessionResearch: ReturnType<typeof internalQuery> = internalQuery({
  args: {
    sessionId: v.string(),
    researchRunId: v.id("researchRuns"),
  },
  handler: async (ctx, { sessionId, researchRunId }) => {
    const boards = await ctx.db
      .query("productPhotoshoots")
      .withIndex("by_researchRunId_and_updatedAt", (q) => q.eq("researchRunId", researchRunId))
      .collect();
    return boards.filter((board) => board.sessionId === sessionId).length;
  },
});

export const generateForResearch: ReturnType<typeof action> = action({
  args: {
    anonymousId: v.string(),
    researchRunId: v.id("researchRuns"),
    productHandle: v.string(),
  },
  handler: async (ctx, { anonymousId, researchRunId, productHandle }) => {
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiToken) throw new Error("Product photoshoot images are not configured. Add the Replicate API token, then try again.");

    const sessionId = await ctx.runMutation(internal.sessions.ensureAnonymousSession, {
      anonymousId,
    });
    const generationCount = await ctx.runQuery(internal.productPhotoshoots.countForSessionResearch, {
      sessionId,
      researchRunId,
    });
    if (generationCount >= PRODUCT_PHOTOSHOOT_FULL_GENERATION_LIMIT) {
      throw new Error(`Product photoshoot limit reached for this site. You can generate up to ${PRODUCT_PHOTOSHOOT_FULL_GENERATION_LIMIT} full boards per session; use per-shot retry for individual fixes.`);
    }
    const research = await ctx.runQuery(internal.adSceneStorage.loadResearchForGeneration, {
      researchRunId,
    });
    const product = findPhotoshootProduct(research, productHandle);
    if (!product) throw new Error("Product photoshoot could not find that product in the current research.");
    if (!product.imageUrl) throw new Error("Product photoshoot needs a product image reference.");

    const shots = createProductPhotoshootPromptPlan(research, product);
    const board: ProductPhotoshootBoard = {
      researchRunId: String(researchRunId),
      brandName: research.brand.name,
      imageModel: PRODUCT_PHOTOSHOOT_IMAGE_MODEL,
      aspectRatio: PRODUCT_PHOTOSHOOT_ASPECT_RATIO,
      product: {
        title: product.title,
        handle: product.handle,
        url: product.url,
        imageUrl: product.imageUrl,
        imageAlt: product.imageAlt,
        badges: product.badges,
      },
      shots: [],
      createdAt: Date.now(),
    };

    const { photoshootId } = await ctx.runMutation(internal.productPhotoshoots.saveGenerated, {
      sessionId,
      researchRunId,
      productHandle: product.handle,
      imageModel: PRODUCT_PHOTOSHOOT_IMAGE_MODEL,
      aspectRatio: PRODUCT_PHOTOSHOOT_ASPECT_RATIO,
      board,
    });

    for (const shot of shots) {
      try {
        board.shots.push({
          ...shot,
          image: await storePhotoshootImage({
            ctx,
            replicateApiToken,
            prompt: shot.prompt,
            productImageUrl: product.imageUrl,
          }),
          status: "ok",
        });
      } catch (error) {
        if (isReplicateHardStopError(error)) throw error;
        board.shots.push({
          ...shot,
          status: "failed",
          error: error instanceof Error ? error.message : "Product shot generation failed.",
        });
      }
      await ctx.runMutation(internal.productPhotoshoots.patchBoard, {
        photoshootId,
        board,
      });
    }

    return { photoshootId, board };
  },
});

export const regenerateShot: ReturnType<typeof action> = action({
  args: {
    photoshootId: v.id("productPhotoshoots"),
    board: v.any(),
    shotIndex: v.number(),
  },
  handler: async (ctx, { photoshootId, board, shotIndex }) => {
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiToken) throw new Error("Product photoshoot images are not configured. Add the Replicate API token, then try again.");

    const nextBoard = board as ProductPhotoshootBoard;
    const shot = nextBoard.shots.find((item) => item.shotIndex === shotIndex);
    if (!shot) throw new Error("Product photoshoot shot not found.");
    const productImageUrl = nextBoard.product.imageUrl;
    if (!productImageUrl) throw new Error("Product photoshoot needs a product image reference.");

    const image = await storePhotoshootImage({
      ctx,
      replicateApiToken,
      prompt: shot.prompt,
      productImageUrl,
    });
    const patchedBoard: ProductPhotoshootBoard = {
      ...nextBoard,
      shots: nextBoard.shots.map((item) => (
        item.shotIndex === shotIndex
          ? { ...item, image, status: "ok" as const, error: undefined }
          : item
      )),
    };

    await ctx.runMutation(internal.productPhotoshoots.patchBoard, {
      photoshootId,
      board: patchedBoard,
    });

    return { board: patchedBoard };
  },
});
