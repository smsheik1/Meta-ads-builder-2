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

type BrandAssetDecision = {
  source: string;
  url: string | null;
  status: "accepted" | "rejected";
  reason: string;
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
  const signature = `${heading} ${body}`.trim().toLowerCase();
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

const checkImageUrl = async (url: string, fetcher: Fetcher) => {
  try {
    let response = await fetcher(url, { method: "HEAD" });
    if (!response.ok || response.status === 405) {
      response = await fetcher(url, { method: "GET" });
    }
    return response.ok
      ? { ok: true, reason: "URL resolved." }
      : { ok: false, reason: `URL returned ${response.status}.` };
  } catch {
    return { ok: false, reason: "URL fetch failed." };
  }
};

const validImageUrl = async (url: string, fetcher: Fetcher) => (
  (await checkImageUrl(url, fetcher)).ok
);

const firstValidImageUrl = async (
  source: string,
  urls: string[],
  fetcher: Fetcher,
  decisions: BrandAssetDecision[],
) => {
  for (const url of urls) {
    const check = await checkImageUrl(url, fetcher);
    decisions.push({
      source,
      url,
      status: check.ok ? "accepted" : "rejected",
      reason: check.reason,
    });
    if (check.ok) return url;
  }
  return null;
};

const cacheHasAssets = (brand: CachedBrandAssets | null | undefined) => (
  Boolean(brand && (brand.logoUrl || brand.faviconUrl || brand.colors?.length || (brand.fonts && brand.fonts.feel !== "unknown")))
);

const verifiedCachedBrand = async (
  brand: CachedBrandAssets,
  fetcher: Fetcher,
  decisions: BrandAssetDecision[],
) => {
  const result = { ...brand };

  for (const key of ["logoUrl", "faviconUrl"] as const) {
    const url = result[key];
    if (!url) continue;
    const check = await checkImageUrl(url, fetcher);
    decisions.push({
      source: `brand-cache:${key}`,
      url,
      status: check.ok ? "accepted" : "rejected",
      reason: check.reason,
    });
    if (!check.ok) result[key] = null;
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
  const decisions: BrandAssetDecision[] = [];
  if (cacheHasAssets(cachedBrand)) {
    const verifiedBrand = await verifiedCachedBrand(cachedBrand || {}, fetcher, decisions);
    if (cacheHasAssets(verifiedBrand)) {
      const finalLogoUrl = verifiedBrand.logoUrl || verifiedBrand.faviconUrl || null;
      console.info("Brand asset decision", {
        domain,
        finalLogoUrl,
        finalLogoSource: verifiedBrand.logoUrl ? "brand-cache:logoUrl" : verifiedBrand.faviconUrl ? "brand-cache:faviconUrl" : "initials",
        decisions,
      });
      return {
        brand: verifiedBrand,
        branding: {
          source: "brand-cache",
          brandAssetDecision: {
            domain,
            finalLogoUrl,
            finalLogoSource: verifiedBrand.logoUrl ? "brand-cache:logoUrl" : verifiedBrand.faviconUrl ? "brand-cache:faviconUrl" : "initials",
            decisions,
          },
        },
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
    const logoCandidates = selectBrandfetchLogoCandidates(payload.logos);
    const logoUrl = await firstValidImageUrl("brandfetch:logo", logoCandidates, fetcher, decisions);
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
    const colorTypes = (Array.isArray(payload.colors) ? payload.colors : [])
      .map((color) => clean((color as BrandfetchColor).type, 40))
      .filter(Boolean);
    const finalLogoSource = logoUrl ? "brandfetch:logo" : "html-or-initials";
    console.info("Brand asset decision", {
      domain,
      qualityScore: payload.qualityScore,
      brandfetchLogoCandidates: logoCandidates.length,
      colorTypes,
      selectedPrimaryColor: colors[0] || null,
      fontsFound: fonts.feel !== "unknown",
      finalLogoUrl: logoUrl,
      finalLogoSource,
      decisions,
    });

    return {
      brand,
      branding: {
        brandfetch: payload,
        brandAssetDecision: {
          domain,
          qualityScore: payload.qualityScore,
          brandfetchLogoCandidates: logoCandidates.length,
          colorTypes,
          selectedPrimaryColor: colors[0] || null,
          fontsFound: fonts.feel !== "unknown",
          finalLogoUrl: logoUrl,
          finalLogoSource,
          decisions,
        },
      },
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
