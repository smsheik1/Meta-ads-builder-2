import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { include } from "../build-kit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the canonical compatible-Xstage tutorial preserves every proven reconstruction guardrail", async () => {
  const [playbook, skill, poseReadme, promotion, readme] = await Promise.all([
    fs.readFile(path.join(root, "references", "rig-animation-playbook.md"), "utf8"),
    fs.readFile(path.join(root, "SKILL.md"), "utf8"),
    fs.readFile(path.join(root, "poses", "README.md"), "utf8"),
    fs.readFile(path.join(root, "POSE-PROMOTION.md"), "utf8"),
    fs.readFile(path.join(root, "README.md"), "utf8"),
  ]);

  for (const heading of [
    "### Canonical tutorial: reconstruct a reusable action from a compatible Xstage",
    "#### Maintainer setup",
    "#### Step 1: freeze every source",
    "#### Step 14: preserve evidence, status, and the lesson",
    "#### Stop instead of guessing",
  ]) {
    assert.ok(playbook.includes(heading), `missing tutorial structure: ${heading}`);
  }
  for (const command of [
    "scene_runtime_manifest.py",
    "runtime/compile-tvg-assets.mjs",
    "runtime/extract-pose-recipe.mjs",
    "runtime/register-compatible-tvg-assets.mjs",
  ]) {
    assert.ok(playbook.includes(command), `missing authoring command: ${command}`);
  }

  assert.match(playbook, /complete source archive, not a lone `\.xstage` file/);
  assert.match(playbook, /native Toon Boom export is the independent Harmony-fidelity authority/);
  assert.match(playbook, /No native export means Harmony fidelity remains unproven/);
  assert.match(playbook, /--source-archive \/absolute\/path\/source\.zip/);
  assert.match(playbook, /sourceAction\.extractionBoundary/);
  assert.match(playbook, /parent graph, stage field grid, and static pivot basis/);
  assert.match(playbook, /canonical-identical[\s\S]*absent from canonical[\s\S]*same ID, different artwork/);
  assert.match(playbook, /unsupported nonconstant curve fails closed/);
  assert.match(playbook, /currently end-to-end proven PART2 ranges are `1683-1740`, `1795-1959`, and `2817-2933`/);
  assert.match(playbook, /live-rig range `604-727` correctly stops/);
  assert.match(playbook, /synchronized native-versus-runtime playback at 1×/);
  assert.match(playbook, /\*\*Sequence-ready\*\*[\s\S]*\*\*Packet-ready\*\*/);

  for (const question of [
    "What was visibly wrong?",
    "What was the actual root cause?",
    "What was the smallest reusable correction?",
    "What exact native, render, or test evidence proved it?",
    "Which instruction, runtime check, or regression now prevents recurrence?",
  ]) {
    assert.ok(playbook.includes(question), `missing learning-loop question: ${question}`);
  }

  assert.match(skill, /Skill version: \*\*2\.3\*\*/);
  assert.match(skill, /canonical tutorial in `references\/rig-animation-playbook\.md`/);
  assert.match(skill, /pass the actual full archive/);
  const compatiblePoseSection = poseReadme.slice(
    poseReadme.indexOf("## Importing an action from a compatible Xstage"),
    poseReadme.indexOf("## Render one recipe"),
  );
  assert.match(poseReadme, /single source of truth/);
  assert.match(poseReadme, /sealed runtime kit intentionally excludes Xstage conversion/);
  assert.doesNotMatch(compatiblePoseSection, /node runtime\/extract-pose-recipe\.mjs/);
  assert.match(promotion, /playbook owns reconstruction technique/);
  assert.match(promotion, /actual source archive/);
  assert.match(readme, /Start with `POSE-PROMOTION\.md`/);
  assert.match(readme, /references\/rig-animation-playbook\.md/);
  assert.equal(include(path.join(root, "references", "rig-animation-playbook.md")), true);
});
