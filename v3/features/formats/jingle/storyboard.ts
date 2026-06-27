import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_JINGLE_MODEL } from "../../llm/nvidiaNimModels";
import { withTimeout } from "../../llm/timeout";
import type {
  JingleAdScene,
  JingleMusicVideoClip,
  JingleMusicVideoStitchedVideo,
} from "../../scene/types";

export const BRICK_MUSIC_VIDEO_STYLE_ID = "brick-music-video" as const;
export const BRICK_STORYBOARD_IMAGE_MODEL = "google/nano-banana-2";
export const BRICK_STORYBOARD_VIDEO_MODEL = "bytedance/seedance-2.0-mini";
export const DEFAULT_BRICK_STORYBOARD_SHOT_COUNT = 3;

export type BrickStoryboardSlot = {
  section: "hook" | "verse";
  shotIndex: number;
  durationMs: number;
  startMs: number;
  endMs: number;
  lyricLine: string;
};

export type BrickStoryboardPromptPlan = {
  referenceFramePrompt: string;
  shots: Array<BrickStoryboardSlot & {
    shotPrompt: string;
  }>;
};

export type BrickStoryboardStoryShot = {
  shotIndex: number;
  lyricLine: string;
  sceneDescription: string;
  motionHint: string;
  heroObject: string;
};

export type BrickStoryboardStoryPlan = {
  shots: BrickStoryboardStoryShot[];
};

export type BrickStoryboardImage = {
  storageId: string;
  url: string | null;
  mimeType: string;
};

export type BrickStoryboard = {
  jingleSceneId: string;
  visualStyle: typeof BRICK_MUSIC_VIDEO_STYLE_ID;
  imageModel: typeof BRICK_STORYBOARD_IMAGE_MODEL;
  shotCount: number;
  storyPlan?: BrickStoryboardStoryPlan;
  musicVideo?: {
    sourceStoryboardId: string;
    clips: JingleMusicVideoClip[];
    stitchedVideo?: JingleMusicVideoStitchedVideo;
    builtAt: number;
  };
  referenceFrame: {
    prompt: string;
    image?: BrickStoryboardImage;
    status: "pending" | "ok" | "failed";
    error?: string;
  };
  shots: Array<BrickStoryboardSlot & {
    shotPrompt: string;
    image?: BrickStoryboardImage;
    video?: BrickStoryboardImage;
    status: "pending" | "ok" | "failed";
    error?: string;
  }>;
};

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_STORY_DIRECTOR_TIMEOUT_MS = 60_000;
const DEFAULT_STORY_DIRECTOR_MAX_TOKENS = 4096;
const sleep = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

const cleanText = (value: unknown, maxLength = 1400) => String(value ?? "")
  .replace(/[—–]/g, "-")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const sectionName = (text: string): "hook" | "verse" => (
  /^\[verse]/i.test(text.trim()) ? "verse" : "hook"
);

const lyricLines = (text: string) => text
  .split("\n")
  .map((line) => cleanText(line, 140))
  .filter((line) => line && !/^\[[^\]]+]$/.test(line));

const parseJsonObject = (value: string, providerLabel = "AI provider") => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonText) throw new Error(`${providerLabel} returned no JSON.`);
  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const suffix = jsonText.slice(-240).replace(/\s+/g, " ").trim();
    throw new Error(`${providerLabel} returned malformed JSON: ${message}. JSON ended with: ${suffix}`);
  }
};

export function deriveBrickStoryboardShots(scene: JingleAdScene): BrickStoryboardSlot[] {
  const chunks = scene.layout.compositionPlan.chunks;
  const counts = chunks.map(() => 1);
  for (let extra = DEFAULT_BRICK_STORYBOARD_SHOT_COUNT - chunks.length; extra > 0; extra -= 1) {
    let bestIndex = 0;
    for (let index = 1; index < chunks.length; index += 1) {
      if ((chunks[index]!.duration_ms / counts[index]!) > (chunks[bestIndex]!.duration_ms / counts[bestIndex]!)) {
        bestIndex = index;
      }
    }
    counts[bestIndex]! += 1;
  }

  let absoluteStart = 0;
  let shotIndex = 0;
  const slots: BrickStoryboardSlot[] = [];
  chunks.forEach((chunk, chunkIndex) => {
    const lines = lyricLines(chunk.text);
    const count = counts[chunkIndex]!;
    let chunkCursor = 0;
    for (let localIndex = 0; localIndex < count; localIndex += 1) {
      const remaining = chunk.duration_ms - chunkCursor;
      const durationMs = localIndex === count - 1 ? remaining : Math.round(remaining / (count - localIndex));
      const startMs = absoluteStart + chunkCursor;
      const endMs = startMs + durationMs;
      slots.push({
        section: sectionName(chunk.text),
        shotIndex,
        durationMs,
        startMs,
        endMs,
        lyricLine: lines[localIndex % Math.max(1, lines.length)] || scene.creative.headline,
      });
      shotIndex += 1;
      chunkCursor += durationMs;
    }
    absoluteStart += chunk.duration_ms;
  });

  return slots;
}

