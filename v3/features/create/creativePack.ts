import type { AdFormatId } from "../scene/types";

export const CREATIVE_PACK_CONCURRENCY = 3;
export const CREATIVE_PACK_SOFT_TIMEOUT_MS = 20_000;
export const CREATIVE_PACK_HARD_TIMEOUT_MS = 60_000;
export const CREATIVE_PACK_MONEY_SHOT_READY_COUNT = 5;

export const CREATIVE_PACK_FORMATS = [
  { format: "reviews", label: "Reviews", count: 4 },
  { format: "video-meme", label: "Video Meme", count: 3 },
  { format: "meme", label: "Memes", count: 4 },
  { format: "text-message", label: "iMessage", count: 4 },
  { format: "were-sorry", label: "Apology", count: 4 },
  { format: "visualizer", label: "Visualizer", count: 1 },
  { format: "jingle", label: "Jingle", count: 1 },
  { format: "brainrot", label: "Brainrot", count: 1 },
] as const;

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
