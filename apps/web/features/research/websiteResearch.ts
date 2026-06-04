import { load } from 'cheerio';
import type { AdSceneReceipts } from '@/features/create/scene';
import { assertPublicWebsiteUrl, normalizeWebsiteUrl, type LookupWebsiteHost } from './url';

export type ResearchProviderStatus = {
  provider: 'html' | 'firecrawl' | 'openrouter';
  status: 'used' | 'skipped' | 'failed';
  reason: string;
};

export type WebsiteResearch = {
  websiteUrl: string;
  finalUrl: string;
  host: string;
  brandName: string;
  title: string;
  description: string;
  faviconUrl: string | null;
  logoUrl: string | null;
  ogImageUrl: string | null;
  colors: string[];
  headings: string[];
  paragraphs: string[];
  receipts: AdSceneReceipts;
  providerStatus: ResearchProviderStatus[];
};

type Fetcher = typeof fetch;

export type FetchWebsiteResearchOptions = {
  fetcher?: Fetcher;
  lookup?: LookupWebsiteHost;
  skipNetworkGuard?: boolean;
  timeoutMs?: number;
};

const USER_AGENT = 'WigglyCreateV2Research/1.0 (+https://wiggly.agentenamel.com)';
const MAX_HTML_CHARS = 1_200_000;

const cleanText = (value: unknown, maxLength = 260) => String(value ?? '')
  .replace(/\s+/g, ' ')
  .replace(/\u00a0/g, ' ')
  .trim()
  .slice(0, maxLength)
  .trim();

const unique = (items: string[]) => items
  .map((item) => cleanText(item))
  .filter(Boolean)
  .filter((item, index, all) => all.findIndex((candidate) => (
    candidate.toLowerCase() === item.toLowerCase()
  )) === index);

const resolveMaybeUrl = (value: string | undefined, baseUrl: string) => {
  const cleaned = cleanText(value, 900);
  if (!cleaned || cleaned.startsWith('data:') || cleaned.startsWith('blob:')) return null;

  try {
    return new URL(cleaned, baseUrl).href;
  } catch {
    return null;
  }
};

