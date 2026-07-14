import { normalizePublicWebsiteUrl } from "../../research/url";

const weakProductUseTerms = /\b(pack|packet|pouch|gumm(?:y|ies)|capsule|bottle|jar|tin|box)\b/i;
const unusableImageTerms = /\b(logo|icon|favicon|review|clinical|chart|badge|banner|desktop|mobile|thumbnail|size[-_ ]?guide)\b/i;

const decodeHtml = (value: string) => value
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, "\"")
  .replace(/&#39;|&apos;/gi, "'");

const attribute = (tag: string, name: string) => (
  tag.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "i"))?.[1] || ""
);

const resolveImageUrl = (value: string, pageUrl: string) => {
  const cleaned = decodeHtml(value).trim();
  if (!cleaned || cleaned.startsWith("data:") || cleaned.startsWith("blob:")) return "";
  try {
    return new URL(cleaned, pageUrl).href;
  } catch {
    return "";
  }
};

const productUseScore = (identity: string) => (
  (/(sachet|satchet)/i.test(identity) ? 400 : 0)
  + (/\bsingle[-_ ]?(serve|serving|pack)\b/i.test(identity) ? 300 : 0)
  + (/(hand|holding)/i.test(identity) ? 150 : 0)
  + (/\b(in[-_ ]?use|carry|travel|on[-_ ]?the[-_ ]?go)\b/i.test(identity) ? 100 : 0)
  + (/\blifestyle\b/i.test(identity) ? 30 : 0)
  + (weakProductUseTerms.test(identity) ? 10 : 0)
);

const productPackshotScore = (identity: string, width: number) => (
  (/(pouch[-_ ]?w[-_ ]?gumm|pouch[-_ ]?with[-_ ]?gumm)/i.test(identity) ? 500 : 0)
  + (/(packshot|product[-_ ]?(shot|render)|render[-_ ]?front)/i.test(identity) ? 350 : 0)
  + (/(transparent|no[-_ ]?bg)/i.test(identity) ? 300 : 0)
  + (weakProductUseTerms.test(identity) ? 80 : 0)
  + Math.min(120, Math.max(0, width / 10))
  - (/(lifestyle|hand|holding|comparison|table|modal|gallery|offer)/i.test(identity) ? 240 : 0)
);

const imageCandidates = (html: string, pageUrl: string, heroImageUrl = "") => {
  const hero = resolveImageUrl(heroImageUrl, pageUrl);
  return (html.match(/<img\b[^>]*>/gi) || [])
    .map((tag, index) => {
      const url = resolveImageUrl(attribute(tag, "src"), pageUrl);
      const identity = `${url} ${decodeHtml(attribute(tag, "alt"))}`;
      const width = Number(attribute(tag, "width")) || 0;
      if (!url || url === hero || unusableImageTerms.test(identity)) return null;
      return { url, identity, width, index };
    })
    .filter((candidate): candidate is { url: string; identity: string; width: number; index: number } => Boolean(candidate));
};

export const extractThreeDProductUseImageUrl = (
  html: string,
  pageUrl: string,
  heroImageUrl = "",
) => {
  const candidates = imageCandidates(html, pageUrl, heroImageUrl)
    .map(({ url, identity, index }) => ({ url, score: productUseScore(identity), index }))
    .filter((candidate): candidate is { url: string; score: number; index: number } => Boolean(candidate?.score))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return candidates[0]?.url || null;
};

export const extractThreeDProductPackshotImageUrl = (
  html: string,
  pageUrl: string,
  heroImageUrl = "",
) => {
  const candidates = imageCandidates(html, pageUrl, heroImageUrl)
    .map(({ url, identity, width, index }) => ({ url, score: productPackshotScore(identity, width), index }))
    .filter((candidate) => candidate.score >= 300)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return candidates[0]?.url || null;
};

export const fetchThreeDProductReferenceImageUrls = async (
  productPageUrl: string,
  heroImageUrl: string,
  fetcher: typeof fetch = fetch,
) => {
  const pageUrl = normalizePublicWebsiteUrl(productPageUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetcher(pageUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.includes("text/html")) return null;
    const html = await response.text();
    return {
      packshotImageUrl: extractThreeDProductPackshotImageUrl(html, pageUrl.href, heroImageUrl),
      useImageUrl: extractThreeDProductUseImageUrl(html, pageUrl.href, heroImageUrl),
    };
  } finally {
    clearTimeout(timeout);
  }
};
