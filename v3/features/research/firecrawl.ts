import {
  buildFallbackBrandBrief,
  curateWebsiteResearchResult,
  type BrandCuratorOptions,
} from "./brandCurator";
import {
  resolveBrandAssets,
  type CachedBrandAssets,
  type BrandAssetResolution,
} from "./brandAssets";
import { normalizePublicWebsiteUrl } from "./url";
import type {
  BrandSnapshot,
  ResearchEvidence,
  ResearchReceipts,
  WebsiteResearchResult,
} from "./types";

type Fetcher = typeof fetch;

export type FirecrawlOptions = {
  apiKey?: string;
  fetcher?: Fetcher;
  timeoutMs?: number;
  includeScreenshot?: boolean;
  curator?: BrandCuratorOptions;
  jina?: {
    enabled?: boolean;
    fetcher?: Fetcher;
    htmlMetadataFetcher?: Fetcher;
    timeoutMs?: number;
    htmlMetadataTimeoutMs?: number;
    minMarkdownChars?: number;
    minUsefulLines?: number;
  };
  brandAssets?: {
    apiKey?: string;
    fetcher?: Fetcher;
    cachedBrand?: CachedBrandAssets | null;
  };
};

export type FirecrawlPayload = {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: Record<string, unknown>;
    branding?: Record<string, unknown>;
    screenshot?: unknown;
  };
};

const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";
const JINA_READER_BASE_URL = "https://r.jina.ai/http://";
export const DEFAULT_FIRECRAWL_TIMEOUT_MS = 60_000;
export const DEFAULT_JINA_READER_TIMEOUT_MS = 8_000;
export const DEFAULT_JINA_HTML_METADATA_TIMEOUT_MS = 4_000;
export const DEFAULT_JINA_MIN_MARKDOWN_CHARS = 500;
export const DEFAULT_JINA_MIN_USEFUL_LINES = 8;
const MAX_MARKDOWN_CHARS = 24_000;
const FIRECRAWL_TIMEOUT_MESSAGE = "That site took too long to read. Try again, or paste a more specific public page from the same brand.";
const chromeTextPattern = /\b(skip to content|cart is empty|continue shopping|log in|login|check out|checkout|add to cart|quantity|subtotal|loading|have an account|gift message|discount code|multiple addresses?|free shipping not applied|regular price|sale price|sold out|password|newsletter|privacy policy|terms of service)\b/i;
const standalonePricePattern = /^(?:from\s+)?\$[\d,.]+(?:\s*-\s*\$[\d,.]+)?$/i;
const imageAltNoisePattern = /\b(decorative|background image|hero image|image|photo|picture|screenshot|graphic|illustration)\b/i;

const decodeHtmlEntities = (value: string) => value
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, "\"")
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">");

