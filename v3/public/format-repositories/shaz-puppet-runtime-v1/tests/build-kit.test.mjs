import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildKit, include } from "../build-kit.mjs";
import { sha256 } from "../runtime/run-common.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkedInZip = path.join(root, "downloads", "wiggly-shaz-puppet-runtime-format-kit.zip");
const checkedInSidecar = `${checkedInZip}.sha256`;

function archiveEntries(zipPath) {
  return execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
}

test("the checked-in kit matches a fresh deterministic build", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-build-kit-test-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const built = await buildKit({ outputDirectory: scratch });
  const [checkedInSha, sidecar] = await Promise.all([
    sha256(checkedInZip),
    fs.readFile(checkedInSidecar, "utf8"),
  ]);

  assert.equal(checkedInSha, built.sha256, "checked-in ZIP is stale; run npm run build:kit and commit ZIP + sidecar");
  assert.equal(sidecar, `${built.sha256}  ${path.basename(checkedInZip)}\n`);

  const second = await buildKit({ outputDirectory: scratch });
  assert.equal(second.sha256, built.sha256);
});

test("the sealed kit contains every candidate source but no review-only runtime example", async () => {
  const entries = archiveEntries(checkedInZip);
  const prefix = "wiggly-shaz-puppet-runtime-format-kit/";
  const packaged = new Set(entries.map((entry) => entry.startsWith(prefix) ? entry.slice(prefix.length) : entry));

  for (const tutorialFile of [
    "SKILL.md",
    "POSE-PROMOTION.md",
    "poses/README.md",
    "references/rig-animation-playbook.md",
  ]) {
    assert.ok(packaged.has(tutorialFile), `sealed kit is missing ${tutorialFile}`);
  }

  for (const directory of ["poses/candidates", "poses/candidates/sources"]) {
    const names = await fs.readdir(path.join(root, directory), { withFileTypes: true });
    for (const entry of names) {
      if (!entry.isFile() || !/\.(?:json|mjs)$/.test(entry.name)) continue;
      assert.ok(packaged.has(`${directory}/${entry.name}`), `missing packaged candidate file ${directory}/${entry.name}`);
    }
  }

  for (const relative of [
    "fixtures/final-unlabeled-input.json",
    "fixtures/lego-body-language-sample-input.json",
    "fixtures/proof-alternate-input.json",
    "runtime/compile-tvg-assets.mjs",
    "runtime/extract-pose-recipe.mjs",
    "runtime/register-compatible-tvg-assets.mjs",
    "tests/build-kit.test.mjs",
    "tests/compatible-xstage-actions.test.mjs",
    "tests/compatible-xstage-importer.test.mjs",
    "tests/compile-tvg-assets.test.mjs",
    "tests/pose-recipe.test.mjs",
  ]) {
    assert.equal(include(path.join(root, relative)), false);
    assert.equal(packaged.has(relative), false, `review-only fixture leaked into kit: ${relative}`);
  }

  for (const entry of entries) {
    const relative = entry.startsWith(prefix) ? entry.slice(prefix.length) : entry;
    if (relative === "agent-runs/.gitkeep") continue;
    assert.doesNotMatch(relative, /(?:^|\/)(?:agent-runs|goldens|node_modules|\.runtime-cache|downloads)(?:\/|$)/);
    assert.doesNotMatch(relative, /(?:^|\/)whisper-cli$/);
    assert.doesNotMatch(relative, /artifacts\/shaz-0826-pose-selection|clips\/\d{2}-/);
  }

  for (const relative of [...packaged].filter((entry) => /^tests\/.*\.test\.mjs$/.test(entry))) {
    const source = execFileSync("unzip", ["-p", checkedInZip, `${prefix}${relative}`], {
      encoding: "utf8",
    });
    const imports = source.matchAll(/(?:from\s+|import\s*\()\s*["']([^"']+)["']/g);
    for (const [, specifier] of imports) {
      if (!specifier.startsWith(".")) continue;
      const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(relative), specifier));
      assert.ok(packaged.has(dependency), `${relative} imports missing packaged module ${dependency}`);
    }
  }
});

test("registration journals and lock state can never enter the sealed kit", async (t) => {
  const legacyState = path.join(
    root,
    `.compatible-registration-journal-build-test-${process.pid}`,
  );
  const currentState = path.join(root, ".wiggly-authoring-state", `build-test-${process.pid}`);
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-build-kit-journal-guard-"));
  t.after(async () => {
    await fs.rm(legacyState, { recursive: true, force: true });
    await fs.rm(currentState, { recursive: true, force: true });
    await fs.rmdir(path.dirname(currentState)).catch((error) => {
      if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error?.code)) throw error;
    });
    await fs.rm(scratch, { recursive: true, force: true });
  });
  await Promise.all([
    fs.mkdir(legacyState, { recursive: true }),
    fs.mkdir(currentState, { recursive: true }),
  ]);
  await Promise.all([
    fs.writeFile(path.join(legacyState, "journal.json"), "must not ship"),
    fs.writeFile(path.join(currentState, "active.lock"), "must not ship"),
  ]);

  assert.equal(include(legacyState), false);
  assert.equal(include(currentState), false);
  const built = await buildKit({ outputDirectory: scratch });
  const entries = archiveEntries(built.output);
  assert.equal(entries.some((entry) => entry.includes("compatible-registration-journal")), false);
  assert.equal(entries.some((entry) => entry.includes(".wiggly-authoring-state")), false);
});

test("every downloadable sequence fixture uses only reviewed gestures or neutral", async () => {
  const safePoseIds = new Set(["neutral-listening", "present", "think", "aha", "point", "confident"]);
  const fixtureRoot = path.join(root, "fixtures");
  const pending = [fixtureRoot];
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolute);
        continue;
      }
      if (!entry.isFile() || path.extname(entry.name) !== ".json" || !include(absolute)) continue;
      const value = JSON.parse(await fs.readFile(absolute, "utf8"));
      for (const item of value.sequence ?? []) {
        assert.ok(safePoseIds.has(item.poseId), `${path.relative(root, absolute)} exposes unreviewed pose ${item.poseId}`);
      }
    }
  }
});
