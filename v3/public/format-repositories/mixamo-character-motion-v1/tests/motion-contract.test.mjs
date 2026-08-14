import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));

test("all normalized Mixamo clips preserve manifest timing and provenance", async () => {
  const manifest = await readJson("assets/motions/manifest.json");
  assert.equal(manifest.motions.length, 25);
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
  assert.equal(new Set(catalog.packs.map((pack) => pack.id)).size, catalog.packs.length, "character IDs must be unique");
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
    for (const name of declaredBones) {
      assert.ok(
        model.includes(`name="${name}"`) || model.includes(`sid="${name}"`),
        `${pack.id} model is missing runtime bone ${name}`,
      );
    }
    for (const motion of manifest.motions) {
      const clip = await readJson(motion.file);
      for (const source of Object.values(map)) assert.ok(clip.bones[source], `${pack.id}:${motion.id} is missing ${source}`);
    }
  }
});

test("Patrick delegates authored scale-helper legs to shared IK and protects his face", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const patrick = catalog.packs.find((pack) => pack.id === "patrick");
  assert.ok(patrick);
  assert.deepEqual(patrick.motionProfile.legChains, {
    left: ["pat_thigh_L", "pat_calf_L"],
    right: ["pat_thigh_R", "pat_calf_R"],
  });
  for (const bone of ["pat_calf_L", "pat_foot_L", "pat_calf_R", "pat_foot_R"]) {
    assert.equal(patrick.motionProfile.boneMap[bone], undefined, `${bone} must be driven by the shared foot IK`);
  }
  for (const bone of ["pat_eye_L", "pat_eye_R", "pat_brow_L", "pat_brow_R", "pat_jaw", "pat_lip_lower", "pat_lip_upper"]) {
    assert.ok(patrick.motionProfile.protectedBones.includes(bone), `${bone} must retain its authored transform`);
  }
  assert.equal(patrick.motionProfile.maximumVerticalRootCorrection, 0.14);
});

test("Y-up Collada characters can opt out of the default Z-up pitch without a second loader", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const agentP = catalog.packs.find((pack) => pack.id === "agent-p");
  assert.ok(agentP);
  assert.equal(agentP.pitch, 0);
  assert.equal(agentP.yaw, 0);
  const model = await readFile(path.join(root, agentP.model), "utf8");
  assert.doesNotMatch(model, /<up_axis>/);
  assert.match(model, /<init_from>Agent_P_D\.png<\/init_from>/);
  const renderer = await readFile(path.join(root, "runtime/renderer/app.js"), "utf8");
  assert.match(renderer, /characterPack\.pitch \?\? -Math\.PI \/ 2/);
});

test("Squidward keeps the approved eye overlay and facial rig while sharing the paired-tentacle runtime", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const squidward = catalog.packs.find((pack) => pack.id === "squidward");
  assert.ok(squidward);
  assert.deepEqual(squidward.transparentTextures, ["tx8_0000_squideyes_128.PNG"]);
  assert.deepEqual(squidward.transparentMaterials, ["unnamed.0", "unnamed.001"]);
  assert.equal(squidward.motionProfile.pairedBoneChains.length, 2);
  for (const bone of [
    "squidward_eye_rotate_space_L",
    "squidward_eye_scale_space_L",
    "pupil_L",
    "squidward_eye_rotate_space_R",
    "squidward_eye_scale_space_R",
    "pupil_R",
    "squidward_mouth",
    "squidward_nose_base",
  ]) {
    assert.ok(squidward.motionProfile.protectedBones.includes(bone), `${bone} must retain its authored transform`);
  }
});

test("Mario preserves the source's inch-scale unit without clipping the full-body skin", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const mario = catalog.packs.find((pack) => pack.id === "mario");
  assert.ok(mario);
  assert.equal(mario.scale, 0.02);
  assert.equal(mario.motionProfile.rootBone, "joint1");
  assert.deepEqual(mario.motionProfile.feet, { left: "joint6", right: "joint10" });
  const model = await readFile(path.join(root, mario.model), "utf8");
  assert.match(model, /<unit name="inch" meter="0\.0254"\/>/);
  for (const texture of [
    "mariobodyfixred_nrm.png",
    "mariobodyfix_alb.png",
    "marioeye_alb.png",
    "marioface_alb.png",
    "mariohandnew_alb.png",
    "marioshoes_alb.png",
  ]) {
    assert.match(model, new RegExp(`<init_from>\\./${texture}</init_from>`));
  }
});

test("Olaf stays visibly framed with his transparent body and facial textures", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const olaf = catalog.packs.find((pack) => pack.id === "olaf");
  assert.ok(olaf);
  assert.equal(olaf.scale, 4.5);
  assert.deepEqual(olaf.transparentTextures, ["mat1.png", "mat2.png", "mat3.png"]);
  assert.equal(olaf.motionProfile.rootBone, "joint1");
  assert.deepEqual(olaf.motionProfile.feet, { left: "joint5", right: "joint8" });
});