const cleanText = (value: unknown, maxLength = 260) => String(value ?? "")
  .replace(/&(?:amp|quot|#39|apos|lt|gt);/gi, (entity) => decodeHtmlEntities(entity))
  .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
  .replace(/!\[[^\]]*]\[[^\]]*]/g, " ")
  .replace(/!\[[^\]]*]/g, " ")
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  .replace(/^#{1,6}\s*/, "")
  .replace(/^\s*[-*]\s*/, "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

export const isWebsiteChromeText = (value: unknown) => {
  const cleaned = cleanText(value, 260);
  if (!cleaned) return true;
  if (standalonePricePattern.test(cleaned)) return true;
  if (/^_?\\?\*+/.test(cleaned)) return true;
  if (/^!/.test(cleaned)) return true;
  if (/^(search|menu|account)$/i.test(cleaned)) return true;
  if (imageAltNoisePattern.test(cleaned) && cleaned.split(/\s+/).length <= 8) return true;
  if (/~~\s*\$0\.00\s*~~/i.test(cleaned)) return true;
  if (chromeTextPattern.test(cleaned)) return true;
  return false;
};

const unique = (items: string[], maxItems: number) => items
  .map((item) => cleanText(item))
  .filter(Boolean)
  .filter((item) => !isWebsiteChromeText(item))
  .filter((item, index, all) => all.findIndex((candidate) => (
    candidate.toLowerCase() === item.toLowerCase()
  )) === index)
  .slice(0, maxItems);

const claimPattern = /(\$[\d,.]+|\b\d[\d,.]*(?:\.\d+)?\s*(?:%|percent|days?|weeks?|months?|years?|hours?|calls?|appointments?|leads?|sales|rankings?|mentions?|citations?|revenue|customers?|homes?|listings?)\b)/i;
const momentPattern = /\b(tired of|stuck|struggle|miss|missing|losing|waste|waiting|before|after|when|while|because|need to|trying to|want to|can't|cannot|compare|choose|buyers|customers|owners|teams)\b/i;
const proofPattern = /\b(review|testimonial|customer|client|founder|owner|manager|said|says|case study|result|generated|ranked|stars?)\b/i;

const metadataText = (
  metadata: Record<string, unknown>,
  keys: string[],
  fallback = "",
  maxLength = 260,
) => cleanText(keys.map((key) => metadata[key]).find(Boolean) || fallback, maxLength);

const rawMetadataText = (
  metadata: Record<string, unknown>,
  keys: string[],
  fallback = "",
  maxLength = 900,
) => cleanText(keys.map((key) => metadata[key]).find(Boolean) || fallback, maxLength);

const resolveMaybeUrl = (value: unknown, baseUrl: string) => {
  const cleaned = cleanText(value, 900);
  if (!cleaned || cleaned.startsWith("data:") || cleaned.startsWith("blob:")) return null;

  try {
    return new URL(cleaned, baseUrl).href;
  } catch {
    return null;
  }
};

const screenshotUrlFromFirecrawl = (screenshot: unknown, baseUrl: string) => {
  if (typeof screenshot === "string") return resolveMaybeUrl(screenshot, baseUrl);
  if (screenshot && typeof screenshot === "object") {
    const record = screenshot as Record<string, unknown>;
    return resolveMaybeUrl(record.url || record.screenshotUrl || record.src, baseUrl);
  }
  return null;
};

const titleToBrand = (title: string, host: string) => {
  const hostBase = host.replace(/^www\./, "").split(".")[0] || "";
  const compactHost = hostBase.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const chunks = cleanText(title, 160)
    .split(/\s+[|–—-]\s+/)
    .map((chunk) => cleanText(chunk, 80))
    .filter(Boolean);
  const matchingChunk = chunks.find((chunk) => {
    const compactChunk = chunk.replace(/[^a-z0-9]/gi, "").toLowerCase();
    return compactHost.length >= 4 && (compactChunk.includes(compactHost) || compactHost.includes(compactChunk));
  });
  if (matchingChunk && matchingChunk.length >= 2 && matchingChunk.length <= 48) return matchingChunk;

  const firstChunk = chunks[0]?.trim();
  if (firstChunk && firstChunk.length >= 2 && firstChunk.length <= 48) return firstChunk;

  return host
    .replace(/^www\./, "")
    .split(".")[0]
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part[0]?.toUpperCase()}${part.slice(1).toLowerCase()}`))
    .join(" ") || "Brand";
};

const parseMarkdownEvidence = (markdown: string): ResearchEvidence => {
  const lines = markdown
    .slice(0, MAX_MARKDOWN_CHARS)
    .split(/\n+/)
    .map((line) => cleanText(line, 260))
    .filter((line) => line.length >= 8)
    .filter((line) => !isWebsiteChromeText(line));
  const headings = lines.filter((line) => line.length <= 120).slice(0, 24);
  const paragraphs = lines.filter((line) => line.length >= 24).slice(0, 42);
  const receipts: ResearchReceipts = {
    specificClaims: unique(lines.filter((line) => claimPattern.test(line)), 8),
    buyerMoments: unique(lines.filter((line) => momentPattern.test(line)), 8),
    exactSiteLanguage: unique(headings, 8),
    namedProof: unique(lines.filter((line) => proofPattern.test(line) && claimPattern.test(line)), 8),
  };

  return {
    headings: unique(headings, 24),
    paragraphs: unique(paragraphs, 42),
    receipts,
    rawMarkdown: lines.join("\n").slice(0, MAX_MARKDOWN_CHARS),
  };
};

const colorsFromFirecrawl = (
  branding: Record<string, unknown>,
  metadata: Record<string, unknown>,
) => {
  const rawColors = [
    metadata.themeColor,
    metadata["theme-color"],
    ...(Array.isArray(metadata.colors) ? metadata.colors : []),
    ...(Array.isArray(branding.colors) ? branding.colors : []),
  ];
  return rawColors
    .map((color) => String(color ?? "").trim().toUpperCase())
    .filter((color) => /^#[0-9A-F]{6}$/.test(color))
    .filter((color, index, all) => all.indexOf(color) === index)
    .slice(0, 8);
};

const hasHtmlBrandAssets = (metadata: Record<string, unknown>) => (
  Boolean(metadata.logo || metadata.favicon || metadata.ogImage || (Array.isArray(metadata.colors) && metadata.colors.length))
);

const logoUrlFromFirecrawl = (
  metadata: Record<string, unknown>,
  branding: Record<string, unknown>,
  finalUrl: string,
) => {
  const candidates = [
    branding.logo,
    branding.logoUrl,
    metadata.logo,
    metadata.logoUrl,
    metadata.favicon,
    metadata.faviconUrl,
    metadata.icon,
  ];
  return candidates.map((candidate) => resolveMaybeUrl(candidate, finalUrl)).find(Boolean) || null;
};

const fontsFromFirecrawl = (branding: Record<string, unknown>): BrandSnapshot["fonts"] => {
  const rawFonts = branding.fonts && typeof branding.fonts === "object"
    ? branding.fonts as Record<string, unknown>
    : {};
  const heading = cleanText(rawFonts.heading || rawFonts.display, 80);
  const body = cleanText(rawFonts.body || rawFonts.text, 80);
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

const buildVibeTags = (
  metadata: Record<string, unknown>,
  branding: Record<string, unknown>,
  evidence: ResearchEvidence,
) => unique([
  cleanText(metadata.ogSiteName || metadata.siteName, 40),
  cleanText((branding.fonts as Record<string, unknown> | undefined)?.heading, 40),
  evidence.receipts.specificClaims.length ? "proof-driven" : "",
  evidence.receipts.buyerMoments.length ? "buyer-moment" : "",
  evidence.headings.some((heading) => /\b(ai|automation|software|platform|tool)\b/i.test(heading)) ? "software" : "",
], 6);

const assertUsefulMarkdown = (markdown: string) => {
  if (markdown.trim().length < 40) {
    throw new Error("Firecrawl returned no useful page copy.");
  }
};

const assertUsefulJinaMarkdown = (
  markdown: string,
  options: Pick<Required<NonNullable<FirecrawlOptions["jina"]>>, "minMarkdownChars" | "minUsefulLines">,
) => {
  const evidence = parseMarkdownEvidence(markdown);
  if (markdown.trim().length < options.minMarkdownChars || evidence.rawMarkdown.split("\n").length < options.minUsefulLines) {
    throw new Error("Jina returned weak page copy.");
  }
};

export const isAbortLikeError = (error: unknown) => {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const name = String(record.name || "");
  const message = error instanceof Error
    ? error.message
    : String(record.message || error || "");

  return name === "AbortError" ||
    message === "AbortError" ||
    /\b(aborted|abort|timed out|timeout)\b/i.test(message);
};

export const toWebsiteResearchErrorMessage = (error: unknown) => {
  if (isAbortLikeError(error)) return FIRECRAWL_TIMEOUT_MESSAGE;
  if (error instanceof Error && error.message.trim()) return error.message.trim();

  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const message = String(record.message || error || "").trim();
  return message || "Website research failed.";
};

export const normalizeFirecrawlPayload = (
  inputUrl: string,
  payload: FirecrawlPayload,
): WebsiteResearchResult => {
  const websiteUrl = normalizePublicWebsiteUrl(inputUrl);
  const data = payload.data || {};
  const metadata = data.metadata || {};
  const branding = data.branding || {};
  const markdown = String(data.markdown || "");

  assertUsefulMarkdown(markdown);

  const evidence = parseMarkdownEvidence(markdown);
  const finalUrl = metadataText(metadata, ["sourceURL", "url"], websiteUrl.href, 900);
  const title = metadataText(
    metadata,
    ["ogTitle", "title"],
    evidence.headings[0] || websiteUrl.hostname,
    120,
  );
  const description = metadataText(
    metadata,
    ["ogDescription", "description"],
    evidence.paragraphs[0] || "",
    280,
  );
  const brandName = metadataText(
    metadata,
    ["ogSiteName", "siteName", "applicationName"],
    titleToBrand(title, websiteUrl.hostname),
    60,
  );
  const faviconUrl = resolveMaybeUrl(
    metadata.favicon || metadata.faviconUrl || metadata.icon,
    finalUrl,
  );
  const logoUrl = logoUrlFromFirecrawl(metadata, branding, finalUrl);
  const ogImageUrl = resolveMaybeUrl(metadata.ogImage || metadata.image, finalUrl);
  const screenshotUrl = screenshotUrlFromFirecrawl(data.screenshot, finalUrl);
  const colors = colorsFromFirecrawl(branding, metadata);

  const result: Omit<WebsiteResearchResult, "brandBrief"> = {
    websiteUrl: websiteUrl.href,
    finalUrl,
    host: websiteUrl.hostname,
    brand: {
      name: brandName,
      url: finalUrl,
      host: websiteUrl.hostname,
      title,
      description,
      faviconUrl,
      logoUrl,
      ogImageUrl,
      screenshotUrl,
      colors,
      fonts: fontsFromFirecrawl(branding),
      vibeTags: buildVibeTags(metadata, branding, evidence),
    },
    evidence: {
      ...evidence,
      receipts: {
        ...evidence.receipts,
        exactSiteLanguage: unique([title, ...evidence.receipts.exactSiteLanguage, description], 8),
      },
    },
    metadata,
    branding,
    providerStatus: [{
      provider: "firecrawl",
      status: "used",
      reason: `Firecrawl read ${evidence.paragraphs.length} page snippets.`,
    }],
  };

  return {
    ...result,
    brandBrief: buildFallbackBrandBrief(result),
  };
};

const parseJinaReaderText = (text: string) => {
  const title = text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() || "";
  const sourceUrl = text.match(/^URL Source:\s*(.+)$/m)?.[1]?.trim() || "";
  const markdown = text.includes("Markdown Content:")
    ? text.split("Markdown Content:").slice(1).join("Markdown Content:").trim()
    : text.trim();

  return { title, sourceUrl, markdown };
};

const attrPattern = (name: string) => new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");

const tagAttr = (tag: string, name: string) => tag.match(attrPattern(name))?.[1]?.trim() || "";

const metaContent = (html: string, key: string) => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\b(?=[^>]*(?:property|name)\\s*=\\s*["']${escaped}["'])[^>]*>`, "i");
  const tag = html.match(pattern)?.[0] || "";
  return tag ? tagAttr(tag, "content") : "";
};

const linkHref = (html: string, relPattern: RegExp) => {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  const tag = links.find((candidate) => relPattern.test(tagAttr(candidate, "rel")));
  return tag ? tagAttr(tag, "href") : "";
};

const titleFromHtml = (html: string) => cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "", 160);

