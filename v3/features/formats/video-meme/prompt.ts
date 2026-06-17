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
  const isPingu = template.id === "pingu-noot-noot";
  const isDarwin = template.id === "darwin-journey";
  const slotRules = isPingu
    ? `- templateId must be exactly "pingu-noot-noot".
- Return slots.setupText and slots.dreadText. Do not return caption.
- Each setupText and dreadText must be under ${template.captionMaxChars} characters.
- Never name the brand or product in either slot.`
    : isDarwin
      ? `- templateId must be exactly "darwin-journey".
- Return slots.caption. Do not return setupText or dreadText.
- Caption is one line only. No second caption, no subtext, no CTA, no hashtags, no emojis.
- Never name the brand or product in the caption.
- Caption must be under ${template.captionMaxChars} characters total, complete thought, never cut mid-sentence.`
    : `- clipId must be exactly "${template.id}".
- Caption is one line only. No second caption, no subtext, no CTA, no hashtags, no emojis.
- Never name the brand or product in the caption.
- Caption must be under ${template.captionMaxChars} characters total, complete thought, never cut mid-sentence.`;
  const outputShape = isPingu
    ? `{
  "variants": [
    {
      "angle": "the pain or buyer moment this pair uses",
      "templateId": "pingu-noot-noot",
      "slots": {
        "setupText": "the calm in-the-moment thought",
        "dreadText": "the specific comic-dread thought that undercuts setupText"
      },
      "selfCheckPassed": "one line: why the dread pays off the setup and why the target buyer recognizes it"
    }
  ]
}`
    : isDarwin
      ? `{
  "variants": [
    {
      "angle": "the pain/persona being framed",
      "templateId": "darwin-journey",
      "mode": "${template.allowedModes.join(" | ")}",
      "slots": {
        "caption": "the single Darwin caption"
      },
      "selfCheckPassed": "one line: why calm-vs-chaos lands, which mode it is, and for goofy mode the real pain underneath"
    }
  ]
}`
    : `{
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
  const intro = isPingu
    ? `Each meme is a two-beat text pair pinned over a known reaction video clip. The clip supplies the punchline and emotion. Your text only sets up the calm thought and the dread thought, deadpan. You are not writing an ad.`
    : isDarwin
      ? `Each meme is ONE caption pinned over a known reaction video clip. The clip supplies Darwin's blank calm and the chaotic journey. Your caption names the persona and the specific pain stack they survived, deadpan. You are not writing an ad.`
    : `Each meme is ONE line of text pinned over a known reaction video clip. The clip supplies the punchline and emotion. Your caption only sets up WHO or WHAT, deadpan. You are not writing an ad. You are writing a caption a real person would tag a friend in.`;

  return `You are a senior brand copywriter writing reaction-clip memes.
${intro}

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
${slotRules}
- Text must be deadpan and flat. Do NOT add hype, exclamation marks, "amazing", "best", or adjectives the clip already supplies.
- Every variant must trace to the brand context or cached ad angles. Do not invent numbers, reviews, awards, guarantees, integrations, timeframes, or discounts.
- If proof is thin, build on the buyer moment or pain. A specific problem beat is stronger than a fake stat.
- Avoid hype words: unlock, elevate, supercharge, game-changer, revolutionary, level up, transform.
- No em dashes or en dashes.
- No line may end on a dangling word like "and", "the", "to", "for", "of", "on", "with", "that".

SELF-CHECK before returning each variant:
- Would a real person tag themselves or a coworker in this? If no, it is too salesy or too vague.
- Does the text expose an identity/behavior/thought and NOT the product? If it names the product, rewrite.
- Is the idea specific enough that swapping in a competitor would feel wrong? If generic, rewrite.
- Did I let the clip carry the comedy instead of explaining the joke?

OUTPUT SHAPE:
${outputShape}`;
}
