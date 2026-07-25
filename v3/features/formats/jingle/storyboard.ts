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
export const BRICK_STORYBOARD_IMAGE_MODEL = "google/nano-banana-2-lite";
export const BRICK_STORYBOARD_VIDEO_MODEL = "bytedance/seedance-2.0-mini";
export const BRICK_STORYBOARD_VIDEO_RESOLUTION = "480p";
export const DEFAULT_BRICK_STORYBOARD_SHOT_COUNT = 3;
const BRICK_STORYBOARD_FUN_MECHANISMS = [
  "physical_metaphor",
  "tiny_disaster",
  "dramatic_reveal",
  "crowd_reaction",
  "chase_or_motion",
  "visual_joke",
  "scale_exaggeration",
] as const;

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
  storyboardSheetPrompt: string;
  shots: Array<BrickStoryboardSlot & {
    shotPrompt: string;
    animationPrompt: string;
  }>;
};

export type BrickStoryboardStoryShot = {
  shotIndex: number;
  lyricLine: string;
  funMechanism: BrickStoryboardFunMechanism;
  sceneDescription: string;
  motionHint: string;
};

export type BrickStoryboardStoryPlan = {
  recurringHeroObject: string;
  shots: BrickStoryboardStoryShot[];
};

export type BrickStoryboardFunMechanism = typeof BRICK_STORYBOARD_FUN_MECHANISMS[number];

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
  storyboardSheetPrompt?: string;
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
    animationPrompt?: string;
    image?: BrickStoryboardImage;
    video?: BrickStoryboardImage;
    status: "pending" | "ok" | "failed";
    error?: string;
  }>;
};

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_STORY_DIRECTOR_TIMEOUT_MS = 60_000;
const DEFAULT_STORY_DIRECTOR_MAX_TOKENS = 2400;
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
  if (chunks.length > DEFAULT_BRICK_STORYBOARD_SHOT_COUNT) {
    const totalDuration = chunks.reduce((sum, chunk) => sum + chunk.duration_ms, 0);
    if (totalDuration <= 0) return [];
    const chunkAtTime = (timeMs: number) => {
      let cursor = 0;
      for (const chunk of chunks) {
        cursor += chunk.duration_ms;
        if (timeMs < cursor) return chunk;
      }
      return chunks[chunks.length - 1]!;
    };
    return Array.from({ length: DEFAULT_BRICK_STORYBOARD_SHOT_COUNT }, (_, shotIndex) => {
      const startMs = Math.round((totalDuration * shotIndex) / DEFAULT_BRICK_STORYBOARD_SHOT_COUNT);
      const endMs = shotIndex === DEFAULT_BRICK_STORYBOARD_SHOT_COUNT - 1
        ? totalDuration
        : Math.round((totalDuration * (shotIndex + 1)) / DEFAULT_BRICK_STORYBOARD_SHOT_COUNT);
      const chunk = chunkAtTime(startMs + ((endMs - startMs) / 2));
      const lines = lyricLines(chunk.text);
      return {
        section: sectionName(chunk.text),
        shotIndex,
        durationMs: endMs - startMs,
        startMs,
        endMs,
        lyricLine: lines[0] || scene.creative.headline,
      };
    });
  }

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
  "brick-built brand storefront sign integrated into the set",
  "brand-color modular brick streets, counters, product displays, and signal lights",
  "small block-figure customers, carts, screens, and animated brick props",
];

const stillFrameRules = [
  "One single full-frame 9:16 image.",
  "One miniature brick-style scene, one camera angle, one frozen moment in time.",
  "The scene should read instantly as one clear visual idea: large hero object, simple background, obvious action, strong foreground and midground separation.",
  "No storyboard sheet, comic strip, collage, split-screen, contact sheet, before-after layout, panel borders, horizontal dividers, or multiple frames.",
  "No realistic human faces. Block-figure characters only.",
  "Stable upright vertical frame, no sideways framing, no Dutch angle.",
  "No captions, subtitles, lyric text, CTA text, buttons, or extra readable ad copy beyond in-world brand signage.",
].join(" ");

const animationNegativeRules = "No stage performance, band, DJ, concert crowd, shake, handheld movement, rotation, zoom, sideways frame, cuts, crop drift, captions, subtitles, lyrics, color labels, realistic human faces, trademarked toy names, or newly added extra text.";

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

