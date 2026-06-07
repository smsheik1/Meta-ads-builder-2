import assert from "node:assert/strict";
import {
  buildDeterministicAdCandidates,
  extractAdCandidatesFromResponse,
  generateAdCandidatesFromResearch,
  normalizeAdCandidatePayload,
} from "../features/ad-generation/generate";
import { bannedAdWords, buildAdIdeasPrompt } from "../features/ad-generation/prompt";
import type { StoredWebsiteResearchResult } from "../features/research/types";
import { createVisualizerAdScene } from "../features/scene/createVisualizerScene";
import type { AdSceneCandidate } from "../features/scene/types";

const research: StoredWebsiteResearchResult = {
  sessionId: "session_1",
  researchRunId: "research_1",
  brandSnapshotId: "brand_1",
  websiteUrl: "https://ogtool.com/",
  finalUrl: "https://ogtool.com/",
  host: "ogtool.com",
	  brand: {
    name: "OGTool",
    url: "https://ogtool.com/",
    host: "ogtool.com",
    title: "OGTool | ChatGPT Visibility",
    description: "Fully managed Reddit and ChatGPT visibility campaigns for D2C operators.",
    faviconUrl: "https://ogtool.com/favicon.ico",
    logoUrl: "https://ogtool.com/logo.svg",
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#07111F", "#82DFFF"],
    fonts: {
      heading: "Inter",
      body: "Inter",
      feel: "sans",
    },
	    vibeTags: ["technical", "growth"],
	  },
	  brandBrief: {
	    brandName: "OGTool",
	    offer: "Fully managed Reddit and ChatGPT visibility campaigns for D2C operators.",
	    audience: "D2C operators trying to show up when buyers ask AI tools for recommendations.",
	    buyerMoments: [
	      "Buyers ask ChatGPT for recommendations and your competitor shows up first.",
	      "D2C operators are trying to show up when buyers ask AI tools for recommendations.",
	    ],
	    proof: [
	      "First ChatGPT mention in 14 days.",
	      "A customer generated 42 citations in two weeks.",
	    ],
	    siteLanguage: [
	      "ChatGPT mentions in 14 days",
	      "Secure Google front-page rankings and AI brand citations",
	    ],
	    ctaDirection: "See the proof",
	    visualNotes: ["Use OGTool's blue accent color."],
	    droppedNoiseSummary: [],
	    confidence: "high",
	  },
	  evidence: {
    headings: [
      "Get mentioned by ChatGPT",
      "Reddit campaigns for AI search visibility",
    ],
    paragraphs: [
      "OGTool builds managed Reddit campaigns and ChatGPT search visibility for D2C brands.",
    ],
    receipts: {
      specificClaims: [
        "First ChatGPT mention in 14 days.",
        "Fully managed Reddit and ChatGPT visibility campaigns.",
      ],
      buyerMoments: [
        "Buyers ask ChatGPT for recommendations and your competitor shows up first.",
        "D2C operators are trying to show up when buyers ask AI tools for recommendations.",
      ],
      exactSiteLanguage: [
        "ChatGPT mentions in 14 days",
        "Secure Google front-page rankings and AI brand citations",
      ],
      namedProof: [
        "A customer generated 42 citations in two weeks.",
      ],
    },
    rawMarkdown: "# OGTool",
  },
  metadata: {},
  branding: {},
  providerStatus: [
    {
      provider: "firecrawl",
      status: "used",
      reason: "Firecrawl read the page.",
    },
  ],
};

const fallback: AdSceneCandidate = {
  angleId: "chatgpt-mentions",
  headline: "ChatGPT Mentions In 14 Days",
  subheadline: "First ChatGPT mention in 14 days from managed Reddit and AI visibility campaigns.",
  ctaText: "See the proof",
  headlineType: "receipt_drop",
  selectedPain: "Buyers ask ChatGPT for recommendations and your competitor shows up first.",
  selectedProof: "First ChatGPT mention in 14 days.",
};