const cameraSetups = [
  "wide low-angle vertical shot",
  "medium three-quarter side shot",
  "close front-facing vertical shot",
];

const setDetails = [
  "Lego-built brand name sign integrated into a storefront",
  "brand-color brick streets, counters, packages, and signal lights",
  "small Lego customers, carts, screens, and animated brick props",
];

const motionNotes = [
  "Locked camera; the hero object moves once in a clean readable action.",
  "Locked camera; a Lego character reacts while one set piece changes state.",
  "Locked camera; brand-color bricks ripple through the scene on the beat.",
];

const styleSummary = (scene: JingleAdScene) => scene.layout.compositionPlan.chunks[0]?.positive_styles
  .slice(0, 8)
  .join(", ") || "modern hip hop, polished studio production";

const brandPalette = (scene: JingleAdScene) => scene.brand.colors
  .slice(0, 5)
  .join(", ") || scene.style.accentColor || "#111827, #FFFFFF";

const angleContext = (scene: JingleAdScene) => cleanText(
  scene.layout.angle || scene.creative.subheadline || scene.brand.description,
  220,
);

const bannedStoryPattern = /\b(stage performance|concert|band|dj|subtitles?|captions?|lyric text|testimonial|guarantee|guaranteed|#1|award|discount)\b/i;

const normalizeComparableText = (value: unknown) => cleanText(value, 260).replace(/\s+/g, " ");

export function buildBrickStoryboardStoryPrompt(scene: JingleAdScene) {
  const colors = brandPalette(scene);
  const angle = angleContext(scene);
  const slots = deriveBrickStoryboardShots(scene);
  const ctaDirection = cleanText(scene.creative.ctaText || "Learn more", 80);
  return [
    "You are a Lego music video B-roll director for a brand jingle.",
    "Return ONLY valid JSON. Return B-roll beats only, NOT image prompts.",
    "",
    "REQUIRED JSON CONTRACT:",
    "- Return one flat top-level JSON object with EXACTLY one top-level key: shots.",
    "- Do not add visualPremise, recurringHeroObject, worldSetting, storyPremise, premise, setting, hero, or storyPlan.",
    "- shots must contain exactly 3 objects using the exact keys: shotIndex, lyricLine, sceneDescription, motionHint, heroObject.",
    "- Keep every string short. sceneDescription max 140 chars. motionHint max 90 chars. heroObject max 60 chars.",
    "- Do not use double quote characters inside any string value. Use apostrophes if needed.",
    JSON.stringify({
      shots: [
        { shotIndex: 0, lyricLine: slots[0]?.lyricLine || "exact lyric line", sceneDescription: "literal Lego B-roll visual for this lyric", motionHint: "one simple physical motion", heroObject: "object in this shot" },
        { shotIndex: 1, lyricLine: slots[1]?.lyricLine || "exact lyric line", sceneDescription: "literal Lego B-roll visual for this lyric", motionHint: "one simple physical motion", heroObject: "object in this shot" },
        { shotIndex: 2, lyricLine: slots[2]?.lyricLine || "exact lyric line", sceneDescription: `literal Lego B-roll visual that turns ${ctaDirection} into action`, motionHint: "one simple CTA-driven physical motion", heroObject: "object in this shot" },
      ],
    }, null, 2),
    "",
    "BRAND:",
    `- Name: ${scene.brand.name}`,
    `- Description: ${cleanText(scene.brand.description, 260)}`,
    `- Jingle angle: ${angle}`,
    `- CTA direction: ${ctaDirection}`,
    `- Brand colors: ${colors}`,
    `- Music style: ${styleSummary(scene)}`,
    "",
    "LYRIC SLOTS (return exactly one shot for each row; do not split, merge, reorder, or add shots):",
    "shotIndex | startMs | endMs | durationMs | section | lyricLine",
    slots
      .map((slot) => `${slot.shotIndex} | ${slot.startMs} | ${slot.endMs} | ${slot.durationMs} | ${slot.section} | ${slot.lyricLine}`)
      .join("\n"),
    "",
    "RULES:",
    "- Each sceneDescription must visually depict what the assigned lyric means as vivid Lego B-roll.",
    "- Do not force a sales funnel, problem/escalation/payoff structure, stage performance, or generic brand wallpaper.",
    "- Every motionHint must be a concrete visible action a viewer can understand without reading lyrics.",
    "- Use a consistent heroObject family across shots: product, package, dashboard, phone, cart, inbox, calendar, storefront, or service desk.",
    `- The final shot sceneDescription must incorporate the CTA direction "${ctaDirection}" as a physical Lego action, not as text.`,
    "- No stage performance, band, DJ, concert crowd, captions, subtitles, lyric text, CTA text, buttons, or fake claims.",
    "- No invented stats, ratings, reviews, discounts, guarantees, awards, competitors, or claims beyond the brand context.",
    "- Do not write camera directions, provider prompts, style tags, or image prompts.",
  ].join("\n");
}

export function extractBrickStoryboardStoryPlan(
  content: string,
  slots: BrickStoryboardSlot[],
  providerLabel = "Story Director",
): BrickStoryboardStoryPlan {
  const payload = parseJsonObject(content, providerLabel);
  const unexpectedTopLevelKeys = Object.keys(payload).filter((key) => key !== "shots");
  if (unexpectedTopLevelKeys.length) {
    throw new Error(`${providerLabel} returned unexpected top-level keys: ${unexpectedTopLevelKeys.slice(0, 8).join(", ")}.`);
  }
  const rawShots = Array.isArray(payload.shots) ? payload.shots : [];

  if (slots.length !== DEFAULT_BRICK_STORYBOARD_SHOT_COUNT || rawShots.length !== slots.length) {
    throw new Error(`${providerLabel} must return exactly 3 B-roll shots, one per lyric slot.`);
  }

  const shots = rawShots.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`${providerLabel} returned an invalid story shot.`);
    }
    const record = item as Record<string, unknown>;
    if ("role" in record) {
      throw new Error(`${providerLabel} used the old problem/escalation/payoff story shape.`);
    }
    if ("visualMetaphor" in record || "physicalEvent" in record) {
      throw new Error(`${providerLabel} used the old visualMetaphor/physicalEvent story shape.`);
    }
    const slot = slots[index]!;
    const shotIndex = Math.round(Number(record.shotIndex));
    const lyricLine = cleanText(record.lyricLine, 180);
    const sceneDescription = cleanText(record.sceneDescription, 240);
    const motionHint = cleanText(record.motionHint, 160);
    const heroObject = cleanText(record.heroObject, 140);
    const combined = `${lyricLine} ${sceneDescription} ${motionHint} ${heroObject}`;

    if (shotIndex !== slot.shotIndex) {
      throw new Error(`${providerLabel} story shots must preserve lyric slot indexes.`);
    }
    if (normalizeComparableText(lyricLine) !== normalizeComparableText(slot.lyricLine)) {
      throw new Error(`${providerLabel} story shot ${slot.shotIndex + 1} must use the exact assigned lyric line.`);
    }
    if (!sceneDescription || !motionHint || !heroObject) {
      throw new Error(`${providerLabel} returned an incomplete B-roll story shot.`);
    }
    if (bannedStoryPattern.test(combined)) {
      throw new Error(`${providerLabel} used banned stage, caption, or fake-claim language.`);
    }
    return { shotIndex, lyricLine, sceneDescription, motionHint, heroObject };
  });

  return { shots };
}