const bannedStoryPattern = /\b(stage performance|concert|band|dj|subtitles?|captions?|lyric text|testimonial|guarantee|guaranteed|#1|award|discount|realistic human faces?|trademarked|lego|minifigures?)\b/i;
const bannedHeroObjectPattern = /\b(realistic human faces?|trademarked)\b/i;
const genericContainerPattern = /\b(box|boxes|cardboard|carton|crate|shipping box|delivery box|package|parcel)\b/i;
const productSpecificObjectPattern = /\b(cookie|cookies|brownie|brownies|cake|cheesecake|tin|tray|platter|product|bottle|apparel|shirt|shoe|skincare|serum|dashboard|phone|calendar|inbox|cart|storefront|service desk)\b/i;
const readableHeroTextPattern = /\b(label|logo|wordmark|brand name|readable text|lettering|printed name)\b/i;
const productOnlyScenePattern = /\b(product-only|tabletop|showroom|still life|still-life|packshot|catalog shot|product render|product placement|generic brand(?:ed)? wallpaper)\b/i;
const ALLOWED_FUN_MECHANISMS = new Set<BrickStoryboardFunMechanism>(BRICK_STORYBOARD_FUN_MECHANISMS);

const normalizeComparableText = (value: unknown) => cleanText(value, 260).replace(/\s+/g, " ");

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripReadableHeroText = (value: string, brandName = "") => {
  let next = value;
  const brand = cleanText(brandName, 120);
  if (brand) {
    next = next.replace(new RegExp(escapeRegExp(brand), "gi"), "");
  }
  return cleanText(
    next
      .replace(/\s+\b(?:with|including|featuring|showing)\b\s+(?:a\s+|the\s+)?(?:readable\s+)?(?:brand\s+)?(?:name|label|logo|wordmark|lettering|printed name|text)\b.*$/i, "")
      .replace(/\s+\b(?:with|including|featuring|showing)\b\s+(?:a\s+|the\s+)?printed\s+(?:label|logo|wordmark|name|text)\b.*$/i, "")
      .replace(/\b(?:readable\s+)?(?:brand\s+)?(?:name|label|logo|wordmark|lettering|printed name|text)\b/gi, "")
      .replace(/\s+(?:with|including|featuring|showing)\s*$/i, "")
      .replace(/\s{2,}/g, " "),
    140,
  );
};

export const toSeedanceSafeBrickPrompt = (value: string) => value
  .replace(/\bLego-built\b/gi, "brick-built")
  .replace(/\bLego minifigures?\b/gi, "plastic brick characters")
  .replace(/\bLego world\b/gi, "snap-together brick world")
  .replace(/\bminifigures?\b/gi, "plastic brick characters")
  .replace(/\bLego\b/gi, "brick-style")
  .replace(/\btoy-brick\b/gi, "brick-style miniature");

export function buildBrickStoryboardStoryPrompt(scene: JingleAdScene) {
  const colors = brandPalette(scene);
  const angle = angleContext(scene);
  const slots = deriveBrickStoryboardShots(scene);
  const ctaDirection = cleanText(scene.creative.ctaText || "Learn more", 80);
  return [
    "You are a brick-style miniature music video B-roll director for a brand jingle.",
    "Return ONLY valid JSON. Return B-roll beats only, NOT image prompts.",
    "",
    "REQUIRED JSON CONTRACT:",
    "- Return one flat top-level JSON object with EXACTLY two top-level keys: recurringHeroObject and shots.",
    "- recurringHeroObject is the one physical miniature brick-style object that appears in all 3 shots.",
    "- recurringHeroObject describes the recurring brand/product motif. It can be the catalyst, prize, signal, tool, or payoff, but it does not need to dominate every frame.",
    "- recurringHeroObject describes shape, color, and use only. Example: red cookie tin. Never include brand name, logo, readable label, wordmark, or text.",
    "- Do not add visualPremise, worldSetting, storyPremise, premise, setting, hero, or storyPlan.",
    "- shots must contain exactly 3 objects using the exact keys: shotIndex, lyricLine, funMechanism, sceneDescription, motionHint.",
    `- funMechanism must be one of: ${BRICK_STORYBOARD_FUN_MECHANISMS.join(", ")}.`,
    "- Do not write camera directions, provider prompts, style tags, image prompts, or shotPrompt text.",
    "- Keep every string short. recurringHeroObject max 60 chars. sceneDescription max 140 chars. motionHint max 90 chars.",
    JSON.stringify({
      recurringHeroObject: "red brick cookie tin",
      shots: [
        { shotIndex: 0, lyricLine: slots[0]?.lyricLine || "exact lyric line", funMechanism: "dramatic_reveal", sceneDescription: "oven door blasts warm light as a crowd of block-figures gasps at the red tin sliding out", motionHint: "the tin slides halfway onto a waiting scooter rack" },
        { shotIndex: 1, lyricLine: slots[1]?.lyricLine || "exact lyric line", funMechanism: "tiny_disaster", sceneDescription: "dusty gray stale snacks topple like a tiny disaster while the red tin races along a bright brick path", motionHint: "the tin knocks one stale display aside" },
        { shotIndex: 2, lyricLine: slots[2]?.lyricLine || "exact lyric line", funMechanism: "crowd_reaction", sceneDescription: "front door opens to warm cookie glow as a family crowd reaches for the red tin like treasure", motionHint: "the lid lifts and steam rises as hands reach in" },
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
    "- Return story beats only. Do not write camera directions, provider prompts, style tags, image prompts, or shotPrompt text.",
    "- North star: Lyric -> surprising miniature event -> visible reaction -> brand payoff.",
    "- Each shot must be fun with audio muted. It should make the viewer think: 'wait, what is happening now?'",
    "- Each shot must use a different funMechanism.",
    "- If the lyric is an idiom, make it physical. If it names a pain, show the consequence. If it names a benefit, show the world reacting. If it has attitude, exaggerate it.",
    "- Each sceneDescription must include at least two cinematic ingredients: visible character reaction, old-vs-new contrast, object in motion, environmental stakes, crowd/social proof energy, visual joke, or dramatic scale.",
    "- Each sceneDescription must describe one frozen peak moment, not a sequence of actions. Prefer 'the tin is halfway onto the scooter rack' over 'the baker slides the tin onto the scooter'.",
    "- Each sceneDescription must contain no more than two distinct spatial zones: foreground and background only. No three-zone compositions.",
    "- Every motionHint must be one concrete visible action a viewer can understand without reading lyrics.",
    "- Each sceneDescription must visually depict what the assigned lyric means as vivid brick-style B-roll.",
    "- Reject quiet product-only still lifes, showroom shots, tabletop product renders, and generic branded wallpaper.",
    "- Do not force a sales funnel, problem/escalation/payoff structure, stage performance, or generic brand wallpaper.",
    "- Pick exactly one recurringHeroObject. If product imagery or product language exists, derive it from the actual product or use moment: cookie tray, cookie tin, cheesecake slice, brownie platter, skincare bottle, apparel pocket, dashboard, phone, calendar, inbox, cart, storefront, or service desk.",
    "- The recurringHeroObject must not include brand name, logo, label, wordmark, or readable text. Use color, shape, and product type instead.",
    "- Never choose a generic box, crate, carton, shipping box, delivery box, parcel, or package as the recurringHeroObject unless that container is literally the product being sold.",
    "- Every sceneDescription and motionHint must include that same recurringHeroObject as a recognizable motif, but it must not be the whole shot. Product/brand motif can be the catalyst, prize, signal, tool, or payoff.",
    "- The reference frame locks the world; the recurringHeroObject gets the same lock.",
    `- The final shot should turn the CTA direction "${ctaDirection}" into a visible physical action, never baked text, a button, or a caption.`,
    "- No stage performance, band, DJ, concert crowd, captions, subtitles, lyric text, CTA text, buttons, panel layouts, realistic human faces, or fake claims. Block-figure characters only.",
    "- Brand name or logo may appear only as natural in-world set dressing, such as a storefront sign, menu board, delivery van side, or product display. Do not put brand text in recurringHeroObject, captions, subtitles, CTA buttons, or floating ad copy.",
    "- Do not use trademarked toy names. Use brick-style miniature, modular brick, and block-figure language instead.",
    "- No invented stats, ratings, reviews, discounts, guarantees, awards, competitors, or claims beyond the brand context.",
  ].join("\n");
}

export function extractBrickStoryboardStoryPlan(
  content: string,
  slots: BrickStoryboardSlot[],
  providerLabel = "Story Director",
  options: { ctaDirection?: string; brandName?: string } = {},
): BrickStoryboardStoryPlan {
  const payload = parseJsonObject(content, providerLabel);
  const unexpectedTopLevelKeys = Object.keys(payload).filter((key) => !["recurringHeroObject", "shots"].includes(key));
  if (unexpectedTopLevelKeys.length) {
    throw new Error(`${providerLabel} returned unexpected top-level keys: ${unexpectedTopLevelKeys.slice(0, 8).join(", ")}.`);
  }
  const recurringHeroObject = stripReadableHeroText(
    cleanText(toSeedanceSafeBrickPrompt(cleanText(payload.recurringHeroObject, 140)), 140),
    options.brandName,
  );
  if (!recurringHeroObject) {
    throw new Error(`${providerLabel} must choose one recurring hero object.`);
  }
  if (bannedHeroObjectPattern.test(recurringHeroObject)) {
    throw new Error(`${providerLabel} used banned language in the recurring hero object: ${recurringHeroObject}.`);
  }
  if (genericContainerPattern.test(recurringHeroObject) && !productSpecificObjectPattern.test(recurringHeroObject)) {
    throw new Error(`${providerLabel} recurring hero object must not be a generic box or package.`);
  }
  const normalizedHeroObject = normalizeComparableText(recurringHeroObject).toLowerCase();
  const normalizedBrandName = normalizeComparableText(options.brandName || "").toLowerCase();
  if (readableHeroTextPattern.test(recurringHeroObject) || (normalizedBrandName && normalizedHeroObject.includes(normalizedBrandName))) {
    throw new Error(`${providerLabel} recurring hero object must not include the brand name, label, logo, or readable text.`);
  }
  const rawShots = Array.isArray(payload.shots) ? payload.shots : [];

  if (slots.length !== DEFAULT_BRICK_STORYBOARD_SHOT_COUNT || rawShots.length !== slots.length) {
    throw new Error(`${providerLabel} must return exactly 3 B-roll shots, one per lyric slot.`);
  }

  const seenFunMechanisms = new Set<BrickStoryboardFunMechanism>();
  const shots = rawShots.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`${providerLabel} returned an invalid story shot.`);
    }
    const record = item as Record<string, unknown>;
    if ("eventArchetype" in record || "lyricInterpretation" in record || "cinematicIngredients" in record) {
      throw new Error(`${providerLabel} returned extra story fields instead of the lean funMechanism story shape.`);
    }
    if ("role" in record) {
      throw new Error(`${providerLabel} used the old problem/escalation/payoff story shape.`);
    }
    if ("visualMetaphor" in record || "physicalEvent" in record) {
      throw new Error(`${providerLabel} used the old visualMetaphor/physicalEvent story shape.`);
    }
    if ("heroObject" in record && normalizeComparableText(record.heroObject) !== normalizeComparableText(recurringHeroObject)) {
      throw new Error(`${providerLabel} story shots must share the recurring hero object.`);
    }
    const slot = slots[index]!;
    const shotIndex = Math.round(Number(record.shotIndex));
    const lyricLine = cleanText(record.lyricLine, 180);
    const funMechanism = cleanText(record.funMechanism, 80) as BrickStoryboardFunMechanism;
    const sceneDescription = cleanText(record.sceneDescription, 240);
    const motionHint = cleanText(record.motionHint, 160);
    const combined = `${lyricLine} ${sceneDescription} ${motionHint}`;

    if (shotIndex !== slot.shotIndex) {
      throw new Error(`${providerLabel} story shots must preserve lyric slot indexes.`);
    }
    if (normalizeComparableText(lyricLine) !== normalizeComparableText(slot.lyricLine)) {
      throw new Error(`${providerLabel} story shot ${slot.shotIndex + 1} must use the exact assigned lyric line.`);
    }
    if (!ALLOWED_FUN_MECHANISMS.has(funMechanism)) {
      throw new Error(`${providerLabel} story shot ${slot.shotIndex + 1} must use a valid funMechanism.`);
    }
    if (seenFunMechanisms.has(funMechanism)) {
      throw new Error(`${providerLabel} must use a different funMechanism for each story shot.`);
    }
    seenFunMechanisms.add(funMechanism);
    if (!sceneDescription || !motionHint) {
      throw new Error(`${providerLabel} returned an incomplete B-roll story shot.`);
    }
    if (bannedStoryPattern.test(combined)) {
      throw new Error(`${providerLabel} used banned stage, caption, or fake-claim language.`);
    }
    if (productOnlyScenePattern.test(combined)) {
      throw new Error(`${providerLabel} returned a quiet product-only or showroom scene instead of a fun miniature event.`);
    }
    return { shotIndex, lyricLine, funMechanism, sceneDescription, motionHint };
  });

  return { recurringHeroObject, shots };
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
    { ctaDirection: scene.creative.ctaText || "", brandName: scene.brand.name },
  );
}

