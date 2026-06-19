import type { StoredWebsiteResearchResult } from "../../research/types";

export const DEFAULT_TEXT_MESSAGE_VARIANT_COUNT = 6;
export const TEXT_MESSAGE_MIN_MESSAGES = 4;
export const TEXT_MESSAGE_MAX_MESSAGES = 6;
export const TEXT_MESSAGE_MAX_CHARS_PER_MESSAGE = 80;
export const TEXT_MESSAGE_MAX_TOTAL_CHARS = 240;

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

export function buildTextMessagePrompt(
  research: StoredWebsiteResearchResult,
  count = DEFAULT_TEXT_MESSAGE_VARIANT_COUNT,
) {
  const brandName = research.brandBrief.brandName || research.brand.name;

  return `You are a copywriter who writes fake text-message conversations for brand ads.

The screenshot looks like one real person texting another. Return only valid JSON.
The output is a STATIC phone screenshot. It must fit on one screen.

BRAND CONTEXT:
- Brand: ${brandName}
- What it sells: ${research.brandBrief.offer}
- Who it's for: ${research.brandBrief.audience}
- Ad angles (pick one per variant): ${adAnglesForPrompt(research)}
- Buyer moments: ${cleanList(research.brandBrief.buyerMoments, research.brand.description)}
- Proof: ${cleanList(research.brandBrief.proof, research.brand.description)}
- Site language: ${cleanList(research.brandBrief.siteLanguage, research.brand.description)}
- CTA direction: ${research.brandBrief.ctaDirection}

GOAL:
Write a short, believable text thread where someone hits a specific buyer pain,
and the conversation lands on ${brandName} as the relief. It must read like two
real people texting, not an ad.

HOW A REAL THREAD WORKS:
- Start mid-conversation, not "Hey!". Drop the reader into a real moment.
- One person vents a specific frustration in casual texting voice.
- The other reacts like a friend: recognition, "same", "wait how", "send me that".
- The brand enters once, naturally, like a recommendation between friends.
- End on the payoff beat: relief, curiosity, or "ok i'm trying this", not a CTA.

CONTRAST SPINE:
"stuck in old pain" -> friend names brand outcome -> "ok send it"

GOOD SHAPE:
left: "did your dentist actually answer the phone?"
right: "barely lol"
left: "mine started using ${brandName}"
left: "no voicemail maze. just booked."
right: "send me that"

RULES:
- Return plain JSON only.
- Write exactly ${count} variants.
- Each variant must use a different ad angle, buyer moment, or proof.
- Include an "angle" field naming the buyer moment used.
- Use exactly ${TEXT_MESSAGE_MIN_MESSAGES}-${TEXT_MESSAGE_MAX_MESSAGES} messages per variant.
- Use side values only: "left" or "right".
- Both sides must appear.
- Message text must sound like texting, not polished ad copy.
- Max ${TEXT_MESSAGE_MAX_CHARS_PER_MESSAGE} characters per message.
- Max ${TEXT_MESSAGE_MAX_TOTAL_CHARS} total message characters per variant.
- Name the brand at most once, using this exact name: ${brandName}
- Every variant must use a different pain and a different opening line.
- Do not use fake stats, prices, reviews, discounts, guarantees, awards, hashtags, emojis, or URLs.
- Avoid marketing speak: unlock, elevate, game-changer, transform, revolutionary, supercharge, level up.
- No CTA-button language like "click here", "sign up now", "limited time", "Book now", "Get started", or "Learn more".
- No em dashes or en dashes.
- No markdown.

VOICE CALIBRATION:
Good:
left: "i've called three places and it's all voicemail"
right: "wait try this one, they actually pick up"
left: "ok send it"

Bad:
"Tired of unreliable service? Discover the solution that transforms your experience!"

OUTPUT SHAPE:
{
  "variants": [
    {
      "angle": "the buyer moment this text conversation is built on",
      "contactName": "short natural contact name, not the brand",
      "timestampLabel": "Today 9:41 AM",
      "messages": [
        { "side": "left", "text": "..." },
        { "side": "right", "text": "..." }
      ],
      "selfCheckPassed": "one line confirming it fits one screen and sounds like texting"
    }
  ]
}`;
}
