import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { generateGeminiVoiceover } from "../features/audio/geminiTts";
import {
  createGeneratedSceneAudio,
  getSceneAudioKey,
} from "../features/audio/sceneAudio";
import { assertShareableAdScene } from "../features/share/shareScene";

const storageIdFromString = (storageId: string) => storageId as Id<"_storage">;

export const saveGenerated: ReturnType<typeof internalMutation> = internalMutation({
  args: {
    sessionId: v.string(),
    sceneKey: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    durationMs: v.number(),
    transcript: v.string(),
    provider: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const audioAssetId = await ctx.db.insert("audioAssets", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    const url = await ctx.storage.getUrl(args.storageId);
    return {
      audioAssetId,
      storageId: args.storageId,
      url,
    };
  },
});

export const getUrl: ReturnType<typeof query> = query({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, { storageId }) => {
    const id = storageIdFromString(storageId);
    const asset = await ctx.db
      .query("audioAssets")
      .withIndex("by_storageId", (q) => q.eq("storageId", id))
      .first();
    const url = await ctx.storage.getUrl(id);

    if (!url) return null;

    return {
      storageId,
      url,
      mimeType: asset?.mimeType || "",
      durationMs: asset?.durationMs || 0,
      transcript: asset?.transcript || "",
    };
  },
});

export const generateForScene: ReturnType<typeof action> = action({
  args: {
    anonymousId: v.string(),
    scene: v.any(),
  },
  handler: async (ctx, { anonymousId, scene }) => {
    const audioScene = assertShareableAdScene(scene);
    const sessionId = await ctx.runMutation(internal.sessions.ensureAnonymousSession, {
      anonymousId,
    });
    const result = await generateGeminiVoiceover(audioScene);
    const storageId = await ctx.storage.store(new Blob([result.bytes], {
      type: result.mimeType,
    }));
    const sceneKey = getSceneAudioKey(audioScene);
    const saved = await ctx.runMutation(internal.audioAssets.saveGenerated, {
      sessionId,
      sceneKey,
      storageId,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      transcript: result.transcript,
      provider: result.provider,
      model: result.model,
    });
    const url = saved.url || await ctx.storage.getUrl(storageId);

    if (!url) throw new Error("Generated audio was stored, but no playable URL was returned.");

    const audio = createGeneratedSceneAudio({
      storageId,
      url,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      transcript: result.transcript,
      captions: result.captions,
      model: result.model,
    });

    return {
      audio,
      scene: {
        ...audioScene,
        audio,
      },
    };
  },
});