export function createBrickStoryboardPromptPlan(
  scene: JingleAdScene,
  storyPlan: BrickStoryboardStoryPlan,
): BrickStoryboardPromptPlan {
  const slots = deriveBrickStoryboardShots(scene);
  const colors = brandPalette(scene);
  const sceneDescriptions = storyPlan.shots.map((shot) => shot.sceneDescription).join(" Then ");
  const referenceFramePrompt = cleanText(
    [
      "Single full-frame vertical 9:16 brick-style music-video B-roll reference still for this brand.",
      `Use dominant brick palette ${colors}.`,
      `Create one consistent brick-style miniature world that can support these lyric visuals: ${sceneDescriptions}.`,
      `Recurring hero object locked across all shots: ${storyPlan.recurringHeroObject}.`,
      `Include a tasteful in-world ${scene.brand.name} storefront sign, product tin label, menu board, delivery van mark, or product display as set dressing.`,
      "Stable upright vertical frame, no sideways framing, no Dutch angle.",
      "Polished commercial miniature lighting, crisp product-detail lighting, energetic music-video composition.",
      stillFrameRules,
    ].join(" "),
    1800,
  );
  const storyboardSheetPrompt = cleanText(
    [
      "Experimental 3-panel brick-style storyboard sheet for internal review.",
      `Use the same brick-style world, palette ${colors}, and recurring hero object ${storyPlan.recurringHeroObject}.`,
      "Three horizontal panels stacked vertically, one for each lyric slot, showing the intended sequence for human review only.",
      "This is NOT a Seedance input and not a single shot still.",
    ].join(" "),
    1200,
  );

  const shots = slots.map((slot) => {
    const index = slot.shotIndex % cameraSetups.length;
    const storyShot = storyPlan.shots.find((shot) => shot.shotIndex === slot.shotIndex);
    if (!storyShot) throw new Error(`Story Director output is missing shot ${slot.shotIndex + 1}.`);
    const shotPrompt = cleanText(
      [
        `Single full-frame 9:16 brick-style commercial still, ${cameraSetups[index]}.`,
        "One frozen moment visualizing this jingle slot's idea without rendering lyric text.",
        `Scene: ${storyShot.sceneDescription}.`,
        `Recurring hero object: ${storyPlan.recurringHeroObject}.`,
        `Keep any ${scene.brand.name} branding as natural in-world set dressing only.`,
        `Same brick-style miniature world as the reference frame, ${setDetails[index]}, brand palette ${colors}, directional rim light, soft front fill, crisp product-detail lighting.`,
        stillFrameRules,
      ].join(" "),
      1800,
    );
    const animationPrompt = cleanText(
      [
        `Animate this exact single-frame brick-style miniature still into one short music-video B-roll shot.`,
        `Motion: ${storyShot.motionHint}.`,
        `Keep the recurring hero object ${storyPlan.recurringHeroObject} visually consistent with the input still and reference world.`,
        "Animate only the described motion; preserve the input still's composition, objects, characters, and visual identity.",
        "Stable camera with only subtle cinematic push-in allowed.",
        animationNegativeRules,
      ].join(" "),
      1200,
    );
    return { ...slot, shotPrompt, animationPrompt };
  });

  return { referenceFramePrompt, storyboardSheetPrompt, shots };
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
        output_format: "jpg",
      },
    }),
  }), DEFAULT_TIMEOUT_MS, "Replicate Nano Banana image generation");
  let payload = await prediction.json().catch(() => null) as {
    id?: string;
    status?: string;
    urls?: { get?: string };
    output?: string | string[];
    error?: string;
    detail?: string;
    logs?: string;
  } | null;
  if (!prediction.ok) throw new Error(payload?.error || payload?.detail || "Replicate Nano Banana image generation failed.");
  console.log("[brick-image] nano banana prediction created", {
    id: payload?.id,
    status: payload?.status,
    hasOutput: Boolean(payload?.output),
    hasGetUrl: Boolean(payload?.urls?.get),
    error: payload?.error || null,
  });

  for (let attempt = 0; payload?.urls?.get && !payload.output && !["succeeded", "failed", "canceled"].includes(payload.status || "") && attempt < 24; attempt += 1) {
    await sleep(5_000);
    const nextResponse = await withTimeout(fetch(payload.urls.get, {
      headers: { Authorization: `Bearer ${replicateApiToken}` },
    }), DEFAULT_TIMEOUT_MS, "Replicate Nano Banana prediction polling");
    payload = await nextResponse.json().catch(() => payload);
    console.log("[brick-image] nano banana poll", {
      id: payload?.id,
      status: payload?.status,
      hasOutput: Boolean(payload?.output),
      error: payload?.error || null,
    });
  }

  if (payload?.status === "failed" || payload?.status === "canceled") {
    throw new Error(`Replicate Nano Banana ${payload.status}: ${payload.error || payload.logs || "no provider error returned"}`);
  }
  const outputUrl = Array.isArray(payload?.output) ? payload.output[0] : payload?.output;
  if (!outputUrl) throw new Error("Replicate Nano Banana returned no image.");

  const imageResponse = await withTimeout(fetch(outputUrl), DEFAULT_TIMEOUT_MS, "Replicate image download");
  if (!imageResponse.ok) throw new Error("Replicate Nano Banana image download failed.");
  return {
    bytes: new Uint8Array(await imageResponse.arrayBuffer()),
    mimeType: imageResponse.headers.get("content-type") || "image/jpeg",
  };
}

