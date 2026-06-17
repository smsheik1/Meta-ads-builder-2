import assert from "node:assert/strict";
import {
  buildAdAnglesPrompt,
  extractAdAnglesFromResearch,
  normalizeAdAnglesPayload,
} from "../features/research/adAngles";
import { makeResearch } from "./helpers/research";

const research = makeResearch({
  brand: {
    ...makeResearch().brand,
    name: "Agent Enamel",
    title: "Agent Enamel | AI dental receptionist",
    description: "AI receptionist for dental practices that answers calls and books appointments.",
    logoUrl: null,
    colors: ["#19C37D"],
    vibeTags: [],
  },
  brandBrief: {
    brandName: "Agent Enamel",
    offer: "AI receptionist for dental practices.",
    audience: "Dental practice owners who miss calls when staff are busy or closed.",
    buyerMoments: ["Patients call after hours and nobody is at the desk."],
    proof: ["Answers calls and books appointments."],
    siteLanguage: ["AI dental receptionist", "books appointments"],
    ctaDirection: "Hear it answer",
    visualNotes: [],
    droppedNoiseSummary: [],
    confidence: "medium",
  },
  adAngles: [],
  evidence: {
    headings: ["AI dental receptionist", "Never miss another patient call"],
    paragraphs: ["Agent Enamel answers calls and books appointments for dental practices."],
    receipts: {
      specificClaims: ["Answers calls and books appointments."],
      buyerMoments: ["Patients call after hours and nobody is at the desk."],
      exactSiteLanguage: ["AI dental receptionist"],
      namedProof: [],
    },
    rawMarkdown: "AI dental receptionist\nAnswers calls and books appointments.",
  },
  metadata: {},
  branding: {},
  providerStatus: [],
});

const prompt = buildAdAnglesPrompt(research);
assert.ok(prompt.includes("You are extracting AD ANGLES"));
assert.ok(prompt.includes("Return ONLY a JSON array"));

const normalized = normalizeAdAnglesPayload([
  {
    buyer: "solo dental practice owner",
    moment: "the patient called after closing",
    pain: "the practice loses the booking window",
    proof: "answers calls and books appointments",
    sitePhrase: "books appointments",
  },
  {
    buyer: "duplicate",
    moment: "the patient called after closing",
    pain: "same",
    proof: "answers calls and books appointments",
    sitePhrase: "books appointments",
  },
  { buyer: "thin" },
]);
assert.equal(normalized.length, 1);
assert.equal(normalized[0]?.sitePhrase, "books appointments");

const generated = await extractAdAnglesFromResearch(research, {
  nvidiaNimApiKey: "test-nim-key",
  nvidiaNimChatCompletion: async () => JSON.stringify(normalized),
});
assert.equal(generated.adAngles.length, 1);
assert.equal(generated.providerStatus.provider, "ad-angles");
assert.equal(generated.providerStatus.status, "used");

const failed = await extractAdAnglesFromResearch(research, {
  nvidiaNimApiKey: "test-nim-key",
  nvidiaNimChatCompletion: async () => {
    throw new Error("angle model unavailable");
  },
  geminiApiKey: "",
});
assert.deepEqual(failed.adAngles, []);
assert.equal(failed.providerStatus.status, "failed");

console.log("ad-angles tests passed");