const prompt = buildAdIdeasPrompt(research, 50);
assert.ok(prompt.includes("STUDY THESE EXAMPLES"));
assert.ok(prompt.includes("DECIDE HEADLINE TYPE BEFORE WRITING"));
assert.ok(prompt.includes("Return only JSON"));
assert.ok(prompt.includes(bannedAdWords.join(", ")));

const deterministic = buildDeterministicAdCandidates(research, 50);
assert.equal(deterministic.length, 50);
assert.ok(deterministic.every((candidate) => candidate.headline.length >= 8));
assert.ok(deterministic.every((candidate) => candidate.subheadline.length >= 24));
assert.ok(deterministic.every((candidate) => !/#\d+$/.test(candidate.headline)));

assert.equal(
  normalizeAdCandidatePayload({
    ...fallback,
    headline: "Unlock Your AI Potential",
  }, fallback, 0),
  null,
);
assert.equal(
  normalizeAdCandidatePayload({
    ...fallback,
    headline: "Continue shopping #31",
    subheadline: "Your cart is empty and you can log in to check out faster.",
  }, fallback, 0),
  null,
);

const parsed = extractAdCandidatesFromResponse(JSON.stringify({
  candidates: [
    {
      angleId: "chatgpt-mentions",
      headline: "Your Competitor Shows Up First",
      subheadline: "Buyers ask ChatGPT for recommendations and your competitor shows up first.",
      ctaText: "See the proof",
      headlineType: "contrast",
      selectedPain: "Buyers ask ChatGPT for recommendations and your competitor shows up first.",
      selectedProof: "First ChatGPT mention in 14 days.",
    },
  ],
}), [fallback], 1);
assert.equal(parsed.length, 1);
assert.equal(parsed[0]?.headlineType, "contrast");

const scene = createVisualizerAdScene({
  research,
  candidate: parsed[0]!,
  candidateIndex: 0,
  generationBatchId: "batch_1",
  model: "test-model",
  provider: "openrouter",
  now: 123,
});
assert.equal(scene.format, "visualizer");
assert.equal(scene.version, 1);
assert.equal(scene.brand.receipts.specificClaims[0], "First ChatGPT mention in 14 days.");
assert.equal(scene.metadata.researchRunId, "research_1");
assert.equal(scene.metadata.model, "test-model");

const geminiResult = await generateAdCandidatesFromResearch(research, {
  count: 1,
  geminiApiKey: "test-gemini-key",
  geminiModel: "test-gemini-model",
  geminiGenerateContent: async () => JSON.stringify({
    candidates: [
      {
        angleId: "competitor-chatgpt",
        headline: "Your Competitor Shows Up First",
        subheadline: "Buyers ask ChatGPT for recommendations and your competitor shows up first.",
        ctaText: "See the proof",
        headlineType: "contrast",
        selectedPain: "Buyers ask ChatGPT for recommendations and your competitor shows up first.",
        selectedProof: "First ChatGPT mention in 14 days.",
      },
    ],
  }),
});
assert.equal(geminiResult.provider, "gemini");
assert.equal(geminiResult.model, "test-gemini-model");
assert.equal(geminiResult.providerStatus.provider, "gemini");
assert.equal(geminiResult.providerStatus.status, "used");
assert.equal(geminiResult.candidates[0]?.headline, "Your Competitor Shows Up First");

const openRouterFallbackResult = await generateAdCandidatesFromResearch(research, {
  count: 1,
  geminiApiKey: "test-gemini-key",
  geminiGenerateContent: async () => {
    throw new Error("Gemini quota exhausted.");
  },
  openRouterApiKey: "test-openrouter-key",
  openRouterModel: "test-openrouter-model",
  fetcher: async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            candidates: [
              {
                angleId: "tracked-revenue",
                headline: "Tracked Revenue From AI Search",
                subheadline: "First ChatGPT mention in 14 days from managed Reddit visibility campaigns.",
                ctaText: "See the proof",
                headlineType: "receipt_drop",
                selectedPain: "D2C operators are trying to show up when buyers ask AI tools for recommendations.",
                selectedProof: "First ChatGPT mention in 14 days.",
              },
            ],
          }),
        },
      },
    ],
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  }),
});
assert.equal(openRouterFallbackResult.provider, "openrouter");
assert.equal(openRouterFallbackResult.model, "test-openrouter-model");
assert.equal(openRouterFallbackResult.providerStatus.reason.includes("Gemini failed"), true);
assert.equal(openRouterFallbackResult.candidates[0]?.headline, "Tracked Revenue From AI Search");