const jsonLdLogo = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return "";
  if (Array.isArray(value)) return value.map(jsonLdLogo).find(Boolean) || "";
  if (typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if (typeof record.logo === "string") return cleanText(record.logo, 900);
  if (Array.isArray(record.logo)) return record.logo.map((item) => {
    if (typeof item === "string") return cleanText(item, 900);
    if (item && typeof item === "object") return cleanText((item as Record<string, unknown>).url, 900);
    return "";
  }).find(Boolean) || "";
  if (record.logo && typeof record.logo === "object") {
    const directLogoUrl = cleanText((record.logo as Record<string, unknown>).url, 900);
    if (directLogoUrl) return directLogoUrl;
  }

  return Object.values(record).map(jsonLdLogo).find(Boolean) || "";
};

const logoFromJsonLd = (html: string) => {
  const scripts = html.match(/<script\b(?=[^>]*type\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi) || [];

  for (const script of scripts) {
    const rawJson = script.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1] || "";
    try {
      const logo = jsonLdLogo(JSON.parse(decodeHtmlEntities(rawJson.trim())));
      if (logo) return logo;
    } catch {
      // Ignore malformed structured data; normal metadata still carries the scrape.
    }
  }

  return "";
};

const colorsFromHtml = (html: string) => {
  const matches = html.matchAll(/#([0-9a-f]{6})\b|%23([0-9a-f]{6})\b/gi);
  return Array.from(matches)
    .map((match) => `#${match[1] || match[2]}`.toUpperCase())
    .filter((color, index, all) => all.indexOf(color) === index)
    .slice(0, 8);
};

export const parseBasicHtmlMetadata = (html: string, baseUrl: string) => {
  const colors = colorsFromHtml(html);
  const metadata: Record<string, unknown> = {
    sourceURL: baseUrl,
    title: titleFromHtml(html),
    ogTitle: metaContent(html, "og:title"),
    description: metaContent(html, "description"),
    ogDescription: metaContent(html, "og:description"),
    ogSiteName: metaContent(html, "og:site_name"),
    ogImage: metaContent(html, "og:image"),
    logo: logoFromJsonLd(html),
    themeColor: metaContent(html, "theme-color"),
    favicon: linkHref(html, /\b(icon|shortcut icon|apple-touch-icon)\b/i),
    colors,
  };

  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => (
    Array.isArray(value) ? value.length > 0 : cleanText(value, 900)
  )));
};

