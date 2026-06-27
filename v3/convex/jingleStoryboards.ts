import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  BRICK_MUSIC_VIDEO_STYLE_ID,
  BRICK_STORYBOARD_IMAGE_MODEL,
  buildBrickMusicVideoClips,
  createBrickStoryboardPromptPlan,
  generateBrickStoryboardStoryPlan,
  generateReplicateNanoBanana2Image,
  generateReplicateSeedanceVideo,
  type BrickStoryboard,
  type BrickStoryboardImage,
} from "../features/formats/jingle/storyboard";
import type { AdScene } from "../features/scene/types";

const assertJingleScene = (scene: AdScene) => {
  if (scene.format !== "jingle") throw new Error("Brick storyboards require a jingle scene.");
  return scene;
};

type MusicVideoClip = ReturnType<typeof buildBrickMusicVideoClips>[number];

const replicateThrottleDelayMs = 12_000;
const sleep = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));
const isReplicateThrottleError = (error: unknown) => /throttled|rate limit|rate-limit|too many requests/i.test(
  error instanceof Error ? error.message : String(error || ""),
);

async function refreshClipUrls(ctx: MutationCtx, clips: MusicVideoClip[]) {
  return Promise.all(clips.map(async (clip) => {
    const url = await ctx.storage.getUrl(clip.storageId as Id<"_storage">);
    if (!url) throw new Error(`Build music video could not refresh shot ${clip.shotIndex + 1}.`);
    return { ...clip, url };
  }));
}

async function generateStoryboardImageWithRetry({
  replicateApiToken,
  prompt,
  retryPrompt,
}: {
  replicateApiToken: string;
  prompt: string;
  retryPrompt?: string;
}) {
  try {
    return await generateReplicateNanoBanana2Image({
      replicateApiToken,
      prompt,
    });
  } catch (error) {
    if (isReplicateThrottleError(error)) {
      await sleep(replicateThrottleDelayMs);
      return generateReplicateNanoBanana2Image({
        replicateApiToken,
        prompt,
      });
    }
    if (!retryPrompt) throw error;
    return generateReplicateNanoBanana2Image({
      replicateApiToken,
      prompt: retryPrompt,
    });
  }
}

async function storeStoryboardImage({
  ctx,
  replicateApiToken,
  prompt,
  retryPrompt,
}: {
  ctx: {
    storage: {
      store: (blob: Blob) => Promise<Id<"_storage">>;
      getUrl: (storageId: Id<"_storage">) => Promise<string | null>;
    };
  };
  replicateApiToken: string;
  prompt: string;
  retryPrompt?: string;
}): Promise<BrickStoryboardImage> {
  const result = await generateStoryboardImageWithRetry({
    replicateApiToken,
    prompt,
    retryPrompt,
  });
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
    sceneId: v.id("adScenes"),
    visualStyle: v.string(),
    imageModel: v.string(),
    shotCount: v.number(),
    storyboard: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const storyboardId = await ctx.db.insert("jingleStoryboards", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return { storyboardId };
  },
});

export const patchStoryboard: ReturnType<typeof internalMutation> = internalMutation({
  args: {
    storyboardId: v.id("jingleStoryboards"),
    storyboard: v.any(),
  },
  handler: async (ctx, { storyboardId, storyboard }) => {
    await ctx.db.patch(storyboardId, {
      storyboard,
      updatedAt: Date.now(),
    });
  },
});

export const latestForScene: ReturnType<typeof query> = query({
  args: {
    sceneId: v.id("adScenes"),
  },
  handler: async (ctx, { sceneId }) => ctx.db
    .query("jingleStoryboards")
    .withIndex("by_sceneId_and_updatedAt", (q) => q.eq("sceneId", sceneId))
    .order("desc")
    .first(),
});

