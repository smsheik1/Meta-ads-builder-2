import net from 'net';
import { GoogleGenAI } from '@google/genai';
import { buildBrandBrainPrompt, type BrandAssets, type BrandBrain, type BrandFontSignal, type BrandReceipts } from '../lib/prompts/brand-brain';
import { hasReadableWebsiteResearch } from '../lib/research-readability';

export type { BrandAssets, BrandBrain, BrandReceipts } from '../lib/prompts/brand-brain';

const isDisabled = (value: string | undefined) => ['0', 'false', 'off', 'no'].includes(String(value || '').trim().toLowerCase());

export const parseJsonResponse = (text: string) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = (fenced ? fenced[1] : trimmed)
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
  return JSON.parse(jsonText);
};

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape';
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const BRAND_RESEARCH_MODEL = 'gemini-3-flash-preview';
export const BRAND_RESEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
const BRAND_RESEARCH_CACHE_LIMIT = 100;
const MAX_RESEARCH_PAGES = 1;
const MAX_RESEARCH_CHARS = 56000;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const FIRECRAWL_TIMEOUT_MS = 12000;
const TAVILY_TIMEOUT_MS = 9000;
const BRAND_BRAIN_TIMEOUT_MS = 18000;
export const BRAND_BRAIN_CACHE_VERSION = 'brand-assets-v9';

type ScrapedPage = {
  url: string;
  title: string;
  description: string;
  markdown: string;
  links: string[];
  colors: string[];
  logoUrl?: string;
  brandAssets: BrandAssets;
};

type BrandResearchCacheEntry = {
  expiresAt: number;
  pages: ScrapedPage[];
  researchText: string;
  logoUrl?: string;
  brandAssets: BrandAssets;
};

type BrandBrainCacheEntry = {
  expiresAt: number;
  brandBrain: BrandBrain;
};

const brandResearchCache = new Map<string, BrandResearchCacheEntry>();
const brandBrainCache = new Map<string, BrandBrainCacheEntry>();

const blockedHostnames = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const isPrivateIpv4 = (hostname: string) => {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
};

const isPrivateIpv6 = (hostname: string) => {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
};

export const normalizeResearchUrl = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Website URL is required.');
  const withProtocol = raw.includes('://') ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Website must start with http or https.');
  url.hash = '';
  url.username = '';
  url.password = '';
  const hostname = url.hostname.toLowerCase();
  const ipVersion = net.isIP(hostname);
  if (
    blockedHostnames.has(hostname) ||
    hostname.endsWith('.local') ||
    (ipVersion === 4 && isPrivateIpv4(hostname)) ||
    (ipVersion === 6 && isPrivateIpv6(hostname))
  ) {
    throw new Error('That website URL cannot be researched.');
  }
  return url;
};

const sameOriginUrl = (value: string, baseUrl: URL) => {
  try {
    const nextUrl = new URL(value, baseUrl.href);
    nextUrl.hash = '';
    nextUrl.username = '';
    nextUrl.password = '';
    if (!['http:', 'https:'].includes(nextUrl.protocol)) return null;
    if (nextUrl.hostname.replace(/^www\./, '') !== baseUrl.hostname.replace(/^www\./, '')) return null;
    if (/\.(pdf|zip|png|jpe?g|gif|webp|svg|mp4|mp3|wav|m4a|mov)$/i.test(nextUrl.pathname)) return null;
    return nextUrl.href;
  } catch {
    return null;
  }
};

const addBrandResearchCache = (key: string, entry: BrandResearchCacheEntry) => {
  brandResearchCache.set(key, entry);
  while (brandResearchCache.size > BRAND_RESEARCH_CACHE_LIMIT) {
    const firstKey = brandResearchCache.keys().next().value;
    if (!firstKey) break;
    brandResearchCache.delete(firstKey);
  }
};

const getBrandResearchCache = (key: string) => {
  const cached = brandResearchCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt < Date.now() || !cached.brandAssets) {
    brandResearchCache.delete(key);
    return null;
  }
  return cached;
};

export const addBrandBrainCache = (key: string, entry: BrandBrainCacheEntry) => {
  brandBrainCache.set(key, entry);
  while (brandBrainCache.size > BRAND_RESEARCH_CACHE_LIMIT) {
    const firstKey = brandBrainCache.keys().next().value;
    if (!firstKey) break;
    brandBrainCache.delete(firstKey);
  }
};

export const getBrandBrainCache = (key: string) => {
  const cached = brandBrainCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    brandBrainCache.delete(key);
    return null;
  }
  return cached;
};

export const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalizePublicAssetUrl = (value: unknown, baseUrl: string) => {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('data:')) return '';
  try {
    const url = new URL(raw, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch {
    return '';
  }
};

const normalizeImageAssetUrl = (value: unknown, baseUrl: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);/i.test(raw)) {
    return raw.length <= 20000 ? raw : '';
  }
  return normalizePublicAssetUrl(raw, baseUrl);
};

const isLikelyFaviconAsset = (value: unknown) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw.startsWith('data:')) return false;
  return /(?:^|\/)(?:favicon|apple-touch-icon|mstile|site-icon|android-chrome|icon[-_]\d|icon\.)/i.test(raw)
    || /\.(?:ico)(?:$|[?#])/i.test(raw);
};

const firstPublicAssetUrl = (values: unknown[], baseUrl: string) => {
  for (const value of values) {
    const normalized = normalizeImageAssetUrl(value, baseUrl);
    if (normalized) return normalized;
  }
  return '';
};

export const cleanTextField = (value: unknown, maxLength: number) => decodeHtmlEntities(String(value || ''))
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const clipJsonValue = (value: unknown, depth = 0): unknown => {
  if (value == null) return value;
  if (typeof value === 'string') return value.slice(0, 800);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= 4) return Array.isArray(value) ? '[array]' : '[object]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => clipJsonValue(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]) => [key.slice(0, 80), clipJsonValue(item, depth + 1)])
    );
  }
  return String(value).slice(0, 800);
};

