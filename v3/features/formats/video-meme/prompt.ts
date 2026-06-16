import type { StoredWebsiteResearchResult } from "../../research/types";
import { VIDEO_MEME_VARIANT_COUNT, getVideoMemeTemplate } from "./templates";

const cleanList = (items: string[], fallback: string) => (
  items.length ? items.slice(0, 8).join("; ") : fallback
);

export function buildVideoMemePrompt(
  research: StoredWebsiteResearchResult,
  count = VIDEO_MEME_VARIANT_COUNT,
  templateId = "bear-sniff",
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
- fixed caption family:
  - Primary: "This bear sniffs people who \${secretBehavior}"
  - Also allowed when more natural: "This bear sniffs \${specificGroup} \${secretBehavior}"
- notes: ${template.notes}

BEAR-SNIFF CALIBRATION EXAMPLES:
These teach the PATTERN. Do NOT copy them. They are from other contexts to show the shape, not to reuse.

The strongest bear captions expose a SECRET behavior or thought, like the bear is a lie detector. The comedy is being CAUGHT, not being complimented.

VIRAL PATTERN (caught in the act):
"This bear sniffs people who want to quit their job."
"This bear sniffs people updating LinkedIn at office hours."
"This bear sniffs people with eleven half-used serums in the drawer."
Why they work: each names a SECRET the viewer recognizes in themselves. The bear exposing it is the joke. Viewers tag a friend who is guilty of it.

WEAKER PATTERN (flattering claim, use sparingly):
"This bear sniffs people who never miss a client call."
Why it is weaker: it is a compliment, not an exposure. Still works, but lower share rate. Use only when no secret-behavior angle exists.

DEAD (do not write):
"This bear sniffs successful business owners."  (too vague, no specific behavior)
"This bear sniffs people who use [Brand]."  (names the product, nobody tags themselves for using a tool)
"This bear sniffs people who want to transform their business."  (marketing language, not a real human thought)

MODES:
- caught: primary mode. Exposes a secret behavior, private thought, guilty work habit, or embarrassing buyer moment.
- flattering: fallback mode. Names an aspirational identity or after-state. Use sparingly.

RULES:
- Write exactly ${count} variants.
- Default to caught mode.
- Each variant must use a DIFFERENT ad angle, buyer moment, or proof. Include an "angle" field naming it.
- Each variant must use a DIFFERENT "target" naming the exact person/group/behavior being sniffed.
- No two captions may be rewordings of the same target.
- Caption must start with "This bear sniffs".
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
      "target": "the specific person/group/behavior the bear is sniffing",
      "clipId": "bear-sniff",
      "caption": "This bear sniffs ...",
      "mode": "caught | flattering",
      "selfCheckPassed": "one line: why a viewer would tag someone and why it names an identity/behavior, not the product"
    }
  ]
}`;
}
