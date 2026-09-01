import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildKit, KIT_EXCLUDES } from "../../build-kit.mjs";

const formatRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sanitizedRealFixture = path.resolve(
  formatRoot,
  "../../..",
  "test-fixtures",
  "tvg",
  "shaz-left-pupil-08-sanitized.tvg.base64",
);

test("real authoring binaries and their parser regression stay out of the public kit", async (t) => {
  assert.ok(KIT_EXCLUDES.includes("converter/fixtures/regression/*"));
  assert.ok(KIT_EXCLUDES.includes("converter/tests/render_tvg.test.mjs"));
  assert.ok(path.relative(formatRoot, sanitizedRealFixture).startsWith(`..${path.sep}`));

  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "animal-kit-source-boundary-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const sourceRoot = path.join(scratch, "source");
  const output = path.join(scratch, "kit.zip");
  await Promise.all([
    fs.mkdir(path.join(sourceRoot, "converter", "fixtures", "regression"), { recursive: true }),
    fs.mkdir(path.join(sourceRoot, "converter", "fixtures", "reference"), { recursive: true }),
    fs.mkdir(path.join(sourceRoot, "converter", "tests"), { recursive: true }),
  ]);
  await Promise.all([
    fs.writeFile(path.join(sourceRoot, "README.md"), "public\n"),
    fs.writeFile(path.join(sourceRoot, "converter", "fixtures", "regression", "private.tvg"), "private\n"),
    fs.writeFile(path.join(sourceRoot, "converter", "fixtures", "reference", "preview.png"), "public\n"),
    fs.writeFile(path.join(sourceRoot, "converter", "tests", "render_tvg.test.mjs"), "source only\n"),
  ]);

  await buildKit({ sourceRoot, output });
  const listed = spawnSync("unzip", ["-Z1", output], { encoding: "utf8" });
  assert.equal(listed.status, 0, listed.stderr || listed.stdout);
  const entries = listed.stdout.trim().split("\n");
  assert.ok(entries.includes("README.md"));
  assert.ok(entries.includes("converter/fixtures/reference/preview.png"));
  assert.equal(entries.includes("converter/fixtures/regression/private.tvg"), false);
  assert.equal(entries.includes("converter/tests/render_tvg.test.mjs"), false);
});
