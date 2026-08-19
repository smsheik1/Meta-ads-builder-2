import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import { loadManifest } from "../runtime/rig-v2-renderer.mjs";
import { buildArmsCrossedSkeptical } from "../poses/generated/sources/arms-crossed-skeptical.mjs";
import { buildFacepalmFrustrated } from "../poses/generated/sources/facepalm-frustrated.mjs";
import { buildPointAtScreen } from "../poses/generated/sources/point-at-screen.mjs";

const load = async (name) => JSON.parse(await fs.readFile(
  new URL(`../poses/generated/${name}.json`, import.meta.url),
  "utf8",
));

test("handheld props are established instead of appearing randomly", async () => {
  const phonePose = await load("look-at-phone");
  const phone = phonePose.props.find(({ id }) => id === "phone");
  assert.equal(phone.keys[0].opacity, 100);
  assert.equal(phone.keys[0].interpolation, "hold", "phone must remain with the lowered hand until the pickup beat");
  assert.ok(phone.keys[0].position[0] < phone.keys[1].position[0], "phone must begin beside the lowered hand");
  assert.ok(phone.keys[0].position[1] > phone.keys[1].position[1], "phone must rise with the hand");
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

test("crossed-arm redraws stay hidden until the real rig arms reach the contact swap", async () => {
  const pose = await load("arms-crossed-skeptical");
  assert.equal(pose.quality.armCompositeMode, "registered-crossed-rig-substitution");
  assert.deepEqual(pose.props.map(({ id }) => id), [
    "crossed-right-sleeve",
    "crossed-right-hand",
    "crossed-left-sleeve",
    "crossed-left-hand",
  ]);
  for (const prop of pose.props) {
    assert.equal(prop.keys[0].opacity, 0);
    assert.equal(prop.keys.find(({ frame }) => frame === 8).opacity, 0);
    assert.equal(prop.keys.find(({ frame }) => frame === 9).opacity, 100);
  }
  for (const nodeName of ["Left_Forearm", "Left_Hand", "Right_Forearm", "Right_Hand"]) {
    assert.equal(pose.controls[nodeName].find(({ frame }) => frame === 8).opacity, 100);
    assert.equal(pose.controls[nodeName].find(({ frame }) => frame === 9).opacity, 0);
  }
  assert.equal(pose.drawings.Left_Eye.at(-1).drawing, "2");
  assert.equal(pose.drawings.Right_Eye.at(-1).drawing, "2");
});

test("crossed-arm props are byte-identical to their registered rig drawings", async () => {
  const assets = JSON.parse(await fs.readFile(new URL("../assets.json", import.meta.url), "utf8"));
  const receipt = JSON.parse(await fs.readFile(
    new URL("../rig-v2/assets/receipt.json", import.meta.url),
    "utf8",
  ));
  const receiptByName = new Map(receipt.assets.map((asset) => [asset.filename, asset]));
  for (const prop of assets.props.filter(({ id }) => id.startsWith("crossed-"))) {
    assert.equal(prop.sha256, receiptByName.get(prop.sourceRigAsset).outputSha256);
  }
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
  assert.deepEqual(
    Object.keys(pose.controls).sort(),
    Object.keys(authoredShrug.controls).sort(),
    "the semantic variant must retain every secondary source control that keeps the hold alive",
  );
});
