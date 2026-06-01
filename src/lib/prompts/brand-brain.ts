export type BrandFontSignal = {
  family: string;
  role?: string;
};

export type BrandPageSignal = {
  url: string;
  title: string;
  description: string;
  colors: string[];
  logoUrl?: string;
  markdownPreview?: string;
};

export type BrandExternalSource = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export type BrandExternalResearch = {
  provider: 'tavily';
  queries: string[];
  answers: string[];
  sources: BrandExternalSource[];
  socialLinks: string[];
  raw?: unknown;
};

export type BrandAssets = {
  images: {
    logo?: string;
    favicon?: string;
    ogImage?: string;
    heroImages: string[];
    allImages: string[];
  };
  colors: Record<string, string>;
  fonts: BrandFontSignal[];
  componentStyles: Record<string, unknown>;
  personality?: unknown;
  designSystem?: unknown;
  metadata: Record<string, string>;
  socialLinks: string[];
  pages: BrandPageSignal[];
  externalResearch?: BrandExternalResearch;
  rawBranding?: Record<string, unknown>;
};

export type BrandBrain = {
  businessName: string;
  websiteUrl: string;
  brandLogoUrl?: string;
  brandAssets?: BrandAssets;
  offer: string;
  audience: string;
  pain: string;
  promisedResult: string;
  differentiator: string;
  tone: string;
  colors: string[];
  proof: string[];
  bannedGenericPhrases: string[];
  adAngles: string[];
};

export const BRAND_FALLBACK_QUESTIONS = [
  'What do you sell?',
  'Who buys it?',
  'What painful problem do you solve?',
];

export const buildBrandBrainPrompt = ({
  websiteUrl,
  researchText,
  fallbackAnswers,
}: {
  websiteUrl: string;
  researchText: string;
  fallbackAnswers?: string[];
}) => `You are Wiggly's brand researcher.

Goal: read the company's website research and return the sharpest possible advertising brief for making social video ads from an uploaded voice clip.

Website: ${websiteUrl}

${fallbackAnswers?.length ? `Fallback answers from the user:
${fallbackAnswers.map((answer, index) => `${index + 1}. ${answer}`).join('\n')}
` : ''}

Website research:
${researchText}

Return ONLY valid JSON. No markdown. No comments.

Schema:
{
  "businessName": "string",
  "websiteUrl": "string",
  "brandLogoUrl": "logo URL from research if found, otherwise empty string",
  "offer": "plain-English thing they sell, max 24 words",
  "audience": "specific buyer, max 24 words",
  "pain": "specific pain the buyer feels, max 28 words",
  "promisedResult": "result they promise, max 24 words",
  "differentiator": "why them instead of the obvious alternative, max 28 words",
  "tone": "3-6 words describing how ads should sound",
  "colors": ["#000000"],
  "proof": ["specific proof points found or strongly implied"],
  "bannedGenericPhrases": ["generic phrases Wiggly should avoid"],
  "adAngles": ["8 specific ad angles"]
}

Rules:
- Use the website's actual language, but compress it.
- If a field is not obvious, infer carefully from nearby evidence.
- Colors must be 6-digit hex codes only.
- bannedGenericPhrases must include vague phrases like "transform your business" when they do not fit this company.
- adAngles should be concrete enough to generate headlines from, not category labels.`;

export const buildFallbackBrandBrain = ({
  websiteUrl,
  answers,
}: {
  websiteUrl: string;
  answers: string[];
}): BrandBrain => ({
  businessName: new URL(websiteUrl).hostname.replace(/^www\./, '').split('.')[0] || 'Your brand',
  websiteUrl,
  brandLogoUrl: undefined,
  brandAssets: undefined,
  offer: answers[0] || 'A service that helps customers get a better result.',
  audience: answers[1] || 'Customers who need this result soon.',
  pain: answers[2] || 'They are stuck with the old way and losing time.',
  promisedResult: 'Get the outcome faster with less manual work.',
  differentiator: 'Built around the customer problem instead of generic tools.',
  tone: 'clear, confident, direct',
  colors: ['#00D6B8', '#4F46E5', '#0F172A'],
  proof: [],
  bannedGenericPhrases: [
    'transform your business',
    'take it to the next level',
    'game changer',
    'unlock your potential',
  ],
  adAngles: [
    'the expensive problem they already have',
    'the old workaround that stopped working',
    'the result they wanted yesterday',
    'the hidden cost of waiting',
    'the simpler way to get unstuck',
    'the moment they realize the old process is broken',
    'the competitor advantage they are missing',
    'the daily frustration that should not exist',
  ],
});
