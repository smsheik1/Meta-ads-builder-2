import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const builderSource = readFileSync("features/builder/MakerBuilderClient.tsx", "utf8");
const createPageSource = readFileSync("app/create/page.tsx", "utf8");
const testClientSource = readFileSync("app/create/MakerFormatTestClient.tsx", "utf8");
const testRouteSource = readFileSync("app/api/maker/test-format/route.ts", "utf8");

assert.match(builderSource, /Test with a brand/);
assert.match(builderSource, /\/create\?makerTest=/);
assert.match(createPageSource, /params\.makerTest/);
assert.match(createPageSource, /MakerFormatTestClient/);
assert.match(testClientSource, /Maker Test Mode/);
assert.match(testClientSource, /Back to builder/);
assert.match(testClientSource, /api\.researchRuns\.runWebsiteResearch/, "Maker Test Mode must reuse the existing research action.");
assert.match(testClientSource, /Product to advertise/);
assert.match(testClientSource, /Full creative brief/);
assert.match(testClientSource, /Generate test ads/);
assert.match(testClientSource, /event\.code !== "Space"/);
assert.match(testClientSource, /\(index \+ 1\) % scenes\.length/);
assert.match(testClientSource, /AdRenderSurface/);
assert.match(testClientSource, /previewCanvas\.width.*previewCanvas\.height/, "Maker test preview must preserve the scene's canvas ratio.");
assert.doesNotMatch(testClientSource, /data-maker-test-preview[^>]*aspect-square/, "Maker test preview must not crush non-square Formats into a square.");
assert.match(testClientSource, /createMakerFormatTestScenes/);
assert.match(testClientSource, /loadLocalDraft/);
assert.doesNotMatch(testClientSource, /saveLocalDraft|publishLocalDraft|Replicate|image generation/i);
assert.match(testRouteSource, /generateMakerFormatTestVariations/);
assert.match(testRouteSource, /contract\.questions\.some/, "The API must reject unanswered Maker questions.");
assert.doesNotMatch(testRouteSource, /fallback|retry|REPLICATE_API_TOKEN|OPENROUTER_API_KEY/i);

console.log("maker format test flow tests passed");
