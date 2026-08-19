import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import { loadManifest } from "../runtime/rig-v2-renderer.mjs";
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

test("crossed-arm redraws stay hidden until the real rig arms reach the contact swap", async () => {
  const pose = await load("arms-crossed-skeptical");
  for (const prop of pose.props) {
    assert.equal(prop.keys[0].opacity, 0);
    assert.equal(prop.keys.find(({ frame }) => frame === 8).opacity, 0);
    assert.equal(prop.keys.find(({ frame }) => frame === 9).opacity, 100);
  }
  for (const nodeName of ["Left_Forearm", "Left_Hand", "Right_Forearm", "Right_Hand"]) {
    assert.equal(pose.controls[nodeName].find(({ frame }) => frame === 8).opacity, 100);
    assert.equal(pose.controls[nodeName].find(({ frame }) => frame === 9).opacity, 0);
  }
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
