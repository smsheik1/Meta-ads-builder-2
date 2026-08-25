import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import test from "node:test";

import { loadManifest } from "../runtime/rig-v2-renderer.mjs";
import { buildArmsCrossedSkeptical } from "../poses/generated/sources/arms-crossed-skeptical.mjs";
import { buildFacepalmFrustrated } from "../poses/generated/sources/facepalm-frustrated.mjs";
import { buildExcitedCelebration } from "../poses/generated/sources/excited-celebration.mjs";
import { buildLookAtPhone } from "../poses/generated/sources/look-at-phone.mjs";
import { buildPointAtScreen } from "../poses/generated/sources/point-at-screen.mjs";
import { buildPhoneUseSequence } from "../poses/generated/sources/phone-use-sequence.mjs";

const load = async (name) => JSON.parse(await fs.readFile(
  new URL(`../poses/generated/${name}.json`, import.meta.url),
  "utf8",
));

test("handheld props are established instead of appearing randomly", async () => {
  const phonePose = await load("look-at-phone");
  const phone = phonePose.props.find(({ id }) => id === "phone");
  assert.deepEqual(phonePose.props.map(({ id }) => id), ["phone"]);
  assert.equal(phone.keys[0].opacity, 100);
  assert.equal(phone.keys[0].interpolation, "hold", "phone must remain with the lowered hand until the pickup beat");
  assert.deepEqual(phone.keys[0].position, phone.keys.find(({ frame }) => frame === 7).position,
    "phone must remain with the lowered native hand until the lift begins");
  assert.ok(phone.keys[0].position[1] > phone.keys.at(-1).position[1], "phone must rise with the hand");
  assert.deepEqual(phonePose.drawings.OL_Hand.at(-1), { frame: 13, drawing: "1" });
  assert.equal(phonePose.props.some(({ id }) => /hand|arm|sleeve|fist/i.test(id)), false,
    "screen-space limb substitutes are forbidden");
  const settledPhone = phone.keys.at(-1).position;
  assert.ok(settledPhone[0] >= 0.4 && settledPhone[0] <= 0.43,
    "settled phone must remain outside the face while touching the native overlay hand");
  assert.equal(phonePose.quality.armCompositeMode, "native-rig");
});

test("look-at-phone generator exactly reproduces the registered recipe", async () => {
  const [manifest, checkedIn] = await Promise.all([
    loadManifest(new URL("../rig-v2/runtime.json", import.meta.url)),
    load("look-at-phone"),
  ]);
  assert.deepEqual(await buildLookAtPhone(manifest), checkedIn);
});

test("phone-use sequence reuses the intact registered phone interaction", async () => {
  const pose = await load("phone-use-sequence");
  const base = await load("look-at-phone");
  assert.equal(pose.durationFrames, base.durationFrames);
  assert.equal(pose.quality.armCompositeMode, "native-rig");
  assert.deepEqual(pose.props.map(({ id }) => id), ["phone"]);
  assert.equal(pose.props.some(({ id }) => /phone-sequence|sleeve/.test(id)), false);
  assert.deepEqual(pose.controls, base.controls);
  assert.deepEqual(pose.drawings, base.drawings);
});

test("phone-use sequence generator exactly reproduces the registered recipe", async () => {
  const [manifest, checkedIn] = await Promise.all([
    loadManifest(new URL("../rig-v2/runtime.json", import.meta.url)),
    load("phone-use-sequence"),
  ]);
  assert.deepEqual(await buildPhoneUseSequence(manifest), checkedIn);
});

test("point-at-screen follows the supplied off-canvas pointing storyboard", async () => {
  const pose = await load("point-at-screen");
  assert.equal(pose.durationFrames, 36);
  assert.deepEqual(pose.props ?? [], [], "the off-canvas target must not become a random screen prop");
  assert.equal(pose.controls["Shaz_Master-P"][0].flipHorizontal, true);
  assert.equal(pose.drawings.Left_Hand.at(-1).drawing, "8");
  assert.equal(pose.drawings.Mouth.at(-1).drawing, "4");
  assert.equal(pose.controls["Left_Arm_MOVE-P"].at(-1).frame, 36);
  assert.equal(pose.controls["Head_Movement-P"].at(-1).frame, 36);
});

