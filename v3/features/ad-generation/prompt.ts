import type { StoredWebsiteResearchResult } from "../research/types";

const cleanText = (value: unknown, maxLength = 260) => String(value ?? "")
  .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
  .replace(/!\[[^\]]*]\[[^\]]*]/g, " ")
  .replace(/!\[[^\]]*]/g, " ")
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

CURATED BRAND BRIEF:
Offer: ${cleanText(research.brandBrief.offer, 220)}
Audience: ${cleanText(research.brandBrief.audience, 220)}
Buyer moments: ${listForPrompt(research.brandBrief.buyerMoments)}
Proof: ${listForPrompt(research.brandBrief.proof)}
Exact site phrases: ${listForPrompt(research.brandBrief.siteLanguage)}
CTA direction: ${cleanText(research.brandBrief.ctaDirection, 80)}
Visual notes: ${listForPrompt(research.brandBrief.visualNotes, 6)}
Curator confidence: ${research.brandBrief.confidence}

RAW WEBSITE BACKUP (use only if it supports the curated brief; ignore navigation, cart, login, checkout, loading, and standalone price text):
Headings: ${listForPrompt(research.evidence.headings, 10)}
Paragraphs: ${listForPrompt(research.evidence.paragraphs, 10)}

PICK THE BEST STUFF FIRST FOR EACH CANDIDATE:
- Best buyer: who is most likely to care?
- One buyer moment: the specific situation that makes them want this now.
- One proof point: the specific claim, phrase, result, or concrete product detail that makes the promise believable.
- One ad phrase: which exact site phrase or proof sounds most clickable?
- Do not average the whole brief. Each candidate should be built from one clear buyer moment plus one clear proof point.

CONCRETE HEADLINE TEST:
A good headline makes a buyer recognize a specific moment, result, or contrast.
A bad headline only restates the brand's SEO title, product category, homepage tagline, or generic benefit.
Bad:
- "Official Store"
- "Best Workout Clothes"
- "Cookie Delivery | Gift Baskets"
- "Scheduling Software For Everyone"
- "Premium Products For Modern Teams"
Good:
- "Your competitor shows up in ChatGPT. You don't."
- "That listing was gone before lunch."
- "Protein bars that don't taste like punishment."
- "Forgot the birthday? Cookies still ship."

HEADLINE CALIBRATION EXAMPLES:
These teach the difference between concrete and generic. Do not copy them. They are from other industries to show the pattern, not to be reused. Match this level of specificity using this brand's evidence.

GENERIC bad -> CONCRETE good

Dental practice:
Bad: "Quality Dental Care You Can Trust"
Good: "Drowning in Monday morning phone calls?"
Bad: "Your Smile, Our Priority"
Good: "The patient called. Nobody picked up."

Bookkeeping software:
Bad: "Smart Bookkeeping for Small Business"
Good: "Tax season shouldn't cost you a weekend"
Bad: "Save Time and Money Today"
Good: "47 receipts. One shoebox. Sound familiar?"

Meal-prep delivery:
Bad: "Healthy Meals Delivered to Your Door"
Good: "It's 6pm and the fridge is still empty"
Bad: "Eat Better, Live Better"
Good: "Skip the 'what's for dinner' fight"

WHY THE GOOD ONES WORK:
- They name a specific moment the buyer has lived: a time, a scene, or a friction.
- They make the buyer think "that's literally me" within 2 seconds.
- They imply a stake without inventing numbers.
- A good headline could only belong to this kind of buyer. If it works verbatim for any company in the category, it is too generic.

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

Brand: fitness apparel brand
Bad: "Shop Performance Workout Clothes"
Good: "Leg day needs shorts that keep up."

Brand: fresh cookie delivery
Bad: "Cookie Delivery | Gift Baskets"
Good: "Forgot the birthday? Cookies still ship."

FORMAT-SPECIFIC OUTPUT EXAMPLES. Copy the quality bar, not the facts:
Example A:
Evidence:
- Brand: AI dental receptionist
- Buyer moment: calls arrive after the front desk leaves
- Proof: answers after-hours calls and books appointments
Good candidate:
{
  "angleId": "after-hours-leads",
  "headline": "Your front desk went home. The lead didn't.",
  "subheadline": "Supporting context only: after-hours callers still need a human-sounding answer and a booked next step.",
  "ctaText": "Hear it answer",
  "headlineType": "painful_moment",
  "selectedPain": "calls arrive after the front desk leaves",
  "selectedProof": "answers after-hours calls and books appointments"
}

Example B:
Evidence:
- Brand: AI search visibility service
- Buyer moment: competitors show up in AI answers first
- Proof: first ChatGPT mention in 14 days
Good candidate:
{
  "angleId": "competitor-ai-answers",
  "headline": "ChatGPT found your competitor first.",
  "subheadline": "Supporting context only: buyers ask AI tools for recommendations before they ever reach a website.",
  "ctaText": "See the proof",
  "headlineType": "contrast",
  "selectedPain": "competitors show up in AI answers first",
  "selectedProof": "first ChatGPT mention in 14 days"
}

Example C:
Evidence:
- Brand: fresh cookie delivery
- Buyer moment: someone forgot a gift
- Proof: fresh baked cookies ship as gifts
Good candidate:
{
  "angleId": "forgotten-gift",
  "headline": "Forgot the gift? Cookies still ship.",
  "subheadline": "Supporting context only: a fresh cookie box gives late gift senders a simple save.",
  "ctaText": "Send cookies",
  "headlineType": "painful_moment",
  "selectedPain": "someone forgot a gift",
  "selectedProof": "fresh baked cookies ship as gifts"
}

WHAT TO WRITE:
- Generate exactly ${count} candidates.
- Headlines must carry the whole visible visualizer ad. They are the main canvas copy.
- Subheadline is supporting metadata for dialogue/share context. It is not visible on the visualizer canvas.
- Subheadline must be one sentence. Lead with proof or a buyer moment, then explain the promise without adding new claims.
- CTA should be 2-5 words, start with an action verb, and name a specific next step or outcome.
- Use at least 3 different CTA verbs across the list when generating 10 or more candidates.
- Match the CTA to the business category:
  Ecommerce: "Shop the drop", "Build your box", "Find your fit".
  SaaS: "Try the workflow", "Book a demo", "See the dashboard".
  Services: "Book the call", "See the proof", "Get the plan".
- Use only the curated brand brief and supporting raw website backup above.
- Vary the headlineType across the list. For 40+ candidates, use every headlineType multiple times instead of clustering around one shape.
- If evidence is thin, make fewer claims, not bigger claims.

BAD HEADLINE SHAPES:
- "Grow your business"
- "Unlock your potential"
- "Take it to the next level"
- "The future of [category]"
- "[Brand] made easier"
- A plain category label with no reason to care
- SEO/title restatements like "Official Store", "Shop [Brand]", "[Category] Delivery", or "[Product] | [Product] | [Product]"

BANNED WORDS:
${bannedAdWords.join(", ")}

HARD RULES:
- Do not invent numbers, reviews, customers, guarantees, awards, or timeframes.
- Do not use the STUDY THESE EXAMPLES facts unless those facts appear in the curated brief or raw website backup.
- Do not copy site navigation, checkout text, SEO pipes, category menus, or standalone prices into headline/subheadline/ctaText.
- Do not repeat the same headline structure more than 3 times in a row.
- Do not repeat the same CTA text more than 5 times in the list.
- Headline must be 8-72 characters.
- Subheadline must be 24-180 characters.
- ctaText must be 2-5 words.
- selectedPain and selectedProof must be copied or closely paraphrased from CURATED BRAND BRIEF.
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
