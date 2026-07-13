import type { MakerFormatTestGeneration } from "./testRuntime";

type SerperImage = {
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  link?: string;
};

type SerperResponse = { images?: SerperImage[] };

export type MakerImageSearch = (query: string) => Promise<string>;

const usableImage = (image: SerperImage) => {
  if (!image.imageUrl || !/^https?:\/\//i.test(image.imageUrl)) return false;
  if (/\.(?:gif|svg)(?:$|\?)/i.test(image.imageUrl)) return false;
  if (image.imageWidth && image.imageWidth < 300) return false;
  if (image.imageHeight && image.imageHeight < 300) return false;
  return true;
};

const hostname = (value = "") => {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return ""; }
};

const unstableImageHost = (image: SerperImage) => /(?:instagram\.com|fbcdn\.net|pinimg\.com|tiktokcdn\.com)$/i.test(hostname(image.imageUrl));

export function createSerperImageSearch({
  apiKey = process.env.SERPER_API_KEY || "",
  preferredHost = "",
}: {
  apiKey?: string;
  preferredHost?: string;
} = {}): MakerImageSearch {
  return async (query) => {
    if (!apiKey) throw new Error("Serper image search is not configured.");
    const response = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ q: query, num: 10 }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Serper image search failed with ${response.status}.`);
    const payload = await response.json() as SerperResponse;
    const candidates = payload.images?.filter(usableImage) || [];
    const normalizedPreferredHost = hostname(`https://${preferredHost}`);
    const match = candidates.find((image) => normalizedPreferredHost && hostname(image.link).endsWith(normalizedPreferredHost))
      || candidates.find((image) => !unstableImageHost(image));
    if (!match?.imageUrl) throw new Error(`Image search found no usable result for “${query}”.`);
    return match.imageUrl;
  };
}

export async function resolveMakerFormatTestImages(
  generation: MakerFormatTestGeneration,
  search: MakerImageSearch,
): Promise<MakerFormatTestGeneration> {
  const resolved = structuredClone(generation);
  await Promise.all(resolved.variations.flatMap((variation) => variation.assets.map(async (asset) => {
    if (asset.kind !== "web-image") return;
    asset.imageUrl = await search(asset.query || "");
  })));
  return resolved;
}
