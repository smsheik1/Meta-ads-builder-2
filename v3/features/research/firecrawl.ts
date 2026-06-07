import {
  buildFallbackBrandBrief,
  curateWebsiteResearchResult,
  type BrandCuratorOptions,
} from "./brandCurator";
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
  curator?: BrandCuratorOptions;
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
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_MARKDOWN_CHARS = 24_000;
const FIRECRAWL_TIMEOUT_MESSAGE = "That site took too long to read. Try again, or paste a more specific public page from the same brand.";
const chromeTextPattern = /\b(skip to content|cart is empty|continue shopping|log in|login|check out|checkout|add to cart|quantity|subtotal|loading|have an account|gift message|discount code|multiple addresses?|free shipping not applied|regular price|sale price|sold out|password|newsletter|privacy policy|terms of service)\b/i;
const standalonePricePattern = /^(?:from\s+)?\$[\d,.]+(?:\s*-\s*\$[\d,.]+)?$/i;

const cleanText = (value: unknown, maxLength = 260) => String(value ?? "")
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
  if (/^(search|menu|account)$/i.test(cleaned)) return true;
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
  const firstChunk = cleanText(title, 80).split(/\s+[|-]\s+/)[0]?.trim();
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
    rawMarkdown: markdown.slice(0, MAX_MARKDOWN_CHARS),
  };
};

const colorsFromFirecrawl = (
  branding: Record<string, unknown>,
  metadata: Record<string, unknown>,
) => {
  const rawColors = [
    metadata.themeColor,
    metadata["theme-color"],
    ...(Array.isArray(branding.colors) ? branding.colors : []),
  ];
  return rawColors
    .map((color) => String(color ?? "").trim().toUpperCase())
    .filter((color) => /^#[0-9A-F]{6}$/.test(color))
    .filter((color, index, all) => all.indexOf(color) === index)
    .slice(0, 8);
};

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
  ) || new URL("/favicon.ico", websiteUrl.origin).href;
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

export const firecrawlRequestShape = (url: string) => ({
  url,
  formats: [
    "markdown",
    "branding",
    {
      type: "screenshot",
      fullPage: true,
    },
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

  if (!apiKey) {
    throw new Error("Firecrawl is required for website research, but it is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await (options.fetcher ?? fetch)(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(firecrawlRequestShape(websiteUrl.href)),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Firecrawl returned ${response.status}.`);
    }

    const payload = await response.json() as FirecrawlPayload;
    if (payload.success === false) {
      throw new Error("Firecrawl could not read that website.");
    }

    return curateWebsiteResearchResult(
      normalizeFirecrawlPayload(websiteUrl.href, payload),
      options.curator,
    );
  } catch (error) {
    throw new Error(toWebsiteResearchErrorMessage(error));
  } finally {
    clearTimeout(timeout);
  }
};
