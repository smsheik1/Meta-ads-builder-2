import type { StoredWebsiteResearchResult } from "../../research/types";
import type { ReviewsProofItem } from "../../scene/types";

const maxProofItems = 12;
const maxReviewFetchUrls = 6;
const sitemapTimeoutMs = 3_000;
const minUsefulLength = 18;
const maxProofLength = 220;

const chromePhrases = [
  "privacy policy",
  "terms of service",
  "all rights reserved",
  "cookie policy",
  "navigation",
  "subscribe",
  "sign up",
  "log in",
  "menu",
  "skip to content",
];

const imageChromeWords = [
  "logo",
  "favicon",
  "icon",
  "avatar",
  "badge",
  "sprite",
];

const decodeHtmlEntities = (value: string) => value
  .replace(/&quot;|&#34;/gi, "\"")
  .replace(/&apos;|&#39;|&rsquo;|&lsquo;/gi, "'")
  .replace(/&rdquo;|&ldquo;/gi, "\"")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&mdash;|&ndash;/gi, " ")
  .replace(/&nbsp;/gi, " ");

export const normalizeProofText = (value: string) => decodeHtmlEntities(value)
  .replace(/[“”]/g, "\"")
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.!?])/g, "$1")
  .trim();

const cleanLine = (value: unknown) => normalizeProofText(String(value ?? "")
  .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
  .replace(/\[[^\]]+]\([^)]+\)/g, (match) => match.match(/^\[([^\]]+)]/)?.[1] || " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/^[-*#>\s]+/g, " "));

const isUsefulProofLine = (line: string) => {
  const lower = line.toLowerCase();
  if (line.length < minUsefulLength) return false;
  if (line.length > 360) return false;
  if (chromePhrases.some((phrase) => lower.includes(phrase))) return false;
  if (/^(home|about|contact|pricing|features|services|products)$/i.test(line)) return false;
  if (!/[a-z]/i.test(line)) return false;
  return true;
};

const extractRating = (line: string) => {
  const starMatch = line.match(/\b([1-5](?:\.\d)?)\s*(?:\/\s*5)?\s*(?:stars?|★)/i);
  if (starMatch?.[1]) return Number(starMatch[1]);
  if (/★★★★★|5-star|five-star/i.test(line)) return 5;
  return undefined;
};

