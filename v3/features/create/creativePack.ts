import type { AdFormatId, AdScene } from "../scene/types";

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
  { format: "motion-story", label: "Motion Story", count: 1 },
  { format: "jingle", label: "Jingle", count: 1 },
  { format: "brainrot", label: "Brainrot", count: 1 },
] as const;

export type CreativePackFormat = typeof CREATIVE_PACK_FORMATS[number]["format"];
export type CreativePackStatus = "idle" | "researching" | "generating" | "ready" | "error" | "cancelled";
export type CreativePackGroupStatus = "pending" | "generating" | "still-cooking" | "ready" | "needs-retry" | "cancelled";

export const CREATIVE_PACK_SHOWCASE_PRIORITY = [
  "jingle",
  "brainrot",
  "motion-story",
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

export function hasPlayableCreativePackScenes(format: CreativePackFormat, scenes: AdScene[]) {
  if (!scenes.length) return false;
  if (!isCreativePackAudioFormat(format)) return true;
  return scenes.some((scene) => scene.audio.status === "generated" && Boolean(scene.audio.url));
}

export function isCreativePackTerminalStatus(status: CreativePackGroupStatus) {
  return status === "ready" || status === "needs-retry" || status === "cancelled";
}

export function getCreativePackFormatLabel(format: CreativePackFormat) {
  return CREATIVE_PACK_FORMATS.find((item) => item.format === format)?.label || format;
}

export type CreativePackSceneRow<TSceneId = unknown> = {
  _id: TSceneId;
  format?: string;
  generationBatchId?: string;
  candidateIndex?: number;
  updatedAt?: number;
  createdAt?: number;
  scene: AdScene;
};

export type HydratedCreativePackGroup<TSceneId = unknown> = {
  format: CreativePackFormat;
  label: string;
  status: CreativePackGroupStatus;
  scenes: AdScene[];
  sceneIds: TSceneId[];
  message?: string;
  publicMessage?: string;
  debugMessage?: string;
};

function rowMatchesFormat(row: CreativePackSceneRow, format: CreativePackFormat) {
  return row.scene?.format === format || row.format === format;
}

function rowSortValue(row: CreativePackSceneRow) {
  return row.updatedAt || row.createdAt || 0;
}

export function hydrateCreativePackGroupsFromSceneRows<TSceneId = unknown>({
  minimumReadyFormats = 2,
  rows,
}: {
  minimumReadyFormats?: number;
  rows: Array<CreativePackSceneRow<TSceneId>>;
}): Array<HydratedCreativePackGroup<TSceneId>> {
  const sortedRows = [...rows].sort((a, b) => rowSortValue(b) - rowSortValue(a));
  const latestRowsByFormat = new Map<CreativePackFormat, Array<CreativePackSceneRow<TSceneId>>>();

  for (const { format } of CREATIVE_PACK_FORMATS) {
    const latestRow = sortedRows.find((row) => rowMatchesFormat(row, format));
    if (!latestRow) continue;

    const latestBatchId = latestRow.generationBatchId || "";
    const formatRows = sortedRows
      .filter((row) => rowMatchesFormat(row, format))
      .filter((row) => (latestBatchId ? row.generationBatchId === latestBatchId : row._id === latestRow._id))
      .sort((a, b) => (a.candidateIndex ?? 0) - (b.candidateIndex ?? 0));

    latestRowsByFormat.set(format, formatRows);
  }

  if (latestRowsByFormat.size < minimumReadyFormats) return [];

  return CREATIVE_PACK_FORMATS.map(({ format, label }) => {
    const formatRows = latestRowsByFormat.get(format) || [];
    const scenes = formatRows
      .map((row) => row.scene)
      .filter((scene): scene is AdScene => Boolean(scene) && scene.format === format);
    const playable = hasPlayableCreativePackScenes(format, scenes);

    if (!scenes.length || !playable) {
      return {
        format,
        label,
        status: "needs-retry",
        scenes,
        sceneIds: formatRows.map((row) => row._id),
        message: "Needs retry.",
        publicMessage: "Needs retry.",
        debugMessage: scenes.length ? `${label} scenes exist but are not playable yet.` : `${label} has no saved scenes for this research run.`,
      };
    }

    return {
      format,
      label,
      status: "ready",
      scenes,
      sceneIds: formatRows.map((row) => row._id),
    };
  });
}