const verifiedImageMetadata = async (
  metadata: Record<string, unknown>,
  baseUrl: string,
  fetcher: Fetcher,
  signal: AbortSignal,
) => {
  const result = { ...metadata };

  await Promise.all(["logo", "favicon", "ogImage"].map(async (key) => {
    const url = resolveMaybeUrl(result[key], baseUrl);
    if (!url) {
      delete result[key];
      return;
    }

    try {
      const response = await fetcher(url, { method: "HEAD", signal });
      if (!response.ok) delete result[key];
    } catch {
      delete result[key];
    }
  }));

  return result;
};

const fetchBasicHtmlMetadata = async (
  url: string,
  options: Pick<NonNullable<FirecrawlOptions["jina"]>, "htmlMetadataFetcher" | "htmlMetadataTimeoutMs"> = {},
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.htmlMetadataTimeoutMs ?? DEFAULT_JINA_HTML_METADATA_TIMEOUT_MS);

  try {
    const response = await (options.htmlMetadataFetcher ?? fetch)(url, {
      headers: { accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
    });
    if (!response.ok) return {};
    const html = await response.text();
    return verifiedImageMetadata(
      parseBasicHtmlMetadata(html, url),
      url,
      options.htmlMetadataFetcher ?? fetch,
      controller.signal,
    );
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
};

export const normalizeJinaReaderPayload = (
  inputUrl: string,
  readerText: string,
  htmlMetadata: Record<string, unknown> = {},
): WebsiteResearchResult => {
  const websiteUrl = normalizePublicWebsiteUrl(inputUrl);
  const parsed = parseJinaReaderText(readerText);
  const metadata: Record<string, unknown> = {
    sourceURL: parsed.sourceUrl || websiteUrl.href,
    title: parsed.title,
    ...htmlMetadata,
  };
  const markdown = parsed.markdown;

  assertUsefulMarkdown(markdown);

  const evidence = parseMarkdownEvidence(markdown);
  const finalUrl = rawMetadataText(metadata, ["sourceURL", "url"], websiteUrl.href, 900);
  const title = metadataText(
    metadata,
    ["ogTitle", "title"],
    parsed.title || evidence.headings[0] || websiteUrl.hostname,
    120,
  );
  const description = metadataText(
    metadata,
    ["ogDescription", "description"],
    evidence.paragraphs[0] || "",
    280,
  );
  const brandName = metadataText(
    metadata,
    ["ogSiteName", "siteName", "applicationName"],
    titleToBrand(title, websiteUrl.hostname),
    60,
  );
  const faviconUrl = resolveMaybeUrl(
    metadata.favicon || metadata.faviconUrl || metadata.icon,
    finalUrl,
  );
  const logoUrl = resolveMaybeUrl(metadata.logo || metadata.logoUrl, finalUrl);
  const ogImageUrl = resolveMaybeUrl(metadata.ogImage || metadata.image, finalUrl);
  const colors = colorsFromFirecrawl({}, metadata);

  const result: Omit<WebsiteResearchResult, "brandBrief"> = {
    websiteUrl: websiteUrl.href,
    finalUrl,
    host: websiteUrl.hostname,
    brand: {
      name: brandName,
      url: finalUrl,
      host: websiteUrl.hostname,
      title,
      description,
      faviconUrl,
      logoUrl,
      ogImageUrl,
      screenshotUrl: null,
      colors,
      fonts: { feel: "unknown" },
      vibeTags: buildVibeTags(metadata, {}, evidence),
    },
    evidence: {
      ...evidence,
      receipts: {
        ...evidence.receipts,
        exactSiteLanguage: unique([title, ...evidence.receipts.exactSiteLanguage, description], 8),
      },
    },
    metadata,
    branding: {},
    providerStatus: [{
      provider: "jina",
      status: "used",
      reason: `Jina read ${evidence.paragraphs.length} page snippets.`,
    }, ...(hasHtmlBrandAssets(metadata) ? [{
      provider: "html-brand-assets" as const,
      status: "used" as const,
      reason: "Read brand assets from website HTML.",
    }] : [])],
  };

  return {
    ...result,
    brandBrief: buildFallbackBrandBrief(result),
  };
};

const mergeBrandAssets = (
  research: WebsiteResearchResult,
  resolution: BrandAssetResolution,
): WebsiteResearchResult => {
  const assets = resolution.brand;
  return {
    ...research,
    brand: {
      ...research.brand,
      faviconUrl: assets.faviconUrl ?? research.brand.faviconUrl,
      logoUrl: assets.logoUrl ?? research.brand.logoUrl,
      ogImageUrl: assets.ogImageUrl ?? research.brand.ogImageUrl,
      screenshotUrl: assets.screenshotUrl ?? research.brand.screenshotUrl,
      colors: assets.colors?.length ? assets.colors : research.brand.colors,
      fonts: assets.fonts && assets.fonts.feel !== "unknown" ? assets.fonts : research.brand.fonts,
      vibeTags: assets.vibeTags?.length ? assets.vibeTags : research.brand.vibeTags,
    },
    branding: {
      ...research.branding,
      ...resolution.branding,
    },
    providerStatus: [
      ...research.providerStatus,
      ...resolution.providerStatus,
    ],
  };
};

const fetchWebsiteResearchWithJina = async (
  inputUrl: string,
  options: NonNullable<FirecrawlOptions["jina"]> = {},
) => {
  const websiteUrl = normalizePublicWebsiteUrl(inputUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_JINA_READER_TIMEOUT_MS);

  try {
    const readerUrl = `${JINA_READER_BASE_URL}${websiteUrl.href}`;
    const [response, htmlMetadata] = await Promise.all([
      (options.fetcher ?? fetch)(readerUrl, {
        headers: { accept: "text/plain" },
        signal: controller.signal,
      }),
      fetchBasicHtmlMetadata(websiteUrl.href, options),
    ]);
    if (!response.ok) throw new Error(`Jina returned ${response.status}.`);

    const readerText = await response.text();
    const parsed = parseJinaReaderText(readerText);
    assertUsefulJinaMarkdown(parsed.markdown, {
      minMarkdownChars: options.minMarkdownChars ?? DEFAULT_JINA_MIN_MARKDOWN_CHARS,
      minUsefulLines: options.minUsefulLines ?? DEFAULT_JINA_MIN_USEFUL_LINES,
    });

    return normalizeJinaReaderPayload(websiteUrl.href, readerText, htmlMetadata);
  } catch (error) {
    throw new Error(toWebsiteResearchErrorMessage(error));
  } finally {
    clearTimeout(timeout);
  }
};

export const firecrawlRequestShape = (
  url: string,
  options: Pick<FirecrawlOptions, "includeScreenshot"> = {},
) => ({
  url,
  formats: [
    "markdown",
    "branding",
    ...(options.includeScreenshot ? [{
      type: "screenshot",
      fullPage: true,
    }] : []),
  ],
  onlyMainContent: true,
  removeBase64Images: true,
  blockAds: true,
});

export const fetchWebsiteResearchWithFirecrawl = async (
  inputUrl: string,
  options: FirecrawlOptions = {},
) => {
  const websiteUrl = normalizePublicWebsiteUrl(inputUrl);
  const apiKey = options.apiKey ?? process.env.FIRECRAWL_API_KEY;
  const shouldTryJina = options.jina?.enabled !== false && (!options.fetcher || Boolean(options.jina?.fetcher));
  let jinaFailureReason = "";

  if (shouldTryJina) {
    try {
      const jinaResult = await fetchWebsiteResearchWithJina(inputUrl, options.jina);
      const assetResolution = await resolveBrandAssets({
        domain: websiteUrl.hostname,
        htmlColors: jinaResult.brand.colors,
        cachedBrand: options.brandAssets?.cachedBrand,
        apiKey: options.brandAssets?.apiKey,
        fetcher: options.brandAssets?.fetcher,
      });
      return curateWebsiteResearchResult(mergeBrandAssets(jinaResult, assetResolution), options.curator);
    } catch (error) {
      jinaFailureReason = toWebsiteResearchErrorMessage(error);
      // Firecrawl remains the hard-site fallback for weak, blocked, or timed-out Jina reads.
    }
  }

  if (!apiKey) {
    throw new Error("Firecrawl is required for website research, but it is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_FIRECRAWL_TIMEOUT_MS);

  try {
    const response = await (options.fetcher ?? fetch)(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(firecrawlRequestShape(websiteUrl.href, {
        includeScreenshot: options.includeScreenshot,
      })),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Firecrawl returned ${response.status}.`);
    }

    const payload = await response.json() as FirecrawlPayload;
    if (payload.success === false) {
      throw new Error("Firecrawl could not read that website.");
    }

    const firecrawlResult = normalizeFirecrawlPayload(websiteUrl.href, payload);
    const assetResolution = await resolveBrandAssets({
      domain: websiteUrl.hostname,
      htmlColors: firecrawlResult.brand.colors,
      cachedBrand: options.brandAssets?.cachedBrand,
      apiKey: options.brandAssets?.apiKey,
      fetcher: options.brandAssets?.fetcher,
    });
    const enrichedFirecrawlResult = mergeBrandAssets(firecrawlResult, assetResolution);
    return curateWebsiteResearchResult(
      jinaFailureReason
        ? {
          ...enrichedFirecrawlResult,
          providerStatus: [
            {
              provider: "jina",
              status: "failed",
              reason: `${jinaFailureReason} Used Firecrawl fallback.`,
            },
            ...enrichedFirecrawlResult.providerStatus,
          ],
        }
        : enrichedFirecrawlResult,
      options.curator,
    );
  } catch (error) {
    throw new Error(toWebsiteResearchErrorMessage(error));
  } finally {
    clearTimeout(timeout);
  }
};
