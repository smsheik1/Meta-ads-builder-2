import type { StoredWebsiteResearchResult } from "../../research/types";

export const BRAINROT_VARIANT_COUNT = 3;
export const BRAINROT_MIN_BEATS = 6;
export const BRAINROT_MAX_BEATS = 10;
export const BRAINROT_MAX_BEAT_CHARS = 82;
export const BRAINROT_BEAT_GAP_MS = 200;
export const BRAINROT_BACKGROUND_VIDEO_SRC = "/brainrot/block-parkour.mp4";
export const BRAINROT_LEFT_SPRITE_SRC = "/brainrot/peter.png";
export const BRAINROT_RIGHT_SPRITE_SRC = "/brainrot/stewie.png";
export const BRAINROT_LEFT_VOICE_ID = "b1d36a18f8d84bd59dead30474cbe3d7";
export const BRAINROT_RIGHT_VOICE_ID = "e91c4f5974f149478a35affe820d02ac";

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

export function buildBrainrotPrompt(
  research: StoredWebsiteResearchResult,
  count = BRAINROT_VARIANT_COUNT,
) {
  const brandName = research.brandBrief.brandName || research.brand.name;

  return `You write two-character educational brainrot ad scripts over muted Minecraft gameplay.
Return only valid JSON.

BRAND:
- Name: ${brandName}
- Offer: ${research.brandBrief.offer}
- Audience: ${research.brandBrief.audience}
- Ad angles: ${adAnglesForPrompt(research)}
- Buyer moments: ${cleanList(research.brandBrief.buyerMoments, research.brand.description)}
- Proof: ${cleanList(research.brandBrief.proof, research.brand.description)}
- Site language: ${cleanList(research.brandBrief.siteLanguage, research.brand.description)}

THE FORMAT (follow this structure exactly):
This is a fake-podcast "did you know" skit. One character is stuck or clueless,
the other knows the secret. It opens with a hook, reveals a secret, and ends
on an abrupt punchline that loops.

ROLES:
- left = the stuck one: bored, frustrated, or asking the dumb obvious question.
- right = the one who knows: drops the secret, lands the brand as the answer.
- Tension = left has the problem, right is unbothered and knows the fix.

STRUCTURE (per variant, ${BRAINROT_MIN_BEATS}-${BRAINROT_MAX_BEATS} beats):
- Beat 1 (HOOK): an outrageous claim or "secret" that creates a knowledge gap.
  Not a greeting. Example energy: "wait, you still [old painful way]?"
- Middle beats: left reacts/pushes, right reveals the secret step by step,
  teaching the point through banter. Brand enters as the answer AFTER the
  pain is set up, never in beat 1 or 2.
- Final beat (PAYOFF): an abrupt punchline or reveal. No wind-down, no
  "so you should," no sign-off. It should feel like it loops.

RULES:
- Write exactly ${count} variants.
- Each variant uses one distinct buyer pain or ad angle.
- Pain must trace to the adAngles / buyerMoments inputs. Invent nothing.
- Each variant has ${BRAINROT_MIN_BEATS}-${BRAINROT_MAX_BEATS} beats.
- speaker must be "left" or "right".
- Both speakers must appear and should alternate naturally.
- Each beat text max ${BRAINROT_MAX_BEAT_CHARS} characters.
- Brand name appears at most twice per variant, exactly as "${brandName}".
- No intros, no "hey guys," no fluff. Zero wasted words.
- No fake stats, prices, reviews, discounts, guarantees, awards, hashtags, emojis, URLs, em dashes, or en dashes.
- Avoid hype words: unlock, elevate, game-changer, transform, revolutionary, supercharge, level up.
- Spoken, short, funny. Roast the old problem, not a real person.

GOOD SHAPE (hook -> reveal -> brand -> abrupt payoff):
left: "wait, your front desk still misses lunch calls?"
right: "enough of them. that's how patients vanish"
left: "so what, you just accept it?"
right: "nah. ${brandName} answers before voicemail even loads"
left: "so the calls just... get picked up?"
right: "yep. funny how that works"

OUTPUT:
{
  "variants": [
    {
      "angle": "the buyer pain this script uses",
      "beats": [
        { "speaker": "left", "text": "..." },
        { "speaker": "right", "text": "..." }
      ],
      "selfCheckPassed": "confirms hook in beat 1, brand as the reveal, abrupt looping payoff, traceable pain"
    }
  ]
}`;
}