test("Sandy reveals her intact face through declarative helmet-glass opacity", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const sandy = catalog.packs.find((pack) => pack.id === "sandy");
  assert.ok(sandy);
  assert.deepEqual(sandy.materialOpacities, { "unnamed.007": 0.18 });
  assert.ok(sandy.transparentTextures.includes("tx8_0000_sandyglass.PNG"));
  for (const bone of ["sandy_eye_L", "sandy_eye_R", "sandy_jaw", "sandy_lid_top_L", "sandy_lid_top_R"]) {
    assert.ok(sandy.motionProfile.protectedBones.includes(bone), `${bone} must retain its authored transform`);
  }
  const renderer = await readFile(path.join(root, "runtime/renderer/app.js"), "utf8");
  assert.match(renderer, /characterPack\.materialOpacities\?\.\[source\.name\] \?\? 1/);
  assert.match(renderer, /opacity < 1/);
});

test("Aqua stays on the single Collada runtime after an offline skinned-model conversion", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const aqua = catalog.packs.find((pack) => pack.id === "aqua");
  assert.ok(aqua);
  assert.equal(aqua.format, "collada");
  assert.equal(aqua.scale, 0.38);
  assert.equal(aqua.pitch, 0);
  assert.equal(aqua.motionProfile.rootBone, "center");
  assert.equal(Object.keys(aqua.motionProfile.boneMap).length, 25);
  assert.deepEqual(aqua.motionProfile.feet, { left: "L_ashi1", right: "R_ashi1" });
  assert.deepEqual(aqua.transparentTextures, ["Aqua_PS2_Cloth.png", "Aqua_PS2_Hair.png", "Aqua_PS2_Skin.png"]);
  const model = await readFile(path.join(root, aqua.model), "utf8");
  assert.match(model, /Wiggly one-time glTF-to-Collada compatibility conversion/);
  assert.match(model, /<up_axis>Y_UP<\/up_axis>/);
  assert.match(model, /<Name_array[^>]+count="77"/);
});

test("Ratchet keeps the verified anonymous-joint anatomy map and protected authored bones", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const ratchet = catalog.packs.find((pack) => pack.id === "ratchet");
  assert.ok(ratchet);
  assert.equal(ratchet.format, "collada");
  assert.equal(ratchet.yaw, -1.5707963268);
  assert.equal(ratchet.motionProfile.rootBone, "J0");
  assert.deepEqual(ratchet.motionProfile.feet, { left: "J103", right: "J97" });
  assert.equal(Object.keys(ratchet.motionProfile.boneMap).length, 21);
  assert.equal(ratchet.motionProfile.boneMap.J8, "mixamorig_Head");
  assert.equal(ratchet.motionProfile.boneMap.J76, "mixamorig_LeftHand");
  assert.equal(ratchet.motionProfile.boneMap.J56, "mixamorig_RightHand");
  for (const bone of ["J9", "J51", "J57", "J70", "J77", "J90", "J104", "J110"]) {
    assert.ok(ratchet.motionProfile.protectedBones.includes(bone), `${bone} must retain its authored transform`);
  }
});

test("the one-character import audit accounts for every supplied archive and every accepted proof", async () => {
  const catalog = await readJson("assets/character-packs.json");
  const audit = await readJson("assets/character-import-audit.json");
  const accepted = audit.acceptedNew.flatMap((entry) => entry.characterIds);
  const existing = audit.alreadyIncluded.flatMap((entry) => entry.characterIds);
  const archives = [
    ...audit.acceptedNew,
    ...audit.alreadyIncluded,
    ...audit.rejected,
  ].map((entry) => entry.archive);

  assert.equal(audit.counts.archivesDiscovered, 51);
  assert.equal(audit.acceptedNew.length, 11);
  assert.equal(audit.alreadyIncluded.length, 4);
  assert.equal(audit.rejected.length, 36);
  assert.equal(archives.length, 51);
  assert.equal(new Set(archives).size, 51, "every source archive must be accounted for exactly once");
  assert.deepEqual([...existing, ...accepted].sort(), catalog.packs.map((pack) => pack.id).sort());
  for (const entry of audit.acceptedNew) {
    assert.equal(entry.proof.length, 2, `${entry.archive} needs two distinct motion proofs`);
    for (const proof of entry.proof) assert.ok((await stat(path.join(root, proof))).size > 20_000, `${proof} must be a real contact sheet`);
  }
  assert.equal(audit.futureVoiceHandoff.status, "not-started");
  assert.equal(audit.futureVoiceHandoff.spiderManVoiceId, "c9c0183c624d4b85a1345bc2ec4a10bf");
  const packageManifest = await readJson("package.json");
  const proofScript = await readFile(path.join(root, "runtime/scripts/prove-character-catalog.mjs"), "utf8");
  assert.equal(packageManifest.scripts["prove:character"], "node runtime/scripts/prove-character-catalog.mjs");
  assert.match(proofScript, /Pass exactly one --character=/);
  assert.doesNotMatch(proofScript, /args\.characters|requestedIds/);
});