const deterministicResult = await generateAdCandidatesFromResearch(research, {
  count: 1,
  geminiApiKey: "",
  openRouterApiKey: "",
});
assert.equal(deterministicResult.provider, "deterministic");
assert.equal(deterministicResult.providerStatus.status, "skipped");

const ecommerceResearch: StoredWebsiteResearchResult = {
  ...research,
	  brand: {
	    ...research.brand,
	    name: "David's Cookies",
	    title: "David's Cookies: Cookie Delivery | Gift Baskets | Fresh Baked",
	    description: "We're known for our cookies, but we make so much more, including our fabulous cheesecakes and specialty desserts.",
	  },
	  brandBrief: {
	    brandName: "David's Cookies",
	    offer: "Fresh baked cookies, gift baskets, cheesecakes, and specialty desserts for delivery.",
	    audience: "People sending cookies, gift baskets, and desserts for memorable occasions.",
	    buyerMoments: [
	      "Someone needs a giftable dessert that feels fresh and easy to send.",
	    ],
	    proof: [
	      "We're known for our cookies, but we make so much more, including our fabulous cheesecakes and specialty desserts.",
	      "A box of Fresh Baked Cookies from David's Cookies.",
	    ],
	    siteLanguage: [
	      "Cookie Delivery | Gift Baskets | Fresh Baked",
	      "Fresh Baked Cookies",
	    ],
	    ctaDirection: "Shop fresh cookies",
	    visualNotes: ["Use David's Cookies brand red."],
	    droppedNoiseSummary: [
	      "Continue shopping",
	      "Your cart is empty",
	      "Regular price sale price labels",
	    ],
	    confidence: "high",
	  },
	  evidence: {
    headings: [
      "Cookie Delivery | Gift Baskets | Fresh Baked",
      "Skip to content",
      "Your cart is empty",
      "Continue shopping",
      "Loading...",
    ],
    paragraphs: [
      "We're known for our cookies, but we make so much more, including our fabulous cheesecakes and specialty desserts.",
      "A box of Fresh Baked Cookies from David's Cookies.",
    ],
    receipts: {
      specificClaims: ["From $33.95", "Regular price~~$0.00~~Sale price"],
      buyerMoments: ["Your cart is empty", "Have an account?", "Log in to check out faster."],
      exactSiteLanguage: [
        "David's Cookies: Cookie Delivery | Gift Baskets | Fresh Baked",
        "Continue shopping",
      ],
      namedProof: [],
    },
    rawMarkdown: "# David's Cookies",
  },
};
const ecommerceFallback = buildDeterministicAdCandidates(ecommerceResearch, 50);
const ecommerceText = JSON.stringify(ecommerceFallback);
assert.equal(ecommerceFallback.length, 50);
assert.ok(!ecommerceText.includes("Continue shopping"));
assert.ok(!ecommerceText.includes("Your cart is empty"));
assert.ok(!ecommerceText.includes("Regular price"));
assert.ok(!ecommerceText.includes("Loading"));
assert.ok(ecommerceFallback.every((candidate) => !/#\d+$/.test(candidate.headline)));

console.log("ad-generation tests passed");
