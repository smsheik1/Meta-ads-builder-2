import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const formatRoot = path.dirname(root);

async function manifest(name) {
  return JSON.parse(await readFile(path.join(root, "manifests", `${name}.json`), "utf8"));
}

for (const character of ["cat", "bunny"]) {
  test(`${character} frame-one manifest is a complete ordered pose`, async () => {
    const value = await manifest(`${character}-frame1`);
    assert.equal(value.layers.length, 12);
    assert.equal(value.expectedLayerCount, 12);
    assert.equal(new Set(value.layers.map((layer) => layer.id)).size, 12);
    assert.equal(value.layers.at(-1).id, "nose");
    assert.ok(value.requiredRgb.length >= 4);
    assert.ok(value.requiredOpaquePoints.length >= 1);
  });
}

test("bunny eye placement preserves the source PEG transform", async () => {
  const value = await manifest("bunny-frame1");
  const eyes = value.layers.find((layer) => layer.id === "eyes");
  assert.ok(eyes.transform);
  assert.notEqual(eyes.transform.positionXFields, 0);
  assert.notEqual(eyes.transform.scaleX, 1);
  assert.notEqual(eyes.transform.rotationDegrees, 0);
});

test("bunny body resolves the detached shadow and light color nodes", async () => {
  const value = await manifest("bunny-frame1");
  const body = value.layers.find((layer) => layer.id === "body");
  assert.equal(body.seedOverrides.length, 3);
  assert.deepEqual(body.seedOverrides.map(({ colorId, side }) => [colorId, side]), [
    ["0b6d656fc8edfc85", 0],
    ["0b6acb7cbef2d932", 1],
    ["0b6d656fc8edc66b", 0],
  ]);
});

test("bunny head resolves the detached shadow color node", async () => {
  const value = await manifest("bunny-frame1");
  const head = value.layers.find((layer) => layer.id === "head");
  assert.deepEqual(head.seedOverrides, [
    { colorId: "0b6d656fc8edfc85", boundaryIndex: 11, side: 1 },
  ]);
});

test("every packaged pose keeps its required interior points opaque", async () => {
  for (const character of ["cat", "bunny"]) {
    const value = await manifest(`${character}-frame1`);
    for (const pose of ["idle", "blink", "mouth-open"]) {
      const file = path.join(formatRoot, "assets", "characters", character, `${pose}.png`);
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (const [normalizedX, normalizedY] of value.requiredOpaquePoints) {
        const x = Math.round(normalizedX * info.width);
        const y = Math.round(normalizedY * info.height);
        const alpha = data[(y * info.width + x) * info.channels + 3];
        assert.equal(alpha, 255, `${character}/${pose} is transparent at ${normalizedX},${normalizedY}`);
      }
    }
  }
});

test("every packaged bunny pose keeps the recovered head-shadow color", async () => {
  for (const pose of ["idle", "blink", "mouth-open"]) {
    const file = path.join(formatRoot, "assets", "characters", "bunny", `${pose}.png`);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const x = Math.round(0.71 * info.width);
    const y = Math.round(0.40 * info.height);
    const offset = (y * info.width + x) * info.channels;
    assert.deepEqual([...data.slice(offset, offset + 4)], [213, 122, 122, 255], `${pose} has the wrong head shadow`);
  }
});

test("expression layers use numbered Toon Boom drawing substitutions", async () => {
  for (const character of ["cat", "bunny"]) {
    const value = await manifest(`${character}-frame1`);
    assert.match(value.layers.find((layer) => layer.id === "eyes").file, /Eyes-2\.tvg$/);
    assert.match(value.layers.find((layer) => layer.id === "mouth").file, /Mouth-1\.tvg$/);
  }
});
