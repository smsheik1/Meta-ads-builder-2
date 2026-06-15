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
      maxWords: slot.maxWords,
      maxLines: slot.maxLines,
      textCase: slot.textCase,
    })),
  }));

  return `You are writing brand-specific meme copy for ${research.brand.name}.

BRAND CONTEXT:
- Brand: ${research.brandBrief.brandName || research.brand.name}
- Offer: ${research.brandBrief.offer}
- Audience: ${research.brandBrief.audience}
- Buyer moments: ${cleanList(research.brandBrief.buyerMoments, research.brand.description)}
- Proof: ${cleanList(research.brandBrief.proof, research.brand.description)}
- Site language: ${cleanList(research.brandBrief.siteLanguage, research.brand.description)}
- CTA direction: ${research.brandBrief.ctaDirection}

TASK:
Write exactly one meme variant for each template below, in the same order.
Each variant must fit that template's semantics and director notes.

TEMPLATES:
${JSON.stringify(templates, null, 2)}

RULES:
- Return plain JSON only.
- Do not use markdown.
- Do not use image syntax like ![alt](url).
- Do not invent numbers, reviews, guarantees, integrations, or timeframes.
- Reference the specific offer or buyer moment, not generic SaaS lines.
- Every required slot must be present.
- Stay under each slot's maxChars hard limit.
- Stay under each slot's maxWords hard limit.
- Write short meme-native phrases, not complete marketing sentences.
- The LLM must not output coordinates, styles, image URLs, or layout data.
- For Drake, the two slots must be a clear old-way versus better-way contrast.
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
