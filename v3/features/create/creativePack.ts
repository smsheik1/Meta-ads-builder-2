import type { AdFormatId } from "../scene/types";

export const CREATIVE_PACK_CONCURRENCY = 3;
export const CREATIVE_PACK_FORMAT_TIMEOUT_MS = 20_000;

export const CREATIVE_PACK_FORMATS = [
  { format: "reviews", label: "Reviews" },
  { format: "video-meme", label: "Video Meme" },
  { format: "meme", label: "Memes" },
  { format: "text-message", label: "iMessage" },
  { format: "were-sorry", label: "Apology" },
  { format: "visualizer", label: "Visualizer" },
] as const;

export const CREATIVE_PACK_EXCLUDED_FORMATS = [
  "jingle",
  "brainrot",
] as const satisfies readonly AdFormatId[];

export type CreativePackFormat = typeof CREATIVE_PACK_FORMATS[number]["format"];
export type CreativePackStatus = "idle" | "researching" | "generating" | "ready" | "error" | "cancelled";
export type CreativePackGroupStatus = "pending" | "generating" | "ready" | "unavailable" | "cancelled";

const creativePackFormatSet = new Set<AdFormatId>(CREATIVE_PACK_FORMATS.map((item) => item.format));

export function isCreativePackFormat(format: AdFormatId): format is CreativePackFormat {
  return creativePackFormatSet.has(format);
}

export function getCreativePackFormatLabel(format: CreativePackFormat) {
  return CREATIVE_PACK_FORMATS.find((item) => item.format === format)?.label || format;
}
