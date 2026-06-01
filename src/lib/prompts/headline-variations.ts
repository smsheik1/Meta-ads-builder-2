import type { BrandBrain } from './brand-brain';
import { normalizeAdAngles } from './ad-angles';

export type GeneratedAdFormat = 'visualizer' | 'conversation';

export type ConversationAdLine = {
  speaker: string;
  text: string;
};

export type HeadlineVariation = {
  id: string;
  angle: string;
  headline: string;
  format?: GeneratedAdFormat;
  conversationLines?: ConversationAdLine[];
};

export const buildHeadlineVariationsPrompt = ({
  brandBrain,
  count,
}: {
  brandBrain: BrandBrain;
  count: number;
}) => `You are writing Wiggly ad headlines.

Wiggly turns an uploaded voice clip into a beautiful moving social ad. The headline sits on the ad, so it must be short, concrete, and scroll-stopping.

Brand brain:
${JSON.stringify({
  businessName: brandBrain.businessName,
  offer: brandBrain.offer,
  audience: brandBrain.audience,
  pain: brandBrain.pain,
  promisedResult: brandBrain.promisedResult,
  differentiator: brandBrain.differentiator,
  tone: brandBrain.tone,
  proof: brandBrain.proof,
}, null, 2)}

Angles to pull from:
${normalizeAdAngles(brandBrain).map((angle, index) => `${index + 1}. ${angle}`).join('\n')}

Avoid these generic phrases:
${(brandBrain.bannedGenericPhrases || []).map((phrase) => `- ${phrase}`).join('\n') || '- transform your business\n- game changer\n- take it to the next level'}

Return ONLY valid JSON:
{
  "variations": [
    { "angle": "one of the angle ideas or a specific sub-angle", "headline": "4 to 12 words" }
  ]
}

Rules:
- Write exactly ${count} headline variations.
- Spread them across the angles.
- Do not mention Wiggly.
- Do not write CTAs.
- Do not repeat headlines.
- Do not write full sentences if a punchier fragment is better.
- Make the user feel like Wiggly read their mind, not like a generic ad generator.`;