const hasQuotedReview = (line: string) => /["]/.test(normalizeProofText(line));

const hasCustomerVoice = (line: string) => /\b(?:i|i'm|i've|we|we're|we've|my|our|me|us|ordered|order again|would order|arrived|received|came|showed up|tasted|loved|love|recommend|asked where)\b/i.test(line);

const hasStrongReviewShape = (line: string) => /\b(?:best .*ever|can't stop|would order|order again|awesome|excellent|delicious|perfect|amazing|homemade|beautiful|right on time|melt(?:s|ed)? in your mouth|asked for more)\b/i.test(line);

const looksLikeMarketingCopy = (line: string) => /\b(?:shop|sale|for less|more of the|you(?:'|’)ll ever own|everyone(?:'|’)s favorite|now in|new arrivals?|new corset|new .*styles?|made for the studio|collection|silhouettes?|shade|pack is here|add to bag|buy now|limited time|free shipping)\b/i.test(line);

const isRatingOrCountSummary = (line: string) => (
  /\d/.test(line) &&
  /\b(?:reviews?|testimonials?|ratings?|rated|stars?|out of 5)\b/i.test(line)
);

export const isActualReviewProof = (item: ReviewsProofItem) => (
  item.type === "review" &&
  !isRatingOrCountSummary(item.text) &&
  !looksLikeMarketingCopy(item.text) &&
  (
    hasCustomerVoice(item.text) ||
    Boolean(item.rating) ||
    Boolean(item.sourceName) ||
    (hasQuotedReview(item.text) && hasStrongReviewShape(item.text))
  )
);

const pushStoredReview = (
  items: ReviewsProofItem[],
  seen: Set<string>,
  text: string,
) => {
  const line = cleanLine(text).slice(0, maxProofLength).trim();
  const key = line.toLowerCase();
  if (!isUsefulProofLine(line) || seen.has(key)) return;
  const rating = extractRating(line);
  const item: ReviewsProofItem = {
    type: "review",
    text: line,
    ...(rating ? { rating } : {}),
    provider: "website",
  };
  if (!isActualReviewProof(item)) return;
  seen.add(key);
  items.push(item);
};

const rawMarkdownLines = (rawMarkdown: string) => rawMarkdown
  .split(/\n+/)
  .map(cleanLine)
  .filter(Boolean);

export function extractWebsiteReviewProofItems(research: StoredWebsiteResearchResult): ReviewsProofItem[] {
  const items: ReviewsProofItem[] = [];
  const seen = new Set<string>();

  for (const text of research.evidence.receipts.namedProof || []) pushStoredReview(items, seen, text);
  for (const text of research.brandBrief.proof || []) pushStoredReview(items, seen, text);
  for (const text of research.evidence.receipts.specificClaims || []) pushStoredReview(items, seen, text);
  for (const text of research.evidence.paragraphs || []) pushStoredReview(items, seen, text);
  for (const text of research.evidence.headings || []) pushStoredReview(items, seen, text);
  for (const text of rawMarkdownLines(research.evidence.rawMarkdown || "")) pushStoredReview(items, seen, text);

  return items.slice(0, maxProofItems);
}

const pushReview = (
  items: ReviewsProofItem[],
  seen: Set<string>,
  text: unknown,
  rating?: unknown,
  sourceName?: unknown,
  sourceUrl?: unknown,
) => {
  const line = normalizeProofText(String(text ?? "")).slice(0, maxProofLength).trim();
  const key = line.toLowerCase();
  if (!isUsefulProofLine(line) || seen.has(key)) return;
  const numericRating = Number(rating);
  const item: ReviewsProofItem = {
    type: "review",
    text: line.startsWith("\"") ? line : `"${line}"`,
    provider: "website",
    ...(Number.isFinite(numericRating) && numericRating > 0 ? { rating: numericRating } : {}),
    ...(typeof sourceName === "string" && sourceName.trim() ? { sourceName: normalizeProofText(sourceName).slice(0, 80) } : {}),
    ...(typeof sourceUrl === "string" && sourceUrl.trim() ? { sourceUrl } : {}),
  };
  if (!isActualReviewProof(item)) return;
  seen.add(key);
  items.push(item);
};

const valueFromPath = (value: unknown, path: string[]): unknown => path.reduce(
  (current, key) => (current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined),
  value,
);

const textFromRecord = (record: Record<string, unknown>, paths: string[][]) => {
  for (const path of paths) {
    const value = valueFromPath(record, path);
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};

const ratingFromRecord = (record: Record<string, unknown>) => {
  const rating = valueFromPath(record, ["reviewRating", "ratingValue"])
    || valueFromPath(record, ["rating", "ratingValue"])
    || record.rating
    || record.score;
  return typeof rating === "number" || typeof rating === "string" ? rating : undefined;
};

const authorFromRecord = (record: Record<string, unknown>) => {
  const author = record.author || record.user || record.reviewer;
  if (typeof author === "string") return author;
  if (author && typeof author === "object") {
    const authorRecord = author as Record<string, unknown>;
    return textFromRecord(authorRecord, [["name"], ["displayName"], ["nickname"]]);
  }
  return "";
};

const isSchemaReview = (record: Record<string, unknown>) => {
  const type = record["@type"] || record.type;
  const values = Array.isArray(type) ? type : [type];
  return values.some((value) => String(value || "").toLowerCase() === "review");
};

const collectSchemaReviews = (value: unknown, items: ReviewsProofItem[], seen: Set<string>) => {
  if (Array.isArray(value)) {
    for (const item of value) collectSchemaReviews(item, items, seen);
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  if (isSchemaReview(record)) {
    pushReview(
      items,
      seen,
      textFromRecord(record, [["reviewBody"], ["body"], ["description"], ["text"], ["content"]]),
      ratingFromRecord(record),
      authorFromRecord(record),
    );
  }

  for (const key of ["@graph", "review", "reviews", "itemReviewed", "mainEntity"]) {
    if (key in record) collectSchemaReviews(record[key], items, seen);
  }
};

const extractJsonLdScripts = (html: string) => [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => decodeHtmlEntities(match[1] || "").trim())
  .filter(Boolean);

const parseJsonLdReviews = (html: string, items: ReviewsProofItem[], seen: Set<string>) => {
  for (const script of extractJsonLdScripts(html)) {
    try {
      collectSchemaReviews(JSON.parse(script), items, seen);
    } catch {
      // Ignore malformed structured data; widget/HTML parsers may still find review proof.
    }
  }
};

const parseJsonStringLiteral = (value: string) => {
  try {
    return JSON.parse(`"${value.replace(/\n/g, "\\n")}"`) as string;
  } catch {
    return "";
  }
};

const parseYotpoPreloadedReviews = (html: string, items: ReviewsProofItem[], seen: Set<string>) => {
  const matches = [...html.matchAll(/preloadedReviews\s*=\s*JSON\.parse\("([\s\S]*?)"\);/g)];
  for (const match of matches) {
    const jsonText = parseJsonStringLiteral(match[1] || "");
    if (!jsonText) continue;
    try {
      const payload = JSON.parse(jsonText) as { reviews?: Array<Record<string, unknown>> };
      for (const review of payload.reviews || []) {
        pushReview(items, seen, review.content, review.score, (review.user as Record<string, unknown> | undefined)?.displayName);
      }
    } catch {
      // Ignore malformed widget blobs; the page may still contain rendered review HTML.
    }
  }
};

const parseRenderedYotpoReviews = (html: string, items: ReviewsProofItem[], seen: Set<string>) => {
  const articleMatches = [...html.matchAll(/<article\b[^>]*class="[^"]*\byotpo-review\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi)];
  for (const match of articleMatches) {
    const article = match[0] || "";
    const body = match[1] || "";
    const text = body.match(/<p\b[^>]*class="[^"]*\byotpo-review-body\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ");
    const rating = article.match(/data-rating="([^"]+)"/i)?.[1] || body.match(/\b([1-5])\/5\b/)?.[1];
    const sourceName = article.match(/data-reviewer="([^"]+)"/i)?.[1]
      || body.match(/class="[^"]*\byotpo-reviewer-name\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1]?.replace(/<[^>]+>/g, " ");
    pushReview(items, seen, text, rating, sourceName);
  }
};

