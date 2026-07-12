import assert from "node:assert/strict";
import { makerAnalysisFixture } from "../features/builder/fixture";
import {
  callGemmaReferenceAnalysis,
  callSam3AssetRefinement,
} from "../features/builder/referenceAnalysis.server";
import type { PaddleOcrResult } from "../features/builder/referenceAnalysis";

const ocr: PaddleOcrResult = {
  width: 1080,
  height: 1080,
  texts: Array.from({ length: 20 }, (_, index) => ({
    id: `text_${String(index + 1).padStart(2, "0")}`,
    text: `Evidence ${index + 1}`,
    confidence: 0.99,
    polygon: [[0, 0], [100, 0], [100, 40], [0, 40]],
    textColor: "#111111",
  })),
};

let gemmaRequests = 0;
const gemmaBodies: Record<string, unknown>[] = [];
const gemma = await callGemmaReferenceAnalysis({
  apiKey: "test-key",
  imageUrl: "data:image/jpeg;base64,test",
  ocr,
  fetcher: async (_url, init) => {
    gemmaRequests += 1;
    gemmaBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(makerAnalysisFixture) } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
});
assert.equal(gemma.analysis.formula.premise, makerAnalysisFixture.formula.premise);
assert.equal(gemmaRequests, 1, "Gemma must run once with no retry.");
assert.equal(gemmaBodies[0]?.model, "google/gemma-4-31b-it");
assert.equal((gemmaBodies[0]?.response_format as { type?: string }).type, "json_schema");

let emptySamRequests = 0;
const emptySam = await callSam3AssetRefinement({
  assets: [],
  imageUrl: "data:image/jpeg;base64,test",
  token: "test-token",
  fetcher: async () => {
    emptySamRequests += 1;
    throw new Error("SAM should not run");
  },
});
assert.equal(emptySamRequests, 0, "SAM must not run when no non-locked asset needs refinement.");
assert.deepEqual(emptySam.results, []);

let samRequests = 0;
const samBodies: Record<string, unknown>[] = [];
const sam = await callSam3AssetRefinement({
  assets: [makerAnalysisFixture.assets[0]!],
  imageUrl: "data:image/jpeg;base64,test",
  token: "test-token",
  fetcher: async (url, init) => {
    samRequests += 1;
    if (String(url).includes("predictions")) {
      samBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ status: "succeeded", output: { results: ["https://fixture.test/result.json"] } }), { status: 201 });
    }
    return new Response(JSON.stringify({ boxes: [[1, 2, 3, 4]], scores: [0.9], masks: [[[1]]], masks_offset: [[1, 2]] }), { status: 200 });
  },
});
assert.equal(samRequests, 2);
assert.equal(sam.results[0]?.assetId, "brand_mark");
assert.equal(((samBodies[0]?.input as { prompts?: string[] }).prompts || []).length, 1);

console.log("maker reference provider tests passed");
