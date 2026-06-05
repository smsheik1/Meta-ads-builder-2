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
  modelLabel?: string;
  timeoutMs?: number;
};

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_AD_COPY_TIMEOUT_MS = 24_000;

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
const isAbortError = (error: unknown) => (
  error instanceof Error && (error.name === 'AbortError' || /aborted/i.test(error.message))
);

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

const listForPrompt = (items: string[], maxItems = 8) => JSON.stringify(
  items.map((item) => cleanText(item, 220)).filter(Boolean).slice(0, maxItems),
);

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
You write punchy ad canvas copy from homepage evidence.

OBJECTIVE:
Pick the best stuff from the website, then turn it into one ready-to-test ad angle.
The ad should make the user feel: "Wiggly understood this business."

BRAND:
${research.brandName}

SITE SUMMARY:
Title: ${research.title}
Description: ${research.description}

STUFF FROM THE WEBSITE:
Possible offers: ${listForPrompt(research.offerCandidates)}
Possible buyers: ${listForPrompt(research.audienceCandidates)}
Customer pains / moments: ${listForPrompt(research.receipts.buyerMoments)}
Specific proof / claims: ${listForPrompt(research.receipts.specificClaims)}
Named proof / reviews: ${listForPrompt(research.receipts.namedProof.length ? research.receipts.namedProof : research.receipts.reviews)}
Exact site phrases: ${listForPrompt(research.receipts.exactSiteLanguage)}

PICK THE BEST STUFF FIRST:
- Best promise: what is the clearest thing the customer gets?
- Best buyer: who is most likely to care?
- Best pain: what annoying moment makes them want this now?
- Best proof: what makes the promise believable?
- Best ad phrase: which exact site phrase or proof sounds most clickable?

DECIDE HEADLINE TYPE BEFORE WRITING:
Pick ONE shape:
1. PAINFUL MOMENT - a concrete annoying moment the buyer recognizes.
2. RECEIPT DROP - the strongest number, result, timeframe, review, or proof.
3. CALLOUT - directly name the buyer and the problem.
4. CONTRAST - show the old painful way versus the better way.
5. TRANSFORMATION - show the before-to-after outcome.

Then write the headline using that shape. Draw from the picked proof or pain.

STUDY THESE EXAMPLES (shape only; do not copy their facts, numbers, markets, or claims unless this website provided them):
Brand: AI dental receptionist
Bad: "Grow your dental practice with AI"
Good: "Your front desk goes home at 5. Mine answers at 11pm."

Brand: AI search visibility service
Bad: "Boost your AI visibility"
Good: "Your competitor shows up in ChatGPT. You don't."

Brand: med spa booking software
Bad: "Streamline your bookings"
Good: "37 no-shows last month. This fixed it."

Brand: home search app
Bad: "Find your dream home today"
Good: "That listing was gone before lunch."

WHAT TO WRITE:
- Headline should be punchy, concrete, and easy to read on a phone.
- Subheadline should be one sentence. Lead with the best proof, then explain the promise.
- Use one exact website receipt, but make it sound like an ad, not a website summary.
- Prefer outcomes, speed, proof, comparison, or a painful moment over generic category labels.
- If the brand is broad, pick the most specific offer shown on this page.
- CTA should be 3-5 words, start with an action verb, and name a specific next step or outcome.
- Avoid lazy CTAs like "Learn More", "Get Started", "Sign Up", or "Try Now" unless the website gives no better action.

BAD HEADLINE SHAPES:
- "Grow your business"
- "Unlock your potential"
- "Take it to the next level"
- "The future of [category]"
- "[Brand] made easier"
- A plain category label with no reason to care

BANNED WORDS:
unlock, elevate, transform, next-generation, future of, powered by AI, revolutionary, seamless, cutting-edge, supercharge, leverage, robust, solution, journey, ecosystem, empower

HARD RULES:
- Do not invent numbers, reviews, customers, guarantees, awards, or timeframes.
- Do not use the STUDY THESE EXAMPLES facts unless those facts appear in STUFF FROM THE WEBSITE.
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
  const modelLabel = options.modelLabel || model || 'Auto best available';

  if (!apiKey || !model || isDisabled(process.env.OPENROUTER_ENABLED)) {
    return {
      copy: fallback,
      providerStatus: {
        provider: 'openrouter',
        status: 'skipped',
        reason: `${modelLabel} was not configured for OpenRouter; used deterministic receipt copy.`,
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_AD_COPY_TIMEOUT_MS);

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
        reason: `Generated ad copy with ${modelLabel}.`,
      },
    };
  } catch (error) {
    const reason = isAbortError(error)
      ? 'OpenRouter took too long to write ad copy; used deterministic receipt copy.'
      : error instanceof Error
        ? `${error.message} Used deterministic receipt copy.`
        : 'OpenRouter failed; used deterministic receipt copy.';

    return {
      copy: fallback,
      providerStatus: {
        provider: 'openrouter',
        status: 'failed',
        reason,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
};
