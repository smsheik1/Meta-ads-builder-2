import type { StoredWebsiteResearchResult } from "../../research/types";
import { MEME_TEMPLATES } from "./templates";

const cleanList = (items: string[], fallback: string) => (
  items.length ? items.slice(0, 6).join("; ") : fallback
);

export function buildMemePrompt(research: StoredWebsiteResearchResult) {
  const templates = MEME_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    semantics: template.semantics,
    directorsNotes: template.directorsNotes,
    slots: template.slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      maxChars: slot.maxChars,
      maxLines: slot.maxLines,
      textCase: slot.textCase,
    })),
  }));

  return `You are a senior brand copywriter who writes meme captions.
Your taste filter rejects generic SaaS phrasing on sight.

REJECT INSTANTLY: "unlock", "elevate", "supercharge", "game-changer", "take it to the next level", "in today's world", "level up", "harness the power", rhetorical-question openings.

BRAND CONTEXT:
- Brand: ${research.brandBrief.brandName || research.brand.name}
- Offer: ${research.brandBrief.offer}
- Audience: ${research.brandBrief.audience}
- Buyer moments: ${cleanList(research.brandBrief.buyerMoments, research.brand.description)}
- Proof: ${cleanList(research.brandBrief.proof, research.brand.description)}
- Site language: ${cleanList(research.brandBrief.siteLanguage, research.brand.description)}
- CTA direction: ${research.brandBrief.ctaDirection}

TASK:
Write exactly one meme variant for every template below, in the exact order given.

TEMPLATES:
${JSON.stringify(templates, null, 2)}

RULES:
- Return plain JSON only.
- Every required slot must be present.
- Plain text only in slot values. No markdown, no URLs.
- Sound like a meme caption, not an ad headline.
- Reference only proof, offer, or buyer moments from the BRAND block above. Do not invent numbers, reviews, customers, guarantees, integrations, or timeframes.
- Stay under each slot's maxChars hard limit.
- Each slot must be a complete thought. Never cut mid-sentence.
- No slot may end with dangling words like "and", "the", "to", "for", "of", "on", "that", "get", or "with".
- If a complete thought cannot fit within maxChars, shorten the idea instead of truncating the sentence.
- Compress ideas into natural short phrases. Do not copy the start of a long website sentence and chop off the end.
- Bad: "Tired of paying for ads that get"
- Good: "Ads keep getting pricier"
- Bad: "A managed service that ranks brands on"
- Good: "Rank on ChatGPT"
- Bad: "Unlock the power of viral marketing"
- Good: "Posts people actually steal"
- For Drake, the two slots must be a clear old-way versus better-way contrast.
- For Woman Yelling at Cat, the yelling slot must be a loud objection or complaint, and the cat response must be short, calm, and unimpressed.
- For This Is Fine, use the top and bottom text spaces: top names the bad thing happening, bottom names the forced calm response.
- For Expanding Brain, the four slots must form a real escalation ladder: naive move, smarter move, specific brand insight, punchline/aha. Do not write four disconnected benefits.
- For This Is Fine, the caption must name the fire and must not say "this is fine".
- If a template feels odd for the brand, lean into useful absurdity instead of skipping it.

OUTPUT SHAPE:
{
  "variants": [
    {
      "templateId": "template id from the registry",
      "slots": {
        "slotId": "copy for that slot"
      }
    }
  ]
}`;
}
