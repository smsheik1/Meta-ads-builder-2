import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildMemePrompt } from "../features/formats/meme/prompt";
import {
  buildDeterministicMemeVariants,
  extractMemeVariantsFromResponse,
  generateMemeVariantsFromResearch,
} from "../features/formats/meme/generate";
import { MEME_TEMPLATES } from "../features/formats/meme/templates";
import { createMemeAdScene } from "../features/scene/createMemeScene";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { rerollScene, createDefaultSceneLocks } from "../features/create/reroll";
import { assertSavableAdScene, createSavedDesignId, restoreSavedDesignSelection } from "../features/create/savedDesigns";
import type { StoredWebsiteResearchResult } from "../features/research/types";

const research: StoredWebsiteResearchResult = {
  sessionId: "session_1",
  researchRunId: "research_1",
  brandSnapshotId: "brand_1",
  websiteUrl: "https://davidscookies.com/",
  finalUrl: "https://davidscookies.com/",
  host: "davidscookies.com",
  brand: {
    name: "David's Cookies",
    url: "https://davidscookies.com/",
    host: "davidscookies.com",
    title: "David's Cookies",
    description: "Fresh baked cookies and brownies delivered for gifts, parties, and cravings.",
    faviconUrl: null,
    logoUrl: null,
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#0F172A", "#F97316"],
    fonts: {
      feel: "sans",
    },
    vibeTags: ["giftable"],
  },
  brandBrief: {
    brandName: "David's Cookies",
    offer: "Fresh baked cookies and brownies delivered for gifts, parties, and cravings.",
    audience: "People who need an easy dessert gift or last-minute treat.",
    buyerMoments: [
      "Forgot a birthday and need a gift fast.",
      "Need dessert for the office party.",
    ],
    proof: [
      "Fresh baked cookies shipped nationwide.",
      "Gift baskets, brownies, and cookie tins.",
    ],
    siteLanguage: ["Cookie gifts", "Dessert delivery"],
    ctaDirection: "Shop cookies",
    visualNotes: [],
    droppedNoiseSummary: [],
    confidence: "high",
  },
  evidence: {
    headings: ["Cookie gifts", "Dessert delivery"],
    paragraphs: ["Fresh baked cookies and brownies delivered for gifts, parties, and cravings."],
    receipts: {
      specificClaims: ["Fresh baked cookies shipped nationwide."],
      buyerMoments: ["Need dessert for the office party."],
      exactSiteLanguage: ["Cookie gifts"],
      namedProof: [],
    },
    rawMarkdown: "# David's Cookies",
  },
  metadata: {},
  branding: {},
  providerStatus: [],
};

assert.equal(MEME_TEMPLATES.length, 4);
assert.deepEqual(MEME_TEMPLATES.map((template) => template.id), [
  "drake",
  "woman_yelling_cat",
  "this_is_fine",
  "expanding_brain",
]);

const payload = {
  variants: MEME_TEMPLATES.map((template) => ({
    templateId: template.id,
    x: 100,
    y: 200,
    slots: Object.fromEntries(template.slots.map((slot) => [slot.id, `copy ${slot.id}`.slice(0, slot.maxChars)])),
  })),
};
const parsed = extractMemeVariantsFromResponse(JSON.stringify(payload));
assert.equal(parsed.length, 4);
assert.ok(!("x" in parsed[0]!));

const prompt = buildMemePrompt(research);
assert.ok(prompt.includes("Your taste filter rejects generic SaaS phrasing"));
assert.ok(prompt.includes("Each slot must be a complete thought"));
assert.ok(prompt.includes("Posts people actually steal"));
assert.ok(!prompt.includes("maxWords"));

assert.throws(
  () => extractMemeVariantsFromResponse(JSON.stringify({
    variants: [
      {
        templateId: "this_is_fine",
        slots: { topText: "this is fine", bottomText: "stay calm" },
      },
    ],
  })),
  /incomplete meme variants/,
);

assert.throws(
  () => extractMemeVariantsFromResponse(JSON.stringify({
    variants: MEME_TEMPLATES.map((template) => ({
      templateId: template.id,
      slots: Object.fromEntries(template.slots.map((slot) => [
        slot.id,
        slot.id === "level1Text"
          ? "x".repeat(slot.maxChars + 1)
          : `copy ${slot.id}`.slice(0, slot.maxChars),
      ])),
    })),
  })),
  /incomplete meme variants/,
);

assert.throws(
  () => extractMemeVariantsFromResponse(JSON.stringify({
    variants: MEME_TEMPLATES.map((template) => ({
      templateId: template.id,
      slots: Object.fromEntries(template.slots.map((slot) => [
        slot.id,
        template.id === "woman_yelling_cat" && slot.id === "yellingText"
          ? "Tired of paying for ads that get"
          : `copy ${slot.id}`.slice(0, slot.maxChars),
      ])),
    })),
  })),
  /incomplete meme variants/,
);

