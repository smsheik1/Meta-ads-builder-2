import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));

test("all normalized Mixamo clips preserve manifest timing and provenance", async () => {
  const manifest = await readJson("assets/motions/manifest.json");
  assert.equal(manifest.motions.length, 4);
  for (const record of manifest.motions) {
    const bytes = await readFile(path.join(root, record.file));
    const clip = JSON.parse(bytes);
    assert.equal(clip.kind, "mixamo-world-delta-v1");
    assert.equal(clip.fps, 30);
    assert.equal(clip.frameCount, record.frameCount);
    assert.equal(clip.durationSeconds, record.durationSeconds);
    assert.ok(Math.abs(clip.durationSeconds - clip.frameCount / clip.fps) < 1e-6);
    assert.equal(clip.root.positions.length, clip.frameCount * 3);
    assert.equal(clip.feet.left.contacts.length, clip.frameCount);
    assert.equal(clip.feet.right.contacts.length, clip.frameCount);
    assert.equal(clip.feet.left.upperLegToFootVectors.length, clip.frameCount * 3);
    assert.equal(clip.feet.right.upperLegToFootVectors.length, clip.frameCount * 3);
    assert.ok(Number.isFinite(clip.feet.left.floorOffsetFromRestMeters));
    assert.ok(Number.isFinite(clip.feet.right.floorOffsetFromRestMeters));
    assert.ok(clip.metrics.sourceLegLengthsMeters.left > 0);
    assert.ok(clip.metrics.sourceLegLengthsMeters.right > 0);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), record.normalizedSha256);
    assert.equal(clip.source.sha256, record.sourceSha256);
  }
});

test("the SpongeBob profile maps the full body while excluding every protected face bone", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const manifest = await readJson("assets/motions/manifest.json");
  const pack = catalog.packs.find((candidate) => candidate.id === "spongebob");
  const map = pack.motionProfile.boneMap;
  const targets = Object.keys(map);
  assert.equal(targets.length, 35);
  assert.equal(new Set(targets).size, targets.length);
  for (const name of pack.motionProfile.protectedBones) assert.equal(map[name], undefined, `${name} must stay protected`);
  for (const motion of manifest.motions) {
    const clip = await readJson(motion.file);
    for (const source of Object.values(map)) assert.ok(clip.bones[source], `${motion.id} is missing ${source}`);
  }
});
