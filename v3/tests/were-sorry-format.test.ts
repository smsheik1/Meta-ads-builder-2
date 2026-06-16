import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildWereSorryPrompt, DEFAULT_WERE_SORRY_VARIANT_COUNT } from "../features/formats/were-sorry/prompt";
import {
  extractWereSorryVariantsFromResponse,
  generateWereSorryVariantsFromResearch,
} from "../features/formats/were-sorry/generate";
import { createWereSorryAdScene } from "../features/scene/createWereSorryScene";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { rerollScene, createDefaultSceneLocks } from "../features/create/reroll";
import { assertSavableAdScene, createSavedDesignId, restoreSavedDesignSelection } from "../features/create/savedDesigns";
import type { StoredWebsiteResearchResult } from "../features/research/types";

const research: StoredWebsiteResearchResult = {
  sessionId: "session_1",
  researchRunId: "research_1",
  brandSnapshotId: "brand_1",
  websiteUrl: "https://agentenamel.com/",
  finalUrl: "https://agentenamel.com/",
  host: "agentenamel.com",
  brand: {
    name: "Agent Enamel",
    url: "https://agentenamel.com/",
    host: "agentenamel.com",
    title: "Agent Enamel",
    description: "An AI receptionist that answers dental calls and books patients.",
    faviconUrl: null,
    logoUrl: "https://cdn.example/logo.png",
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#22C55E", "#0F172A"],
    fonts: {
      feel: "sans",
    },
    vibeTags: ["calm"],
  },
  brandBrief: {
    brandName: "Agent Enamel",
    offer: "An AI receptionist that answers dental calls and books patients.",
    audience: "Dental practices missing calls while the front desk is busy.",
    buyerMoments: [
      "The patient called while the front desk was already juggling check-ins.",
      "After-hours callers leave before anyone can call back.",
    ],
    proof: [
      "Answers calls and books patients.",
      "Built for dental practices.",
    ],
    siteLanguage: ["AI receptionist", "Books patients"],
    ctaDirection: "Book a demo",
    visualNotes: [],
    droppedNoiseSummary: [],
    confidence: "high",
  },
  evidence: {
    headings: ["AI receptionist for dental practices"],
    paragraphs: ["An AI receptionist that answers dental calls and books patients."],
    receipts: {
      specificClaims: ["Answers calls and books patients."],
      buyerMoments: ["The patient called while the front desk was busy."],
      exactSiteLanguage: ["AI receptionist"],
      namedProof: [],
    },
    rawMarkdown: "# Agent Enamel",
  },
  metadata: {},
  branding: {},
  providerStatus: [],
};

const variants = Array.from({ length: DEFAULT_WERE_SORRY_VARIANT_COUNT }, (_, index) => ({
  angle: `distinct angle ${index + 1}`,
  apologyHeader: index === 0 ? "An Official Apology" : `Official Apology ${index + 1}`,
  legalOpener: index === 0
    ? "It has come to our attention that some calls stopped slipping away."
    : `We take full responsibility for buyer moment ${index + 1}.`,
  confessions: index === 0
    ? [
      "We apologize that your front desk stopped losing calls after lunch.",
      "We regret that more callers found a path onto the schedule.",
    ]
    : [
      `We apologize for making buyer pain ${index + 1} easier to spot.`,
      `We regret that proof point ${index + 1} became harder to ignore.`,
    ],
  signoff: "Sincerely, Agent Enamel",
  selfCheckPassed: "The wrapper reads real and the confessions are specific.",
}));

const payload = { variants };
const parsed = extractWereSorryVariantsFromResponse(JSON.stringify(payload));
assert.equal(parsed.length, DEFAULT_WERE_SORRY_VARIANT_COUNT);
assert.deepEqual(parsed[0], variants[0]);

const prompt = buildWereSorryPrompt(research);
assert.ok(prompt.includes("Official Apology"));
assert.ok(prompt.includes("HARD SAFETY GATE"));
assert.ok(prompt.includes("Every confession = a real benefit"));
assert.ok(prompt.includes("Only mention a discount, coupon, sale, free offer, or stock-out if the brand context explicitly says it"));
assert.ok(prompt.includes("\"variants\""));

