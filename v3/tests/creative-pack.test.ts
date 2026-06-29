import assert from "node:assert/strict";
import {
  CREATIVE_PACK_HARD_TIMEOUT_MS,
  CREATIVE_PACK_MONEY_SHOT_READY_COUNT,
  CREATIVE_PACK_CONCURRENCY,
  CREATIVE_PACK_FORMATS,
  CREATIVE_PACK_SHOWCASE_PRIORITY,
  CREATIVE_PACK_SOFT_TIMEOUT_MS,
  isCreativePackAudioFormat,
  isCreativePackFormat,
  isCreativePackTerminalStatus,
} from "../features/create/creativePack";

const formatIds = CREATIVE_PACK_FORMATS.map((item) => item.format);
const formatIdStrings = formatIds as readonly string[];
assert.deepEqual(
  formatIds,
  ["reviews", "video-meme", "meme", "text-message", "were-sorry", "visualizer", "jingle", "brainrot"],
  "Creative Pack must include cheap text/image/audio formats in the planned shell-wave order.",
);
assert.deepEqual(
  Object.fromEntries(CREATIVE_PACK_FORMATS.map((item) => [item.format, item.count])),
  {
    reviews: 4,
    "video-meme": 3,
    meme: 4,
    "text-message": 4,
    "were-sorry": 4,
    visualizer: 1,
    jingle: 1,
    brainrot: 1,
  },
  "Creative Pack must use lightweight pack-specific generation counts.",
);
assert.equal(formatIdStrings.includes("product-photoshoot"), false, "Creative Pack must not trigger product photoshoot image generation.");
assert.equal(CREATIVE_PACK_CONCURRENCY, 3, "Creative Pack must run exactly three format generations at once.");
assert.equal(CREATIVE_PACK_SOFT_TIMEOUT_MS, 20_000, "Creative Pack must mark slow cards as still cooking after 20 seconds.");
assert.equal(CREATIVE_PACK_HARD_TIMEOUT_MS, 60_000, "Creative Pack must mark cards needs retry after 60 seconds.");
assert.equal(CREATIVE_PACK_MONEY_SHOT_READY_COUNT, 5, "Creative Pack money-shot threshold must fire when five directions are ready.");
assert.deepEqual(
  CREATIVE_PACK_SHOWCASE_PRIORITY,
  ["jingle", "brainrot", "visualizer", "video-meme", "reviews", "text-message", "meme", "were-sorry"],
  "Creative Pack showcase must prioritize ready audio/video cards before text cards.",
);

for (const format of formatIds) {
  assert.equal(isCreativePackFormat(format), true, `${format} should be recognized as a Creative Pack format.`);
}
assert.equal(isCreativePackAudioFormat("jingle"), true);
assert.equal(isCreativePackAudioFormat("brainrot"), true);
assert.equal(isCreativePackAudioFormat("visualizer"), true);
assert.equal(isCreativePackAudioFormat("reviews"), false);
assert.equal(isCreativePackTerminalStatus("ready"), true);
assert.equal(isCreativePackTerminalStatus("needs-retry"), true);
assert.equal(isCreativePackTerminalStatus("cancelled"), true);
assert.equal(isCreativePackTerminalStatus("still-cooking"), false);