test("point-at-screen generator exactly reproduces the registered recipe", async () => {
  const [manifest, checkedIn] = await Promise.all([
    loadManifest(new URL("../rig-v2/runtime.json", import.meta.url)),
    load("point-at-screen"),
  ]);
  assert.deepEqual(await buildPointAtScreen(manifest), checkedIn);
});

test("facepalm uses the front hand channel for complete face coverage", async () => {
  const pose = await load("facepalm-frustrated");
  assert.equal(pose.durationFrames, 36);
  assert.deepEqual(pose.props ?? [], [], "face coverage must come from a rig hand, not a prop");
  assert.deepEqual(pose.drawings.Mouth, [
    { frame: 1, drawing: "3" },
    { frame: 7, drawing: "6" },
  ]);
  assert.deepEqual(pose.drawings.Left_Hand.at(-1), { frame: 13, drawing: null });
  assert.deepEqual(pose.drawings.OL_Hand, [
    { frame: 1, drawing: null },
    { frame: 13, drawing: "1" },
    { frame: 16, drawing: "2" },
  ]);
  for (const key of pose.controls["OL_Hand-P"].filter(({ frame }) => frame >= 16)) {
    assert.ok(key.scale[0] <= 0.421 && key.scale[1] <= 0.421);
    assert.ok(key.rotation >= 98 && key.rotation <= 108);
  }
});

