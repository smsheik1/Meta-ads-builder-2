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
    toneRules: [
      "Diss the OLD PROBLEM like it is the villain. Never diss a real person, party, group, competitor, or customer.",
      "Use contrast as the spine: they were stuck in the old pain, now the brand outcome wins.",
      "Hook is chantable and repetitive, built around brandPhonetic so the brand lands as the chant.",
      "Verse is low, plain, and confrontational. Keep shouted energy for the hook.",
      "The old problem loses. The brand lands as the winner, not as an ad.",
      "No goofy insults, fake beef, cruelty, or real targets. Attitude comes from confidence.",
    ],
  },
  {
    id: "pop-rap-hook",
    label: "Pop Rap Hook",
    helper: "Bright, catchy 100 BPM melodic rap hook.",
    positiveStyles: ["pop rap", "100 BPM", "bright melodic hook", "clean confident vocal", "bouncy bass", "snappy claps", "glossy commercial production"],
    negativeStyles: ["sad", "dark", "lo-fi", "distorted", "off-key", "aggressive diss"],
  },
  {
    id: "retail-dance",
    label: "Retail Dance",
    helper: "Glossy 118 BPM dance-pop retail anthem.",
    positiveStyles: ["dance pop", "118 BPM", "four-on-the-floor kick", "glossy synth bass", "hand claps", "chantable vocal hook", "bright retail energy"],
    negativeStyles: ["sad", "slow", "lo-fi", "acoustic ballad", "off-key", "dark"],
  },
  {
    id: "funky-commercial",
    label: "Funky Commercial",
    helper: "Playful 105 BPM funk-pop brand jingle.",
    positiveStyles: ["funk pop", "105 BPM", "playful bass guitar", "hand claps", "warm keys", "group hook", "upbeat commercial polish"],
    negativeStyles: ["sad", "slow", "lo-fi", "heavy trap", "off-key", "dark"],
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
  const toneRules = "toneRules" in style && Array.isArray(style.toneRules)
    ? `\nSTYLE-SPECIFIC TONE:\n${style.toneRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}\n`
    : "";

  return `You are a senior jingle copywriter and music director.
Write exactly ${JINGLE_VARIANT_COUNT} short, catchy, singable ${style.label} brand jingle.
Write the creative lines only. Wiggly builds the exact ElevenLabs Music v2 composition plan.

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
- hook is exactly ONE catchy line.
- verseLines contains 2-3 short lines about exactly ONE evidence-based pain or benefit.
- Do not put the brand name in hook. Wiggly adds brandPhonetic to both hooks and makes it the final lyric line.
- Wiggly builds exactly 3 chunks: [Hook] 6000ms, [Verse] 8000ms, [Hook] 6000ms.

STYLE DIRECTION:
${style.positiveStyles.join(", ")}
Avoid: ${style.negativeStyles.join(", ")}
${toneRules}

CRAFT RULES:
- Lines in the same section must have matching or near-matching syllable counts.
- Use short, common, punchy words that rap cleanly.
- hook is one line and does not include the brand name.
- No invented stats, percentages, discounts, offers, guarantees, reviews, awards, or features.
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
      "hook": "one catchy line without the brand name",
      "verseLines": ["short line one", "short line two"]
    }
  ]
}`;
};