export async function generateBrickStoryboardStoryPlan(
  scene: JingleAdScene,
  options: {
    nvidiaNimApiKey?: string;
    nvidiaNimBaseUrl?: string;
    nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
    nvidiaNimModel?: string;
    timeoutMs?: number;
  } = {},
) {
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;
  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM brick story director is not configured.");
  if (/^(0|false|off|disabled)$/i.test(String(process.env.NVIDIA_NIM_ENABLED || ""))) {
    throw new Error("NVIDIA NIM brick story director is disabled.");
  }

  const content = await callNvidiaNimChat({
    apiKey: nvidiaNimApiKey,
    baseUrl: options.nvidiaNimBaseUrl || process.env.NVIDIA_NIM_BASE_URL || DEFAULT_NVIDIA_NIM_BASE_URL,
    label: "NVIDIA NIM brick story director",
    model: options.nvidiaNimModel || process.env.NVIDIA_NIM_JINGLE_MODEL || DEFAULT_NVIDIA_NIM_JINGLE_MODEL,
    nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
    prompt: buildBrickStoryboardStoryPrompt(scene),
    maxTokens: DEFAULT_STORY_DIRECTOR_MAX_TOKENS,
    temperature: 0.35,
    timeoutMs: options.timeoutMs ?? DEFAULT_STORY_DIRECTOR_TIMEOUT_MS,
  });
  return extractBrickStoryboardStoryPlan(
    content,
    deriveBrickStoryboardShots(scene),
    "NVIDIA NIM brick story director",
  );
}

