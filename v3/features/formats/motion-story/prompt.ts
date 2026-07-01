import type { StoredWebsiteResearchResult } from "../../research/types";
import type { MotionStoryStrongProof } from "./proof";

export const MOTION_STORY_MANUAL_VARIANT_COUNT = 4;

const proofItemsForPrompt = (proofItems: MotionStoryStrongProof[]) => JSON.stringify(
  proofItems.map((item) => ({
    proofIndex: item.proofIndex,
    text: item.text,
    strengthReason: item.strengthReason,
    traits: item.traits,
    ...(item.rating ? { rating: item.rating } : {}),
    ...(item.sourceName ? { sourceName: item.sourceName } : {}),
  })),
  null,
  2,
);

export function buildMotionStoryPrompt({
  count,
  productTitle,
  proofItems,
  research,
}: {
  count: number;
  productTitle: string;
  proofItems: MotionStoryStrongProof[];
  research: StoredWebsiteResearchResult;
}) {
  const brandName = research.brandBrief.brandName || research.brand.name;
  return `You are directing premium ecommerce motion-story ads for Wiggly.
Return ONLY valid JSON.

This format is an Apple-style 20 second product story video: real product, real proof, brand colors, big readable motion graphics.
The output must feel expensive, specific, and runnable as a Meta ad.

BRAND:
- Name: ${brandName}
- Offer: ${research.brandBrief.offer}
- Audience: ${research.brandBrief.audience}
- CTA direction: ${research.brandBrief.ctaDirection}
- Site language: ${research.brandBrief.siteLanguage.join(" | ")}

PRODUCT:
- Title: ${productTitle}

REAL REVIEW PROOF ITEMS:
${proofItemsForPrompt(proofItems)}

WRITE EXACTLY ${count} VARIANTS.

COPY QUALITY CALIBRATION:
- Strong: "The gift that actually gets remembered."
- Strong: "Cookies that do not taste like a backup plan."
- Weak: "Discover delicious cookies today."
- Dead: "Experience premium quality and satisfaction."

RULES:
- Each variant must feel like a distinct ad direction, not a minor rewrite.
- Manual multi-variant output must use different hook angles and different proofIndex values.
- The hook must name a buyer desire, anxiety, gifting moment, product use case, or product-specific reason to care.
- Avoid generic ecommerce language like discover, experience, premium quality, satisfaction, shop now, great product.
- Use only proof from REAL REVIEW PROOF ITEMS. Never invent reviews, ratings, sources, customers, stats, guarantees, discounts, or awards.
- proofDisplayText must be a verbatim substring from the selected proof item, max 15 words, preserving meaning.
- Product beat should make the selected product feel like the hero, not a catalog thumbnail.
- CTA beat should be short, visual, and action-oriented. No fake urgency.
- shareCopy is a short post caption for this ad, not rendered inside the video.

FIXED BEAT CONTRACT:
- hook: 0-3000ms, motion "kinetic-reveal"
- product: 3000-8000ms, motion "image-expand"
- proof: 8000-16000ms, motion "proof-card"
- cta: 16000-20000ms, motion "cta-slam"

OUTPUT SHAPE:
{
  "variants": [
    {
      "hookAngle": "specific angle, not generic",
      "proofIndex": 0,
      "proofDisplayText": "verbatim substring max 15 words",
      "proofStrengthReason": "why this proof is strong",
      "beats": [
        { "role": "hook", "motion": "kinetic-reveal", "headline": "specific hook", "supportingText": "", "startMs": 0, "endMs": 3000 },
        { "role": "product", "motion": "image-expand", "headline": "${productTitle}", "supportingText": "short product frame", "startMs": 3000, "endMs": 8000 },
        { "role": "proof", "motion": "proof-card", "headline": "proof frame", "supportingText": "proofDisplayText or short context", "startMs": 8000, "endMs": 16000 },
        { "role": "cta", "motion": "cta-slam", "headline": "short CTA line", "supportingText": "", "startMs": 16000, "endMs": 20000 }
      ],
      "shareCopy": "short caption"
    }
  ]
}`;
}