export const regenerateBrickShot: ReturnType<typeof action> = action({
  args: {
    storyboardId: v.id("jingleStoryboards"),
    storyboard: v.any(),
    shotIndex: v.number(),
  },
  handler: async (ctx, { storyboardId, storyboard, shotIndex }) => {
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiToken) throw new Error("Replicate image generation is not configured.");

    const currentStoryboard = storyboard as BrickStoryboard;
    const nextStoryboard: BrickStoryboard = {
      ...currentStoryboard,
      shots: [...currentStoryboard.shots],
    };
    const shot = nextStoryboard.shots.find((item) => item.shotIndex === shotIndex);
    if (!shot) throw new Error("Storyboard shot not found.");
    const referencePrompt = nextStoryboard.referenceFrame.prompt;
    const prompt = `${shot.shotPrompt}\n\nREFERENCE WORLD TO MATCH:\n${referencePrompt}`;
    const retryPrompt = `${shot.shotPrompt}\n\nUse the same narrative brick-style miniature world, palette, and recurring hero object from the reference frame. One single full-frame vertical 9:16 still. No storyboard sheet, collage, split-screen, panels, captions, subtitles, readable logos, brand names, brand signage, realistic human faces, trademarked toy names, or extra text. Block-figure characters only.`;

    const image = await storeStoryboardImage({
      ctx,
      replicateApiToken,
      prompt,
      retryPrompt,
    });
    const nextShot = {
      ...shot,
      image,
      status: "ok" as const,
      error: undefined,
    };
    nextStoryboard.shots = nextStoryboard.shots.map((item) => (
      item.shotIndex === shotIndex ? nextShot : item
    ));
    await ctx.runMutation(internal.jingleStoryboards.patchStoryboard, {
      storyboardId,
      storyboard: nextStoryboard,
    });
    return { storyboard: nextStoryboard };
  },
});

