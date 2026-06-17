import type { StoredWebsiteResearchResult } from "../../research/types";

export const JINGLE_VARIANT_COUNT = 1;
export const JINGLE_MUSIC_LENGTH_MS = 20_000;
export const JINGLE_MAX_MUSIC_LENGTH_MS = 30_000;
export const JINGLE_MODEL_ID = "music_v2";
export const JINGLE_STYLES = [
  {
    id: "modern-hip-hop",
    label: "Modern Hip Hop",
    helper: "Polished, confident 90 BPM brand jingle.",
    positiveStyles: ["modern hip hop", "90 BPM", "confident vocal delivery", "punchy 808 bass", "crisp hi-hats", "clean trap drums", "polished studio production"],
    negativeStyles: ["sad", "slow", "lo-fi", "distorted", "off-key"],
  },
  {
    id: "cinematic-trap-diss",
    label: "Cinematic Trap Diss",
    helper: "Dark intro, gritty rap verses, shouted chant hook.",
    positiveStyles: ["cinematic trap diss rap", "viral meme anthem", "95 BPM", "hard 808s", "trap hi-hat rolls", "marching drums", "low gritty rap verses", "shouted melodic chant hook"],
    negativeStyles: ["sad", "slow", "lo-fi", "soft acoustic", "off-key", "real politicians", "real parties"],
  },
] as const;
export type JingleStyleId = typeof JINGLE_STYLES[number]["id"];
export const DEFAULT_JINGLE_STYLE_ID: JingleStyleId = "modern-hip-hop";
export const getJingleStyle = (styleId: JingleStyleId = DEFAULT_JINGLE_STYLE_ID) =>
  JINGLE_STYLES.find((style) => style.id === styleId) || JINGLE_STYLES[0];

const clean = (value: unknown, maxLength = 1200) => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

export const buildJinglePrompt = (
  research: StoredWebsiteResearchResult,
  styleId: JingleStyleId = DEFAULT_JINGLE_STYLE_ID,
) => {
  const style = getJingleStyle(styleId);
  const brandName = clean(research.brandBrief.brandName || research.brand.name, 120);
  const offer = clean(research.brandBrief.offer || research.brand.description, 700);
  const audience = clean(research.brandBrief.audience, 500);
  const buyerMoments = research.brandBrief.buyerMoments.slice(0, 8).map((item) => `- ${clean(item, 180)}`).join("\n");
  const proof = research.brandBrief.proof.slice(0, 8).map((item) => `- ${clean(item, 180)}`).join("\n");
  const siteLanguage = research.brandBrief.siteLanguage.slice(0, 8).map((item) => `- ${clean(item, 140)}`).join("\n");
  const adAngles = (research.adAngles || []).slice(0, 8).map((angle) => (
    `- buyer: ${clean(angle.buyer, 90)} | moment: ${clean(angle.moment, 140)} | pain: ${clean(angle.pain, 140)} | proof: ${clean(angle.proof, 140)}`
  )).join("\n");

  return `You are a senior jingle copywriter and music director.
Write exactly ${JINGLE_VARIANT_COUNT} short, catchy, singable ${style.label} brand jingle.
Each output object is a composition plan for ElevenLabs Music v2.

BRAND CONTEXT:
- Brand: ${brandName}
- Offer: ${offer}
- Audience: ${audience}
- Buyer moments:
${buyerMoments || "- none"}
- Proof:
${proof || "- none"}
- Site language:
${siteLanguage || "- none"}
- Cached ad angles:
${adAngles || "- none"}

WHAT A JINGLE IS HERE:
- A tiny 20 second hip hop track.
- Exactly 3 chunks: [Hook] 6000ms, [Verse] 8000ms, [Hook] 6000ms.
- The first hook contains brandPhonetic.
- The final hook repeats the payoff and the FINAL lyric line is brandPhonetic.
- The verse names exactly ONE evidence-based pain or benefit.

STYLE FOR EVERY CHUNK:
positive_styles must include these exact ideas, in English, with no artist/song/band references:
${style.positiveStyles.join(", ")}
negative_styles should avoid: ${style.negativeStyles.join(", ")}

CRAFT RULES:
- Lines in the same section must have matching or near-matching syllable counts.
- Use short, common, punchy words that rap cleanly.
- Brand name appears in both hooks using brandPhonetic.
- Final lyric line is brandPhonetic only.
- No invented stats, numbers, discounts, offers, guarantees, reviews, awards, or features.
- No jargon, hype words, hashtags, emojis, em dashes, or en dashes.
- Never name real artists, bands, songs, or copyrighted style references.
- For satirical/diss styles, diss the buyer's old problem, never a real person, party, or group.
- If proof is thin, use the buyer moment or pain instead of inventing a claim.

BRAND PHONETIC:
- If the brand is made of normal English words, use the real spelling exactly as brandPhonetic.
- Only respell unusual casing, acronyms, numbers, made-up words, or names with real pronunciation risk.
- Do not respell ordinary English words into syllables. It can create a fake accent.
- Examples: "Agent Enamel" -> "Agent Enamel"; "David's Cookies" -> "David's Cookies"; "OGTool" -> "Oh Gee Tool".

OUTPUT:
Return only valid JSON in this shape:
{
  "variants": [
    {
      "angle": "the one pain or benefit this jingle uses",
      "brandPhonetic": "how the brand is sung",
      "musicLengthMs": 20000,
      "compositionPlan": {
        "chunks": [
          {
            "text": "[Hook]\\n<1-2 singable lines with brandPhonetic>",
            "duration_ms": 6000,
            "positive_styles": ${JSON.stringify(style.positiveStyles)},
            "negative_styles": ${JSON.stringify(style.negativeStyles)},
            "context_adherence": "high"
          },
          {
            "text": "[Verse]\\n<2-3 lines about ONE evidence-backed pain or benefit>",
            "duration_ms": 8000,
            "positive_styles": ${JSON.stringify(style.positiveStyles)},
            "negative_styles": ${JSON.stringify(style.negativeStyles)},
            "context_adherence": "high"
          },
          {
            "text": "[Hook]\\n<repeat hook payoff>\\n<brandPhonetic>",
            "duration_ms": 6000,
            "positive_styles": ${JSON.stringify(style.positiveStyles)},
            "negative_styles": ${JSON.stringify(style.negativeStyles)},
            "context_adherence": "high"
          }
        ]
      },
      "selfCheckPassed": "syllable count per line; durations sum to 20000; final line is brandPhonetic; no invented claims"
    }
  ]
}`;
};
