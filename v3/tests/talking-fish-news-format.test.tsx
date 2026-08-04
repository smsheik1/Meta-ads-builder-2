import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { talkingFishNewsProofScene, talkingFishNewsProofScript } from "../features/formats/talking-fish-news/fixture";
import { validateTalkingFishNewsScene } from "../features/formats/talking-fish-news/validate";
import { getFormatModule } from "../features/formats/registry";
import { AdRenderSurface } from "../features/render/AdRenderSurface";

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const validation = validateTalkingFishNewsScene(talkingFishNewsProofScene);

assert.equal(validation.valid, true, validation.errors.join(" "));
assert.ok(talkingFishNewsProofScript.startsWith("Breaking news."));
assert.ok(wordCount(talkingFishNewsProofScript) >= 38 && wordCount(talkingFishNewsProofScript) <= 60);
assert.equal(talkingFishNewsProofScene.layout.beats.length, 4);
assert.equal(talkingFishNewsProofScene.layout.durationMs, 18504);
assert.equal(talkingFishNewsProofScene.audio.status, "generated");
assert.equal(talkingFishNewsProofScene.audio.provider, "fish-studio");
assert.ok(talkingFishNewsProofScene.audio.model.includes("105a95c3aa3d4301b175ca1f7b3996ca"));
assert.equal(talkingFishNewsProofScene.backgroundMusic, undefined);
assert.equal(getFormatModule("talking-fish-news").id, "talking-fish-news");

for (const beat of talkingFishNewsProofScene.layout.beats) {
  assert.ok(wordCount(beat.caption) >= 2 && wordCount(beat.caption) <= 7);
  assert.ok(beat.proofSrc.startsWith("/talking-fish-news-assets/mars-"));
}

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: talkingFishNewsProofScene,
  mode: "video",
  timeSeconds: 8,
}));
assert.ok(html.includes('data-render-surface="ad"'));
assert.ok(html.includes('data-format="talking-fish-news"'));
assert.ok(html.includes('data-talking-fish-news-caption="true"'));
assert.ok(html.includes("Tiny polygons. Entire valley."));
assert.ok(html.includes("fixed-fish-anchor-suited.png"));
assert.ok(html.includes("mars-polygons-closeup.png"));
assert.equal(html.includes("THE DAILY CURRENT"), false);
assert.equal(html.includes("REPORT"), false);

const invalid = validateTalkingFishNewsScene({
  ...talkingFishNewsProofScene,
  layout: {
    ...talkingFishNewsProofScene.layout,
    durationMs: 12000,
  },
});
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.some((error) => error.includes("14-20 seconds")));

console.log("talking fish news format tests passed");
