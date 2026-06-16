import type { StoredWebsiteResearchResult } from "../../research/types";

export const JINGLE_VARIANT_COUNT = 3;
export const JINGLE_MUSIC_LENGTH_MS = 20_000;
export const JINGLE_MAX_MUSIC_LENGTH_MS = 30_000;
export const JINGLE_MODEL_ID = "music_v2";

const clean = (value: unknown, maxLength = 1200) => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

export const buildJinglePrompt = (
  research: StoredWebsiteResearchResult,
  count = JINGLE_VARIANT_COUNT,
) => {
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
Write exactly ${count} short, catchy, singable modern hip hop brand jingles.
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
- The first hook contains the phonetic brand name.
- The final hook repeats the payoff and the FINAL lyric line is the phonetic brand name.
- The verse names exactly ONE evidence-based pain or benefit.

STYLE FOR EVERY CHUNK:
positive_styles must include these exact ideas, in English, with no artist/song/band references:
modern hip hop, 90 BPM, confident vocal delivery, punchy 808 bass, crisp hi-hats, clean trap drums, polished studio production
negative_styles should avoid: sad, slow, lo-fi, distorted, off-key

CRAFT RULES:
- Lines in the same section must have matching or near-matching syllable counts.
- Use short, common, punchy words that rap cleanly.
- Brand name appears in both hooks using brandPhonetic.
- Final lyric line is brandPhonetic only.
- No invented stats, numbers, discounts, offers, guarantees, reviews, awards, or features.
- No jargon, hype words, hashtags, emojis, em dashes, or en dashes.
- Never name real artists, bands, songs, or copyrighted style references.
- If proof is thin, use the buyer moment or pain instead of inventing a claim.

BRAND PHONETIC:
- Easy names can use the brand as-is.
- Unusual spelling, capitalization, numbers, or pronunciation risk must be respelled.
- Examples: "OGTool" -> "Oh Gee Tool"; "Agent Enamel" -> "Ay-jent Ee-nam-ul".

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
            "positive_styles": ["modern hip hop", "90 BPM", "confident vocal delivery", "punchy 808 bass", "crisp hi-hats", "clean trap drums", "polished studio production"],
            "negative_styles": ["sad", "slow", "lo-fi", "distorted", "off-key"],
            "context_adherence": "high"
          },
          {
            "text": "[Verse]\\n<2-3 lines about ONE evidence-backed pain or benefit>",
            "duration_ms": 8000,
            "positive_styles": ["modern hip hop", "90 BPM", "confident vocal delivery", "punchy 808 bass", "crisp hi-hats", "clean trap drums", "polished studio production"],
            "negative_styles": ["sad", "slow", "lo-fi", "distorted", "off-key"],
            "context_adherence": "high"
          },
          {
            "text": "[Hook]\\n<repeat hook payoff>\\n<brandPhonetic>",
            "duration_ms": 6000,
            "positive_styles": ["modern hip hop", "90 BPM", "confident vocal delivery", "punchy 808 bass", "crisp hi-hats", "clean trap drums", "polished studio production"],
            "negative_styles": ["sad", "slow", "lo-fi", "distorted", "off-key"],
            "context_adherence": "high"
          }
        ]
      },
      "selfCheckPassed": "syllable count per line; durations sum to 20000; final line is brandPhonetic; no invented claims"
    }
  ]
}`;
};
