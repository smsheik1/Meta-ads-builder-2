import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("standalone kit rebuilds, verifies released source parity, and rejects changed extraction", async (t) => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const release = JSON.parse(await readFile(path.join(root, "release-files.json"), "utf8"));
  const publicContracts = (await readdir(root)).filter((file) => /\.(md|json)$/i.test(file) && file !== "RELEASE-CONTENTS.json");
  for (const file of publicContracts) assert.ok(release.files.includes(file), `Public Repo contract must ship in the ZIP: ${file}`);
  const format = JSON.parse(await readFile(path.join(root, "format.json"), "utf8"));
  assert.equal(format.id, "repo-builder");
  assert.equal(format.version, JSON.parse(await readFile(path.join(root, "KIT-MANIFEST.json"), "utf8")).version);
  assert.ok(release.files.includes("assets/repo-builder-overview.svg"));
  const temporary = await mkdtemp(path.join(tmpdir(), "wiggly-kit-parity-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const archive = path.join(temporary, "kit.zip");
  const extracted = path.join(temporary, "kit");
  execFileSync(process.execPath, [path.join(root, "build-kit.mjs"), archive], { encoding: "utf8" });
  execFileSync("unzip", ["-q", archive, "-d", extracted]);
  const verify = () => execFileSync(process.execPath, [path.join(root, "verify-kit.mjs"), extracted], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(JSON.parse(verify()).status, "verified");
  await writeFile(path.join(extracted, "README.md"), "Changed after release\n");
  assert.throws(verify, /Damaged extracted file/);
});
