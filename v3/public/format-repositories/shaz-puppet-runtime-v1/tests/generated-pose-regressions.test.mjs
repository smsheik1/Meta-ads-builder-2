import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const load = async (name) => JSON.parse(await fs.readFile(
  new URL(`../poses/generated/${name}.json`, import.meta.url),
  "utf8",
));

test("environment and handheld props are established instead of appearing randomly", async () => {
  const [screenPose, phonePose] = await Promise.all([
    load("point-at-screen"),
    load("look-at-phone"),
  ]);
  assert.equal(screenPose.props.find(({ id }) => id === "screen").keys[0].opacity, 100);
  const phone = phonePose.props.find(({ id }) => id === "phone");
  assert.equal(phone.keys[0].opacity, 100);
  assert.equal(phone.keys[0].interpolation, "hold", "phone must remain with the lowered hand until the pickup beat");
  assert.ok(phone.keys[0].position[0] < phone.keys[1].position[0], "phone must begin beside the lowered hand");
  assert.ok(phone.keys[0].position[1] > phone.keys[1].position[1], "phone must rise with the hand");
});

test("point-at-screen does not hold the clenched-tooth drawings", async () => {
  const pose = await load("point-at-screen");
  const mouthDrawings = pose.drawings.Mouth.map(({ drawing }) => drawing);
  assert.equal(mouthDrawings.includes("4"), false);
  assert.equal(mouthDrawings.includes("8"), false);
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
