import type { AdFormatId } from "../scene/types";

export const CREATIVE_PACK_CONCURRENCY = 3;
export const CREATIVE_PACK_SOFT_TIMEOUT_MS = 20_000;
export const CREATIVE_PACK_HARD_TIMEOUT_MS = 60_000;
export const CREATIVE_PACK_MONEY_SHOT_READY_COUNT = 5;

export const CREATIVE_PACK_FORMATS = [
  { format: "reviews", label: "Reviews" },
  { format: "video-meme", label: "Video Meme" },
  { format: "meme", label: "Memes" },
  { format: "text-message", label: "iMessage" },
  { format: "were-sorry", label: "Apology" },
  { format: "visualizer", label: "Visualizer" },
  { format: "jingle", label: "Jingle" },
  { format: "brainrot", label: "Brainrot" },
] as const;

export const CREATIVE_PACK_EXCLUDED_FORMATS = [] as const satisfies readonly AdFormatId[];

export type CreativePackFormat = typeof CREATIVE_PACK_FORMATS[number]["format"];
export type CreativePackStatus = "idle" | "researching" | "generating" | "ready" | "error" | "cancelled";
export type CreativePackGroupStatus = "pending" | "generating" | "still-cooking" | "ready" | "needs-retry" | "cancelled";

export const CREATIVE_PACK_SHOWCASE_PRIORITY = [
  "jingle",
  "brainrot",
  "visualizer",
  "video-meme",
  "reviews",
  "text-message",
  "meme",
  "were-sorry",
] as const satisfies readonly CreativePackFormat[];

export const CREATIVE_PACK_AUDIO_FORMATS = [
  "visualizer",
  "jingle",
  "brainrot",
] as const satisfies readonly CreativePackFormat[];

const creativePackFormatSet = new Set<AdFormatId>(CREATIVE_PACK_FORMATS.map((item) => item.format));
const creativePackAudioFormatSet = new Set<AdFormatId>(CREATIVE_PACK_AUDIO_FORMATS);

export function isCreativePackFormat(format: AdFormatId): format is CreativePackFormat {
  return creativePackFormatSet.has(format);
}

export function isCreativePackAudioFormat(format: CreativePackFormat) {
  return creativePackAudioFormatSet.has(format);
}

export function isCreativePackTerminalStatus(status: CreativePackGroupStatus) {
  return status === "ready" || status === "needs-retry" || status === "cancelled";
}

export function getCreativePackFormatLabel(format: CreativePackFormat) {
  return CREATIVE_PACK_FORMATS.find((item) => item.format === format)?.label || format;
}