const collectPublicAssetUrls = (value: unknown, baseUrl: string, urls = new Set<string>()) => {
  if (!value) return urls;
  if (typeof value === 'string') {
    const normalized = normalizeImageAssetUrl(value, baseUrl);
    if (normalized) urls.add(normalized);
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectPublicAssetUrls(item, baseUrl, urls));
    return urls;
  }
  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectPublicAssetUrls(item, baseUrl, urls));
  }
  return urls;
};

const normalizeStringRecord = (value: unknown, maxEntries = 40, maxValueLength = 300) => {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
      .slice(0, maxEntries)
      .map(([key, item]) => [key.slice(0, 80), String(item).replace(/\s+/g, ' ').trim().slice(0, maxValueLength)])
      .filter(([, item]) => item)
  );
};

const extractFonts = (value: unknown): BrandFontSignal[] => {
  const fonts = Array.isArray(value) ? value : [];
  return fonts
    .map((font): BrandFontSignal | null => {
      if (typeof font === 'string') return { family: cleanTextField(font, 80) };
      if (!font || typeof font !== 'object') return null;
      const record = font as Record<string, unknown>;
      const family = cleanTextField(record.family || record.name || record.fontFamily, 80);
      if (!family) return null;
      return {
        family,
        role: cleanTextField(record.role || record.type || record.usage, 40) || undefined,
      };
    })
    .filter((font): font is BrandFontSignal => Boolean(font))
    .filter((font, index, fonts) => fonts.findIndex((candidate) => candidate.family.toLowerCase() === font.family.toLowerCase() && candidate.role === font.role) === index)
    .slice(0, 12);
};

const extractSocialLinks = (links: string[], baseUrl: string) => {
  const socialPattern = /\b(?:instagram|linkedin|facebook|twitter|x\.com|youtube|tiktok|threads|pinterest)\.com\b/i;
  return links
    .map((link) => normalizePublicAssetUrl(link, baseUrl))
    .filter((link) => link && socialPattern.test(link))
    .filter((link, index, links) => links.indexOf(link) === index)
    .slice(0, 20);
};

const isUsableReviewSnippet = (line: string) => (
  !/^(home|about|services|contact|privacy|terms|menu)$/i.test(line) &&
  !/^[-–—]\s*[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3}$/.test(line) &&
  !/^\[?(?:view|read|see|load|show)\s+more\s+(?:reviews|testimonials)\]?$/i.test(line)
);

