import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const route = readFileSync("app/format-lab/squilliam-news/page.tsx", "utf8");
const repositoryRoot = "public/format-repositories/squilliam-news-v1";
const evidenceRoot = `${repositoryRoot}/examples/we-the-artists/evidence`;
const finalization = JSON.parse(readFileSync(`${evidenceRoot}/finalization.json`, "utf8")) as {
  automaticReview: string;
  humanReview: string;
  videoHash: string;
  finalVideo: string;
};

assert.match(route, /Wiggly \/ Format Lab/);
assert.match(route, /squilliam-news-v1/);
assert.match(route, /squilliam-final-video/);
assert.match(route, /Download final MP4/);
assert.match(route, /View the promoted event/);
assert.match(route, /poster\.png/);
assert.match(route, /blind-handoff\/v0\.2\.1/);
assert.doesNotMatch(route, /AdRenderSurface|canvas|getContext\(/);

const finalVideoPath = `${evidenceRoot}/${finalization.finalVideo}`;
assert.equal(existsSync(finalVideoPath), true);
assert.equal(existsSync(`${evidenceRoot}/poster.png`), true);
assert.equal(finalization.automaticReview, "pass");
assert.equal(finalization.humanReview, "pass");
assert.equal(
  createHash("sha256").update(readFileSync(finalVideoPath)).digest("hex"),
  finalization.videoHash,
);

console.log("Squilliam News repo page tests passed.");
