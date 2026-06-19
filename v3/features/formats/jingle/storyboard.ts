import { withTimeout } from "../../llm/timeout";
import type {
  JingleAdScene,
  JingleMusicVideoClip,
  JingleMusicVideoStitchedVideo,
} from "../../scene/types";

export const BRICK_MUSIC_VIDEO_STYLE_ID = "brick-music-video" as const;
export const BRICK_STORYBOARD_IMAGE_MODEL = "google/nano-banana-2";
export const BRICK_STORYBOARD_VIDEO_MODEL = "bytedance/seedance-2.0-fast";
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

export const normalizeBrickStoryboardShotCount = (shotCount = DEFAULT_BRICK_STORYBOARD_SHOT_COUNT) =>
  Math.min(8, Math.max(3, Math.round(shotCount)));

export function deriveBrickStoryboardShots(
  scene: JingleAdScene,
  shotCount = DEFAULT_BRICK_STORYBOARD_SHOT_COUNT,
): BrickStoryboardSlot[] {
  const chunks = scene.layout.compositionPlan.chunks;
  const targetCount = normalizeBrickStoryboardShotCount(shotCount);
  const counts = chunks.map(() => 1);
  for (let extra = targetCount - chunks.length; extra > 0; extra -= 1) {
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
  "overhead three-quarter vertical shot",
  "wide tracking shot",
  "medium low-angle push-in",
  "close side-profile shot",
  "wide top-lit stage shot",
];

const subjectPlacements = [
  "toy-brick performer centered on a stepped stage",
  "toy-brick crew at frame left facing a brick console",
  "toy-brick mascot near frame right beside stacked speaker towers",
  "toy-brick crowd silhouettes along the lower frame",
  "toy-brick lead figure crossing the center aisle",
  "toy-brick DJ behind a raised block platform",
  "toy-brick camera rig pointed at the brick brand sign",
  "toy-brick dancers spaced across tiered risers",
];

const setDetails = [
  "brick-built brand name sign on the rear wall",
  "stacked brick speaker columns using the brand palette",
  "striped brick floor tiles in the brand colors",
  "small brick light trusses over the stage",
  "brick skyline pieces behind the performer",
  "blocky brick turntables on the center platform",
  "brick stair risers leading to the rear sign",
  "brick side panels with alternating brand-color blocks",
];

const motionNotes = [
  "Locked camera; the performer steps one brick forward.",
  "Locked camera; the light bar sweeps across the set.",
  "Locked camera; the subject raises one arm on the beat.",
  "Locked camera; the crowd blocks bounce in place.",
  "Locked camera; stage lights blink in sequence.",
  "Locked camera; the speaker blocks pulse gently.",
  "Locked camera; the side-stage lights sweep once.",
  "Locked camera; the full toy-brick set stays upright and steady.",
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

export function createBrickStoryboardPromptPlan(
  scene: JingleAdScene,
  shotCount = DEFAULT_BRICK_STORYBOARD_SHOT_COUNT,
): BrickStoryboardPromptPlan {
  const slots = deriveBrickStoryboardShots(scene, shotCount);
  const colors = brandPalette(scene);
  const referenceFramePrompt = cleanText(
    [
      `Vertical 9:16 toy-brick music video stage for ${scene.brand.name}.`,
      `Use dominant brick palette ${colors}.`,
      `Build a single consistent stage with a brick-built ${scene.brand.name} name sign, stacked speaker columns, tiered risers, and a clean dark studio backdrop.`,
      `Lighting style matches ${styleSummary(scene)}.`,
      "Locked-off upright vertical composition. No Dutch angle, no sideways frame, no handheld camera.",
      "No captions, no subtitles, no lyric text, no readable ad copy besides the brand name sign.",
    ].join(" "),
    1800,
  );

  const shots = slots.map((slot) => {
    const index = slot.shotIndex % cameraSetups.length;
    const shotPrompt = cleanText(
      [
        `${cameraSetups[index]}, ${subjectPlacements[index]}, ${slot.section} section,`,
        `directional rim light and soft front fill using ${colors},`,
        `${setDetails[index]},`,
        `physical action tied to the lyric "${cleanText(slot.lyricLine, 90)}" and brand angle "${angleContext(scene)}".`,
        motionNotes[index],
        "Same toy-brick stage as the reference frame. Upright vertical 9:16 frame. No camera shake, no rotation, no handheld motion. Do not render captions, subtitles, lyric text, or extra readable ad copy.",
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
}: {
  replicateApiToken: string;
  prompt: string;
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
        aspect_ratio: "9:16",
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
