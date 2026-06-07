import type { StoredWebsiteResearchResult } from "../research/types";

const cleanText = (value: unknown, maxLength = 260) => String(value ?? "")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.!?])/g, "$1")
  .trim()
  .slice(0, maxLength)
  .trim();

const listForPrompt = (items: string[], maxItems = 8) => JSON.stringify(
  items.map((item) => cleanText(item, 220)).filter(Boolean).slice(0, maxItems),
);

export const bannedAdWords = [
  "unlock",
  "elevate",
  "transform",
  "next-generation",
  "future of",
  "powered by AI",
  "revolutionary",
  "seamless",
  "cutting-edge",
  "supercharge",
  "leverage",
  "robust",
  "solution",
  "journey",
  "ecosystem",
  "empower",
] as const;

export const buildAdIdeasPrompt = (
  research: StoredWebsiteResearchResult,
  count: number,
) => `
You write punchy social ad canvas ideas from website evidence.

OBJECTIVE:
Generate ${count} distinct ad candidates for Wiggly.
Every candidate must make the user feel: "Wiggly understood this business."

BRAND:
${research.brand.name}

SITE SUMMARY:
Title: ${research.brand.title}
Description: ${research.brand.description}
Website: ${research.finalUrl}

STUFF FROM THE WEBSITE:
Headings: ${listForPrompt(research.evidence.headings, 16)}
Paragraphs: ${listForPrompt(research.evidence.paragraphs, 16)}
Customer pains / moments: ${listForPrompt(research.evidence.receipts.buyerMoments)}
Specific proof / claims: ${listForPrompt(research.evidence.receipts.specificClaims)}
Named proof / testimonials: ${listForPrompt(research.evidence.receipts.namedProof)}
Exact site phrases: ${listForPrompt(research.evidence.receipts.exactSiteLanguage)}

PICK THE BEST STUFF FIRST FOR EACH CANDIDATE:
- Best buyer: who is most likely to care?
- Best pain: what annoying moment makes them want this now?
- Best proof: what makes the promise believable?
- Best ad phrase: which exact site phrase or proof sounds most clickable?

DECIDE HEADLINE TYPE BEFORE WRITING:
Pick ONE shape for each headline:
1. painful_moment - a concrete annoying moment the buyer recognizes.
2. receipt_drop - the strongest number, result, timeframe, review, or proof.
3. callout - directly name the buyer and the problem.
4. contrast - show the old painful way versus the better way.
5. transformation - show the before-to-after outcome.

STUDY THESE EXAMPLES (shape only; do not copy facts, numbers, markets, or claims unless this website provided them):
Brand: AI dental receptionist
Bad: "Grow your dental practice with AI"
Good: "Your front desk goes home at 5. Mine answers at 11pm."

Brand: AI search visibility service
Bad: "Boost your AI visibility"
Good: "Your competitor shows up in ChatGPT. You don't."

Brand: med spa booking software
Bad: "Streamline your bookings"
Good: "37 no-shows last month. This fixed it."

Brand: home search app
Bad: "Find your dream home today"
Good: "That listing was gone before lunch."

WHAT TO WRITE:
- Generate exactly ${count} candidates.
- Headlines must be punchy, concrete, and easy to read on a phone.
- Subheadline must be one sentence. Lead with proof or a buyer moment, then explain the promise.
- CTA should be 2-5 words, start with an action verb, and name a specific next step or outcome.
- Use only the website evidence above.
- Vary the headlineType across the list.
- If evidence is thin, make fewer claims, not bigger claims.

BAD HEADLINE SHAPES:
- "Grow your business"
- "Unlock your potential"
- "Take it to the next level"
- "The future of [category]"
- "[Brand] made easier"
- A plain category label with no reason to care

BANNED WORDS:
${bannedAdWords.join(", ")}

HARD RULES:
- Do not invent numbers, reviews, customers, guarantees, awards, or timeframes.
- Do not use the STUDY THESE EXAMPLES facts unless those facts appear in STUFF FROM THE WEBSITE.
- Headline must be 8-72 characters.
- Subheadline must be 24-180 characters.
- ctaText must be 2-5 words.
- selectedPain and selectedProof must be copied or closely paraphrased from STUFF FROM THE WEBSITE.
- Return only JSON.

JSON SHAPE:
{
  "candidates": [
    {
      "angleId": "short-kebab-case",
      "headline": "...",
      "subheadline": "...",
      "ctaText": "...",
      "headlineType": "painful_moment | receipt_drop | callout | contrast | transformation",
      "selectedPain": "...",
      "selectedProof": "..."
    }
  ]
}
`;
