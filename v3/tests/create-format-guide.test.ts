import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CREATE_FORMAT_GUIDES,
  CREATE_FORMAT_GUIDE_ORDER,
} from "../app/create/createFormatEducation";
import {
  PRODUCT_PHOTOSHOOT_FORMAT,
  isComingSoonCreateFormat,
  type CreateFormatId,
} from "../app/create/createFormats";

const expectedFormats: CreateFormatId[] = [
  "meme",
  "were-sorry",
  "video-meme",
  "jingle",
  "text-message",
  "brainrot",
  "reviews",
  "motion-story",
  "three-d-breakdown",
  PRODUCT_PHOTOSHOOT_FORMAT,
  "visualizer",
];

assert.deepEqual([...CREATE_FORMAT_GUIDE_ORDER].sort(), [...expectedFormats].sort());

for (const format of expectedFormats) {
  const guide = CREATE_FORMAT_GUIDES[format];
  assert.equal(guide.format, format);
  assert.ok(guide.label);
  assert.ok(guide.promise);
  assert.ok(guide.why);
  assert.ok(guide.bestForExample);
  assert.ok(guide.skipWhen);
  assert.ok(guide.bestFor.length);
  assert.ok(guide.output);
  assert.ok(guide.needs.length);
  assert.ok(guide.cost);
}

const productPhotoshootChips = CREATE_FORMAT_GUIDES[PRODUCT_PHOTOSHOOT_FORMAT].bestFor as readonly string[];
assert.ok(productPhotoshootChips.includes("Asset"));
assert.ok(!productPhotoshootChips.includes("Conversion"));
assert.equal(isComingSoonCreateFormat("motion-story"), true);
assert.equal(isComingSoonCreateFormat("three-d-breakdown"), false);

const threeDBreakdownGuide = CREATE_FORMAT_GUIDES["three-d-breakdown"];
assert.equal(threeDBreakdownGuide.output, "5 directions → 1 script");
assert.ok(threeDBreakdownGuide.why.includes("five consequence-first story directions"));
assert.ok(threeDBreakdownGuide.why.includes("you choose one script"));

const guideSource = readFileSync("app/create/CreateFormatGuide.tsx", "utf8");

assert.ok(guideSource.includes("data-create-format-compare-trigger"));
assert.ok(guideSource.includes("Coming soon"));
assert.ok(guideSource.includes("disabled={comingSoon}"));
assert.ok(!guideSource.includes("AdRenderSurface"));

console.log("create-format-guide tests passed");
