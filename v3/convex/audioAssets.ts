import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { generateGeminiDialogueVoiceover, generateGeminiVoiceover } from "../features/audio/geminiTts";
import {
  DEEPGRAM_TRANSCRIPTION_MODEL,
  transcribeAudioWithDeepgram,
} from "../features/audio/deepgramTranscription";
import {
  createGeneratedSceneAudio,
  getSceneAudioKey,
  UPLOADED_AUDIO_MODEL,
} from "../features/audio/sceneAudio";
import { analyzeGeneratedWavAudio } from "../features/audio/audioAnalysis";
import {
  applyVoiceVisualizerPreset,
  explainVoiceVisualizerPresetFromAnalysis,
} from "../features/audio/visualizerPresets";
import { cleanDialogueScriptForVoiceover } from "../features/dialogue/dialogueScripts";
import { assertShareableAdScene } from "../features/share/shareScene";
import { legacyCreateVisualizerStyle } from "../features/scene/visualizerStyle";
import type { AdScene, AdSceneAudio, AdSceneCaption } from "../features/scene/types";

const storageIdFromString = (storageId: string) => storageId as Id<"_storage">;
const maxUploadedAudioDurationMs = 60_000;

const isWavMimeType = (mimeType: string) => (
  mimeType.toLowerCase().includes("wav") || mimeType.toLowerCase().includes("wave")
);

const cleanUploadName = (value: string | undefined) => String(value || "Uploaded audio")
  .replace(/[—–]/g, ", ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 120)
  .trim() || "Uploaded audio";

const attachAudioWithVoiceVisualizerPreset = (
  scene: AdScene,
  audio: AdSceneAudio,
): AdScene => {
  if (audio.status !== "generated") {
    return {
      ...scene,
      audio,
    };
  }

  const decision = explainVoiceVisualizerPresetFromAnalysis(audio.analysis, audio.durationMs);
  const visualizer = applyVoiceVisualizerPreset(
    scene.style.visualizer || legacyCreateVisualizerStyle,
    decision.presetId,
  );

  return {
    ...scene,
    style: {
      ...scene.style,
      visualizer,
    },
    audio,
  };
};

export const createUploadUrl: ReturnType<typeof mutation> = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

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
      analysis: result.analysis,
      model: result.model,
    });

    return {
      audio,
      scene: attachAudioWithVoiceVisualizerPreset(audioScene, audio),
    };
  },
});

export const generateDialogueForScene: ReturnType<typeof action> = action({
  args: {
    anonymousId: v.string(),
    scene: v.any(),
    script: v.any(),
  },
  handler: async (ctx, { anonymousId, scene, script }) => {
    const audioScene = assertShareableAdScene(scene);
    const dialogueScript = cleanDialogueScriptForVoiceover(script);
    const sessionId = await ctx.runMutation(internal.sessions.ensureAnonymousSession, {
      anonymousId,
    });
    const result = await generateGeminiDialogueVoiceover(dialogueScript);
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

    if (!url) throw new Error("Generated dialogue audio was stored, but no playable URL was returned.");

    const audio = createGeneratedSceneAudio({
      storageId,
      url,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      transcript: result.transcript,
      captions: result.captions,
      analysis: result.analysis,
      model: result.model,
    });

    return {
      audio,
      scene: attachAudioWithVoiceVisualizerPreset(audioScene, audio),
    };
  },
});

export const attachUploadedToScene: ReturnType<typeof action> = action({
  args: {
    anonymousId: v.string(),
    scene: v.any(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    durationMs: v.number(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, {
    anonymousId,
    scene,
    storageId,
    mimeType,
    durationMs,
    fileName,
  }) => {
    const audioScene = assertShareableAdScene(scene);
    const safeDurationMs = Math.max(1000, Math.min(maxUploadedAudioDurationMs, Math.round(durationMs || 0)));
    const safeMimeType = mimeType.trim() || "audio/mpeg";
    const sessionId = await ctx.runMutation(internal.sessions.ensureAnonymousSession, {
      anonymousId,
    });
    const url = await ctx.storage.getUrl(storageId);

    if (!url) throw new Error("Uploaded audio was stored, but no playable URL was returned.");

    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("Uploaded audio was stored, but the audio file could not be read.");

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const analysis = isWavMimeType(safeMimeType) ? analyzeGeneratedWavAudio(bytes) ?? undefined : undefined;
    const transcription = await transcribeAudioWithDeepgram({
      audioBlob: new Blob([bytes], { type: safeMimeType }),
      mimeType: safeMimeType,
    });
    const captions: AdSceneCaption[] = transcription.captions;
    const transcript = transcription.transcript || cleanUploadName(fileName);
    const sceneKey = getSceneAudioKey(audioScene);
    const model = captions.length ? DEEPGRAM_TRANSCRIPTION_MODEL : UPLOADED_AUDIO_MODEL;

    await ctx.runMutation(internal.audioAssets.saveGenerated, {
      sessionId,
      sceneKey,
      storageId,
      mimeType: safeMimeType,
      durationMs: safeDurationMs,
      transcript,
      provider: "upload",
      model,
    });

    const audio = createGeneratedSceneAudio({
      storageId,
      url,
      mimeType: safeMimeType,
      durationMs: safeDurationMs,
      transcript,
      captions,
      analysis,
      model,
      provider: "upload",
    });

    return {
      audio,
      scene: attachAudioWithVoiceVisualizerPreset(audioScene, audio),
    };
  },
});