const trimTitle = (title: string, host: string) => {
  const clean = cleanText(title, 90);
  const domainName = host.replace(/^www\./, '').split('.')[0] || 'Brand';
  const firstChunk = clean.split(/\s+[|–—-]\s+/)[0]?.trim() || clean;
  if (firstChunk.length >= 2 && firstChunk.length <= 46) return firstChunk;
  return domainName
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((part) => part.length <= 3 ? part.toUpperCase() : `${part[0]?.toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');
};

const claimPattern = /(\$[\d,.]+|\b\d[\d,.]*(?:\.\d+)?\s*(?:%|percent|days?|weeks?|months?|years?|hours?|calls?|appointments?|leads?|sales|rankings?|mentions?|citations?|revenue|customers?|homes?|listings?)\b)/i;
const momentPattern = /\b(tired of|stuck|struggle|miss|missing|losing|waste|waiting|before|after|when|while|because|need to|trying to|want to|can't|cannot|compare|choose|buyers|customers|owners|teams)\b/i;
const proofPattern = /\b(review|testimonial|customer|client|founder|owner|manager|said|says|case study|result|generated|ranked|stars?)\b/i;

const pickReceiptLines = (lines: string[], pattern: RegExp, maxItems: number, maxLength = 240) => (
  unique(lines.filter((line) => pattern.test(line)).map((line) => cleanText(line, maxLength))).slice(0, maxItems)
);

const buildReceipts = ({
  title,
  description,
  headings,
  paragraphs,
}: Pick<WebsiteResearch, 'title' | 'description' | 'headings' | 'paragraphs'>): AdSceneReceipts => {
  const evidence = unique([
    title,
    description,
    ...headings,
    ...paragraphs,
  ]);

  const exactSiteLanguage = unique([
    title,
    ...headings.filter((heading) => heading.length <= 120),
    description,
  ]).slice(0, 8);

  const namedProof = pickReceiptLines(evidence, proofPattern, 8);

  return {
    specificClaims: pickReceiptLines(evidence, claimPattern, 8),
    buyerMoments: pickReceiptLines(evidence, momentPattern, 8),
    exactSiteLanguage,
    namedProof,
    reviews: namedProof,
  };
};

export const extractWebsiteResearch = ({
  websiteUrl,
  finalUrl,
  html,
}: {
  websiteUrl: URL;
  finalUrl?: string;
  html: string;
}): WebsiteResearch => {
  const resolvedFinalUrl = finalUrl || websiteUrl.href;
  const $ = load(html.slice(0, MAX_HTML_CHARS));

  $('script, style, noscript, template, svg').remove();

  const meta = (selector: string) => cleanText($(selector).attr('content'), 260);
  const title = cleanText(
    meta('meta[property="og:title"]') ||
    $('title').first().text() ||
    $('h1').first().text(),
    120,
  );
  const description = cleanText(
    meta('meta[name="description"]') ||
    meta('meta[property="og:description"]') ||
    $('p').first().text(),
    260,
  );

  const headings = unique($('h1, h2, h3').toArray().map((element) => cleanText($(element).text(), 140)))
    .filter((heading) => heading.length >= 3)
    .slice(0, 18);

  const paragraphs = unique($('main p, article p, section p, body p').toArray().map((element) => cleanText($(element).text(), 220)))
    .filter((paragraph) => paragraph.length >= 24)
    .slice(0, 30);

  const host = websiteUrl.hostname;
  const brandName = cleanText(
    meta('meta[property="og:site_name"]') ||
    $('meta[name="application-name"]').attr('content') ||
    trimTitle(title, host),
    60,
  );

  const iconHref = $('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').first().attr('href');
  const ogImageUrl = resolveMaybeUrl(meta('meta[property="og:image"]'), resolvedFinalUrl);
  const faviconUrl = resolveMaybeUrl(iconHref, resolvedFinalUrl) || new URL('/favicon.ico', websiteUrl.origin).href;
  const logoImage = $('img[src]').toArray().find((element) => {
    const signature = [
      $(element).attr('alt'),
      $(element).attr('class'),
      $(element).attr('id'),
      $(element).attr('title'),
      $(element).attr('src'),
    ].join(' ').toLowerCase();
    return /\blogo|brandmark|wordmark\b/.test(signature);
  });
  const logoUrl = resolveMaybeUrl(logoImage ? $(logoImage).attr('src') : undefined, resolvedFinalUrl);

  const colorCandidates = [
    meta('meta[name="theme-color"]'),
    ...(html.match(/#[0-9a-fA-F]{6}\b/g) ?? []),
  ];
  const colors = unique(colorCandidates.map((color) => color.toUpperCase()))
    .filter((color) => /^#[0-9A-F]{6}$/.test(color))
    .slice(0, 6);

  const receipts = buildReceipts({ title, description, headings, paragraphs });

  return {
    websiteUrl: websiteUrl.href,
    finalUrl: resolvedFinalUrl,
    host,
    brandName,
    title,
    description,
    faviconUrl,
    logoUrl,
    ogImageUrl,
    colors,
    headings,
    paragraphs,
    receipts,
    providerStatus: [{
      provider: 'html',
      status: 'used',
      reason: `Read ${headings.length} headings and ${paragraphs.length} page snippets.`,
    }],
  };
};

export const fetchWebsiteResearch = async (
  input: string,
  options: FetchWebsiteResearchOptions = {},
) => {
  const websiteUrl = normalizeWebsiteUrl(input);
  if (!options.skipNetworkGuard) {
    await assertPublicWebsiteUrl(websiteUrl, options.lookup);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);

  try {
    const response = await (options.fetcher ?? fetch)(websiteUrl.href, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': USER_AGENT,
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Website returned ${response.status}. Try a more specific public page.`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !/html|text\/plain/i.test(contentType)) {
      throw new Error('That URL did not return a readable website page.');
    }

    const html = await response.text();
    if (!html.trim()) throw new Error('That website returned an empty page.');

    return extractWebsiteResearch({
      websiteUrl,
      finalUrl: response.url || websiteUrl.href,
      html,
    });
  } finally {
    clearTimeout(timeout);
  }
};
