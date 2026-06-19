import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildTextMessagePrompt, DEFAULT_TEXT_MESSAGE_VARIANT_COUNT } from "../features/formats/text-message/prompt";
import {
  extractTextMessageVariantsFromResponse,
  generateTextMessageVariantsFromResearch,
} from "../features/formats/text-message/generate";
import { createTextMessageAdScene } from "../features/scene/createTextMessageScene";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { rerollScene, createDefaultSceneLocks } from "../features/create/reroll";
import { makeResearch } from "./helpers/research";

const research = makeResearch({
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
    buyerMoments: ["The patient called while the front desk was already juggling check-ins."],
    proof: ["Answers calls and books patients."],
    siteLanguage: ["AI receptionist", "Books patients"],
    ctaDirection: "Book a demo",
    visualNotes: [],
    droppedNoiseSummary: [],
    confidence: "high",
  },
});

const makeVariant = (index: number) => ({
  angle: `missed call moment ${index}`,
  contactName: index % 2 ? "Maya" : "Jordan",
  timestampLabel: "Today 9:41 AM",
  messages: [
    { side: "left", text: "did your office answer calls at lunch?" },
    { side: "left", text: "ours used to miss them nonstop" },
    { side: "right", text: "not when front desk was slammed" },
    { side: "left", text: index === 0 ? "ours added Agent Enamel" : `ours fixed lunch calls ${index}` },
    { side: "right", text: "send me that" },
  ],
  selfCheckPassed: "Four short messages, both sides, fits one screen.",
});

const variants = Array.from({ length: DEFAULT_TEXT_MESSAGE_VARIANT_COUNT }, (_, index) => makeVariant(index));
const parsed = extractTextMessageVariantsFromResponse(JSON.stringify({ variants }), "Agent Enamel");
assert.equal(parsed.length, DEFAULT_TEXT_MESSAGE_VARIANT_COUNT);
assert.deepEqual(parsed[0], variants[0]);

const sixMessageVariant = {
  ...makeVariant(0),
  messages: [...makeVariant(0).messages, { side: "left", text: "it actually booked" }],
};
assert.equal(
  extractTextMessageVariantsFromResponse(JSON.stringify({ variants: [sixMessageVariant] }), "Agent Enamel", 1)[0]!.messages.length,
  6,
  "Six short messages must remain valid for older generated scenes.",
);

const prompt = buildTextMessagePrompt(research);
assert.ok(prompt.includes("STATIC phone screenshot"));
assert.ok(prompt.includes("side values only"));
assert.ok(prompt.includes("Max 80 characters per message"));
assert.ok(prompt.includes("\"variants\""));

const invalidCases = [
  {
    name: "one side only",
    payload: { variants: [{ ...makeVariant(0), messages: makeVariant(0).messages.map((message) => ({ ...message, side: "left" })) }] },
  },
  {
    name: "overlong message",
    payload: { variants: [{ ...makeVariant(0), messages: [{ side: "left", text: "x".repeat(81) }, ...makeVariant(0).messages.slice(1)] }] },
  },
  {
    name: "brand spam",
    payload: { variants: [{ ...makeVariant(0), messages: [{ side: "left", text: "Agent Enamel helped" }, { side: "right", text: "Agent Enamel?" }, { side: "left", text: "yep" }, { side: "right", text: "send it" }] }] },
  },
  {
    name: "hype phrase",
    payload: { variants: [{ ...makeVariant(0), messages: [{ side: "left", text: "ready to unlock growth?" }, ...makeVariant(0).messages.slice(1)] }] },
  },
  {
    name: "duplicate message",
    payload: { variants: [{ ...makeVariant(0), messages: [{ side: "left", text: "same" }, { side: "right", text: "same" }, { side: "left", text: "ok" }, { side: "right", text: "done" }] }] },
  },
];

for (const invalid of invalidCases) {
  assert.throws(
    () => extractTextMessageVariantsFromResponse(JSON.stringify(invalid.payload), "Agent Enamel", 1),
    /incomplete text message variants/,
    invalid.name,
  );
}

await assert.rejects(
  () => generateTextMessageVariantsFromResearch(research, {
    nvidiaNimApiKey: "",
    nvidiaNimModel: "test-kimi-model",
  }),
  /NVIDIA NIM text message generation is not configured/,
);

const retryResult = await generateTextMessageVariantsFromResearch(research, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-kimi-model",
  nvidiaNimChatCompletion: async ({ prompt: callPrompt }) => {
    if (callPrompt.includes("previous output was invalid")) return JSON.stringify({ variants });
    return JSON.stringify({ variants: [] });
  },
});
assert.equal(retryResult.provider, "nvidia-nim");
assert.equal(retryResult.variants.length, DEFAULT_TEXT_MESSAGE_VARIANT_COUNT);

const scenes = parsed.map((variant, index) => createTextMessageAdScene({
  research,
  variant,
  candidateIndex: index,
  generationBatchId: "texts-batch",
  model: "test-model",
  provider: "nvidia-nim",
  now: 123,
}));

assert.equal(scenes[0]!.format, "text-message");
assert.equal(scenes[0]!.layout.preset, "text-message-screenshot");
assert.equal(scenes[0]!.layout.messages[0]!.side, "left");
assert.equal(scenes[0]!.style.accentColor, "#22C55E");

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: scenes[0]!,
}));
assert.ok(html.includes('data-format="text-message"'));
assert.ok(html.includes('data-text-message-bubble="left"'));
assert.ok(html.includes('data-text-message-bubble="right"'));
assert.ok(html.includes('data-text-message-tail="true"'));
assert.ok(html.includes('data-text-message-tail="false"'));
assert.ok(html.includes('data-text-message-tail-cutout="true"'));
assert.ok(html.includes("did your office answer calls at lunch?"));
assert.ok(html.includes("iMessage"));
assert.ok(html.includes("95"));
assert.ok(html.includes("background-color:#0A84FF"));
assert.ok(html.includes("border-radius:4.1cqw 4.1cqw 1.1cqw 4.1cqw"));

const rerolled = rerollScene(scenes, scenes[0]!, 0, createDefaultSceneLocks());
assert.equal(rerolled.index, 1);
assert.equal(rerolled.scene?.format, "text-message");
assert.equal(rerolled.scene?.layout.contactName, variants[1]!.contactName);

console.log("text-message-format tests passed");