test("front facepalm palm is a provenance-locked alias of an existing rig drawing", async () => {
  const [manifest, receipt] = await Promise.all([
    loadManifest(new URL("../rig-v2/runtime.json", import.meta.url)),
    fs.readFile(new URL("../rig-v2/assets/receipt.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const overlayElement = manifest.elements.find(({ name }) => name === "OL_Hand");
  assert.deepEqual(overlayElement.drawings, ["1", "2"]);

  const byName = new Map(receipt.assets.map((asset) => [asset.filename, asset]));
  for (const suffix of ["", "--color"]) {
    const alias = byName.get(`ol-hand-02${suffix}.png`);
    const source = byName.get(`right-hand-11${suffix}.png`);
    assert.equal(alias.source, "elements/Right_Hand/Right_Hand-11.tvg");
    assert.equal(alias.sourceSha256, source.sourceSha256);
    assert.equal(alias.outputSha256, source.outputSha256);
    assert.deepEqual(alias.canvas, source.canvas);
    assert.deepEqual(alias.modelOrigin, source.modelOrigin);
  }
});

test("facepalm generator exactly reproduces the registered recipe", async () => {
  const [manifest, checkedIn] = await Promise.all([
    loadManifest(new URL("../rig-v2/runtime.json", import.meta.url)),
    load("facepalm-frustrated"),
  ]);
  assert.deepEqual(await buildFacepalmFrustrated(manifest), checkedIn);
});

test("crossed arms use native anticipation then one fixed crossover assembly", async () => {
  const pose = await load("arms-crossed-skeptical");
  assert.equal(pose.quality.armCompositeMode, "registered-crossed-rig-assembly");
  assert.deepEqual(pose.props.map(({ id }) => id), ["crossed-arms-assembly"]);
  const [assembly] = pose.props;
  assert.equal(assembly.keys[0].opacity, 0);
  assert.equal(assembly.keys.find(({ frame }) => frame === 13).opacity, 0);
  assert.equal(assembly.keys.find(({ frame }) => frame === 14).opacity, 100);
  assert.ok(assembly.keys.every(({ position }) => position[0] === 0.56 && position[1] === 0.376));
  assert.ok(assembly.keys.every(({ scale }) => scale[0] === 1.6 && scale[1] === 1.6),
    "the complete crossed-arm assembly must preserve approved hand and sleeve proportions");
  for (const nodeName of ["Left_Forearm", "Left_Hand", "Right_Forearm", "Right_Hand"]) {
    assert.equal(pose.controls[nodeName].find(({ frame }) => frame === 13).opacity, 100);
    assert.equal(pose.controls[nodeName].find(({ frame }) => frame === 14).opacity, 0);
  }
  assert.equal(pose.drawings.Left_Eye.at(-1).drawing, "2");
  assert.equal(pose.drawings.Right_Eye.at(-1).drawing, "2");
});

test("crossed-arm assembly is checksum-locked to rig-derived source parts", async () => {
  const [assets, receipt, bytes] = await Promise.all([
    fs.readFile(new URL("../assets.json", import.meta.url), "utf8").then(JSON.parse),
    fs.readFile(new URL(
      "../assets/props/crossed-arms-assembly.receipt.json",
      import.meta.url,
    ), "utf8").then(JSON.parse),
    fs.readFile(new URL("../assets/props/crossed-arms-assembly.png", import.meta.url)),
  ]);
  const prop = assets.props.find(({ id }) => id === "crossed-arms-assembly");
  assert.equal(receipt.artistRenderedFramesUsed, false);
  assert.equal(receipt.sourceParts.length, 4);
  assert.equal(prop.sha256, receipt.outputSha256);
  assert.equal(
    crypto.createHash("sha256").update(bytes).digest("hex"),
    receipt.outputSha256,
  );
});

test("arms-crossed generator exactly reproduces the registered recipe", async () => {
  const [manifest, checkedIn] = await Promise.all([
    loadManifest(new URL("../rig-v2/runtime.json", import.meta.url)),
    load("arms-crossed-skeptical"),
  ]);
  assert.deepEqual(await buildArmsCrossedSkeptical(manifest), checkedIn);
});

test("excited celebration preserves the full human-authored timing grammar once", async () => {
  const [pose, authoredShrug] = await Promise.all([
    load("excited-celebration"),
    JSON.parse(await fs.readFile(
      new URL("../poses/authored/shrug.json", import.meta.url),
      "utf8",
    )),
  ]);
  assert.equal(pose.durationFrames, 31);
  assert.equal(pose.quality.maximumIdenticalFrames, 3);
  assert.equal(pose.quality.armCompositeMode, "native-rig");
  assert.deepEqual(pose.props ?? [], []);
  assert.deepEqual(
    pose.deformationFrames,
    Array.from({ length: 31 }, (_, index) => 67 + index),
  );
  assert.deepEqual(
    pose.drawings.Left_Hand.map(({ frame }) => frame),
    [1, 3, 29, 30],
  );
  assert.deepEqual(
    pose.drawings.Left_Eye.map(({ frame }) => frame),
    [1, 3, 4, 25, 29],
  );

  const masterFrames = pose.controls["Shaz_Master-P"].map(({ frame }) => frame);
  assert.deepEqual(masterFrames, Array.from({ length: 31 }, (_, index) => index + 1));
  assert.equal(masterFrames.filter((frame) => frame === 4).length, 1);
  const retainedControls = Object.keys(pose.controls)
    .filter((name) => name !== "Left_Hand" && name !== "Right_Hand")
    .sort();
  assert.deepEqual(retainedControls, Object.keys(authoredShrug.controls).sort(),
    "the semantic variant must retain every secondary source control that keeps the hold alive");
  assert.equal(pose.drawings.Left_Hand.find(({ frame }) => frame === 3).drawing, "10");
  assert.equal(pose.drawings.Right_Hand.find(({ frame }) => frame === 3).drawing, "10");
  for (const nodeName of ["Left_Hand-P", "Right_Hand-P"]) {
    const activeFistScales = pose.controls[nodeName]
      .filter(({ frame }) => frame >= 3 && frame <= 27)
      .map(({ scale }) => Math.min(...scale));
    assert.ok(Math.min(...activeFistScales) >= 1.15,
      `${nodeName} must not shrink the registered victory fist below the sleeve proportion floor`);
  }
});

test("excited-celebration generator exactly reproduces the registered recipe", async () => {
  const [manifest, checkedIn] = await Promise.all([
    loadManifest(new URL("../rig-v2/runtime.json", import.meta.url)),
    load("excited-celebration"),
  ]);
  assert.deepEqual(buildExcitedCelebration(manifest), checkedIn);
});