const repaired = extractMemeVariantsFromResponse(JSON.stringify({
  variants: MEME_TEMPLATES.map((template) => ({
    templateId: template.id,
    slots: Object.fromEntries(template.slots.map((slot) => [
      slot.id,
      slot.id === "level1Text"
        ? "A managed service that ranks brands on ChatGPT and Reddit"
        : `copy ${slot.id}`.slice(0, slot.maxChars),
    ])),
  })),
}), { repairSlotText: true, providerLabel: "NVIDIA NIM" });
assert.equal(repaired.length, 4);
assert.ok(repaired.every((variant) => Object.values(variant.slots).every((value) => value.length > 0)));
assert.ok(repaired.every((variant) => {
  const template = MEME_TEMPLATES.find((item) => item.id === variant.templateId)!;
  return template.slots.every((slot) => variant.slots[slot.id]!.length <= slot.maxChars);
}));

const retryResult = await generateMemeVariantsFromResearch(research, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-kimi-model",
  nvidiaNimChatCompletion: async ({ prompt }) => {
    if (prompt.includes("previous output was invalid")) return JSON.stringify(payload);
    return JSON.stringify({
      variants: [
        {
          templateId: "drake",
          slots: {
            topText: "x".repeat(200),
            bottomText: "Shop cookies",
          },
        },
      ],
    });
  },
});
assert.equal(retryResult.provider, "nvidia-nim");
assert.equal(retryResult.model, "test-kimi-model");
assert.equal(retryResult.providerStatus.provider, "nvidia-nim");
assert.equal(retryResult.variants.length, 4);

const brandCases = [
  research,
  {
    ...research,
    brand: {
      ...research.brand,
      name: "Acme CRM",
      description: "A CRM that keeps sales follow-ups from falling through the cracks.",
    },
    brandBrief: {
      ...research.brandBrief,
      brandName: "Acme CRM",
      offer: "A CRM that keeps sales follow-ups from falling through the cracks.",
      audience: "Small sales teams juggling too many leads.",
      buyerMoments: ["A hot lead goes cold because nobody followed up."],
      proof: ["Follow-up reminders and pipeline tracking in one place."],
      siteLanguage: ["Never miss the next follow-up"],
      ctaDirection: "Try Acme CRM",
    },
  },
  {
    ...research,
    brand: {
      ...research.brand,
      name: "CalmDesk",
      description: "A support inbox that turns angry tickets into clear next steps.",
    },
    brandBrief: {
      ...research.brandBrief,
      brandName: "CalmDesk",
      offer: "A support inbox that turns angry tickets into clear next steps.",
      audience: "Support teams drowning in messy customer threads.",
      buyerMoments: ["The inbox is on fire before lunch."],
      proof: ["Triage, ownership, and suggested replies in one workspace."],
      siteLanguage: ["Make support feel calmer"],
      ctaDirection: "Try CalmDesk",
    },
  },
];

for (const brandCase of brandCases) {
  const result = await generateMemeVariantsFromResearch(brandCase, {
    nvidiaNimApiKey: "test-key",
    nvidiaNimModel: "test-kimi-model",
    nvidiaNimChatCompletion: async () => JSON.stringify(payload),
  });
  assert.equal(result.provider, "nvidia-nim");
  assert.equal(result.variants.length, MEME_TEMPLATES.length);
}

const deterministic = buildDeterministicMemeVariants(research);
assert.ok(Object.values(deterministic[0]!.slots).every((value) => !/\b(and|for|that|on|get)$/i.test(value)));
const scenes = deterministic.map((variant, index) => createMemeAdScene({
  research,
  variant,
  candidateIndex: index,
  generationBatchId: "meme-batch",
  model: "test-model",
  provider: "deterministic",
  now: 123,
}));

assert.equal(scenes.length, 4);
assert.ok(scenes.every((scene) => scene.format === "meme"));
assert.equal(scenes[0]!.layout.templateId, "drake");

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: scenes[0]!,
}));
assert.ok(html.includes('data-format="meme"'));
assert.ok(html.includes('data-meme-template="drake"'));
assert.ok(html.includes('data-meme-artboard="drake"'));
assert.ok(html.includes("/memes/drake.png"));
assert.ok(html.includes('data-meme-slot="topText"'));

const rerolled = rerollScene(scenes, scenes[0]!, 0, createDefaultSceneLocks());
assert.equal(rerolled.index, 1);
assert.equal(rerolled.scene?.format, "meme");
assert.equal(rerolled.scene?.layout.templateId, "woman_yelling_cat");
assert.ok(deterministic.some((variant) => variant.templateId === "this_is_fine" && "topText" in variant.slots && "bottomText" in variant.slots));
assert.ok(deterministic.some((variant) => variant.templateId === "woman_yelling_cat" && "yellingText" in variant.slots && "catResponseText" in variant.slots));

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
assert.equal(restored.selectedScene.format, "meme");
assert.equal(restored.selectedScene.layout.templateId, "drake");

console.log("meme-format tests passed");