const classBlockPattern = (className: string) => new RegExp(`<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/[^>]+>`, "gi");

const textByClass = (html: string, className: string) => html.match(new RegExp(`<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"))?.[1]
  ?.replace(/<[^>]+>/g, " ");

const attrValue = (html: string, attr: string) => html.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"))?.[1];

const ratingFromText = (html: string) => (
  attrValue(html, "data-rating")
  || attrValue(html, "data-score")
  || html.match(/\b([1-5](?:\.\d)?)\s*(?:\/\s*5|stars?)\b/i)?.[1]
);

const parseWidgetClassReviews = (
  html: string,
  items: ReviewsProofItem[],
  seen: Set<string>,
  config: {
    blockClass: string;
    bodyClasses: string[];
    authorClasses: string[];
  },
) => {
  for (const blockMatch of html.matchAll(classBlockPattern(config.blockClass))) {
    const block = blockMatch[0] || "";
    const text = config.bodyClasses.map((className) => textByClass(block, className)).find(Boolean);
    const author = config.authorClasses.map((className) => textByClass(block, className)).find(Boolean);
    pushReview(items, seen, text, ratingFromText(block), author);
  }
};

const parseKnownWidgetReviews = (html: string, items: ReviewsProofItem[], seen: Set<string>) => {
  parseWidgetClassReviews(html, items, seen, {
    blockClass: "jdgm-rev",
    bodyClasses: ["jdgm-rev__body"],
    authorClasses: ["jdgm-rev__author", "jdgm-rev__buyer-badge"],
  });
  parseWidgetClassReviews(html, items, seen, {
    blockClass: "oke-w-review",
    bodyClasses: ["oke-w-review-content-body", "oke-reviewContent-body", "oke-w-review-main"],
    authorClasses: ["oke-w-reviewer-name", "oke-reviewContent-reviewer-name"],
  });
  parseWidgetClassReviews(html, items, seen, {
    blockClass: "loox-review",
    bodyClasses: ["loox-review-content", "loox-review-body"],
    authorClasses: ["loox-review-author", "loox-review-name"],
  });
  parseWidgetClassReviews(html, items, seen, {
    blockClass: "stamped-review",
    bodyClasses: ["stamped-review-content-body", "stamped-review-body"],
    authorClasses: ["stamped-review-header-author", "author"],
  });
};

export function extractReviewProofItemsFromHtml(html: string): ReviewsProofItem[] {
  const items: ReviewsProofItem[] = [];
  const seen = new Set<string>();
  parseJsonLdReviews(html, items, seen);
  parseYotpoPreloadedReviews(html, items, seen);
  parseRenderedYotpoReviews(html, items, seen);
  parseKnownWidgetReviews(html, items, seen);
  return items.slice(0, maxProofItems);
}

const safeUrl = (value: string) => {
  try {
    return new URL(value).toString();
  } catch {
    return "";
  }
};

const productUrlsFromHtml = (html: string, baseUrl: string) => {
  const urls = [...html.matchAll(/href=["']([^"']*\/products\/[^"']+)["']/gi)]
    .map((match) => toAbsoluteUrl(match[1] || "", baseUrl))
    .filter(Boolean);
  return [...new Set(urls)].slice(0, 4);
};

const reviewUrlsFromSitemap = (xml: string, baseUrl: string) => {
  let origin = "";
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }

  const candidates = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
    .map((match) => decodeHtmlEntities(match[1] || "").trim())
    .filter((url) => {
      try {
        const parsed = new URL(url);
        return parsed.origin === origin && /\b(review|reviews|testimonial|testimonials|customer|story|stories|case-study|case-studies)\b/i.test(parsed.pathname);
      } catch {
        return false;
      }
    });
  return [...new Set(candidates)].slice(0, 3);
};

const candidateReviewUrls = (
  research: StoredWebsiteResearchResult,
  homepageHtml = "",
  preferredProductHandles: string[] = [],
) => {
  const baseUrl = research.finalUrl || research.websiteUrl;
  const candidates = new Set<string>();
  const selected = new Set(preferredProductHandles.map((handle) => handle.trim()).filter(Boolean));
  for (const product of research.productCatalog?.products || []) {
    if (selected.has(product.handle) && product.url) candidates.add(product.url);
  }
  for (const value of [research.finalUrl, research.websiteUrl]) {
    const url = safeUrl(value || "");
    if (url) candidates.add(url);
  }
  try {
    const origin = new URL(baseUrl).origin;
    candidates.add(new URL("/pages/reviews", origin).toString());
  } catch {
    // Ignore invalid source URLs; generation will fail loudly if no reviews are found.
  }
  for (const url of productUrlsFromHtml(homepageHtml, baseUrl)) candidates.add(url);
  return [...candidates].slice(0, maxReviewFetchUrls);
};

const fetchText = async (fetcher: typeof fetch, url: string, timeoutMs?: number) => {
  const controller = timeoutMs ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetcher(url, {
    headers: {
      "user-agent": "Mozilla/5.0 WigglyReviewsBot/1.0",
      accept: "text/html,application/xhtml+xml",
    },
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!response.ok) return "";
    return response.text();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const createReviewFetchCache = (fetcher: typeof fetch) => {
  const cache = new Map<string, Promise<string>>();
  return (url: string, timeoutMs?: number) => {
    const key = safeUrl(url);
    if (!key) return Promise.resolve("");
    if (!cache.has(key)) cache.set(key, fetchText(fetcher, key, timeoutMs).catch(() => ""));
    return cache.get(key)!;
  };
};

export async function fetchWebsiteReviewProofItems(
  research: StoredWebsiteResearchResult,
  fetcher: typeof fetch = fetch,
  options: {
    preferredProductHandles?: string[];
  } = {},
): Promise<ReviewsProofItem[]> {
  const baseUrl = safeUrl(research.websiteUrl) || safeUrl(research.finalUrl || "");
  const fetchCached = createReviewFetchCache(fetcher);
  const homepageHtml = baseUrl ? await fetchCached(baseUrl) : "";
  const items: ReviewsProofItem[] = [];
  const seen = new Set<string>();

  for (const url of candidateReviewUrls(research, homepageHtml, options.preferredProductHandles || [])) {
    const html = url === baseUrl ? homepageHtml : await fetchCached(url);
    for (const item of extractReviewProofItemsFromHtml(html)) {
      pushReview(items, seen, item.text, item.rating, item.sourceName, item.sourceUrl || url);
    }
    if (items.length >= maxProofItems) break;
  }

  if (items.length < 2 && baseUrl) {
    let sitemapUrl = "";
    try {
      sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
    } catch {
      sitemapUrl = "";
    }
    const sitemap = sitemapUrl ? await fetchCached(sitemapUrl, sitemapTimeoutMs) : "";
    for (const url of reviewUrlsFromSitemap(sitemap, baseUrl)) {
      const html = await fetchCached(url);
      for (const item of extractReviewProofItemsFromHtml(html)) {
        pushReview(items, seen, item.text, item.rating, item.sourceName, item.sourceUrl || url);
      }
      if (items.length >= maxProofItems) break;
    }
  }

  return items.slice(0, maxProofItems);
}

const isImageUrl = (url: string) => (
  /^https?:\/\//i.test(url) &&
  (/\.(?:png|jpe?g|webp|gif)(?:[?#].*)?$/i.test(url) || /(?:image|cdn|uploads|products?)/i.test(url))
);

const toAbsoluteUrl = (url: string, baseUrl: string) => {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return "";
  }
};

export function extractReviewBackgroundImages(research: StoredWebsiteResearchResult): string[] {
  const raw = research.evidence.rawMarkdown || "";
  const baseUrl = research.finalUrl || research.websiteUrl;
  const matches = [...raw.matchAll(/!\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)];
  const seen = new Set<string>();
  const images: string[] = [];

  for (const match of matches) {
    const alt = (match[1] || "").toLowerCase();
    if (imageChromeWords.some((word) => alt.includes(word))) continue;
    const url = toAbsoluteUrl(match[2] || "", baseUrl);
    if (!url || !isImageUrl(url) || seen.has(url)) continue;
    seen.add(url);
    images.push(url);
    if (images.length >= 6) break;
  }

  const fallbacks = [
    research.brand.ogImageUrl,
    research.brand.screenshotUrl,
    research.brand.logoUrl,
  ].filter((value): value is string => Boolean(value?.trim()));

  for (const fallback of fallbacks) {
    const url = toAbsoluteUrl(fallback, baseUrl);
    if (url && !seen.has(url)) {
      seen.add(url);
      images.push(url);
    }
  }

  return images.slice(0, 6);
}