const extractReviewSnippets = (markdown: string) => {
  const normalized = String(markdown || '')
    .replace(/\r/g, '\n')
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => match.replace(/\]\([^)]+\)/, ']'))
    .split('\n')
    .map((line) => cleanTextField(line.replace(/^#{1,6}\s*/, '').replace(/^[-*•]\s*/, ''), 260))
    .filter(Boolean);
  const snippets: string[] = [];
  const reviewSignal = /\b(review|reviews|testimonial|testimonials|client|customer|patient|stars?|rated|rating|google)\b/i;
  const quoteSignal = /["“”]|(?:\b(amazing|excellent|professional|recommend|recommended|friendly|comfortable|results|love|loved|best)\b)/i;

  normalized.forEach((line, index) => {
    const context = `${normalized[index - 2] || ''} ${normalized[index - 1] || ''} ${line}`.toLowerCase();
    const hasReviewContext = reviewSignal.test(context);
    const looksLikeQuote = quoteSignal.test(line) && line.length >= 36 && line.length <= 220;
    const hasRating = /(?:★★★★★|★{4,5}|\b[45](?:\.0)?\s*(?:\/\s*5|stars?)\b)/i.test(line);
    if (!hasReviewContext && !looksLikeQuote && !hasRating) return;
    if (!isUsableReviewSnippet(line)) return;
    snippets.push(line.replace(/^["“”]+|["“”]+$/g, '').trim());
  });

  return snippets
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 8);
};

const buildPageBrandAssets = ({
  url,
  data,
  colors,
  logoUrl,
  markdown,
  links,
}: {
  url: string;
  data: any;
  colors: string[];
  logoUrl: string;
  markdown: string;
  links: string[];
}): BrandAssets => {
  const metadata = data.metadata || {};
  const branding = data.branding || {};
  const brandingImages = branding.images || {};
  const allImageUrls = Array.from(collectPublicAssetUrls({
    ...brandingImages,
    ogImage: metadata.ogImage || metadata['og:image'] || metadata['twitter:image'],
  }, url)).slice(0, 24);
  const imageUrlSet = new Set(allImageUrls);
  const favicon = firstPublicAssetUrl([brandingImages.favicon, metadata.icon, metadata.favicon], url);
  const ogImage = firstPublicAssetUrl([brandingImages.ogImage, metadata.ogImage, metadata['og:image'], metadata['twitter:image']], url);
  [logoUrl, favicon, ogImage].filter(Boolean).forEach((image) => imageUrlSet.add(image));
  const reviews = extractReviewSnippets(markdown);

  return {
    images: {
      logo: logoUrl || undefined,
      favicon: favicon || undefined,
      ogImage: ogImage || undefined,
      heroImages: allImageUrls.filter((image) => image !== logoUrl && image !== favicon).slice(0, 8),
      allImages: Array.from(imageUrlSet).slice(0, 24),
    },
    colors: {
      ...normalizeStringRecord(branding.colors, 16, 24),
      ...Object.fromEntries(colors.map((color, index) => [`detected${index + 1}`, color])),
    },
    fonts: extractFonts(branding.fonts),
    componentStyles: (clipJsonValue(branding.components || {}, 0) || {}) as Record<string, unknown>,
    personality: clipJsonValue(branding.personality),
    designSystem: clipJsonValue(branding.designSystem),
    metadata: normalizeStringRecord(metadata, 40, 360),
    socialLinks: extractSocialLinks(links, url),
    reviews,
    pages: [{
      url,
      title: cleanTextField(metadata.title || metadata.ogTitle || '', 160),
      description: cleanTextField(metadata.description || metadata.ogDescription || '', 260),
      colors,
      logoUrl: logoUrl || undefined,
      markdownPreview: markdown.slice(0, 2400),
    }],
    rawBranding: (clipJsonValue(branding, 0) || {}) as Record<string, unknown>,
  };
};

const mergeBrandAssets = (pages: ScrapedPage[]): BrandAssets => {
  const mergedColors: Record<string, string> = {};
  const fonts: BrandFontSignal[] = [];
  const socialLinks = new Set<string>();
  const reviews: string[] = [];
  const allImages = new Set<string>();
  let logo = '';
  let favicon = '';
  let ogImage = '';
  const firstAssets = pages[0]?.brandAssets;

  pages.forEach((page) => {
    const assets = page.brandAssets;
    Object.entries(assets.colors || {}).forEach(([key, value]) => {
      if (HEX_COLOR_PATTERN.test(value) && Object.values(mergedColors).indexOf(value) === -1) {
        mergedColors[key] = value;
      }
    });
    assets.fonts.forEach((font) => {
      if (!fonts.some((candidate) => candidate.family.toLowerCase() === font.family.toLowerCase() && candidate.role === font.role)) {
        fonts.push(font);
      }
    });
    assets.socialLinks.forEach((link) => socialLinks.add(link));
    (assets.reviews || []).forEach((review) => {
      if (!reviews.some((candidate) => candidate.toLowerCase() === review.toLowerCase())) reviews.push(review);
    });
    assets.images.allImages.forEach((image) => allImages.add(image));
    logo ||= assets.images.logo || '';
    favicon ||= assets.images.favicon || '';
    ogImage ||= assets.images.ogImage || '';
  });

  return {
    images: {
      logo: logo || undefined,
      favicon: favicon || undefined,
      ogImage: ogImage || undefined,
      heroImages: Array.from(allImages).filter((image) => image !== logo && image !== favicon).slice(0, 10),
      allImages: Array.from(allImages).slice(0, 28),
    },
    colors: mergedColors,
    fonts: fonts.slice(0, 12),
    componentStyles: firstAssets?.componentStyles || {},
    personality: firstAssets?.personality,
    designSystem: firstAssets?.designSystem,
    metadata: firstAssets?.metadata || {},
    socialLinks: Array.from(socialLinks).slice(0, 20),
    reviews: reviews.slice(0, 8),
    pages: pages.map((page) => page.brandAssets.pages[0]).filter(Boolean),
    externalResearch: firstAssets?.externalResearch,
    rawBranding: firstAssets?.rawBranding,
  };
};

const normalizeExternalResearch = (value: unknown, baseUrl: string): BrandAssets['externalResearch'] | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  const sources = (Array.isArray(input.sources) ? input.sources : [])
    .slice(0, 16)
    .map((source): BrandAssets['externalResearch']['sources'][number] | null => {
      if (!source || typeof source !== 'object') return null;
      const record = source as Record<string, unknown>;
      const url = normalizePublicAssetUrl(record.url, baseUrl);
      const title = cleanTextField(record.title, 180);
      const content = cleanTextField(record.content, 500);
      if (!url || (!title && !content)) return null;
      const score = Number(record.score);
      return {
        title: title || new URL(url).hostname,
        url,
        content,
        score: Number.isFinite(score) ? Math.round(score * 1000) / 1000 : undefined,
      };
    })
    .filter((source): source is BrandAssets['externalResearch']['sources'][number] => Boolean(source));
  if (sources.length === 0) return undefined;

  return {
    provider: 'tavily',
    queries: normalizeStringArray(input.queries, 6, 180),
    answers: normalizeStringArray(input.answers, 6, 900),
    sources,
    socialLinks: normalizeStringArray(input.socialLinks, 20, 500)
      .map((link) => normalizePublicAssetUrl(link, baseUrl))
      .filter(Boolean),
    raw: clipJsonValue(input.raw),
  };
};

const researchBrandEverywhere = async (websiteUrl: URL, pages: ScrapedPage[]): Promise<BrandAssets['externalResearch'] | undefined> => {
  if (process.env.ENABLE_TAVILY_RESEARCH !== 'true') return undefined;
  const key = process.env.TAVILY_API_KEY;
  if (!key) return undefined;

  const page = pages[0];
  const domain = websiteUrl.hostname.replace(/^www\./, '');
  const brandName = (page?.title || domain)
    .replace(/\s*[|–-].*$/, '')
    .replace(/\bofficial\b/ig, '')
    .replace(/\bonline store\b/ig, '')
    .trim() || domain;
  const queries = [
    `"${brandName}" "${domain}" official products category proof points`,
    `"${brandName}" official social profiles Instagram TikTok LinkedIn YouTube ${domain}`,
  ];
  const responses: any[] = [];

  for (const query of queries) {
    try {
      const response = await fetchWithTimeout(TAVILY_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: key,
          query,
          search_depth: 'basic',
          include_answer: true,
          include_raw_content: false,
          max_results: 6,
        }),
      }, TAVILY_TIMEOUT_MS);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Tavily search failed (${response.status}): ${body.slice(0, 180)}`);
      }
      responses.push(await response.json());
    } catch (error) {
      console.warn('[brand-research] tavily_failed', query, error instanceof Error ? error.message : error);
    }
  }

  const sourceMap = new Map<string, BrandAssets['externalResearch']['sources'][number]>();
  const answers: string[] = [];
  responses.forEach((payload) => {
    const answer = cleanTextField(payload?.answer, 900);
    if (answer) answers.push(answer);
    (Array.isArray(payload?.results) ? payload.results : []).forEach((result: any) => {
      const url = normalizePublicAssetUrl(result?.url, websiteUrl.href);
      if (!url || sourceMap.has(url)) return;
      sourceMap.set(url, {
        title: cleanTextField(result?.title, 180) || new URL(url).hostname,
        url,
        content: cleanTextField(result?.content, 500),
        score: Number.isFinite(Number(result?.score)) ? Math.round(Number(result.score) * 1000) / 1000 : undefined,
      });
    });
  });

  const sources = Array.from(sourceMap.values()).slice(0, 16);
  if (sources.length === 0 && answers.length === 0) return undefined;
  const socialLinks = extractSocialLinks(sources.map((source) => source.url), websiteUrl.href);
  return {
    provider: 'tavily',
    queries,
    answers: answers.filter((answer, index, list) => list.indexOf(answer) === index).slice(0, 4),
    sources,
    socialLinks,
    raw: clipJsonValue(responses, 0),
  };
};

const firecrawlScrape = async (url: string, includeLinks: boolean): Promise<ScrapedPage> => {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('FIRECRAWL_API_KEY is not set.');

  const response = await fetchWithTimeout(FIRECRAWL_SCRAPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: includeLinks ? ['markdown', 'links', 'branding'] : ['markdown', 'branding'],
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
      timeout: FIRECRAWL_TIMEOUT_MS,
      maxAge: BRAND_RESEARCH_CACHE_TTL_MS,
    }),
  }, FIRECRAWL_TIMEOUT_MS + 3000);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firecrawl scrape failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const payload: any = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('Firecrawl returned an empty scrape.');
  }

  const data = payload.data;
  const metadata = data.metadata || {};
  const brandingColors = data.branding?.colors || {};
  const brandingImages = data.branding?.images || {};
  const colors = Object.values(brandingColors).filter((color): color is string => (
    typeof color === 'string' && HEX_COLOR_PATTERN.test(color)
  ));
  const logoUrl = firstPublicAssetUrl([
    brandingImages.logo,
    metadata.logo,
  ].filter((asset) => !isLikelyFaviconAsset(asset)), url);
  const markdown = String(data.markdown || '').slice(0, 18000);
  const links = Array.isArray(data.links) ? data.links.map(String) : [];
  const brandAssets = buildPageBrandAssets({
    url,
    data,
    colors,
    logoUrl,
    markdown,
    links,
  });

  return {
    url: String(metadata.sourceURL || metadata.url || url),
    title: String(metadata.title || ''),
    description: String(metadata.description || ''),
    markdown,
    links,
    colors,
    logoUrl: logoUrl || undefined,
    brandAssets,
  };
};

const decodeHtmlEntities = (value: string) => value
  .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(parseInt(code, 10)))
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>');

const extractHtmlMeta = (html: string, key: string) => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escapedKey}["'][^>]*>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return '';
};

const fallbackHtmlScrape = async (url: string): Promise<ScrapedPage> => {
  const response = await fetchWithTimeout(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; WigglyBrandResearch/1.0)',
      accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  }, FIRECRAWL_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`Fallback HTML scrape failed (${response.status}).`);
  }

  const finalUrl = response.url || url;
  const html = await response.text();
  const title = decodeHtmlEntities(html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/\s+/g, ' ').trim() || '');
  const description = extractHtmlMeta(html, 'description') || extractHtmlMeta(html, 'og:description');
  const metadata = {
    title,
    description,
    ogTitle: extractHtmlMeta(html, 'og:title'),
    ogDescription: extractHtmlMeta(html, 'og:description'),
    ogImage: extractHtmlMeta(html, 'og:image') || extractHtmlMeta(html, 'twitter:image'),
    icon: html.match(/<link[^>]+rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || '',
  };
  const links = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1]).slice(0, 120);
  const brandAssets = buildPageBrandAssets({
    url: finalUrl,
    data: { metadata, branding: { images: { favicon: metadata.icon, ogImage: metadata.ogImage } } },
    colors: [],
    logoUrl: '',
    markdown: [
      title,
      description,
      metadata.ogTitle,
      metadata.ogDescription,
    ].filter(Boolean).join('\n'),
    links,
  });

  return {
    url: finalUrl,
    title,
    description,
    markdown: brandAssets.pages[0]?.markdownPreview || `${title}\n${description}`,
    links,
    colors: [],
    logoUrl: undefined,
    brandAssets,
  };
};

const buildResearchText = (pages: ScrapedPage[]) => pages
  .map((page, index) => [
    `PAGE ${index + 1}: ${page.title || page.url}`,
    `URL: ${page.url}`,
    page.description ? `Description: ${page.description}` : '',
    page.logoUrl ? `Logo found: ${page.logoUrl}` : '',
    page.colors.length ? `Brand colors found: ${page.colors.slice(0, 5).join(', ')}` : '',
    page.markdown,
  ].filter(Boolean).join('\n'))
  .join('\n\n---\n\n')
  .slice(0, MAX_RESEARCH_CHARS);

const appendExternalResearchText = (researchText: string, externalResearch: BrandAssets['externalResearch']) => {
  if (!externalResearch) return researchText;
  const outsideText = [
    'OUTSIDE WEB RESEARCH:',
    externalResearch.answers.length ? `Summaries:\n${externalResearch.answers.map((answer) => `- ${answer}`).join('\n')}` : '',
    externalResearch.socialLinks.length ? `Social links found:\n${externalResearch.socialLinks.map((link) => `- ${link}`).join('\n')}` : '',
    externalResearch.sources.length ? `Sources:\n${externalResearch.sources.map((source) => [
      `- ${source.title}`,
      `  URL: ${source.url}`,
      source.content ? `  Snippet: ${source.content}` : '',
    ].filter(Boolean).join('\n')).join('\n')}` : '',
  ].filter(Boolean).join('\n');
  return `${researchText}\n\n---\n\n${outsideText}`.slice(0, MAX_RESEARCH_CHARS);
};

const scrapeBrandResearchPage = async (url: string, includeLinks: boolean) => {
  try {
    return await firecrawlScrape(url, includeLinks);
  } catch (error) {
    console.warn('[brand-research] firecrawl_failed_using_html_fallback', url, error instanceof Error ? error.message : error);
    return fallbackHtmlScrape(url);
  }
};

const getAlternateResearchUrls = (websiteUrl: URL) => {
  const hostname = websiteUrl.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname === 'x.com' || hostname === 'twitter.com') {
    return ['https://about.x.com/en'];
  }
  return [];
};

export const researchBrandWebsite = async (websiteUrl: URL) => {
  const cacheKey = websiteUrl.href;
  const cached = getBrandResearchCache(cacheKey);
  if (cached) return cached;

  const homepage = await scrapeBrandResearchPage(websiteUrl.href, true);
  const discoveredLinks = homepage.links
    .map((link) => sameOriginUrl(link, websiteUrl))
    .filter((link): link is string => Boolean(link))
    .filter((link, index, links) => links.indexOf(link) === index)
    .filter((link) => link !== websiteUrl.href)
    .slice(0, MAX_RESEARCH_PAGES - 1);

  const extraPages: ScrapedPage[] = [];
  for (const link of discoveredLinks) {
    try {
      extraPages.push(await firecrawlScrape(link, false));
    } catch (error) {
      console.warn('[brand-research] skipped_page', link, error instanceof Error ? error.message : error);
    }
  }

  let pages = [homepage, ...extraPages].slice(0, MAX_RESEARCH_PAGES);
  let brandAssets = mergeBrandAssets(pages);

  if (!hasReadableWebsiteResearch({ pages, brandAssets })) {
    for (const alternateUrl of getAlternateResearchUrls(websiteUrl)) {
      try {
        const alternatePage = await scrapeBrandResearchPage(alternateUrl, false);
        const alternatePages = [alternatePage, homepage];
        const alternateBrandAssets = mergeBrandAssets(alternatePages);
        if (hasReadableWebsiteResearch({ pages: alternatePages, brandAssets: alternateBrandAssets })) {
          console.info('[brand-research] using_alternate_research_page', websiteUrl.href, alternateUrl);
          pages = alternatePages;
          brandAssets = alternateBrandAssets;
          break;
        }
      } catch (error) {
        console.warn('[brand-research] alternate_page_failed', alternateUrl, error instanceof Error ? error.message : error);
      }
    }
  }

  const externalResearch = await researchBrandEverywhere(websiteUrl, pages);
  if (externalResearch) {
    brandAssets.externalResearch = externalResearch;
    externalResearch.socialLinks.forEach((link) => {
      if (!brandAssets.socialLinks.includes(link)) brandAssets.socialLinks.push(link);
    });
    brandAssets.socialLinks = brandAssets.socialLinks.slice(0, 20);
  }
  const entry = {
    expiresAt: Date.now() + BRAND_RESEARCH_CACHE_TTL_MS,
    pages,
    researchText: appendExternalResearchText(buildResearchText(pages), externalResearch),
    logoUrl: brandAssets.images.logo || pages.find((page) => page.logoUrl)?.logoUrl,
    brandAssets,
  };
  addBrandResearchCache(cacheKey, entry);
  return entry;
};

const normalizeHexColors = (value: unknown) => {
  const colors = Array.isArray(value) ? value : [];
  return colors
    .map((color) => String(color || '').trim())
    .map((color) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color.toUpperCase();
      if (/^[0-9A-Fa-f]{6}$/.test(color)) return `#${color.toUpperCase()}`;
      const short = color.match(/^#?([0-9A-Fa-f]{3})$/);
      if (short) return `#${short[1].split('').map((char) => `${char}${char}`).join('').toUpperCase()}`;
      return '';
    })
    .filter((color) => HEX_COLOR_PATTERN.test(color))
    .filter((color, index, colors) => colors.indexOf(color) === index)
    .slice(0, 5);
};