assert.throws(
  () => extractWereSorryVariantsFromResponse(JSON.stringify({
    variants: [
      {
        angle: "generic",
        apologyHeader: "An Official Apology",
        legalOpener: "We take full responsibility for revolutionary growth.",
        confessions: ["We unlock game-changing value.", "We elevate everything."],
        signoff: "Sincerely, Agent Enamel",
      },
    ],
  })),
  /incomplete we're sorry variants/,
);

assert.throws(
  () => extractWereSorryVariantsFromResponse(JSON.stringify({
    suitable: false,
    reason: "Trust-sensitive territory.",
  })),
  /marked we're sorry format unsuitable/,
);

await assert.rejects(
  () => generateWereSorryVariantsFromResearch(research, {
    nvidiaNimApiKey: "",
    nvidiaNimModel: "test-kimi-model",
  }),
  /NVIDIA NIM we're sorry generation is not configured/,
);

const retryResult = await generateWereSorryVariantsFromResearch(research, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-kimi-model",
  nvidiaNimChatCompletion: async ({ prompt: callPrompt }) => {
    if (callPrompt.includes("previous output was invalid")) return JSON.stringify(payload);
    return JSON.stringify({ variants: [] });
  },
});
assert.equal(retryResult.provider, "nvidia-nim");
assert.equal(retryResult.model, "test-kimi-model");
assert.equal(retryResult.variants.length, DEFAULT_WERE_SORRY_VARIANT_COUNT);

let defaultTimeoutMs = 0;
await generateWereSorryVariantsFromResearch(research, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-kimi-model",
  nvidiaNimChatCompletion: async ({ timeoutMs }) => {
    defaultTimeoutMs = timeoutMs;
    return JSON.stringify(payload);
  },
});
assert.ok(defaultTimeoutMs >= 60_000, "We're Sorry generation needs a longer timeout than the default 30s NIM call.");

await assert.rejects(
  () => generateWereSorryVariantsFromResearch(research, {
    nvidiaNimApiKey: "test-key",
    nvidiaNimModel: "test-kimi-model",
    nvidiaNimChatCompletion: async () => {
      throw new Error("provider exploded");
    },
  }),
  /NVIDIA NIM we're sorry generation failed: provider exploded/,
);

const scenes = parsed.map((variant, index) => createWereSorryAdScene({
  research,
  variant,
  candidateIndex: index,
  generationBatchId: "sorry-batch",
  model: "test-model",
  provider: "nvidia-nim",
  now: 123,
}));

assert.equal(scenes.length, DEFAULT_WERE_SORRY_VARIANT_COUNT);
assert.ok(scenes.every((scene) => scene.format === "were-sorry"));
assert.equal(scenes[0]!.layout.preset, "were-sorry-poster");
assert.equal(scenes[0]!.creative.headline, variants[0]!.apologyHeader);
assert.deepEqual(scenes[0]!.layout.confessions, variants[0]!.confessions);
assert.equal(scenes[0]!.style.accentColor, "#22C55E");

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: scenes[0]!,
}));
assert.ok(html.includes('data-format="were-sorry"'));
assert.ok(html.includes('data-were-sorry-card="true"'));
assert.ok(html.includes("An Official Apology"));
assert.ok(html.includes('data-were-sorry-confessions="true"'));
assert.ok(html.includes("We apologize that your front desk stopped losing calls after lunch."));
assert.ok(html.includes("Sincerely, Agent Enamel"));
assert.ok(html.includes("https://cdn.example/logo.png"));

const rerolled = rerollScene(scenes, scenes[0]!, 0, createDefaultSceneLocks());
assert.equal(rerolled.index, 1);
assert.equal(rerolled.scene?.format, "were-sorry");
assert.equal(rerolled.scene?.creative.headline, variants[1]!.apologyHeader);

const savedDesign = {
  id: createSavedDesignId(scenes[0]!),
  title: scenes[0]!.creative.headline,
  format: scenes[0]!.format,
  scene: scenes[0]!,
  createdAt: 1,
  updatedAt: 2,
};
assert.equal(assertSavableAdScene(scenes[0]!), scenes[0]);
const restored = restoreSavedDesignSelection({ scenes: [], design: savedDesign });
assert.equal(restored.selectedScene.format, "were-sorry");

console.log("were-sorry-format tests passed");
