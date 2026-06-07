import assert from "node:assert/strict";
import {
  buildDeterministicAdCandidates,
  extractAdCandidatesFromResponse,
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

assert.equal(
  normalizeAdCandidatePayload({
    ...fallback,
    headline: "Unlock Your AI Potential",
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

console.log("ad-generation tests passed");
