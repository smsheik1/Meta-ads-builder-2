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

export const extractThreeDProductUseImageUrl = (
  html: string,
  pageUrl: string,
  heroImageUrl = "",
) => {
  const hero = resolveImageUrl(heroImageUrl, pageUrl);
  const candidates = (html.match(/<img\b[^>]*>/gi) || [])
    .map((tag, index) => {
      const url = resolveImageUrl(attribute(tag, "src"), pageUrl);
      const identity = `${url} ${decodeHtml(attribute(tag, "alt"))}`;
      if (!url || url === hero || unusableImageTerms.test(identity)) return null;
      return { url, score: productUseScore(identity), index };
    })
    .filter((candidate): candidate is { url: string; score: number; index: number } => Boolean(candidate?.score))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return candidates[0]?.url || null;
};

export const fetchThreeDProductUseImageUrl = async (
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
    return extractThreeDProductUseImageUrl(await response.text(), pageUrl.href, heroImageUrl);
  } finally {
    clearTimeout(timeout);
  }
};