export const normalizeStringArray = (value: unknown, maxItems: number, maxLength: number) => (
  Array.isArray(value) ? value : []
)
  .map((item) => cleanTextField(item, maxLength))
  .filter(Boolean)
  .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
  .slice(0, maxItems);

const EMPTY_BRAND_RECEIPTS: BrandReceipts = {
  specificClaims: [],
  buyerMoments: [],
  exactSiteLanguage: [],
  namedProof: [],
};

export const normalizeBrandReceipts = (value: unknown): BrandReceipts => {
  const input = value && typeof value === 'object' ? value as Partial<BrandReceipts> : {};
  return {
    specificClaims: normalizeStringArray(input.specificClaims, 8, 260),
    buyerMoments: normalizeStringArray(input.buyerMoments, 8, 260),
    exactSiteLanguage: normalizeStringArray(input.exactSiteLanguage, 8, 220),
    namedProof: normalizeStringArray(input.namedProof, 8, 260),
  };
};

const cleanReceiptLine = (value: unknown, maxLength = 260) => cleanTextField(value, maxLength)
  .replace(/^#{1,6}\s*/, '')
  .replace(/^\s*[-*•]\s*/, '')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/__([^_]+)__/g, '$1')
  .replace(/\*/g, '')
  .replace(/\\+/g, ' ')
  .replace(/\b(New)([A-Z])/g, '$1 $2')
  .replace(/([a-z])(\$)/gi, '$1 $2')
  .replace(/(:)(\$)/g, '$1 $2')
  .replace(/([a-z])(\d+\s*(?:days?|weeks?|months?|years?))/gi, '$1 $2')
  .replace(/\b(days?|weeks?|months?|years?|hours?|hrs?)(see|book|learn|read)\b/gi, '$1 $2')
  .replace(/\s+/g, ' ')
  .trim();

