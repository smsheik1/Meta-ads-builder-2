import type { AdSceneReceipts } from '@/features/create/scene';
import type { ResearchProviderStatus, WebsiteResearch } from './websiteResearch';
import { assertPublicWebsiteUrl, normalizeWebsiteUrl, type LookupWebsiteHost } from './url';

type Fetcher = typeof fetch;

export type FirecrawlOptions = {
  apiKey?: string;
  fetcher?: Fetcher;
  lookup?: LookupWebsiteHost;
  skipNetworkGuard?: boolean;
  timeoutMs?: number;
};

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape';
const MAX_MARKDOWN_CHARS = 24_000;
const DEFAULT_FIRECRAWL_TIMEOUT_MS = 30_000;

type FirecrawlPayload = {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: Record<string, unknown>;
    branding?: Record<string, unknown>;
  };
};

const cleanText = (value: unknown, maxLength = 260) => String(value ?? '')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/^#{1,6}\s*/, '')
  .replace(/^\s*[-*•]\s*/, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength)
  .trim();

const unique = (items: string[], maxItems: number) => items
  .map((item) => cleanText(item))
  .filter(Boolean)
  .filter((item, index, all) => all.findIndex((candidate) => (
    candidate.toLowerCase() === item.toLowerCase()
  )) === index)
  .slice(0, maxItems);

const resolveMaybeUrl = (value: unknown, baseUrl: string) => {
  const cleaned = cleanText(value, 900);
  if (!cleaned || cleaned.startsWith('data:') || cleaned.startsWith('blob:')) return null;

  try {
    return new URL(cleaned, baseUrl).href;
  } catch {
    return null;
  }
};

const titleToBrand = (title: string, host: string) => {
  const firstChunk = cleanText(title, 80).split(/\s+[|–—-]\s+/)[0]?.trim();
  if (firstChunk && firstChunk.length >= 2 && firstChunk.length <= 48) return firstChunk;

  return host
    .replace(/^www\./, '')
    .split('.')[0]
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((part) => part.length <= 3 ? part.toUpperCase() : `${part[0]?.toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ') || 'Brand';
};

const claimPattern = /(\$[\d,.]+|\b\d[\d,.]*(?:\.\d+)?\s*(?:%|percent|days?|weeks?|months?|years?|hours?|calls?|appointments?|leads?|sales|rankings?|mentions?|citations?|revenue|customers?|homes?|listings?)\b)/i;
const momentPattern = /\b(tired of|stuck|struggle|miss|missing|losing|waste|waiting|before|after|when|while|because|need to|trying to|want to|can't|cannot|compare|choose|buyers|customers|owners|teams)\b/i;
const proofPattern = /\b(review|testimonial|customer|client|founder|owner|manager|said|says|case study|result|generated|ranked|stars?)\b/i;
const offerPattern = /\b(platform|service|software|tool|managed|campaigns?|optimization|delivery|product|products?|solution|book|buy|shop|pricing|free trial)\b/i;
const audiencePattern = /\b(for|built for|made for|helps|serves)\s+.{8,90}|\b(operators?|founders?|teams?|brands?|customers?|buyers?|sellers?|owners?|marketers?|agencies|creators|shoppers|patients|clients)\b/i;

const parseMarkdownSignals = (markdown: string) => {
  const lines = markdown
    .slice(0, MAX_MARKDOWN_CHARS)
    .split(/\n+/)
    .map((line) => cleanText(line, 260))
    .filter((line) => line.length >= 8);
  const headings = lines.filter((line) => line.length <= 120).slice(0, 16);
  const paragraphs = lines.filter((line) => line.length >= 24).slice(0, 36);

  return {
    headings,
    paragraphs,
    receipts: {
      specificClaims: unique(lines.filter((line) => claimPattern.test(line)), 8),
      buyerMoments: unique(lines.filter((line) => momentPattern.test(line)), 8),
      exactSiteLanguage: unique(headings, 8),
      namedProof: unique(lines.filter((line) => proofPattern.test(line) && claimPattern.test(line)), 8),
      reviews: unique(lines.filter((line) => proofPattern.test(line)), 8),
    } satisfies AdSceneReceipts,
    reviewCandidates: unique(lines.filter((line) => proofPattern.test(line)), 12),
    offerCandidates: unique(lines.filter((line) => offerPattern.test(line)), 12),
    audienceCandidates: unique(lines.filter((line) => audiencePattern.test(line)), 12),
  };
};

const mergeReceipts = (base: AdSceneReceipts, next: AdSceneReceipts): AdSceneReceipts => ({
  specificClaims: unique([...next.specificClaims, ...base.specificClaims], 8),
  buyerMoments: unique([...next.buyerMoments, ...base.buyerMoments], 8),
  exactSiteLanguage: unique([...next.exactSiteLanguage, ...base.exactSiteLanguage], 8),
  namedProof: unique([...next.namedProof, ...base.namedProof], 8),
  reviews: unique([...next.reviews, ...base.reviews], 8),
});

const appendStatus = (
  research: WebsiteResearch,
  status: ResearchProviderStatus,
) => ({
  ...research,
  providerStatus: [
    ...research.providerStatus.filter((item) => item.provider !== status.provider),
    status,
  ],
});

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ''));

const firecrawlIsConfigured = (apiKey?: string) => Boolean(apiKey) && !isDisabled(process.env.FIRECRAWL_ENABLED);

const isAbortError = (error: unknown) => (
  error instanceof Error && (error.name === 'AbortError' || /aborted/i.test(error.message))
);

const firecrawlRequest = async (
  url: string,
  options: FirecrawlOptions,
): Promise<FirecrawlPayload> => {
  const apiKey = options.apiKey ?? process.env.FIRECRAWL_API_KEY;
  if (!firecrawlIsConfigured(apiKey)) {
    throw new Error('Firecrawl is required for website research, but it is not configured.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_FIRECRAWL_TIMEOUT_MS);

  try {
    const response = await (options.fetcher ?? fetch)(FIRECRAWL_SCRAPE_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'branding'],
        onlyMainContent: true,
        removeBase64Images: true,
        blockAds: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Firecrawl returned ${response.status}.`);
    }

    const payload = await response.json() as FirecrawlPayload;
    const markdown = String(payload.data?.markdown || '');
    if (!payload.success || markdown.trim().length < 40) {
      throw new Error('Firecrawl returned no useful page copy.');
    }

    return payload;
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Firecrawl took too long to read that website. Try again, or use a more specific page from the same brand.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const metadataText = (
  metadata: Record<string, unknown>,
  keys: string[],
  fallback = '',
  maxLength = 260,
) => cleanText(keys.map((key) => metadata[key]).find(Boolean) || fallback, maxLength);

