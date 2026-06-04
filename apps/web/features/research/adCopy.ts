import type { ResearchProviderStatus, WebsiteResearch } from './websiteResearch';

type Fetcher = typeof fetch;

export type AdCopy = {
  headline: string;
  subheadline: string;
  angleId: string;
  ctaText?: string;
};

export type AdCopyResult = {
  copy: AdCopy;
  providerStatus: ResearchProviderStatus;
};

export type GenerateAdCopyOptions = {
  apiKey?: string;
  fetcher?: Fetcher;
  model?: string;
  timeoutMs?: number;
};

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

const cleanText = (value: unknown, maxLength = 220) => String(value ?? '')
  .replace(/\s+/g, ' ')
  .replace(/\s+([,.!?])/g, '$1')
  .trim()
  .slice(0, maxLength)
  .trim();

const slugify = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 48) || 'website-angle';

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ''));

const firstUseful = (items: string[], minLength: number, maxLength: number) => (
  items.find((item) => {
    const cleaned = cleanText(item, maxLength + 20);
    return cleaned.length >= minLength && cleaned.length <= maxLength;
  }) || ''
);

const stripBrandPrefix = (value: string, brandName: string) => {
  const cleaned = cleanText(value, 88);
  return cleaned
    .replace(new RegExp(`^${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:|–—-]\\s*`, 'i'), '')
    .trim() || cleaned;
};

export const buildDeterministicAdCopy = (research: WebsiteResearch): AdCopy => {
  const receiptHeadline = firstUseful(
    [
      ...research.receipts.exactSiteLanguage.filter((line) => /\d/.test(line)),
      ...research.headings,
      research.title,
    ],
    8,
    72,
  );
  const headline = stripBrandPrefix(receiptHeadline || `${research.brandName} made clearer`, research.brandName);
  const subheadline = firstUseful(
    [
      research.description,
      ...research.receipts.specificClaims,
      ...research.paragraphs,
      ...research.receipts.buyerMoments,
    ],
    24,
    180,
  ) || `A clearer reason to choose ${research.brandName}.`;

  return {
    headline: cleanText(headline, 72),
    subheadline: cleanText(subheadline, 180),
    angleId: slugify(headline),
  };
};

const buildPrompt = (research: WebsiteResearch) => `
You write concise ad canvas copy from website evidence.

OBJECTIVE:
Turn the website research into one ready-to-test ad angle. Use receipts, not generic category claims.

BRAND:
${research.brandName}

SITE SUMMARY:
Title: ${research.title}
Description: ${research.description}

RECEIPTS:
Specific claims: ${JSON.stringify(research.receipts.specificClaims)}
Buyer moments: ${JSON.stringify(research.receipts.buyerMoments)}
Exact site language: ${JSON.stringify(research.receipts.exactSiteLanguage)}
Named proof: ${JSON.stringify(research.receipts.namedProof)}

RULES:
- Use one exact receipt from RECEIPTS.
- Do not invent numbers, reviews, customers, guarantees, awards, or timeframes.
- Do not write generic phrases like "grow your business", "unlock your potential", or "take it to the next level".
- Headline must be 8-72 characters.
- Subheadline must be 24-180 characters.
- Return only JSON: {"headline":"...","subheadline":"...","angleId":"...","ctaText":"..."}
`;

const parseJsonObject = (value: string) => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith('{')
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || '';
  if (!jsonText) throw new Error('OpenRouter returned no JSON.');
  return JSON.parse(jsonText) as Record<string, unknown>;
};

const validateCopy = (value: Record<string, unknown>, fallback: AdCopy): AdCopy => {
  const headline = cleanText(value.headline, 72);
  const subheadline = cleanText(value.subheadline, 180);
  const angleId = slugify(cleanText(value.angleId, 80) || headline);
  const ctaText = cleanText(value.ctaText, 32);

  if (headline.length < 8 || headline.length > 72) {
    throw new Error('OpenRouter headline did not fit the ad canvas.');
  }

  if (subheadline.length < 24 || subheadline.length > 180) {
    throw new Error('OpenRouter subheadline did not fit the ad canvas.');
  }

  return {
    headline,
    subheadline,
    angleId: angleId || fallback.angleId,
    ctaText: ctaText || fallback.ctaText,
  };
};

export const generateAdCopy = async (
  research: WebsiteResearch,
  options: GenerateAdCopyOptions = {},
): Promise<AdCopyResult> => {
  const fallback = buildDeterministicAdCopy(research);
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  const model = options.model ?? process.env.OPENROUTER_AD_MODEL;

  if (!apiKey || !model || isDisabled(process.env.OPENROUTER_ENABLED)) {
    return {
      copy: fallback,
      providerStatus: {
        provider: 'openrouter',
        status: 'skipped',
        reason: 'OpenRouter key or ad model is not configured; used deterministic receipt copy.',
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 14_000);

  try {
    const response = await (options.fetcher ?? fetch)(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: buildPrompt(research),
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter returned ${response.status}.`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content || '';
    const copy = validateCopy(parseJsonObject(content), fallback);

    return {
      copy,
      providerStatus: {
        provider: 'openrouter',
        status: 'used',
        reason: `Generated ad copy with ${model}.`,
      },
    };
  } catch (error) {
    return {
      copy: fallback,
      providerStatus: {
        provider: 'openrouter',
        status: 'failed',
        reason: error instanceof Error
          ? `${error.message} Used deterministic receipt copy.`
          : 'OpenRouter failed; used deterministic receipt copy.',
      },
    };
  } finally {
    clearTimeout(timeout);
  }
};
