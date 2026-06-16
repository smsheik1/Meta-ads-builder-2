import type { StoredWebsiteResearchResult } from "../../research/types";

export const DEFAULT_WERE_SORRY_VARIANT_COUNT = 8;

const cleanList = (items: string[], fallback: string) => (
  items.length ? items.slice(0, 8).join("; ") : fallback
);

const adAnglesForPrompt = (research: StoredWebsiteResearchResult) => (
  research.adAngles?.length
    ? JSON.stringify(research.adAngles.slice(0, 8).map((angle) => ({
      buyer: angle.buyer,
      moment: angle.moment,
      pain: angle.pain,
      proof: angle.proof,
      sitePhrase: angle.sitePhrase,
    })), null, 2)
    : "[]"
);

export function buildWereSorryPrompt(
  research: StoredWebsiteResearchResult,
  count = DEFAULT_WERE_SORRY_VARIANT_COUNT,
) {
  const brandName = research.brandBrief.brandName || research.brand.name;

  return `You are a senior brand copywriter writing in the "Official Apology" meme format.

This is a FAKE corporate apology: the brand pretends to apologize, but every "apology" is secretly a brag about a real benefit. The humor comes from the gap between a straight-faced legal wrapper and a bragging payload.

THE FORMAT IS RIGID. Do not get creative with the structure. The structure is the joke.

BRAND CONTEXT:
- Brand: ${brandName}
- Offer: ${research.brandBrief.offer}
- Audience: ${research.brandBrief.audience}
- Buyer moments: ${cleanList(research.brandBrief.buyerMoments, research.brand.description)}
- Proof: ${cleanList(research.brandBrief.proof, research.brand.description)}
- Site language: ${cleanList(research.brandBrief.siteLanguage, research.brand.description)}
- CTA direction: ${research.brandBrief.ctaDirection}
- Cached ad angles: ${adAnglesForPrompt(research)}

HARD SAFETY GATE:
This format must not joke about money safety, insurance payouts, medical or patient care, physical safety, legal outcomes, data breaches, crisis situations, or vulnerable people.

For healthcare-adjacent or service brands, keep every confession strictly on the business outcome:
- okay: "your schedule filled up"
- okay: "missed calls stopped slipping"
- not okay: claims about care quality, health outcomes, patient safety, or treatment

If the brand operates entirely in trust-sensitive territory, return only:
{
  "suitable": false,
  "reason": "why this format is unsafe for this brand"
}

HOW THE FORMAT WORKS:
1. It looks like a real apology, so the reader stops scrolling.
2. The opener sounds like legal/corporate language. No joke yet.
3. The turn: the wrongdoing is actually a benefit.
4. Each confession stacks another specific benefit in the same deadpan tone.

STRUCTURE:
Every variant must use exactly this structure:

- apologyHeader: official-statement title. Examples: "An Official Apology", "We're Sorry", "A Statement From ${brandName}". Serious, no wink.
- legalOpener: one straight corporate apology sentence. Examples: "It has come to our attention that...", "We sincerely apologize for...", "We take full responsibility for..."
- confessions: 2 to 3 lines. Each line is a real customer benefit phrased as fake harm.
- signoff: "Sincerely, ${brandName}" or "We regret nothing. ${brandName}"

THE ONE RULE THAT MATTERS MOST:
Every confession = a real benefit, reframed as an apology, said with a straight face.

Weak:
"We're sorry our service is so good."

Strong:
"We apologize that your front desk stopped losing calls after lunch."

Weak:
"We're sorry customers love us."

Strong:
"We apologize that people keep buying the same hoodie in three colors."

RULES:
- Return plain JSON only.
- Write exactly ${count} variants.
- Each variant must use a different ad angle, buyer moment, or proof.
- Include an "angle" field naming the benefit or buyer moment used.
- No two variants may apologize for the same thing in different words.
- Every confession must trace to the brand context or cached ad angles.
- Do not invent numbers, reviews, awards, discounts, guarantees, integrations, stock-outs, or timeframes.
- Only mention a discount, coupon, sale, free offer, or stock-out if the brand context explicitly says it.
- If proof is thin, build the confession on the buyer moment or pain relieved. Do not fake proof.
- Header and opener must be 100% straight-faced.
- No lol, emojis, hashtags, "just kidding", "(not really)", or wink language.
- Avoid hype words: unlock, elevate, supercharge, game-changer, revolutionary, level up.
- Name the brand only in the signoff and optionally the header.
- Do not stuff the brand name into confessions.

WRITING LIMITS:
- apologyHeader: under 40 chars.
- legalOpener: under 120 chars, one sentence.
- each confession: under 110 chars, complete thought.
- signoff: under 60 chars.
- No em dashes or en dashes.
- Plain text only. No markdown, URLs, or hashtags.
- No line may end with dangling words like "and", "the", "to", "for", "of", "on", "with".

SELF-CHECK:
Before returning each variant, confirm:
- Would the header and opener briefly feel like a real apology?
- Is every confession specific, not a vague brag?
- Is every confession grounded in brand evidence?
- Did it avoid trust-sensitive territory?

OUTPUT SHAPE:
{
  "suitable": true,
  "variants": [
    {
      "angle": "the benefit or buyer moment this variant brags about",
      "apologyHeader": "...",
      "legalOpener": "...",
      "confessions": ["...", "...", "..."],
      "signoff": "Sincerely, ${brandName}",
      "selfCheckPassed": "one line explaining why the wrapper reads real and the confessions are specific"
    }
  ]
}`;
}
