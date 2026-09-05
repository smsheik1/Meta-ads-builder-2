import type { JingleAdScene, LegoMusicVideoAdScene } from "../../scene/types";
import { createJingleCaptions } from "../../audio/elevenlabsMusic";
import {
  buildBrickStoryboardStoryPrompt,
  createBrickStoryboardPromptPlan,
  deriveBrickStoryboardShots,
  extractBrickStoryboardStoryPlan,
  type BrickStoryboardStoryPlan,
} from "../jingle/storyboard";

export const LEGO_MUSIC_VIDEO_VERSION = "0.1.0";
export const LEGO_ATTEMPT_LIMIT = 3;

export function createLegoDraft(brief: string): LegoMusicVideoAdScene {
  return {
    version: 1, format: "lego-music-video",
    brand: { name: "", url: "", host: "", title: "", description: "", logoUrl: null, faviconUrl: null, ogImageUrl: null, screenshotUrl: null, colors: [], fonts: { feel: "sans" }, vibeTags: [], receipts: { specificClaims: [], buyerMoments: [], exactSiteLanguage: [], namedProof: [] } },
    creative: { angleId: "lego-music-video", headline: "", subheadline: brief, ctaText: "", headlineType: "callout", selectedPain: "", selectedProof: "" },
    style: { backgroundColor: "#07111F", textColor: "#FFFFFF", accentColor: "#E3000B", fontFeel: "sans" },
    audio: { status: "none", transcript: "", captions: [] },
    layout: { preset: "lego-music-video", brandPhonetic: "", angle: "", lyrics: ["", "", ""], musicLengthMs: 20_000, compositionPlan: { chunks: [6000, 8000, 6000].map(duration_ms => ({ text: "", duration_ms, positive_styles: [], negative_styles: [], context_adherence: "high" })) }, selfCheckPassed: "" },
    metadata: { candidateIndex: 0, generationBatchId: "local", researchRunId: "host-agent", brandSnapshotId: "host-agent", model: "host-agent", provider: "deterministic", generatedAt: 0 },
  };
}

export function asJingleScene(scene: LegoMusicVideoAdScene): JingleAdScene {
  return { ...scene, format: "jingle", layout: { ...scene.layout, preset: "jingle-lyrics" } };
}

export function asLegoScene(scene: JingleAdScene | LegoMusicVideoAdScene): LegoMusicVideoAdScene {
  return { ...scene, format: "lego-music-video", layout: { ...scene.layout, preset: "lego-music-video" } };
}

export function validateLegoMusicVideoScene(value: unknown, { ready = false } = {}) {
  const errors: string[] = [];
  const scene = value as LegoMusicVideoAdScene;
  if (!scene || typeof scene !== "object" || !scene.layout || !scene.brand || !scene.creative || !scene.style || !scene.audio) {
    return { valid: false, errors: ["A complete Lego Music Video scene is required."] };
  }
  if (scene.version !== 1 || scene.format !== "lego-music-video" || scene.layout.preset !== "lego-music-video") errors.push("Use the Lego Music Video scene contract, version 1.");
  if (!scene.brand.name?.trim() || !scene.brand.description?.trim()) errors.push("Name the brand and its actual offer.");
  if (!scene.brand.receipts?.specificClaims?.length) errors.push("Save source-grounded brand claims in brand.receipts.specificClaims.");
  if (!scene.creative.headline?.trim() || !scene.layout.angle?.trim()) errors.push("Choose the hook and ad angle.");
  if (!scene.layout.brandPhonetic?.trim()) errors.push("Supply the brand pronunciation.");
  const duration = scene.layout.musicLengthMs;
  if (!Number.isInteger(duration) || duration < 10_000 || duration > 30_500) errors.push("The three-shot format supports an actual song duration of 10–30 seconds (500ms encoding tolerance).");
  const chunks = scene.layout.compositionPlan?.chunks;
  if (!Array.isArray(chunks) || chunks.length !== 3) errors.push("Exactly three song sections are required.");
  else {
    if (chunks.some(chunk => !chunk || !chunk.text?.trim() || !Number.isInteger(chunk.duration_ms) || chunk.duration_ms <= 0 || chunk.duration_ms > 15_000 || !Array.isArray(chunk.positive_styles) || !chunk.positive_styles.length || !Array.isArray(chunk.negative_styles))) errors.push("Each song section needs lyrics, styles, and 1–15000ms of duration.");
    if (chunks.reduce((sum, chunk) => sum + (chunk?.duration_ms || 0), 0) !== duration) errors.push("Song section timing must cover the actual song exactly.");
  }
  if (!Array.isArray(scene.layout.lyrics) || !scene.layout.lyrics.length || scene.layout.lyrics.some(line => typeof line !== "string" || !line.trim())) errors.push("Provide the actual song's lyric lines.");
  if (scene.audio.status === "generated") {
    if (!scene.audio.url || !Number.isFinite(scene.audio.durationMs) || Math.abs(scene.audio.durationMs - duration) > 1) errors.push("Measured song duration must match the composition.");
    if (Math.abs(scene.audio.durationSeconds * 1000 - duration) > 1) errors.push("Audio duration fields disagree.");
    let end = 0;
    if (!Array.isArray(scene.audio.captions) || scene.audio.captions.length !== 3) errors.push("Three section-level lyric captions are required.");
    else for (const caption of scene.audio.captions) {
      if (!caption.text?.trim() || caption.startMs !== end || !Number.isInteger(caption.endMs) || caption.endMs <= caption.startMs || caption.endMs > duration) errors.push("Lyric captions must cover the song in order without gaps or overlaps.");
      end = caption.endMs;
    }
    if (end !== duration) errors.push("Lyric captions must end with the song.");
  } else if (ready) errors.push("Import or generate the song before rendering.");
  const video = scene.layout.musicVideo;
  if (ready || video) {
    if (!video?.sourceStoryboardId || !Array.isArray(video.clips) || video.clips.length !== 3) errors.push("Three source clips and their storyboard provenance are required.");
    else {
      let cursor = 0;
      video.clips.forEach((clip, index) => {
        if (clip.shotIndex !== index || clip.startMs !== cursor || !Number.isInteger(clip.endMs) || clip.endMs <= clip.startMs || !clip.url || !clip.storageId) errors.push("Clip slots must be numbered, localizable, and contiguous.");
        cursor = clip.endMs;
      });
      if (cursor !== duration) errors.push("Clips must cover the complete song.");
    }
    if (ready && (!video?.stitchedVideo?.url || video.stitchedVideo.durationMs !== duration)) errors.push("Assemble the clips before rendering; stitched timing must match the song.");
  }
  return { valid: errors.length === 0, errors };
}

