import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildKit, releaseVersion, selectReleaseFiles, stageRelease, validateReleasePath } from "../../build-kit.mjs";
import { execute } from "../common.mjs";

const hash = (data) => createHash("sha256").update(data).digest("hex");
const json = async (file, data) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(data, null, 2)}\n`); };

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "wiggly-release-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const name = "wiggly-test-format-kit";
  await json(path.join(root, "KIT-MANIFEST.json"), { kit: name, formatVersion: "1.2.3" });
  await json(path.join(root, "package.json"), { name, version: "1.2.3" });
  await json(path.join(root, "package-lock.json"), { name, version: "1.2.3", packages: { "": { name, version: "1.2.3" } } });
  await json(path.join(root, "format.json"), { version: "1.2.3" });
  await writeFile(path.join(root, "README.md"), "Public instructions\n");
  await mkdir(path.join(root, "runtime"));
  await writeFile(path.join(root, "runtime", "render.mjs"), "export const official = true;\n");
  await mkdir(path.join(root, "goldens"));
  await writeFile(path.join(root, "goldens", "approved.mp4"), "synthetic approved media bytes");
  const manifest = {
    schemaVersion: 1,
    files: ["KIT-MANIFEST.json", "package.json", "package-lock.json", "format.json", "release-files.json", "README.md", "runtime/render.mjs", "goldens/approved.mp4"],
    approvedMedia: [{ file: "goldens/approved.mp4", sha256: hash("synthetic approved media bytes") }],
  };
  await json(path.join(root, "release-files.json"), manifest);
  return { root, manifest, save: () => json(path.join(root, "release-files.json"), manifest) };
}

async function allFiles(root, prefix = "") {
  const result = [];
  for (const item of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const file = path.posix.join(prefix, item.name);
    if (item.isDirectory()) result.push(...await allFiles(root, file));
    else result.push(file);
  }
  return result.sort();
}

test("exact allowlist staging excludes private, model, environment, and accidental runtime sentinels", async (t) => {
  const f = await fixture(t);
  for (const file of ["agent-runs/personal/source.mp4", ".intake-env/bin/python", ".intake-models/small.en/model.bin", "private/credentials.json", "runtime/not-for-release.mjs", ".env"]) {
    await mkdir(path.dirname(path.join(f.root, file)), { recursive: true });
    await writeFile(path.join(f.root, file), "PRIVATE SENTINEL MUST NOT SHIP");
  }
  const staged = path.join(f.root, "staged");
  const result = await stageRelease({ root: f.root, stageDirectory: staged });
  assert.deepEqual(await allFiles(staged), [...f.manifest.files, "RELEASE-CONTENTS.json"].sort());
  const inventory = JSON.parse(await readFile(path.join(staged, "RELEASE-CONTENTS.json"), "utf8"));
  assert.equal(inventory.formatVersion, "1.2.3");
  for (const file of inventory.files) assert.equal(hash(await readFile(path.join(staged, file.path))), file.sha256);
  assert.equal(hash(await readFile(path.join(staged, "RELEASE-CONTENTS.json"))), result.inventorySha256);
  for (const file of [...f.manifest.files, "RELEASE-CONTENTS.json"]) {
    const info = await lstat(path.join(staged, file));
    assert.equal(info.mtime.toISOString(), "1980-01-01T00:00:00.000Z");
    assert.equal(info.mode & 0o777, 0o644);
  }
});

test("private paths, traversal, globs, platform path tricks, and model/credential files are forbidden even if listed", () => {
  for (const file of ["../README.md", "/etc/passwd", "runtime/../secret.json", "runtime\\secret.json", "assets/*", "a//b", "C:/secret", ".env.local", ".intake-models/model.bin", "node_modules/a.mjs", "cache/token.json", "agent-runs/run/final.mp4", "runtime/.secrets.json", "runtime/credentials.json", "runtime/model.bin", "runtime/client.pem", "scripts/__pycache__/intake.pyc"]) assert.throws(() => validateReleasePath(file), /unsafe|Private|Unsafe/);
  assert.equal(validateReleasePath("scripts/intake-model.json"), "scripts/intake-model.json");
  assert.equal(validateReleasePath("scripts/intake-requirements.lock"), "scripts/intake-requirements.lock");
  assert.equal(validateReleasePath(".cursor/rules/wiggly-format.mdc"), ".cursor/rules/wiggly-format.mdc");
});

test("private directory is rejected even when someone explicitly adds it to the allowlist", async (t) => {
  const f = await fixture(t);
  f.manifest.files.push("agent-runs/secret.json");
  await f.save();
  await assert.rejects(selectReleaseFiles(f.root), /Private or unsafe/);
});

test("both direct and ancestor symlinks are rejected", async (t) => {
  const direct = await fixture(t);
  await symlink("README.md", path.join(direct.root, "alias.md"));
  direct.manifest.files.push("alias.md");
  await direct.save();
  await assert.rejects(selectReleaseFiles(direct.root), /Symlink/);
  const ancestor = await fixture(t);
  await symlink("runtime", path.join(ancestor.root, "linked-runtime"));
  ancestor.manifest.files.push("linked-runtime/render.mjs");
  await ancestor.save();
  await assert.rejects(selectReleaseFiles(ancestor.root), /Symlink/);
});

test("missing files, selected directories, and case-colliding duplicates fail closed", async (t) => {
  for (const [file, pattern] of [["missing.mjs", /ENOENT/], ["runtime", /regular file/], ["readme.MD", /Duplicate/]]) {
    const f = await fixture(t);
    f.manifest.files.push(file);
    await f.save();
    await assert.rejects(selectReleaseFiles(f.root), pattern);
  }
});

test("new raw media and replaced approved proof media cannot enter the release", async (t) => {
  const raw = await fixture(t);
  raw.manifest.files.push("goldens/new-user-video.mp4");
  await raw.save();
  await assert.rejects(selectReleaseFiles(raw.root), /Unapproved audio\/video/);
  const replaced = await fixture(t);
  await writeFile(path.join(replaced.root, "goldens", "approved.mp4"), "PRIVATE REPLACEMENT");
  await assert.rejects(selectReleaseFiles(replaced.root), /replaced or modified/);
});

test("all release version declarations must match and required metadata cannot be omitted", async (t) => {
  const f = await fixture(t);
  assert.deepEqual(await releaseVersion(f.root), { kit: "wiggly-test-format-kit", formatVersion: "1.2.3" });
  await json(path.join(f.root, "format.json"), { version: "1.2.4" });
  await assert.rejects(releaseVersion(f.root), /version mismatch/);
  f.manifest.files = f.manifest.files.filter((file) => file !== "KIT-MANIFEST.json");
  await f.save();
  await assert.rejects(selectReleaseFiles(f.root), /Required release file omitted/);
});

test("release-output symlinks cannot redirect a sidecar write into an unrelated file", async (t) => {
  const f = await fixture(t);
  const outputDirectory = path.join(f.root, "downloads");
  await mkdir(outputDirectory);
  await symlink("../README.md", path.join(outputDirectory, "wiggly-test-format-kit.zip.sha256"));
  await assert.rejects(buildKit({ root: f.root, outputDirectory }), /symlinks forbidden/);
  assert.equal(await readFile(path.join(f.root, "README.md"), "utf8"), "Public instructions\n");
});

test("explicit archive profile verifies real ZIP contents, checksums, stable alias, and immutable version behavior", { skip: process.env.WIGGLY_TEST_ARCHIVE !== "1" }, async (t) => {
  const f = await fixture(t);
  const sentinel = path.join(f.root, "private", "source.wav");
  await mkdir(path.dirname(sentinel));
  await writeFile(sentinel, "PRIVATE SOURCE AUDIO");
  const outputDirectory = path.join(f.root, "downloads");
  const first = await buildKit({ root: f.root, outputDirectory });
  const archive = path.join(outputDirectory, first.archive.file);
  const stable = path.join(outputDirectory, first.stableArchive.file);
  assert.equal(hash(await readFile(archive)), first.archive.sha256);
  assert.equal(hash(await readFile(stable)), first.archive.sha256);
  assert.equal(first.acceptanceStatus, "not-certified-by-packaging");
  assert.equal(first.publication, "local-only");
  const entries = (await execute("unzip", ["-Z1", archive], { capture: true, stdoutOnly: true })).trim().split("\n").sort();
  assert.deepEqual(entries, [...f.manifest.files, "RELEASE-CONTENTS.json"].sort());
  assert.equal(await readFile(`${archive}.sha256`, "utf8"), `${first.archive.sha256}  ${first.archive.file}\n`);
  const second = await buildKit({ root: f.root, outputDirectory });
  assert.equal(second.idempotent, true);
  assert.equal(second.archive.sha256, first.archive.sha256);
  for (const file of f.manifest.files) await utimes(path.join(f.root, file), new Date("2030-07-03T22:11:10Z"), new Date("2030-07-03T22:11:10Z"));
  const freshOutput = path.join(f.root, "separate-candidate");
  const fresh = await buildKit({ root: f.root, outputDirectory: freshOutput });
  assert.equal(fresh.archive.sha256, first.archive.sha256, "Fresh same-toolchain builds are byte-identical despite different source mtimes/output directories");
  await writeFile(path.join(f.root, "README.md"), "Changed after publication");
  await assert.rejects(buildKit({ root: f.root, outputDirectory }), /Do not overwrite a released version/);
  assert.equal(hash(await readFile(archive)), first.archive.sha256);
  assert.equal(hash(await readFile(stable)), first.archive.sha256);
});
