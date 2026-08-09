import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { validateBlindReview, writeReviewPacket } from "../runtime/review.mjs";

const root = new URL("../", import.meta.url);

test("the blind packet binds the MP4 and intent without leaking results or a target score", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "wiggly-dance-review-packet-"));
  try {
    const contract = JSON.parse(await readFile(new URL("quality.json", root), "utf8"));
    const input = JSON.parse(await readFile(new URL("fixtures/smoke/input.json", root), "utf8"));
    const videoPath = path.join(directory, "render.mp4");
    await writeFile(videoPath, "test-video-bytes");
    const packet = await writeReviewPacket({
      runDirectory: directory,
      runId: "packet-test",
      videoPath,
      input,
      contract,
      formatVersion: "0.9.0",
    });
    assert.match(packet.packetId, /^[0-9a-f]{64}$/);
    assert.equal(packet.packetHashAlgorithm, "sha256-json-v1");
    assert.match(packet.video.sha256, /^[0-9a-f]{64}$/);
    assert.equal(packet.intent.castOrder.length, 4);
    assert.equal(packet.rubric.criteria.length, 7);
    assert.equal(packet.rubric.ratingScale.length, 5);
    assert.equal(packet.rubric.criteria.every((criterion) => Object.keys(criterion.anchors).length === 5), true);
    assert.equal("passingScore" in packet.rubric, false);
    const serialized = JSON.stringify(packet);
    assert.doesNotMatch(serialized, /technicalPassed|quality-report|prior grade|automaticScore/);
    const template = JSON.parse(await readFile(path.join(directory, "blind-review.template.json"), "utf8"));
    assert.equal(template.packetId, packet.packetId);
    assert.equal(template.playback.completedPasses, 2);
    assert.deepEqual(template.criteria.map((criterion) => criterion.id), contract.grading.blindCriteria.map((criterion) => criterion.id));
    packet.intent.songTitle = "tampered after packet creation";
    assert.throws(
      () => validateBlindReview({ submission: {}, packet, contract }),
      /review packet contents do not match its packetId/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
