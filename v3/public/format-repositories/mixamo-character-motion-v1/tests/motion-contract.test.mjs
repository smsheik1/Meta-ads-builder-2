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
    assert.equal(clip.schemaVersion, 2);
    assert.equal(clip.kind, "mixamo-world-delta-v2");
    assert.equal(clip.source.referencePose, "inverse-bind-matrices");
    assert.equal(clip.fps, 30);
    assert.equal(clip.frameCount, record.frameCount);
    assert.equal(clip.durationSeconds, record.durationSeconds);
    assert.ok(Math.abs(clip.durationSeconds - clip.frameCount / clip.fps) < 1e-6);
    assert.equal(clip.root.positions.length, clip.frameCount * 3);
    assert.equal(clip.feet.left.contacts.length, clip.frameCount);
    assert.equal(clip.feet.right.contacts.length, clip.frameCount);
    assert.equal(clip.feet.left.upperLegToFootVectors.length, clip.frameCount * 3);
    assert.equal(clip.feet.right.upperLegToFootVectors.length, clip.frameCount * 3);
    assert.equal(clip.feet.left.bindUpperLegToFootVector.length, 3);
    assert.equal(clip.feet.right.bindUpperLegToFootVector.length, 3);
    assert.ok(Number.isFinite(clip.feet.left.floorOffsetFromRestMeters));
    assert.ok(Number.isFinite(clip.feet.right.floorOffsetFromRestMeters));
    assert.ok(clip.metrics.sourceLegLengthsMeters.left > 0);
    assert.ok(clip.metrics.sourceLegLengthsMeters.right > 0);
    const firstFramePoseEnergy = Object.values(clip.bones).reduce((sum, bone) => {
      const w = Math.min(1, Math.abs(bone.worldDeltaQuaternions[3]));
      return sum + 2 * Math.acos(w);
    }, 0) / Object.keys(clip.bones).length;
    assert.ok(firstFramePoseEnergy > 0.05, `${clip.id} must not collapse its first or matching final frame to the target bind pose`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), record.normalizedSha256);
    assert.equal(clip.source.sha256, record.sourceSha256);
  }
});

test("every character profile maps its available full body while excluding protected face bones", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const manifest = await readJson("assets/motions/manifest.json");
  const inputContract = await readJson("input-contract.json");
  assert.deepEqual(catalog.packs.map((pack) => pack.id), ["spongebob", "squilliam", "mr-krabs"]);
  assert.deepEqual(inputContract.properties.characterId.enum, catalog.packs.map((pack) => pack.id));
  for (const pack of catalog.packs) {
    const map = pack.motionProfile.boneMap;
    const targets = Object.keys(map);
    assert.ok(targets.length >= pack.motionProfile.minimumMappedBones);
    assert.ok((pack.motionProfile.maximumMappedPoseErrorRadians || 0.001) <= 0.002);
    assert.equal(new Set(targets).size, targets.length);
    for (const name of pack.motionProfile.protectedBones) assert.equal(map[name], undefined, `${pack.id}:${name} must stay protected`);
    for (const pair of pack.motionProfile.pairedBoneChains || []) {
      assert.equal(pair.driver.length, pair.follower.length, `${pack.id} paired chains must be the same length`);
      for (const name of pair.follower) assert.equal(map[name], undefined, `${pack.id}:${name} must follow its paired visible leg instead of being retargeted independently`);
    }
    const model = await readFile(path.join(root, pack.model), "utf8");
    const declaredBones = new Set([
      ...targets,
      ...pack.motionProfile.protectedBones,
      ...(pack.motionProfile.pairedBoneChains || []).flatMap((pair) => [...pair.driver, ...pair.follower]),
      pack.motionProfile.rootBone,
      ...Object.values(pack.motionProfile.feet),
      ...Object.values(pack.motionProfile.legChains).flat(),
    ]);
    for (const name of declaredBones) assert.ok(model.includes(`name="${name}"`), `${pack.id} model is missing ${name}`);
    for (const motion of manifest.motions) {
      const clip = await readJson(motion.file);
      for (const source of Object.values(map)) assert.ok(clip.bones[source], `${pack.id}:${motion.id} is missing ${source}`);
    }
  }
});
