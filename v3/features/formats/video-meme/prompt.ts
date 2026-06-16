import type { StoredWebsiteResearchResult } from "../../research/types";
import { VIDEO_MEME_VARIANT_COUNT, getVideoMemeTemplate, type VideoMemeTemplateId } from "./templates";

const cleanList = (items: string[], fallback: string) => (
  items.length ? items.slice(0, 8).join("; ") : fallback
);

export function buildVideoMemePrompt(
  research: StoredWebsiteResearchResult,
  count = VIDEO_MEME_VARIANT_COUNT,
  templateId: VideoMemeTemplateId = "bear-sniff",
) {
  const template = getVideoMemeTemplate(templateId);
  if (!template) throw new Error(`Unknown video meme template: ${templateId}`);
  const adAngles = (research.adAngles || []).slice(0, 8).map((angle) => ({
    buyer: angle.buyer,
    moment: angle.moment,
    pain: angle.pain,
    proof: angle.proof,
    sitePhrase: angle.sitePhrase,
  }));

  return `You are a senior brand copywriter writing single-caption reaction-clip memes.
Each meme is ONE line of text pinned over a known reaction video clip. The clip supplies the punchline and emotion. Your caption only sets up WHO or WHAT, deadpan. You are not writing an ad. You are writing a caption a real person would tag a friend in.

THE CLIP DOES THE WORK. The footage is the joke. Your caption is the setup, never the payoff.

BRAND CONTEXT:
- Brand: ${research.brandBrief.brandName || research.brand.name}
- Offer: ${research.brandBrief.offer}
- Audience: ${research.brandBrief.audience}
- Buyer moments: ${cleanList(research.brandBrief.buyerMoments, research.brand.description)}
- Proof: ${cleanList(research.brandBrief.proof, research.brand.description)}
- Site language: ${cleanList(research.brandBrief.siteLanguage, research.brand.description)}
- Cached ad angles: ${JSON.stringify(adAngles, null, 2)}

CLIP:
- clipId: ${template.id}
- name: ${template.name}
- notes: ${template.notes}
${template.promptNotes}

RULES:
- Write exactly ${count} variants.
- Each variant must use a DIFFERENT ad angle, buyer moment, or proof. Include an "angle" field naming it.
- Each variant must use a DIFFERENT "target" naming the exact person/group/behavior/reaction trigger.
- No two captions may be rewordings of the same target.
- clipId must be exactly "${template.id}".
- Caption is one line only. No second caption, no subtext, no CTA, no hashtags, no emojis.
- Never name the brand or product in the caption.
- Caption must be deadpan and flat. Do NOT add hype, exclamation marks, "amazing", "best", or adjectives the clip already supplies.
- Every caption must trace to the brand context or cached ad angles. Do not invent numbers, reviews, awards, guarantees, integrations, timeframes, or discounts.
- If proof is thin, build the caption on the buyer moment or pain. A caught-in-the-act caption about the problem is stronger than a fake stat.
- Avoid hype words: unlock, elevate, supercharge, game-changer, revolutionary, level up, transform.
- No em dashes or en dashes.
- Caption must be under ${template.captionMaxChars} characters total, complete thought, never cut mid-sentence.
- No line may end on a dangling word like "and", "the", "to", "for", "of", "on", "with", "that".

SELF-CHECK before returning each variant:
- Would a real person tag themselves or a coworker in this? If no, it is too salesy or too vague.
- Does the caption expose an identity/behavior/thought and NOT the product? If it names the product, rewrite.
- Is the target specific enough that swapping in a competitor would feel wrong? If generic, rewrite.
- Did I let the clip carry the punchline instead of writing the joke into the caption?

OUTPUT SHAPE:
{
  "variants": [
    {
      "angle": "the benefit, buyer moment, pain, or proof this variant uses",
      "target": "the specific person/group/behavior/reaction trigger",
      "clipId": "${template.id}",
      "caption": "a one-line caption matching this clip's required pattern",
      "mode": "${template.allowedModes.join(" | ")}",
      "selfCheckPassed": "one line: why a viewer would tag someone and why it names an identity/behavior, not the product"
    }
  ]
}`;
}