export function createBrickStoryboardPromptPlan(
  scene: JingleAdScene,
  storyPlan: BrickStoryboardStoryPlan,
): BrickStoryboardPromptPlan {
  const slots = deriveBrickStoryboardShots(scene);
  const colors = brandPalette(scene);
  const heroObjects = storyPlan.shots.map((shot) => shot.heroObject).filter(Boolean).join(", ");
  const sceneDescriptions = storyPlan.shots.map((shot) => shot.sceneDescription).join(" Then ");
  const referenceFramePrompt = cleanText(
    [
      `Vertical 9:16 Lego music-video B-roll world for ${scene.brand.name}.`,
      `Use dominant brick palette ${colors}.`,
      `Create one consistent Lego world that can support these lyric visuals: ${sceneDescriptions}.`,
      `Recurring hero object family: ${heroObjects || "brand product and service desk"}.`,
      `Include a Lego-built ${scene.brand.name} name sign as an in-world object.`,
      `Lighting style matches ${styleSummary(scene)}.`,
      "Locked-off upright vertical composition. No Dutch angle, no sideways frame, no handheld camera.",
      "No captions, no subtitles, no lyric text, no readable ad copy besides the brand name sign.",
    ].join(" "),
    1800,
  );

  const shots = slots.map((slot) => {
    const index = slot.shotIndex % cameraSetups.length;
    const storyShot = storyPlan.shots.find((shot) => shot.shotIndex === slot.shotIndex);
    if (!storyShot) throw new Error(`Story Director output is missing shot ${slot.shotIndex + 1}.`);
    const shotPrompt = cleanText(
      [
        `Style & Mood: lyric-driven Lego music-video B-roll, ${styleSummary(scene)}, brand palette ${colors}.`,
        `Dynamic Description: ${cameraSetups[index]}, visualizing the lyric "${cleanText(slot.lyricLine, 120)}". Scene: ${storyShot.sceneDescription}. Motion: ${storyShot.motionHint}. Hero object: ${storyShot.heroObject}. ${motionNotes[index]}`,
        `Static Description: no stage performance, no band, no DJ, no concert crowd. Same Lego world as the reference frame, ${setDetails[index]}, directional rim light, soft front fill, upright vertical 9:16 frame. No camera shake, rotation, handheld motion, captions, subtitles, lyric text, CTA text, buttons, or extra readable ad copy.`,
      ].join(" "),
      1800,
    );
    return { ...slot, shotPrompt };
  });

  return { referenceFramePrompt, shots };
}

export function buildBrickMusicVideoClips(storyboard: BrickStoryboard): JingleMusicVideoClip[] {
  const clips = storyboard.shots
    .slice()
    .sort((a, b) => a.startMs - b.startMs)
    .map((shot) => {
      if (!shot.video?.storageId) throw new Error(`Shot ${shot.shotIndex + 1} needs a generated video before building.`);
      return {
        shotIndex: shot.shotIndex,
        storageId: shot.video.storageId,
        url: shot.video.url ?? null,
        startMs: shot.startMs,
        endMs: shot.endMs,
      };
    });
  if (!clips.length) throw new Error("Build music video needs at least one generated shot video.");
  return clips;
}

