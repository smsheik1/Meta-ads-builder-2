import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import test from "node:test";
import { fileURLToPath } from "node:url";

const converterRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const formatRoot = path.dirname(converterRoot);

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
