import assert from "node:assert/strict";
import {
  CREATIVE_PACK_HARD_TIMEOUT_MS,
  CREATIVE_PACK_MONEY_SHOT_READY_COUNT,
  CREATIVE_PACK_CONCURRENCY,
  CREATIVE_PACK_FORMATS,
  CREATIVE_PACK_SHOWCASE_PRIORITY,
  CREATIVE_PACK_SOFT_TIMEOUT_MS,
  hasPlayableCreativePackScenes,
  hydrateCreativePackGroupsFromSceneRows,
  isCreativePackAudioFormat,
  isCreativePackFormat,
  isCreativePackTerminalStatus,
  recoverCreativePackGroupsFromSceneRows,
} from "../features/create/creativePack";
import type { AdScene } from "../features/scene/types";

const formatIds = CREATIVE_PACK_FORMATS.map((item) => item.format);
const formatIdStrings = formatIds as readonly string[];
assert.deepEqual(
  formatIds,
  ["reviews", "video-meme", "meme", "text-message", "were-sorry", "visualizer", "jingle", "brainrot"],
  "Creative Pack must contain only formats that can reach a preview without paid media.",
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
assert.equal(formatIdStrings.includes("motion-story"), false, "Creative Pack must not trigger Motion Story's Replicate cutout generation.");
assert.equal(CREATIVE_PACK_CONCURRENCY, 3, "Creative Pack must run exactly three format generations at once.");
assert.equal(CREATIVE_PACK_SOFT_TIMEOUT_MS, 20_000, "Creative Pack must mark slow cards as still cooking after 20 seconds.");
assert.equal(CREATIVE_PACK_HARD_TIMEOUT_MS, 60_000, "Creative Pack must mark cards needs retry after 60 seconds.");
assert.equal(CREATIVE_PACK_MONEY_SHOT_READY_COUNT, 5, "Creative Pack money-shot threshold must fire when five directions are ready.");
assert.deepEqual(
  CREATIVE_PACK_SHOWCASE_PRIORITY,
  ["jingle", "brainrot", "visualizer", "video-meme", "reviews", "text-message", "meme", "were-sorry"],
  "Creative Pack showcase must prioritize high-signal previews before text cards.",
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

const fakeScene = (format: string, audioUrl = "") => ({
  audio: audioUrl ? { status: "generated", url: audioUrl } : { status: "idle" },
  format,
}) as AdScene;

const hydratedGroups = hydrateCreativePackGroupsFromSceneRows({
  rows: [
    { _id: "old-review-1", format: "reviews", generationBatchId: "old", candidateIndex: 0, updatedAt: 1, scene: fakeScene("reviews") },
    { _id: "review-2", format: "reviews", generationBatchId: "new", candidateIndex: 1, updatedAt: 5, scene: fakeScene("reviews") },
    { _id: "review-1", format: "reviews", generationBatchId: "new", candidateIndex: 0, updatedAt: 5, scene: fakeScene("reviews") },
    { _id: "jingle-1", format: "jingle", generationBatchId: "jingle", candidateIndex: 0, updatedAt: 4, scene: fakeScene("jingle", "https://example.com/jingle.mp3") },
    { _id: "brainrot-1", format: "brainrot", generationBatchId: "brainrot", candidateIndex: 0, updatedAt: 3, scene: fakeScene("brainrot") },
  ],
});
const hydratedReviews = hydratedGroups.find((group) => group.format === "reviews");
const hydratedJingle = hydratedGroups.find((group) => group.format === "jingle");
const hydratedBrainrot = hydratedGroups.find((group) => group.format === "brainrot");
assert.equal(hydratedGroups.length, CREATIVE_PACK_FORMATS.length, "Reload hydration must rebuild the full pack rail when multiple pack formats exist.");
assert.deepEqual(hydratedReviews?.sceneIds, ["review-1", "review-2"], "Reload hydration must keep the newest batch for each format and preserve candidate order.");
assert.equal(hydratedReviews?.status, "ready");
assert.equal(hydratedJingle?.status, "ready", "Jingle previews should not need paid audio before they are ready.");
assert.equal(hydratedBrainrot?.status, "ready", "Brainrot previews should not need paid audio before they are ready.");
const recoveredGroups = recoverCreativePackGroupsFromSceneRows({
  groups: [{
    format: "text-message" as const,
    label: "iMessage",
    status: "needs-retry" as const,
    scenes: [],
    sceneIds: [],
    publicMessage: "Needs retry.",
    debugMessage: "iMessage needs retry after 60s.",
  }],
  rows: [{
    _id: "late-imessage",
    format: "text-message",
    generationBatchId: "late",
    candidateIndex: 0,
    updatedAt: 9,
    scene: fakeScene("text-message"),
  }],
});
assert.equal(recoveredGroups[0]?.status, "ready", "A scene saved after the client timeout must repair its visible retry card without another generation.");
assert.deepEqual(recoveredGroups[0]?.sceneIds, ["late-imessage"]);
assert.equal(recoveredGroups[0]?.publicMessage, undefined);
assert.deepEqual(
  hydrateCreativePackGroupsFromSceneRows({
    rows: [{ _id: "only-review", format: "reviews", generationBatchId: "reviews", candidateIndex: 0, updatedAt: 1, scene: fakeScene("reviews") }],
  }),
  [],
  "A normal single-format generation must not hydrate into a Creative Pack rail.",
);
assert.equal(hasPlayableCreativePackScenes([fakeScene("reviews")]), true);
assert.equal(hasPlayableCreativePackScenes([fakeScene("jingle")]), true);