const pushReceipt = (items: string[], value: unknown, maxLength = 260) => {
  const cleaned = cleanReceiptLine(value, maxLength);
  if (!cleaned || cleaned.length < 8) return;
  if (/^(https?:\/\/|www\.|#|\|+$)/i.test(cleaned)) return;
  if (items.some((item) => item.toLowerCase() === cleaned.toLowerCase())) return;
  items.push(cleaned);
};

const extractMarkdownReceiptLines = (markdown = '') => markdown
  .split(/\n+/)
  .map((line) => cleanReceiptLine(line, 260))
  .filter((line) => line.length >= 8 && line.length <= 220);

const claimSignalPattern = /(\$[\d,.]+|\b\d[\d,.]*(?:\.\d+)?\s*(?:%|percent|days?|weeks?|months?|years?|hours?|hrs?|calls?|appointments?|patients?|leads?|sales|wins?|rankings?|mentions?|citations?|revenue|brands?|accounts?|followers?)\b|[<>]\s*\d)/i;
const buyerMomentPattern = /\b(tired of|stuck|struggle|miss|missing|losing|waste|waiting|before|after|when|while|because|need to|trying to|want to|can't|cannot|no longer|instead of|teams|owners|buyers|customers|patients|brands|agencies)\b/i;
const namedProofPattern = /\b(testimonial|review|case study|customer|client|brand|founder|ceo|owner|manager|director|said|says|generated|ranked|revenue|result)\b/i;

export const buildBrandReceipts = (brandBrain: BrandBrain): BrandReceipts => {
  const specificClaims: string[] = [];
  const buyerMoments: string[] = [];
  const exactSiteLanguage: string[] = [];
  const namedProof: string[] = [];
  const assets = brandBrain.brandAssets;
  const metadata = assets?.metadata || {};
  const pages = assets?.pages || [];
  const markdownLines = pages.flatMap((page) => extractMarkdownReceiptLines(page.markdownPreview || ''));
  const titleLines = [
    metadata.title,
    metadata.ogTitle,
    metadata.description,
    metadata.ogDescription,
    ...pages.flatMap((page) => [page.title, page.description]),
  ];
  const evidenceLines = [
    ...titleLines,
    ...markdownLines,
    ...brandBrain.proof,
    ...(assets?.reviews || []),
  ].filter(Boolean);

  for (const line of titleLines) {
    pushReceipt(exactSiteLanguage, line, 220);
    if (exactSiteLanguage.length >= 8) break;
  }

  for (const line of markdownLines) {
    const looksLikeHeading = line.length <= 120 && !/[.!?]\s+\w/.test(line);
    if (looksLikeHeading) pushReceipt(exactSiteLanguage, line, 220);
    if (exactSiteLanguage.length >= 8) break;
  }

  for (const line of evidenceLines) {
    if (claimSignalPattern.test(String(line))) pushReceipt(specificClaims, line);
    if (specificClaims.length >= 8) break;
  }

  for (const line of evidenceLines) {
    if (buyerMomentPattern.test(String(line))) pushReceipt(buyerMoments, line);
    if (buyerMoments.length >= 8) break;
  }

  for (const line of [...(assets?.reviews || []), ...brandBrain.proof, ...markdownLines]) {
    const text = String(line);
    if ((namedProofPattern.test(text) && claimSignalPattern.test(text)) || /^["“].+["”]\s*[-,]/.test(text)) {
      pushReceipt(namedProof, line);
    }
    if (namedProof.length >= 8) break;
  }

  return normalizeBrandReceipts({
    specificClaims,
    buyerMoments,
    exactSiteLanguage,
    namedProof,
  });
};

const normalizeBrandAssets = (value: unknown, websiteUrl: string): BrandAssets | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Partial<BrandAssets>;
  const imageInput = input.images || { heroImages: [], allImages: [] };
  const colorInput = input.colors || {};
  const normalizedLogo = normalizeImageAssetUrl(imageInput.logo, websiteUrl);
  const normalizedColors = Object.fromEntries(
    Object.entries(colorInput)
      .map(([key, color]) => [cleanTextField(key, 60), String(color || '').trim().toUpperCase()])
      .filter(([key, color]) => key && HEX_COLOR_PATTERN.test(color))
      .slice(0, 20)
  );

  return {
    images: {
      logo: normalizedLogo && !isLikelyFaviconAsset(normalizedLogo) ? normalizedLogo : undefined,
      favicon: normalizeImageAssetUrl(imageInput.favicon, websiteUrl) || undefined,
      ogImage: normalizeImageAssetUrl(imageInput.ogImage, websiteUrl) || undefined,
      heroImages: normalizeStringArray(imageInput.heroImages, 12, 500)
        .map((image) => normalizeImageAssetUrl(image, websiteUrl))
        .filter(Boolean),
      allImages: normalizeStringArray(imageInput.allImages, 28, 500)
        .map((image) => normalizeImageAssetUrl(image, websiteUrl))
        .filter(Boolean),
    },
    colors: normalizedColors,
    fonts: extractFonts(input.fonts),
    componentStyles: (clipJsonValue(input.componentStyles || {}, 0) || {}) as Record<string, unknown>,
    personality: clipJsonValue(input.personality),
    designSystem: clipJsonValue(input.designSystem),
    metadata: normalizeStringRecord(input.metadata, 40, 360),
    socialLinks: normalizeStringArray(input.socialLinks, 20, 500)
      .map((link) => normalizePublicAssetUrl(link, websiteUrl))
      .filter(Boolean),
    reviews: normalizeStringArray(input.reviews, 8, 220).filter(isUsableReviewSnippet),
    pages: (Array.isArray(input.pages) ? input.pages : [])
      .slice(0, 8)
      .map((page) => ({
        url: normalizePublicAssetUrl((page as any)?.url, websiteUrl) || websiteUrl,
        title: cleanTextField((page as any)?.title, 160),
        description: cleanTextField((page as any)?.description, 260),
        colors: normalizeHexColors((page as any)?.colors),
        logoUrl: normalizeImageAssetUrl((page as any)?.logoUrl, websiteUrl) || undefined,
        markdownPreview: cleanTextField((page as any)?.markdownPreview, 2400),
      })),
    externalResearch: normalizeExternalResearch(input.externalResearch, websiteUrl),
    rawBranding: (clipJsonValue(input.rawBranding || {}, 0) || {}) as Record<string, unknown>,
  };
};

export const normalizeBrandBrain = (payload: any, websiteUrl: string, fallbackLogoUrl = ''): BrandBrain => {
  const brandAssets = normalizeBrandAssets(payload?.brandAssets, websiteUrl);
  const proof = [
    ...normalizeStringArray(payload?.proof, 8, 140),
    ...(brandAssets?.reviews || []),
  ]
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 8);

  const normalizedBrain: BrandBrain = {
    businessName: cleanTextField(payload?.businessName, 60) || new URL(websiteUrl).hostname.replace(/^www\./, ''),
    websiteUrl,
    brandLogoUrl: (() => {
      const logo = normalizeImageAssetUrl(payload?.brandLogoUrl || fallbackLogoUrl, websiteUrl);
      return logo && !isLikelyFaviconAsset(logo) ? logo : undefined;
    })(),
    brandAssets,
    offer: cleanTextField(payload?.offer, 180),
    audience: cleanTextField(payload?.audience, 180),
    pain: cleanTextField(payload?.pain, 220),
    promisedResult: cleanTextField(payload?.promisedResult, 180),
    differentiator: cleanTextField(payload?.differentiator, 220),
    tone: cleanTextField(payload?.tone, 80) || 'clear, confident, direct',
    colors: normalizeHexColors(payload?.colors).length ? normalizeHexColors(payload?.colors) : ['#00D6B8', '#4F46E5', '#0F172A'],
    proof,
    receipts: normalizeBrandReceipts(payload?.receipts),
    bannedGenericPhrases: normalizeStringArray(payload?.bannedGenericPhrases, 12, 80).length
      ? normalizeStringArray(payload?.bannedGenericPhrases, 12, 80)
      : ['transform your business', 'game changer', 'take it to the next level'],
    adAngles: normalizeStringArray(payload?.adAngles, 8, 180),
  };
  const hasReceipts = Object.values(normalizedBrain.receipts || EMPTY_BRAND_RECEIPTS).some((items) => items.length > 0);
  return hasReceipts ? normalizedBrain : { ...normalizedBrain, receipts: buildBrandReceipts(normalizedBrain) };
};

export const brandBrainNeedsFallback = (brandBrain: BrandBrain) => {
  const required = [brandBrain.offer, brandBrain.audience, brandBrain.pain];
  return required.some((field) => field.length < 12) || brandBrain.adAngles.length < 4;
};

const titleCaseBrandName = (value: string) => value
  .split(/[\s.-]+/)
  .filter(Boolean)
  .map((part) => part.length <= 3 ? part.toUpperCase() : `${part[0]?.toUpperCase() || ''}${part.slice(1).toLowerCase()}`)
  .join(' ');

export const buildHeuristicBrandBrain = ({
  websiteUrl,
  researchText,
  brandAssets,
  brandLogoUrl,
}: {
  websiteUrl: URL;
  researchText: string;
  brandAssets?: BrandAssets;
  brandLogoUrl?: string;
}): BrandBrain => {
  const domain = websiteUrl.hostname.replace(/^www\./, '');
  const domainBrand = titleCaseBrandName(domain.split('.')[0] || 'Brand');
  const metadata = brandAssets?.metadata || {};
  const page = brandAssets?.pages?.[0];
  const title = cleanTextField(page?.title || metadata.title || metadata.ogTitle || domain, 100)
    .replace(/\s*[|–-]\s*(Official|Homepage|Online Store).*$/i, '')
    .replace(/\s*[|–-]\s*.*$/i, '')
    .trim();
  const businessName = title.toLowerCase().includes(domainBrand.toLowerCase()) ? domainBrand : (title || domainBrand);
  const rawDescription = cleanTextField(
    page?.description || metadata.description || metadata.ogDescription || researchText,
    220
  );
  const description = /^(page\s+\d+:|url:|https?:\/\/)/i.test(rawDescription) ? '' : rawDescription;
  const category = description || `${businessName} products and services`;
  const colors = normalizeHexColors(Object.values(brandAssets?.colors || {}));
  const lowerText = `${businessName} ${category} ${researchText}`.toLowerCase();
  const categorySignals = [
    {
      pattern: /\b(public conversation|free and safe place to talk|global town square|social networking|microblogging|breaking news|live events|real-time|real time|creators|news-driven|public conversation)\b/,
      label: 'real-time public conversation platform',
      audience: 'creators, journalists, brands, and people who want live conversations before they hit traditional news',
      pain: 'They miss fast-moving conversations when filtered feeds and traditional media lag behind what people are saying now',
      result: 'Follow live public conversation, build an audience, and react while culture is still moving',
      differentiator: `${businessName} is where public conversation moves in real time across news, creators, communities, and brands`,
      angles: [
        `news before it becomes news`,
        `public conversation while it is still moving`,
        `the feed where culture breaks first`,
        `real-time reactions from the people involved`,
        `where creators and journalists watch the room`,
        `a direct line to live public conversation`,
        `the place brands track what people actually say`,
        `conversation before the recap`,
      ],
    },
    {
      pattern: /\b(ai visibility|chatgpt|reddit campaign|reddit campaigns|reddit marketing|answer engine|generative engine|geo\b|aeo\b|seo|rank|ranking|rankings|front-page|front page|brand mentions|citations|d2c visibility|growth agencies|marketing agency|intent-driven traffic)\b/,
      label: 'AI visibility and Reddit ranking campaigns',
      audience: 'D2C brands, growth agencies, and B2B teams trying to show up where buyers search',
      pain: 'They are paying for attention while buyers increasingly trust Reddit, Google, and ChatGPT answers',
      result: 'Show up in Reddit threads, Google results, and ChatGPT recommendations buyers already trust',
      differentiator: `${businessName} ties Reddit campaigns, AI visibility, ranking proof, and revenue attribution into one managed system`,
      angles: [
        `show up where buyers ask AI`,
        `Reddit threads that become ChatGPT answers`,
        `front-page proof instead of marketing guesses`,
        `AI visibility with revenue receipts`,
        `turn buyer questions into ranked answers`,
        `the ranking system behind ${businessName}`,
        `from invisible brand to recommended answer`,
        `proof buyers can find before they click`,
      ],
    },
    {
      pattern: /\b(medspa|medical spa|skin|laser|aesthetic|rejuvenation|botox|facial|acne)\b/,
      label: 'medspa services',
      audience: 'people considering premium skin and laser treatments',
      pain: 'They want visible skin results but do not know which treatment to trust',
      result: 'Feel confident choosing a treatment for smoother, healthier-looking skin',
      differentiator: `${businessName} makes advanced skin and laser care feel premium and guided`,
      angles: [
        `a clearer plan for better skin`,
        `premium care without the guessing`,
        `skin treatments that feel easier to trust`,
        `the consultation that makes options clear`,
        `visible skin goals with a guided path`,
        `why people choose ${businessName}`,
        `confidence before booking treatment`,
        `advanced care that feels personal`,
      ],
    },
    {
      pattern: /\b(dental|dentist|orthodont|implant|veneers|teeth)\b/,
      label: 'dental care',
      audience: 'people comparing dental providers',
      pain: 'They want dental care that feels trustworthy before they book',
      result: 'Book with more confidence and understand the next step faster',
      differentiator: `${businessName} turns dental care into a clearer, easier decision`,
      angles: [
        `the easier way to choose a dentist`,
        `confidence before the appointment`,
        `dental care that feels less confusing`,
        `the next step made clear`,
        `why patients trust ${businessName}`,
        `a better first impression for care`,
        `from dental worry to booked visit`,
        `proof before they call`,
      ],
    },
    {
      pattern: /\b(fitness|gym|workout|activewear|training gear|athletic apparel|sporting goods|sportswear|shoe|shoes|sneaker|sneakers|running|basketball)\b/,
      label: 'performance footwear and athletic apparel',
      audience: 'athletes and everyday movers choosing training gear',
      pain: 'They want gear that looks good and keeps up with how they move',
      result: 'Train, run, and show up with gear built for performance',
      differentiator: `${businessName} connects performance, style, and athlete-tested trust`,
      angles: [
        `${businessName} gear built for how they move`,
        `the performance promise behind ${businessName}`,
        `${businessName} style that works past the gym`,
        `training gear that feels ready on day one`,
        `the product detail that makes movement easier`,
        `from browsing gear to feeling ready`,
        `${businessName} products that make the next workout easier`,
        `athletic gear that looks as ready as it feels`,
      ],
    },
  ];
  const matchedSignal = categorySignals.find((signal) => signal.pattern.test(lowerText));
  const offer = matchedSignal
    ? `${businessName} offers ${matchedSignal.label} for ${matchedSignal.audience}.`
    : category || `Products from ${businessName}`;
  const audience = matchedSignal?.audience || `People considering ${businessName} or similar options`;
  const pain = matchedSignal?.pain || `People need a concrete reason to choose ${businessName} over another option`;
  const promisedResult = matchedSignal?.result || `Find the right ${businessName} option faster and feel confident trying it`;
  const differentiator = matchedSignal?.differentiator || `${businessName} already has brand recognition, product signals, and trust buyers recognize`;
  const reviewProof = (brandAssets?.reviews || []).filter(isUsableReviewSnippet).slice(0, 3);

  const heuristicBrain: BrandBrain = {
    businessName,
    websiteUrl: websiteUrl.href,
    brandLogoUrl: brandLogoUrl || brandAssets?.images.logo || undefined,
    brandAssets,
    offer,
    audience,
    pain,
    promisedResult,
    differentiator,
    tone: 'clear, confident, direct',
    colors: colors.length ? colors : ['#00D6B8', '#4F46E5', '#0F172A'],
    proof: [
      ...reviewProof,
      description,
      page?.title ? `Website title: ${page.title}` : '',
      brandAssets?.images.logo ? 'Logo found on site' : '',
    ].filter(Boolean).slice(0, 4),
    receipts: EMPTY_BRAND_RECEIPTS,
    bannedGenericPhrases: [
      'transform your business',
      'take it to the next level',
      'game changer',
      'unlock your potential',
    ],
    adAngles: matchedSignal?.angles || [
      `why ${businessName} is the better choice`,
      `the result buyers wanted faster`,
      `the proof behind ${businessName}`,
      `what makes ${businessName} easier to trust`,
      `the old way buyers are tired of`,
      `the moment ${businessName} starts making sense`,
      `a clearer reason to choose ${businessName}`,
      `what buyers notice first`,
    ],
  };
  return { ...heuristicBrain, receipts: buildBrandReceipts(heuristicBrain) };
};

export const generateBrandBrain = async (websiteUrl: string, researchText: string, fallbackAnswers?: string[], fallbackLogoUrl = '') => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || isDisabled(process.env.GEMINI_ENABLED)) throw new Error('GEMINI_API_KEY is not set.');
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await withTimeout(ai.models.generateContent({
    model: BRAND_RESEARCH_MODEL,
    contents: buildBrandBrainPrompt({ websiteUrl, researchText, fallbackAnswers }),
    config: {
      responseMimeType: 'application/json',
    },
  }), BRAND_BRAIN_TIMEOUT_MS, 'Brand research');
  return normalizeBrandBrain(parseJsonResponse(response.text || '{}'), websiteUrl, fallbackLogoUrl);
};