export async function generateReplicateSeedanceVideo({
  replicateApiToken,
  imageUrl,
  lastFrameImageUrl,
  prompt,
  durationSeconds,
  resolution = BRICK_STORYBOARD_VIDEO_RESOLUTION,
  timeoutMs = 180_000,
  predictionId,
  onPredictionCreated,
  pollAttempts = 36,
}: {
  replicateApiToken: string;
  imageUrl: string;
  lastFrameImageUrl?: string;
  prompt: string;
  durationSeconds: number;
  resolution?: "480p" | "720p";
  timeoutMs?: number;
  predictionId?: string;
  onPredictionCreated?: (predictionId: string) => void | Promise<void>;
  pollAttempts?: number;
}) {
  if (!replicateApiToken) throw new Error("Replicate video generation is not configured.");
  const duration = Math.min(15, Math.max(5, Math.round(durationSeconds)));
  const safePrompt = toSeedanceSafeBrickPrompt(prompt);
  console.log(predictionId ? "[brick-video] seedance resume" : "[brick-video] seedance request", {
    model: BRICK_STORYBOARD_VIDEO_MODEL,
    predictionId: predictionId || null,
    duration,
    resolution,
    hasImageUrl: Boolean(imageUrl),
    hasLastFrameImageUrl: Boolean(lastFrameImageUrl),
    promptLength: safePrompt.length,
  });
  const prediction = predictionId
    ? await withTimeout(fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(predictionId)}`, {
      headers: { Authorization: `Bearer ${replicateApiToken}` },
    }), timeoutMs, "Replicate Seedance prediction resume")
    : await withTimeout(fetch(`https://api.replicate.com/v1/models/${BRICK_STORYBOARD_VIDEO_MODEL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${replicateApiToken}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          image: imageUrl,
          ...(lastFrameImageUrl ? { last_frame_image: lastFrameImageUrl } : {}),
          prompt: safePrompt,
          duration,
          aspect_ratio: "9:16",
          resolution,
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
  if (!predictionId && payload?.id) await onPredictionCreated?.(payload.id);
  console.log("[brick-video] seedance prediction created", {
    id: payload?.id,
    status: payload?.status,
    hasOutput: Boolean(payload?.output),
    hasGetUrl: Boolean(payload?.urls?.get),
    error: payload?.error || null,
  });

  for (let attempt = 0; payload?.urls?.get && !payload.output && !["succeeded", "failed", "canceled"].includes(payload.status || "") && attempt < pollAttempts; attempt += 1) {
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
  if (!payload?.output && payload?.id && payload.status !== "succeeded") {
    throw new ReplicatePredictionStillRunningError(payload.id);
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

export class ReplicatePredictionStillRunningError extends Error {
  constructor(readonly predictionId: string) {
    super(`Replicate prediction ${predictionId} is still processing.`);
    this.name = "ReplicatePredictionStillRunningError";
  }
}
