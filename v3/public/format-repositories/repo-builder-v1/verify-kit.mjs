import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashFile, readJson, regularFile } from "./runtime/contracts.mjs";

// Run from a source checkout against an extracted release; does not execute it.
const root = path.dirname(fileURLToPath(import.meta.url));
const extracted = process.argv[2];
assert.ok(extracted, "Usage: node verify-kit.mjs <cleanly extracted kit directory>");
const files = (await readJson(path.join(root, "release-files.json"))).files;
const receipt = await readJson(await regularFile(extracted, "RELEASE-CONTENTS.json"));
assert.deepEqual(receipt.files.map((item) => item.file).sort(), [...files].sort(), "Release allowlist differs from source");
for (const item of receipt.files) {
  assert.equal(await hashFile(await regularFile(root, item.file)), item.sha256, `Stale released source: ${item.file}`);
  assert.equal(await hashFile(await regularFile(extracted, item.file)), item.sha256, `Damaged extracted file: ${item.file}`);
}
console.log(JSON.stringify({ status: "verified", files: files.length, checks: "source-release-content-parity" }));
