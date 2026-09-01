import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import test from "node:test";
import { fileURLToPath } from "node:url";

const converterRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const formatRoot = path.dirname(converterRoot);
const sanitizedRealPupilFixture = path.resolve(
  converterRoot,
  "../../../..",
  "test-fixtures",
  "tvg",
  "shaz-left-pupil-08-sanitized.tvg.base64",
);
const standardCargo = path.join(homedir(), ".cargo", "bin", "cargo");
const cargo = process.env.CARGO || (existsSync(standardCargo) ? standardCargo : "cargo");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function alphaShape(data, info) {
  let pixels = 0;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha < 128) continue;
      pixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const boundingBoxPixels = maxX < minX || maxY < minY
    ? 0
    : (maxX - minX + 1) * (maxY - minY + 1);
  return {
    pixels,
    solidity: boundingBoxPixels === 0 ? 0 : pixels / boundingBoxPixels,
  };
}

test("TVG paint recovery fills the sole enclosed region when the recorded side resolves to nothing", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "harmony-tvg-paint-"));
  const specPath = path.join(directory, "spec.json");
  const outputPath = path.join(directory, "output.png");
  const spec = {
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    boundaries: ["M 0 0 L 100 0 L 100 100 L 0 100 L 0 0"],
    fills: [],
    strokes: [],
    seeds: [{
      boundary_index: 0,
      side: 0,
      color: [255, 255, 255, 255],
      color_id: "white-teeth-fixture",
    }],
  };

  await writeFile(specPath, `${JSON.stringify(spec)}\n`);
  try {
    const rendered = spawnSync(process.execPath, [
      path.join(converterRoot, "render_tvg.cjs"),
      specPath,
      outputPath,
      formatRoot,
    ], { encoding: "utf8" });
    assert.equal(rendered.status, 0, rendered.stderr || rendered.stdout);
    assert.equal(JSON.parse(rendered.stdout).paintResults[0].sideFallback, true);

    const bytes = await readFile(outputPath);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const center = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;
    assert.deepEqual([...data.slice(center, center + 4)], [255, 255, 255, 255]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a sanitized real Shaz compound-pupil TVG exports one closed contour and rasterizes as solid alpha", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "harmony-real-pupil-tvg-"));
  const sourcePath = path.join(directory, "Left_Pupil-8.tvg");
  const specPath = path.join(directory, "spec.json");
  const outputPath = path.join(directory, "output.png");
  const encodedFixture = await readFile(sanitizedRealPupilFixture, "utf8");
  const sourceBytes = Buffer.from(encodedFixture.replace(/\s/g, ""), "base64");

  // Real Shaz-authored PART2_F vector payload with its certificate and
  // workstation/application strings overwritten byte-for-byte. Geometry and
  // chunk layout remain the parser input that exposed the compound-fill bug.
  assert.equal(
    sha256(sourceBytes),
    "c703a6d2ff2966c0e17502c14205472159c3018bb0a76e80a2ebc7f98183875a",
  );
  assert.equal(sourceBytes.includes(Buffer.from("BEGIN CERTIFICATE")), false);
  assert.equal(sourceBytes.includes(Buffer.from("MacBook")), false);
  assert.equal(sourceBytes.includes(Buffer.from("Harmony Premium")), false);
  await writeFile(sourcePath, sourceBytes);

  try {
    const exported = spawnSync(cargo, [
      "run",
      "--quiet",
      "--manifest-path", path.join(converterRoot, "source", "Cargo.toml"),
      "-p", "tvg",
      "--example", "export_spec",
      "--", sourcePath,
    ], { encoding: "utf8" });
    assert.equal(
      exported.status,
      0,
      exported.error?.message || exported.stderr || exported.stdout,
    );
    const spec = JSON.parse(exported.stdout);
    assert.equal(spec.boundaries.length, 1);
    assert.equal(spec.fills.length, 1);
    assert.equal(spec.strokes.length, 0);
    assert.equal(spec.fills[0].d, spec.boundaries[0]);

    const contour = spec.fills[0].d;
    assert.equal((contour.match(/M/g) || []).length, 1);
    const coordinates = [...contour.matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)]
      .map((match) => Number(match[0]));
    assert.ok(coordinates.length >= 4);
    assert.ok(Math.abs(coordinates[0] - coordinates.at(-2)) < 0.001);
    assert.ok(Math.abs(coordinates[1] - coordinates.at(-1)) < 0.001);

    await writeFile(specPath, `${JSON.stringify(spec)}\n`);
    const rendered = spawnSync(process.execPath, [
      path.join(converterRoot, "render_tvg.cjs"),
      specPath,
      outputPath,
      formatRoot,
    ], { encoding: "utf8" });
    assert.equal(rendered.status, 0, rendered.stderr || rendered.stdout);

    const { data, info } = await sharp(await readFile(outputPath))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alpha = alphaShape(data, info);
    assert.ok(alpha.pixels > 2_500, `expected a complete pupil, got ${alpha.pixels} alpha pixels`);
    assert.ok(
      alpha.solidity >= 0.60,
      `expected solid pupil alpha, got ${alpha.solidity.toFixed(3)} solidity`,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