export const buildMusicVideoForScene: ReturnType<typeof mutation> = mutation({
  args: {
    sceneId: v.id("adScenes"),
    storyboardId: v.id("jingleStoryboards"),
  },
  handler: async (ctx, { sceneId, storyboardId }) => {
    const sceneRow = await ctx.db.get(sceneId);
    if (!sceneRow) throw new Error("Build music video could not find the jingle scene.");
    const scene = assertJingleScene(sceneRow.scene as AdScene);
    const storyboardRow = await ctx.db.get(storyboardId);
    if (!storyboardRow || storyboardRow.sceneId !== sceneId) {
      throw new Error("Build music video could not find the matching storyboard.");
    }

    const now = Date.now();
    const clips = await refreshClipUrls(ctx, buildBrickMusicVideoClips(storyboardRow.storyboard as BrickStoryboard));
    const musicVideo = {
      sourceStoryboardId: String(storyboardId),
      clips,
      builtAt: now,
    };
    const nextStoryboard: BrickStoryboard = {
      ...(storyboardRow.storyboard as BrickStoryboard),
      musicVideo,
    };
    const nextScene: AdScene = {
      ...scene,
      layout: {
        ...scene.layout,
        musicVideo,
      },
    };

    await ctx.db.patch(storyboardId, {
      storyboard: nextStoryboard,
      stitchStatus: "queued",
      stitchProgress: 0,
      stitchError: undefined,
      stitchOutputStorageId: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(sceneId, {
      scene: nextScene,
      updatedAt: now,
    });
    return { scene: nextScene, storyboard: nextStoryboard };
  },
});

export const claimNextStitch: ReturnType<typeof mutation> = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const row = await ctx.db
      .query("jingleStoryboards")
      .withIndex("by_stitchStatus_and_updatedAt", (q) => q.eq("stitchStatus", "queued"))
      .order("asc")
      .first();

    if (!row) return null;

    let clips: MusicVideoClip[];
    try {
      clips = await refreshClipUrls(ctx, buildBrickMusicVideoClips(row.storyboard as BrickStoryboard));
    } catch (error) {
      await ctx.db.patch(row._id, {
        stitchStatus: "failed",
        stitchProgress: 0,
        stitchError: error instanceof Error ? error.message : "Could not prepare stitch clips.",
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.patch(row._id, {
      stitchStatus: "claimed",
      stitchProgress: 5,
      stitchError: undefined,
      updatedAt: now,
    });

    return {
      storyboardId: row._id,
      sceneId: row.sceneId,
      clips,
      durationMs: clips.reduce((max, clip) => Math.max(max, clip.endMs), 0),
    };
  },
});

export const markStitchRendering: ReturnType<typeof mutation> = mutation({
  args: {
    storyboardId: v.id("jingleStoryboards"),
    progress: v.optional(v.number()),
  },
  handler: async (ctx, { storyboardId, progress }) => {
    await ctx.db.patch(storyboardId, {
      stitchStatus: "rendering",
      stitchProgress: Math.max(5, Math.min(95, progress ?? 10)),
      updatedAt: Date.now(),
    });
  },
});

export const markStitchReady: ReturnType<typeof mutation> = mutation({
  args: {
    storyboardId: v.id("jingleStoryboards"),
    storageId: v.id("_storage"),
    durationMs: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, { storyboardId, storageId, durationMs, mimeType }) => {
    const row = await ctx.db.get(storyboardId);
    if (!row) throw new Error("Stitch ready could not find the storyboard.");
    const sceneRow = await ctx.db.get(row.sceneId);
    if (!sceneRow) throw new Error("Stitch ready could not find the jingle scene.");
    const scene = assertJingleScene(sceneRow.scene as AdScene);
    const clips = await refreshClipUrls(ctx, buildBrickMusicVideoClips(row.storyboard as BrickStoryboard));
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Stitched music video was stored, but no URL was returned.");

    const now = Date.now();
    const stitchedVideo = {
      storageId: String(storageId),
      url,
      mimeType,
      durationMs,
      builtAt: now,
    };
    const musicVideo = {
      sourceStoryboardId: String(storyboardId),
      clips,
      stitchedVideo,
      builtAt: now,
    };
    const nextStoryboard: BrickStoryboard = {
      ...(row.storyboard as BrickStoryboard),
      musicVideo,
    };
    const nextScene: AdScene = {
      ...scene,
      layout: {
        ...scene.layout,
        musicVideo,
      },
    };

    await ctx.db.patch(storyboardId, {
      storyboard: nextStoryboard,
      stitchStatus: "ready",
      stitchProgress: 100,
      stitchOutputStorageId: storageId,
      stitchError: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(row.sceneId, {
      scene: nextScene,
      updatedAt: now,
    });
    return { scene: nextScene, storyboard: nextStoryboard };
  },
});

export const markStitchFailed: ReturnType<typeof mutation> = mutation({
  args: {
    storyboardId: v.id("jingleStoryboards"),
    error: v.string(),
  },
  handler: async (ctx, { storyboardId, error }) => {
    await ctx.db.patch(storyboardId, {
      stitchStatus: "failed",
      stitchProgress: 0,
      stitchError: error.replace(/\s+/g, " ").trim().slice(0, 700) || "Music video stitch failed.",
      updatedAt: Date.now(),
    });
  },
});

export const animateBrickBoard: ReturnType<typeof action> = action({
  args: {
    storyboardId: v.id("jingleStoryboards"),
    storyboard: v.any(),
  },
  handler: async (ctx, { storyboardId, storyboard }) => {
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiToken) throw new Error("Replicate video generation is not configured.");

    const currentStoryboard = storyboard as BrickStoryboard;
    const nextStoryboard: BrickStoryboard = {
      ...currentStoryboard,
      shots: [...currentStoryboard.shots],
    };
    if (!nextStoryboard.referenceFrame.image?.url) throw new Error("Animate board needs a reference frame image first.");
    if (nextStoryboard.shots.some((shot) => shot.status !== "ok" || !shot.image?.url)) {
      throw new Error("Animate board needs every shot image to be OK first.");
    }

    for (const shot of nextStoryboard.shots) {
      if (shot.video?.url) continue;
      console.log("[brick-video] animating shot", {
        storyboardId,
        shotIndex: shot.shotIndex,
        durationMs: shot.durationMs,
        hasImageUrl: Boolean(shot.image?.url),
        promptLength: shot.animationPrompt?.length ?? 0,
      });
      if (!shot.animationPrompt) throw new Error(`Shot ${shot.shotIndex + 1} is missing its Seedance animation prompt.`);
      const result = await generateReplicateSeedanceVideo({
        replicateApiToken,
        imageUrl: shot.image!.url!,
        prompt: shot.animationPrompt,
        durationSeconds: shot.durationMs / 1000,
      });
      const storageId = await ctx.storage.store(new Blob([result.bytes], {
        type: result.mimeType,
      }));
      const videoUrl = await ctx.storage.getUrl(storageId);
      console.log("[brick-video] shot stored", {
        storyboardId,
        shotIndex: shot.shotIndex,
        mimeType: result.mimeType,
        hasVideoUrl: Boolean(videoUrl),
      });
      nextStoryboard.shots = nextStoryboard.shots.map((candidate) => (
        candidate.shotIndex === shot.shotIndex
          ? {
            ...candidate,
            video: {
              storageId: String(storageId),
              url: videoUrl,
              mimeType: result.mimeType,
            },
          }
          : candidate
      ));
      await ctx.runMutation(internal.jingleStoryboards.patchStoryboard, {
        storyboardId,
        storyboard: nextStoryboard,
      });
    }

    return { storyboard: nextStoryboard };
  },
});

export const generateBrickForScene: ReturnType<typeof action> = action({
  args: {
    anonymousId: v.string(),
    sceneId: v.id("adScenes"),
    scene: v.any(),
  },
  handler: async (ctx, { anonymousId, sceneId, scene }) => {
    const jingleScene = assertJingleScene(scene as AdScene);
    const sessionId = await ctx.runMutation(internal.sessions.ensureAnonymousSession, {
      anonymousId,
    });
    const storyPlan = await generateBrickStoryboardStoryPlan(jingleScene);
    const promptPlan = createBrickStoryboardPromptPlan(jingleScene, storyPlan);
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiToken) throw new Error("Replicate image generation is not configured.");

    const referenceImage = await storeStoryboardImage({
      ctx,
      replicateApiToken,
      prompt: promptPlan.referenceFramePrompt,
    });
    const storyboard: BrickStoryboard = {
      jingleSceneId: String(sceneId),
      visualStyle: BRICK_MUSIC_VIDEO_STYLE_ID,
      imageModel: BRICK_STORYBOARD_IMAGE_MODEL,
      shotCount: promptPlan.shots.length,
      storyPlan,
      storyboardSheetPrompt: promptPlan.storyboardSheetPrompt,
      referenceFrame: {
        prompt: promptPlan.referenceFramePrompt,
        image: referenceImage,
        status: "ok",
      },
      shots: [],
    };

    for (const shot of promptPlan.shots) {
      try {
        const conditionedPrompt = `${shot.shotPrompt}\n\nREFERENCE WORLD TO MATCH:\n${promptPlan.referenceFramePrompt}`;
        const retryPrompt = `${shot.shotPrompt}\n\nUse the same narrative brick-style miniature world, palette, and recurring hero object from the reference frame. One single full-frame vertical 9:16 still. No storyboard sheet, collage, split-screen, panels, captions, subtitles, readable logos, brand names, brand signage, realistic human faces, trademarked toy names, or extra text. Block-figure characters only.`;
        storyboard.shots.push({
          ...shot,
          image: await storeStoryboardImage({
            ctx,
            replicateApiToken,
            prompt: conditionedPrompt,
            retryPrompt,
          }),
          status: "ok",
        });
      } catch (error) {
        storyboard.shots.push({
          ...shot,
          status: "failed",
          error: error instanceof Error ? error.message : "Shot image generation failed.",
        });
      }
    }

    const { storyboardId } = await ctx.runMutation(internal.jingleStoryboards.saveGenerated, {
      sessionId,
      sceneId,
      visualStyle: BRICK_MUSIC_VIDEO_STYLE_ID,
      imageModel: BRICK_STORYBOARD_IMAGE_MODEL,
      shotCount: storyboard.shotCount,
      storyboard,
    });

    return { storyboardId, storyboard };
  },
});
