import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseCherryTsv, SHAZ_FIVE_MOUTH_V1 } from "../runtime/lipsync.mjs";
import { loadPoseRegistry } from "../runtime/run-common.mjs";
import { loadManifest, renderRigFrame } from "../runtime/rig-v2-renderer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Cherry cues map to the five useful registered Shaz mouth drawings", () => {
  const parsed = parseCherryTsv("0.000 X\n0.125 A\n0.250 B\n0.375 C\n0.500 D\n0.625 E\n0.750 F\n0.875 G\n1.000 H\n1.125 I\n1.250 J\n1.375 K\n", {
    fps: 24,
    totalFrames: 48,
  });
  assert.deepEqual(new Set(Object.values(SHAZ_FIVE_MOUTH_V1)), new Set(["1", "2", "3", "4", "5"]));
  assert.deepEqual(Object.keys(parsed.histogram).sort(), ["1", "2", "3", "4", "5"]);
  assert.equal(parsed.frameDrawings[0], "1");
  assert.equal(parsed.frameDrawings[9], "5");
  assert.equal(parsed.frameDrawings.at(-1), "1", "a reusable block must finish at the resting mouth");
});

test("a terminal Cherry cue exactly on the output boundary is accepted", () => {
  const parsed = parseCherryTsv("0.000 X\n1.000 X\n", {
    fps: 24,
    totalFrames: 24,
  });
  assert.equal(parsed.cues.at(-1).timeSeconds, 1);
  assert.equal(parsed.frameDrawings.at(-1), "1");
});

test("mouth override changes only the Mouth drawing through the official renderer", async () => {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  const registry = await loadPoseRegistry(root, manifest);
  const neutral = registry.byId.get("neutral-listening");
  const shared = {
    manifest,
    frame: 1,
    assetRoot: path.join(root, "rig-v2", "assets"),
    propRoot: path.join(root, "assets", "props"),
    poseRuntime: neutral.poseRuntime,
  };
  const [rest, wide] = await Promise.all([
    renderRigFrame({ ...shared, mouthDrawing: 1 }),
    renderRigFrame({ ...shared, mouthDrawing: 2 }),
  ]);
  const withoutMouth = (receipt) => receipt.layers
    .filter(({ nodePath }) => !nodePath.endsWith("/Mouth"));
  assert.deepEqual(withoutMouth(wide.receipt), withoutMouth(rest.receipt));
  assert.equal(rest.receipt.layers.find(({ nodePath }) => nodePath.endsWith("/Mouth")).drawing, "1");
  assert.equal(wide.receipt.layers.find(({ nodePath }) => nodePath.endsWith("/Mouth")).drawing, "2");
  assert.equal(wide.receipt.mouthDrawingOverride, "2");
  assert.notDeepEqual(wide.buffer, rest.buffer);
});

test("compiled v1 mouth inventory remains checksum-distinct except authored duplicate 4/10", async () => {
  const names = Array.from({ length: 10 }, (_, index) => `mouth-${String(index + 1).padStart(2, "0")}.png`);
  const buffers = await Promise.all(names.map((name) => fs.readFile(path.join(root, "rig-v2", "assets", name))));
  assert.deepEqual(buffers[3], buffers[9]);
  assert.equal(new Set(buffers.map((buffer) => buffer.toString("base64"))).size, 9);
});
