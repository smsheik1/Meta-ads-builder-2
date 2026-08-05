import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testRun = path.join(root, "agent-runs", "contract-test");

function run(...args) {
  return spawnSync("node", ["runner.mjs", ...args], { cwd: root, encoding: "utf8" });
}

async function missing(file) {
  try { await access(file); return false; } catch { return true; }
}

test("package exposes the complete semantic command loop and one official renderer", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  for (const command of ["smoke", "check", "init", "validate", "render", "inspect", "finalize", "package"]) {
    assert.ok(packageJson.scripts[command], `missing ${command}`);
  }
  const format = JSON.parse(await readFile(path.join(root, "format.json"), "utf8"));
  const composition = JSON.parse(await readFile(path.join(root, "composition-contract.json"), "utf8"));
  assert.equal(format.renderer, "runtime/renderer/app.js");
  assert.equal(format.outputContract, "output-contract.json");
  assert.match(composition.rendererInvariant, /runtime\/renderer\/app\.js/);
});

test("renderer contains no We The Artists proof facts", async () => {
  const renderer = await readFile(path.join(root, "runtime/renderer/app.js"), "utf8");
  for (const forbidden of ["We The Artists", "Bicentennial", "Gainbridge", "Eventbrite", "Indianapolis talent"]) {
    assert.equal(renderer.includes(forbidden), false, `renderer leaked proof content: ${forbidden}`);
  }
});

test("validation rejects content outside the contract", async () => {
  await rm(testRun, { recursive: true, force: true });
  assert.equal(run("init", "--run=contract-test", "--from=wiggly-format-lab").status, 0);
  const contentFile = path.join(testRun, "content.json");
  const content = JSON.parse(await readFile(contentFile, "utf8"));
  content.headline = "X".repeat(59);
  await writeFile(contentFile, `${JSON.stringify(content, null, 2)}\n`);
  const result = run("validate", "--run=contract-test");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Headline exceeds 58 characters/);
});

test("validation rejects a slide missing layout-required content", async () => {
  await rm(testRun, { recursive: true, force: true });
  assert.equal(run("init", "--run=contract-test", "--from=wiggly-format-lab").status, 0);
  const contentFile = path.join(testRun, "content.json");
  const content = JSON.parse(await readFile(contentFile, "utf8"));
  delete content.slides[8].button;
  await writeFile(contentFile, `${JSON.stringify(content, null, 2)}\n`);
  const result = run("validate", "--run=contract-test");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Slide 9 needs a non-empty button/);
});

test("validated narration-free run cannot contact a provider without approval", async () => {
  await rm(testRun, { recursive: true, force: true });
  assert.equal(run("init", "--run=contract-test", "--from=wiggly-format-lab").status, 0);
  assert.equal(run("validate", "--run=contract-test").status, 0);
  const result = run("render", "--run=contract-test");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Narration is missing/);
  assert.equal(await missing(path.join(testRun, "audio", "provider-receipt.json")), true);
  const state = JSON.parse(await readFile(path.join(testRun, "state.json"), "utf8"));
  assert.equal(state.attempts.length, 0, "an approval precondition must not consume a render attempt");
});

test("finalization requires explicit human review", async () => {
  const result = run("finalize", "--run=contract-test");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /human-review=pass/);
});

test.after(async () => {
  await rm(testRun, { recursive: true, force: true });
});
