#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("./", import.meta.url);
const readText = (path) => readFile(new URL(path, root), "utf8");

const [manifestText, packageText, agents, claude, cursor, skill] = await Promise.all([
  readText("KIT-MANIFEST.json"),
  readText("package.json"),
  readText("AGENTS.md"),
  readText("CLAUDE.md"),
  readText(".cursor/rules/wiggly-format.mdc"),
  readText("bikini-bottom-dance-off-v1/SKILL.md"),
]);

const manifest = JSON.parse(manifestText);
const packageManifest = JSON.parse(packageText);

assert.equal(manifest.formatVersion, packageManifest.version);
assert.match(agents, /bikini-bottom-dance-off-v1\/SKILL\.md/);
assert.match(agents, /exact resolved version/);
assert.match(agents, /Codex, Antigravity app and CLI, and GitHub Copilot/);
assert.match(skill, /KIT-MANIFEST\.json/);
assert.match(skill, /Never use a paid provider without explicit operator approval|obtain approval/);
assert.match(skill, /Run `inspect`/);
assert.match(skill, /Finalize/);
for (const deliverable of ["final.mp4", "eval-report.md", "eval-report.json", "blind-review.json", "delivery.json"]) {
  assert.match(skill, new RegExp(deliverable.replaceAll(".", "\\.")));
}

for (const [name, adapter] of Object.entries({ claude, cursor })) {
  assert.ok(adapter.length < 400, `${name} adapter must stay thin.`);
  assert.match(adapter, /AGENTS\.md/);
  assert.doesNotMatch(adapter, /npm run|Fish Audio|final\.mp4/);
}

console.log(`cross-agent entrypoints passed for Format ${manifest.formatVersion}`);