const brandingColors = (branding: Record<string, unknown>, metadata: Record<string, unknown>) => {
  const rawColors = [
    metadata.themeColor,
    metadata['theme-color'],
    ...(Array.isArray(branding.colors) ? branding.colors : []),
  ];
  return unique(rawColors.map((color) => String(color).toUpperCase()), 6)
    .filter((color) => /^#[0-9A-F]{6}$/.test(color));
};

const collectStringUrls = (value: unknown, baseUrl: string): string[] => {
  if (typeof value === 'string') {
    const resolved = resolveMaybeUrl(value, baseUrl);
    return resolved ? [resolved] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringUrls(item, baseUrl));
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) => collectStringUrls(item, baseUrl));
  }

  return [];
};

const imageUrlsFromFirecrawl = (
  metadata: Record<string, unknown>,
  branding: Record<string, unknown>,
  finalUrl: string,
) => unique([
  ...collectStringUrls(metadata.ogImage || metadata.image, finalUrl),
  ...collectStringUrls(metadata.images, finalUrl),
  ...collectStringUrls(branding.logo || branding.logoUrl, finalUrl),
  ...collectStringUrls(branding.images, finalUrl),
], 16).filter((url) => /\.(?:png|jpe?g|webp|gif|svg|ico)(?:\?|$)/i.test(url) || /favicon|logo|image/i.test(url));

const socialLinksFromFirecrawl = (
  metadata: Record<string, unknown>,
  branding: Record<string, unknown>,
  markdown: string,
  finalUrl: string,
) => unique([
  ...collectStringUrls(metadata.socialLinks || metadata.social || branding.socialLinks || branding.social, finalUrl),
  ...(markdown.match(/https?:\/\/(?:www\.)?(?:instagram|facebook|linkedin|twitter|x\.com|tiktok|youtube|pinterest)\.com\/[^\s)]+/gi) ?? []),
], 12);

