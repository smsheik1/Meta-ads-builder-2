import type { StoredWebsiteResearchResult } from "../../research/types";

export const DEFAULT_WERE_SORRY_VARIANT_COUNT = 8;

const cleanList = (items: string[], fallback: string) => (
  items.length ? items.slice(0, 8).join("; ") : fallback
);

export function buildWereSorryPrompt(
  research: StoredWebsiteResearchResult,
  count = DEFAULT_WERE_SORRY_VARIANT_COUNT,
) {
  return `You are a senior social ad copywriter writing "We're sorry" apology-format ads.
This is the Instagram trend where a brand apologizes with a wink:
"Sorry for being so good", "Sorry we ran out of stock", "Sorry your old way looks worse now."

BRAND CONTEXT:
- Brand: ${research.brandBrief.brandName || research.brand.name}
- Offer: ${research.brandBrief.offer}
- Audience: ${research.brandBrief.audience}
- Buyer moments: ${cleanList(research.brandBrief.buyerMoments, research.brand.description)}
- Proof: ${cleanList(research.brandBrief.proof, research.brand.description)}
- Site language: ${cleanList(research.brandBrief.siteLanguage, research.brand.description)}
- CTA direction: ${research.brandBrief.ctaDirection}

TASK:
Write exactly ${count} distinct "We're sorry" ad variants for this brand.
Each variant should feel like a brand posting a funny public apology, not like polished website copy.

GOOD SHAPES:
- "Sorry your front desk has competition now."
- "Sorry the easy dessert gift sold itself."
- "Sorry your old pan has trust issues."
- "Sorry we made the no-show problem obvious."

BAD SHAPES:
- "Sorry for delivering exceptional service."
- "Sorry for revolutionizing your business."
- "We're sorry, but our premium solution is here."
- "Sorry for being #1 rated."

RULES:
- Return plain JSON only.
- Use a different buyer moment or proof for every variant.
- Each variant must include an "angle" field naming the buyer moment or proof it uses.
- No invented numbers, reviews, awards, discounts, stock-outs, guarantees, or urgency.
- Only mention a discount, coupon, stock-out, sale, or free offer if the BRAND CONTEXT explicitly says it.
- If proof is thin, build the joke on the buyer moment or pain alone. Do not fake proof.
- The apology line should be the visible hook and start with "Sorry" or "We're sorry".
- Keep the apology under 78 characters.
- Keep the makeGood line under 120 characters.
- CTA must be 2-5 words and start with an action verb.
- Name the brand only if it lands naturally.
- Avoid generic hype words: unlock, elevate, supercharge, game-changer, level up, revolutionary.

OUTPUT SHAPE:
{
  "variants": [
    {
      "angle": "buyer moment or proof this variant uses",
      "apology": "Sorry...",
      "makeGood": "short supporting line or make-good line",
      "ctaText": "action CTA",
      "selectedPain": "the buyer moment or pain used",
      "selectedProof": "the proof used, or empty string if proof is thin"
    }
  ]
}`;
}