export function assertLegoScene(scene: unknown): asserts scene is LegoMusicVideoAdScene {
  const result = validateLegoMusicVideoScene(scene);
  if (!result.valid) throw new Error(result.errors.join("\n"));
}

export function legoStoryPrompt(scene: LegoMusicVideoAdScene) {
  assertLegoScene(scene);
  return buildBrickStoryboardStoryPrompt(asJingleScene(scene))
    .replace("brick-style miniature music video B-roll director for a brand jingle", "Lego music-video director making a brand ad")
    .replace("- Do not use trademarked toy names. Use brick-style miniature, modular brick, and block-figure language instead.", "- Lego naming is authorized for this Repo. Keep the Lego visual identity and the advertised brand distinct; never invent an endorsement.");
}

export function parseLegoStory(scene: LegoMusicVideoAdScene, story: unknown): BrickStoryboardStoryPlan {
  assertLegoScene(scene);
  return extractBrickStoryboardStoryPlan(JSON.stringify(story), deriveBrickStoryboardShots(asJingleScene(scene)), "Your coding agent", {
    brandName: scene.brand.name, authorizedLegoBranding: true,
  });
}

export function legoMediaPrompts(scene: LegoMusicVideoAdScene, story: unknown) {
  const result = createBrickStoryboardPromptPlan(asJingleScene(scene), parseLegoStory(scene, story));
  const branded = (text: string) => text.replace(/brick-style(?: miniature)?/g, "Lego")
    .replace("trademarked toy names, ", "");
  return {
    ...result,
    referenceFramePrompt: branded(result.referenceFramePrompt),
    shots: result.shots.map(shot => ({ ...shot, shotPrompt: branded(shot.shotPrompt), animationPrompt: branded(shot.animationPrompt) })),
  };
}

// Preserve actual total duration. These remain section-level lyric captions,
// not a claim of word alignment or direct auditory review.
export function applyMeasuredSong(scene: LegoMusicVideoAdScene, durationMs: number, url: string): LegoMusicVideoAdScene {
  assertLegoScene(scene);
  if (!Number.isInteger(durationMs) || durationMs < 10_000 || durationMs > 30_500) throw new Error("Measured song must be 10–30 seconds.");
  let cursor = 0;
  const planned = scene.layout.compositionPlan.chunks.reduce((sum, chunk) => sum + chunk.duration_ms, 0);
  const chunks = scene.layout.compositionPlan.chunks.map((chunk, index) => {
    const duration = index === 2 ? durationMs - cursor : Math.round(chunk.duration_ms / planned * durationMs);
    cursor += duration;
    return { ...chunk, duration_ms: duration };
  });
  const captions = createJingleCaptions(asJingleScene({ ...scene, layout: { ...scene.layout, compositionPlan: { chunks } } }));
  const next: LegoMusicVideoAdScene = {
    ...scene,
    audio: { status: "generated", storageId: `local:${url}`, url, mimeType: "audio/mpeg", durationMs, durationSeconds: durationMs / 1000, transcript: chunks.map(c => c.text).join("\n"), captions, provider: "upload", model: "existing-song", generatedAt: 0 },
    layout: { ...scene.layout, musicLengthMs: durationMs, compositionPlan: { chunks }, musicVideo: undefined },
  };
  assertLegoScene(next);
  return next;
}
