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
  apology: index === 0
    ? "Sorry your front desk has competition now."
    : `Sorry missed calls got called out ${index + 1}.`,
  makeGood: index === 0
    ? "Agent Enamel answers the dental calls that used to slip."
    : `A real buyer moment, written without fake proof ${index + 1}.`,
  ctaText: "Book a demo",
  selectedPain: `buyer pain ${index + 1}`,
  selectedProof: index % 2 ? "Answers calls and books patients." : "",
}));

const payload = { variants };
const parsed = extractWereSorryVariantsFromResponse(JSON.stringify(payload));
assert.equal(parsed.length, DEFAULT_WERE_SORRY_VARIANT_COUNT);
assert.deepEqual(parsed[0], variants[0]);

const prompt = buildWereSorryPrompt(research);
assert.ok(prompt.includes("Write exactly 8 distinct \"We're sorry\" ad variants"));
assert.ok(prompt.includes("Only mention a discount, coupon, stock-out, sale, or free offer if the BRAND CONTEXT explicitly says it"));
assert.ok(prompt.includes("If proof is thin, build the joke on the buyer moment or pain alone"));
assert.ok(prompt.includes("\"variants\""));

assert.throws(
  () => extractWereSorryVariantsFromResponse(JSON.stringify({
    variants: [
      {
        angle: "generic",
        apology: "Unlock revolutionary growth",
        makeGood: "Premium solution for everyone",
        ctaText: "Learn more",
      },
    ],
  })),
  /incomplete we're sorry variants/,
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
assert.equal(scenes[0]!.creative.headline, variants[0]!.apology);
assert.equal(scenes[0]!.style.accentColor, "#22C55E");

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: scenes[0]!,
}));
assert.ok(html.includes('data-format="were-sorry"'));
assert.ok(html.includes('data-were-sorry-card="true"'));
assert.ok(html.includes("Sorry your front desk has competition now."));
assert.ok(html.includes("Book a demo"));
assert.ok(html.includes("https://cdn.example/logo.png"));

const rerolled = rerollScene(scenes, scenes[0]!, 0, createDefaultSceneLocks());
assert.equal(rerolled.index, 1);
assert.equal(rerolled.scene?.format, "were-sorry");
assert.equal(rerolled.scene?.creative.headline, variants[1]!.apology);

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