export const fetchResearchWithFirecrawl = async (
  input: string,
  options: FirecrawlOptions = {},
): Promise<WebsiteResearch> => {
  const websiteUrl = normalizeWebsiteUrl(input);
  if (!options.skipNetworkGuard) {
    await assertPublicWebsiteUrl(websiteUrl, options.lookup);
  }

  const payload = await firecrawlRequest(websiteUrl.href, options);
  const metadata = payload.data?.metadata || {};
  const branding = payload.data?.branding || {};
  const markdown = String(payload.data?.markdown || '');
  const signals = parseMarkdownSignals(markdown);
  const finalUrl = metadataText(metadata, ['sourceURL', 'url'], websiteUrl.href, 900);
  const title = metadataText(metadata, ['ogTitle', 'title'], signals.headings[0] || websiteUrl.hostname, 120);
  const description = metadataText(
    metadata,
    ['ogDescription', 'description'],
    signals.paragraphs[0] || '',
    260,
  );
  const brandName = metadataText(
    metadata,
    ['ogSiteName', 'siteName', 'applicationName'],
    titleToBrand(title, websiteUrl.hostname),
    60,
  );
  const faviconUrl = resolveMaybeUrl(
    metadata.favicon || metadata.faviconUrl || metadata.icon,
    finalUrl,
  ) || new URL('/favicon.ico', websiteUrl.origin).href;
  const logoUrl = resolveMaybeUrl(
    branding.logo || branding.logoUrl || metadata.logo || metadata.logoUrl,
    finalUrl,
  );
  const ogImageUrl = resolveMaybeUrl(metadata.ogImage || metadata.image, finalUrl);

  const receipts = mergeReceipts({
    specificClaims: [],
    buyerMoments: [],
    exactSiteLanguage: unique([title, ...signals.headings, description], 8),
    namedProof: [],
    reviews: [],
  }, signals.receipts);

  return {
    websiteUrl: websiteUrl.href,
    finalUrl,
    host: websiteUrl.hostname,
    brandName,
    title,
    description,
    faviconUrl,
    logoUrl,
    ogImageUrl,
    colors: brandingColors(branding, metadata),
    headings: unique(signals.headings, 24),
    paragraphs: unique(signals.paragraphs, 42),
    receipts,
    providerStatus: [{
      provider: 'firecrawl',
      status: 'used',
      reason: `Firecrawl read ${signals.paragraphs.length} page snippets.`,
    }],
    rawMarkdown: markdown.slice(0, MAX_MARKDOWN_CHARS),
    metadata,
    branding,
    imageUrls: imageUrlsFromFirecrawl(metadata, branding, finalUrl),
    socialLinks: socialLinksFromFirecrawl(metadata, branding, markdown, finalUrl),
    reviewCandidates: signals.reviewCandidates,
    offerCandidates: signals.offerCandidates,
    audienceCandidates: signals.audienceCandidates,
  };
};

export const firecrawlResearchWasUsed = (research: WebsiteResearch) => (
  research.providerStatus.some((item) => item.provider === 'firecrawl' && item.status === 'used')
);

export const enrichResearchWithFirecrawl = async (
  research: WebsiteResearch,
  options: FirecrawlOptions = {},
): Promise<WebsiteResearch> => {
  const apiKey = options.apiKey ?? process.env.FIRECRAWL_API_KEY;
  if (!firecrawlIsConfigured(apiKey)) {
    return appendStatus(research, {
      provider: 'firecrawl',
      status: 'skipped',
      reason: 'Firecrawl is not configured.',
    });
  }

  try {
    const payload = await firecrawlRequest(research.websiteUrl, options);
    const markdown = String(payload.data?.markdown || '');
    const signals = parseMarkdownSignals(markdown);
    const metadata = payload.data?.metadata || {};

    return {
      ...research,
      title: cleanText(metadata.ogTitle || metadata.title || research.title, 120),
      description: cleanText(metadata.ogDescription || metadata.description || research.description, 260),
      headings: unique([...signals.headings, ...research.headings], 24),
      paragraphs: unique([...signals.paragraphs, ...research.paragraphs], 42),
      receipts: mergeReceipts(research.receipts, signals.receipts),
      rawMarkdown: markdown.slice(0, MAX_MARKDOWN_CHARS),
      metadata: { ...(research.metadata || {}), ...metadata },
      imageUrls: unique([
        ...imageUrlsFromFirecrawl(metadata, payload.data?.branding || {}, research.finalUrl),
        ...research.imageUrls,
      ], 16),
      socialLinks: unique([
        ...socialLinksFromFirecrawl(metadata, payload.data?.branding || {}, markdown, research.finalUrl),
        ...research.socialLinks,
      ], 12),
      reviewCandidates: unique([...signals.reviewCandidates, ...research.reviewCandidates], 12),
      offerCandidates: unique([...signals.offerCandidates, ...research.offerCandidates], 12),
      audienceCandidates: unique([...signals.audienceCandidates, ...research.audienceCandidates], 12),
      providerStatus: [
        ...research.providerStatus.filter((item) => item.provider !== 'firecrawl'),
        {
          provider: 'firecrawl',
          status: 'used',
          reason: `Added ${signals.paragraphs.length} Firecrawl snippets.`,
        },
      ],
    };
  } catch (error) {
    return appendStatus(research, {
      provider: 'firecrawl',
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Firecrawl enrichment failed.',
    });
  }
};
