import type { BrandSnapshot, ResearchProviderStatus } from "./types";

type Fetcher = typeof fetch;

export type CachedBrandAssets = Partial<Pick<
  BrandSnapshot,
  "name" | "url" | "host" | "title" | "description" | "faviconUrl" | "logoUrl" | "ogImageUrl" | "screenshotUrl" | "colors" | "fonts" | "vibeTags"
>>;

export type BrandAssetResolution = {
  brand: CachedBrandAssets;
  branding: Record<string, unknown>;
  providerStatus: ResearchProviderStatus[];
};

type BrandfetchColor = {
  hex?: unknown;
  type?: unknown;
};

type BrandfetchFormat = {
  src?: unknown;
  format?: unknown;
  width?: unknown;
  height?: unknown;
};

type BrandfetchLogo = {
  type?: unknown;
  theme?: unknown;
  formats?: unknown;
};

type BrandfetchPayload = {
  name?: unknown;
  description?: unknown;
  longDescription?: unknown;
  domain?: unknown;
  qualityScore?: unknown;
  logos?: unknown;
  colors?: unknown;
  fonts?: unknown;
};

const BRANDFETCH_URL = "https://api.brandfetch.io/v2/brands/domain";

const clean = (value: unknown, max = 260) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max).trim();

const normalizeHex = (value: unknown) => {
  const text = clean(value, 20).toUpperCase();
  const match = text.match(/^#?([0-9A-F]{6})$/);
  return match ? `#${match[1]}` : "";
};

const colorWeight = (color: BrandfetchColor) => {
  const type = clean(color.type, 40).toLowerCase();
  const hex = normalizeHex(color.hex);
  const boring = /^#(?:000000|111111|FFFFFF|F8F8F8|F9F9F9|FAFAFA)$/i.test(hex);
  if (type === "brand" && !boring) return 0;
  if (type === "accent" && !boring) return 1;
  if (type !== "dark" && type !== "light" && !boring) return 2;
  return 3;
};

export const normalizeBrandfetchColors = (
  colors: unknown,
  htmlColors: string[] = [],
) => {
  const brandfetchColors = (Array.isArray(colors) ? colors : [])
    .filter((color): color is BrandfetchColor => Boolean(color) && typeof color === "object")
    .sort((a, b) => colorWeight(a) - colorWeight(b))
    .map((color) => normalizeHex(color.hex));

  return [...brandfetchColors, ...htmlColors.map(normalizeHex)]
    .filter(Boolean)
    .filter((color, index, all) => all.indexOf(color) === index)
    .slice(0, 8);
};

const fontName = (font: unknown) => {
  if (typeof font === "string") return clean(font, 80);
  if (!font || typeof font !== "object") return "";
  const record = font as Record<string, unknown>;
  return clean(record.name || record.family || record.fontFamily, 80);
};

export const normalizeBrandfetchFonts = (fonts: unknown): BrandSnapshot["fonts"] => {
  const list = (Array.isArray(fonts) ? fonts : []).map(fontName).filter(Boolean);
  const heading = list.find((item) => /\b(display|heading|headline|title)\b/i.test(item)) || list[0] || "";
  const body = list.find((item) => /\b(body|text|sans|serif)\b/i.test(item) && item !== heading) ||
    list.find((item) => item !== heading) ||
    heading;
  const signature = `${heading} ${body}`.toLowerCase();
  const feel = signature.includes("serif")
    ? "serif"
    : signature.includes("mono")
      ? "mono"
      : signature.includes("display")
        ? "display"
        : signature
          ? "sans"
          : "unknown";

  return {
    ...(heading ? { heading } : {}),
    ...(body ? { body } : {}),
    feel,
  };
};

const logoWeight = (logo: BrandfetchLogo) => {
  const type = clean(logo.type, 40).toLowerCase();
  const theme = clean(logo.theme, 40).toLowerCase();
  const typeScore = type === "logo" ? 0 : type === "icon" ? 1 : type === "symbol" ? 2 : 3;
  const themeScore = !theme || theme === "light" ? 0 : 1;
  return typeScore * 10 + themeScore;
};

const logoFormatWeight = (format: BrandfetchFormat) => {
  const kind = clean(format.format, 20).toLowerCase();
  const pixels = Number(format.width || 0) * Number(format.height || 0);
  const formatScore = kind === "png" ? 0 : kind === "jpg" || kind === "jpeg" || kind === "webp" ? 1 : 2;
  return formatScore * 1_000_000_000 - pixels;
};

export const selectBrandfetchLogoCandidates = (logos: unknown) => (
  (Array.isArray(logos) ? logos : [])
    .filter((logo): logo is BrandfetchLogo => Boolean(logo) && typeof logo === "object")
    .sort((a, b) => logoWeight(a) - logoWeight(b))
    .flatMap((logo) => (Array.isArray(logo.formats) ? logo.formats : [])
      .filter((format): format is BrandfetchFormat => Boolean(format) && typeof format === "object")
      .filter((format) => clean(format.format, 20).toLowerCase() !== "svg")
      .sort((a, b) => logoFormatWeight(a) - logoFormatWeight(b))
      .map((format) => clean(format.src, 900))
      .filter(Boolean))
);

const validImageUrl = async (url: string, fetcher: Fetcher) => {
  try {
    let response = await fetcher(url, { method: "HEAD" });
    if (!response.ok || response.status === 405) {
      response = await fetcher(url, { method: "GET" });
    }
    return response.ok;
  } catch {
    return false;
  }
};

const firstValidImageUrl = async (urls: string[], fetcher: Fetcher) => {
  for (const url of urls) {
    if (await validImageUrl(url, fetcher)) return url;
  }
  return null;
};

const cacheHasAssets = (brand: CachedBrandAssets | null | undefined) => (
  Boolean(brand && (brand.logoUrl || brand.faviconUrl || brand.ogImageUrl || brand.colors?.length || (brand.fonts && brand.fonts.feel !== "unknown")))
);

const verifiedCachedBrand = async (brand: CachedBrandAssets, fetcher: Fetcher) => {
  const result = { ...brand };

  for (const key of ["logoUrl", "faviconUrl", "ogImageUrl"] as const) {
    const url = result[key];
    if (url && !(await validImageUrl(url, fetcher))) result[key] = null;
  }

  return result;
};

export const resolveBrandAssets = async ({
  domain,
  htmlColors = [],
  cachedBrand,
  apiKey = process.env.BRANDFETCH_API_KEY,
  fetcher = fetch,
}: {
  domain: string;
  htmlColors?: string[];
  cachedBrand?: CachedBrandAssets | null;
  apiKey?: string;
  fetcher?: Fetcher;
}): Promise<BrandAssetResolution> => {
  if (cacheHasAssets(cachedBrand)) {
    const verifiedBrand = await verifiedCachedBrand(cachedBrand || {}, fetcher);
    if (cacheHasAssets(verifiedBrand)) {
      return {
        brand: verifiedBrand,
        branding: { source: "brand-cache" },
        providerStatus: [{
          provider: "brand-cache",
          status: "used",
          reason: `Reused cached brand assets for ${domain}.`,
        }],
      };
    }
  }

  if (!apiKey) {
    return {
      brand: {},
      branding: {},
      providerStatus: [{
        provider: "brandfetch",
        status: "skipped",
        reason: "Brandfetch skipped because BRANDFETCH_API_KEY is not configured.",
      }],
    };
  }

  try {
    const response = await fetcher(`${BRANDFETCH_URL}/${encodeURIComponent(domain)}`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    const quota = response.headers.get("x-api-key-quota");
    const usage = response.headers.get("x-api-key-approximate-usage");
    if (quota || usage) {
      console.info("Brandfetch quota", { quota, usage });
    }
    if (!response.ok) throw new Error(`Brandfetch returned ${response.status}.`);

    const payload = await response.json() as BrandfetchPayload;
    const logoUrl = await firstValidImageUrl(selectBrandfetchLogoCandidates(payload.logos), fetcher);
    const colors = normalizeBrandfetchColors(payload.colors, htmlColors);
    const fonts = normalizeBrandfetchFonts(payload.fonts);
    const brand: CachedBrandAssets = {
      name: clean(payload.name, 80),
      description: clean(payload.description || payload.longDescription, 280),
      logoUrl,
      colors,
      fonts,
    };
    const useful = Boolean(brand.name || brand.description || brand.logoUrl || colors.length || fonts.feel !== "unknown");

    return {
      brand,
      branding: { brandfetch: payload },
      providerStatus: [{
        provider: "brandfetch",
        status: useful ? "used" : "skipped",
        reason: useful
          ? `Brandfetch resolved brand assets for ${domain}.`
          : `Brandfetch returned no usable brand assets for ${domain}.`,
      }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "Brandfetch failed.");
    return {
      brand: {},
      branding: {},
      providerStatus: [{
        provider: "brandfetch",
        status: "failed",
        reason: message,
      }],
    };
  }
};
