import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { archiveFiles } from "../runtime/package.mjs";
import { hashFile } from "../runtime/contracts.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "wiggly-archive-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "kit"));
  await writeFile(path.join(root, "kit", "README.md"), "# Safe local kit\n");
  return { root: path.join(root, "kit"), output: path.join(root, "release.zip"), files: ["README.md"], metadata: { kind: "test", review: "pending" } };
}

test("explicit allowlist excludes unlisted secrets and clean extraction verifies bytes", async (t) => {
  const args = await fixture(t);
  await writeFile(path.join(args.root, "secrets.env"), "never release this\n");
  const result = await archiveFiles(args);
  assert.equal(result.publication, "local-only");
  assert.equal(result.sha256, await hashFile(args.output));
  assert.deepEqual(execFileSync("unzip", ["-Z1", args.output], { encoding: "utf8" }).trim().split("\n").sort(), ["README.md", "RELEASE-CONTENTS.json"]);
  const inventory = JSON.parse(execFileSync("unzip", ["-p", args.output, "RELEASE-CONTENTS.json"], { encoding: "utf8" }));
  assert.equal(inventory.files[0].sha256, await hashFile(path.join(args.root, "README.md")));
  await assert.rejects(archiveFiles(args), /already exists/);
});

test("release rejects traversal, duplicate names, reserved inventory, symlinks and obvious credentials", async (t) => {
  const args = await fixture(t);
  for (const files of [["../README.md"], ["README.md", "readme.md"], ["RELEASE-CONTENTS.json"]]) await assert.rejects(archiveFiles({ ...args, files }));
  await symlink("README.md", path.join(args.root, "linked.md"));
  await assert.rejects(archiveFiles({ ...args, files: ["linked.md"] }), /Symlink/);
  await writeFile(path.join(args.root, "credentials.md"), "ghp_" + "exampletoken".repeat(3));
  await assert.rejects(archiveFiles({ ...args, files: ["credentials.md"] }), /Credential-like/);
});

test("same allowlisted content makes identical deterministic archives", async (t) => {
  const args = await fixture(t);
  const first = await archiveFiles(args);
  const second = await archiveFiles({ ...args, output: path.join(path.dirname(args.output), "second.zip") });
  assert.equal(first.sha256, second.sha256);
  assert.ok((await readFile(args.output)).length > 0);
});

test("executable child entrypoints retain execute permission after extraction", async (t) => {
  const args = await fixture(t);
  await writeFile(path.join(args.root, "render.sh"), "#!/bin/sh\nexit 0\n");
  await chmod(path.join(args.root, "render.sh"), 0o755);
  await archiveFiles({ ...args, files: ["README.md", "render.sh"] });
  const extracted = path.join(path.dirname(args.output), "extracted");
  execFileSync("unzip", ["-q", args.output, "-d", extracted]);
  assert.equal((await lstat(path.join(extracted, "render.sh"))).mode & 0o777, 0o755);
  execFileSync(path.join(extracted, "render.sh"));
});

test("archive output rejects symlink ancestors before writing outside the chosen directory", async (t) => {
  const args = await fixture(t);
  const parent = path.dirname(args.output);
  await mkdir(path.join(parent, "target"));
  await mkdir(path.join(parent, "target", "nested"));
  await symlink(path.join(parent, "target"), path.join(parent, "alias"));
  await assert.rejects(archiveFiles({ ...args, output: path.join(parent, "alias", "nested", "release.zip") }), /Symlink/);
  await assert.rejects(lstat(path.join(parent, "target", "nested", "release.zip")), { code: "ENOENT" });
});
