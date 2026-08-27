import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { include as includeInKit } from "../build-kit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = path.join(root, "vendor", "cherry-lip-sync", "v0.1.0");
const manifestPath = path.join(vendorRoot, "VENDOR-MANIFEST.json");

async function sha256(file) {
  return crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

async function readManifest() {
  return JSON.parse(await fs.readFile(manifestPath, "utf8"));
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(item));
    else files.push(item);
  }
  return files;
}

test("Cherry WASI vendor artifact is immutable, non-native, and source-pinned", async () => {
  const manifest = await readManifest();
  assert.equal(manifest.schemaVersion, "wiggly-vendor-artifact-v1");
  assert.equal(manifest.engine, "cherry-lip-sync");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.module.path, "cherrylipsync.wasm");
  assert.equal(manifest.module.abi, "wasi-preview1");
  assert.equal(manifest.build.target, "wasm32-wasip1");
  assert.equal(manifest.source.tag, "v0.1.0");
  assert.equal(manifest.source.commit, "ab3e68a8e2d38fc72d1672c450478dff7710bc14");
  assert.equal(
    manifest.source.archiveSha256,
    "cf16c5bf5fdeed18a96240e74144287f80957c1c1461891eb74585ac3ab94bfc",
  );
  assert.equal(manifest.nativeExecutableIncluded, false);
  assert.equal(manifest.build.rustSourceChanged, false);
  assert.equal(manifest.build.cargoLockChanged, false);

  const modulePath = path.join(vendorRoot, manifest.module.path);
  const moduleBytes = await fs.readFile(modulePath);
  assert.deepEqual([...moduleBytes.subarray(0, 4)], [0x00, 0x61, 0x73, 0x6d]);
  assert.equal(moduleBytes.byteLength, manifest.module.bytes);
  assert.equal(await sha256(modulePath), manifest.module.sha256);
  assert.equal((await fs.stat(modulePath)).mode & 0o111, 0, "WASM ships as data, not a native executable");
});

test("Cherry vendor directory cannot reintroduce a Gatekeeper-triggering native executable", async () => {
  const machOMagic = new Set(["feedface", "feedfacf", "cefaedfe", "cffaedfe", "cafebabe", "bebafeca"]);
  for (const file of await listFiles(vendorRoot)) {
    const stat = await fs.stat(file);
    assert.equal(stat.mode & 0o111, 0, `${path.relative(vendorRoot, file)} must not be executable`);
    const magic = (await fs.readFile(file)).subarray(0, 4).toString("hex");
    assert.equal(machOMagic.has(magic), false, `${path.relative(vendorRoot, file)} must not be Mach-O`);
  }
});

test("Cherry licenses, source patch, and parity fixture are checksum-bound", async () => {
  const manifest = await readManifest();
  for (const file of manifest.redistributedFiles) {
    assert.equal(await sha256(path.join(vendorRoot, file.path)), file.sha256, file.path);
  }
  for (const patch of manifest.patches) {
    assert.equal(await sha256(path.join(vendorRoot, patch.path)), patch.sha256, patch.path);
  }

  const input = manifest.parityFixture.input;
  const expected = manifest.parityFixture.expectedCueOutput;
  assert.equal(await sha256(path.join(vendorRoot, input.path)), input.sha256);
  assert.equal((await fs.stat(path.join(vendorRoot, input.path))).size, input.bytes);
  assert.equal(await sha256(path.join(vendorRoot, expected.path)), expected.sha256);
  assert.equal((await fs.stat(path.join(vendorRoot, expected.path))).size, expected.bytes);
  assert.deepEqual(manifest.parityFixture.arguments, ["-f", "24", "--filter"]);
  assert.equal(manifest.parityFixture.result, "byte-identical");

  const patchText = await fs.readFile(path.join(vendorRoot, manifest.patches[0].path), "utf8");
  const addedDependencyLines = patchText
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"));
  const removedDependencyLines = patchText
    .split("\n")
    .filter((line) => line.startsWith("-") && !line.startsWith("---"));
  assert.equal(addedDependencyLines.length, 2);
  assert.equal(removedDependencyLines.length, 2);
  assert.ok(addedDependencyLines.every((line) => line.includes("optional = true")));
  assert.doesNotMatch(patchText, /(?:^|\s)src\//m, "the WASI patch must not change Rust source");
});

test("build kit includes the complete Cherry WASI payload and provenance", async () => {
  const expectedFiles = [
    "cherrylipsync.wasm",
    "VENDOR-MANIFEST.json",
    "SOURCE.md",
    "LICENSE-MIT",
    "LICENSE-APACHE",
    "NOTICE",
    "UPSTREAM-README.md",
    "patches/0001-make-non-runtime-dependencies-optional.patch",
    "fixtures/hello.ogg",
    "fixtures/hello.filtered.fps24.tsv",
  ];

  for (const relative of expectedFiles) {
    const file = path.join(vendorRoot, relative);
    await fs.access(file);
    assert.equal(includeInKit(file), true, relative);
  }
});