export async function generateReplicateNanoBanana2Image({
  replicateApiToken,
  prompt,
  imageInput = [],
  aspectRatio = "9:16",
}: {
  replicateApiToken: string;
  prompt: string;
  imageInput?: string[];
  aspectRatio?: "1:1" | "4:5" | "9:16" | "match_input_image";
}) {
  if (!replicateApiToken) throw new Error("Replicate image generation is not configured.");
  const [owner, name] = BRICK_STORYBOARD_IMAGE_MODEL.split("/");
  if (!owner || !name) throw new Error("Replicate image model is invalid.");

  const prediction = await withTimeout(fetch(`https://api.replicate.com/v1/models/${owner}/${name}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateApiToken}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: {
        prompt,
        ...(imageInput.length ? { image_input: imageInput } : {}),
        aspect_ratio: aspectRatio,
        resolution: "1K",
        output_format: "jpg",
      },
    }),
  }), DEFAULT_TIMEOUT_MS, "Replicate Nano Banana 2 image generation");
  const payload = await prediction.json().catch(() => null) as { output?: string; error?: string; detail?: string } | null;
  if (!prediction.ok) throw new Error(payload?.error || payload?.detail || "Replicate Nano Banana 2 image generation failed.");
  if (!payload?.output) throw new Error("Replicate Nano Banana 2 returned no image.");

  const imageResponse = await withTimeout(fetch(payload.output), DEFAULT_TIMEOUT_MS, "Replicate image download");
  if (!imageResponse.ok) throw new Error("Replicate Nano Banana 2 image download failed.");
  return {
    bytes: new Uint8Array(await imageResponse.arrayBuffer()),
    mimeType: imageResponse.headers.get("content-type") || "image/jpeg",
  };
}

export async function generateReplicateSeedanceVideo({
  replicateApiToken,
  imageUrl,
  prompt,
  durationSeconds,
  timeoutMs = 180_000,
}: {
  replicateApiToken: string;
  imageUrl: string;
  prompt: string;
  durationSeconds: number;
  timeoutMs?: number;
}) {
  if (!replicateApiToken) throw new Error("Replicate video generation is not configured.");
  const duration = Math.min(15, Math.max(5, Math.round(durationSeconds)));
  console.log("[brick-video] seedance request", {
    model: BRICK_STORYBOARD_VIDEO_MODEL,
    duration,
    hasImageUrl: Boolean(imageUrl),
    promptLength: prompt.length,
  });

  const prediction = await withTimeout(fetch(`https://api.replicate.com/v1/models/${BRICK_STORYBOARD_VIDEO_MODEL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateApiToken}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: {
        image: imageUrl,
        prompt,
        duration,
        aspect_ratio: "9:16",
        resolution: "720p",
        generate_audio: false,
      },
    }),
  }), timeoutMs, "Replicate Seedance video generation");
  let payload = await prediction.json().catch(() => null) as {
    id?: string;
    status?: string;
    urls?: { get?: string };
    output?: string;
    error?: string;
    detail?: string;
    logs?: string;
  } | null;
  if (!prediction.ok) throw new Error(payload?.error || payload?.detail || "Replicate Seedance video generation failed.");
  console.log("[brick-video] seedance prediction created", {
    id: payload?.id,
    status: payload?.status,
    hasOutput: Boolean(payload?.output),
    hasGetUrl: Boolean(payload?.urls?.get),
    error: payload?.error || null,
  });

  for (let attempt = 0; payload?.urls?.get && !payload.output && !["succeeded", "failed", "canceled"].includes(payload.status || "") && attempt < 36; attempt += 1) {
    await sleep(5_000);
    const nextResponse = await withTimeout(fetch(payload.urls.get, {
      headers: { Authorization: `Bearer ${replicateApiToken}` },
    }), timeoutMs, "Replicate Seedance prediction polling");
    payload = await nextResponse.json().catch(() => payload);
    console.log("[brick-video] seedance poll", {
      id: payload?.id,
      status: payload?.status,
      hasOutput: Boolean(payload?.output),
      error: payload?.error || null,
    });
  }

  if (payload?.status === "failed" || payload?.status === "canceled") {
    throw new Error(`Replicate Seedance ${payload.status}: ${payload.error || payload.logs || "no provider error returned"}`);
  }
  if (!payload?.output) throw new Error("Replicate Seedance returned no video.");

  console.log("[brick-video] seedance output ready", {
    id: payload.id,
    status: payload.status,
  });
  const videoResponse = await withTimeout(fetch(payload.output), timeoutMs, "Replicate video download");
  if (!videoResponse.ok) throw new Error("Replicate Seedance video download failed.");
  console.log("[brick-video] seedance video downloaded", {
    contentType: videoResponse.headers.get("content-type"),
    contentLength: videoResponse.headers.get("content-length"),
  });
  return {
    bytes: new Uint8Array(await videoResponse.arrayBuffer()),
    mimeType: videoResponse.headers.get("content-type") || "video/mp4",
  };
}
