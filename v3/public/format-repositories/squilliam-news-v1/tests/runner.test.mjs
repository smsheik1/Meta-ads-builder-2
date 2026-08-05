import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, readdir, rm, writeFile } from "node:fs/promises";
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

async function runtimeFilesUnder(relativeDirectory) {
  const files = [];
  for (const entry of await readdir(path.join(root, relativeDirectory), { withFileTypes: true })) {
    const relative = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await runtimeFilesUnder(relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

async function currentRuntimeHash() {
  const files = [
    "runner.mjs",
    "runtime/render.mjs",
    "runtime/renderer/index.html",
    "runtime/renderer/app.js",
    "runtime/scripts/build_motion.py",
    "assets/character-packs.json",
    "assets/motion/presenter-motion-reference.json",
    ...await runtimeFilesUnder("assets/character"),
    ...await runtimeFilesUnder("assets/characters"),
  ].sort();
  const hash = createHash("sha256");
  for (const relative of files) hash.update(await readFile(path.join(root, relative)));
  return hash.digest("hex");
}

test("package exposes the complete semantic command loop and one official renderer", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  for (const command of ["smoke", "check", "init", "validate", "render", "inspect", "finalize", "package"]) {
    assert.ok(packageJson.scripts[command], `missing ${command}`);
  }
  const format = JSON.parse(await readFile(path.join(root, "format.json"), "utf8"));
  const composition = JSON.parse(await readFile(path.join(root, "composition-contract.json"), "utf8"));
  assert.equal(format.renderer, "runtime/renderer/app.js");
  assert.equal(format.runtime, "runner.mjs");
  assert.equal(format.outputContract, "output-contract.json");
  assert.match(composition.rendererInvariant, /runtime\/renderer\/app\.js/);
  assert.deepEqual((await readdir(path.join(root, "runtime", "renderer"))).sort(), ["app.js", "index.html"]);
});

test("character catalog exposes only verified rigs as production presenters", async () => {
  const catalog = JSON.parse(await readFile(path.join(root, "assets", "character-packs.json"), "utf8"));
  const inventory = JSON.parse(await readFile(path.join(root, "assets.json"), "utf8"));
  const documentedAssets = new Set(inventory.fixed.map((asset) => asset.path));
  const byId = Object.fromEntries(catalog.packs.map((pack) => [pack.id, pack]));
  assert.equal(catalog.defaultCharacterId, "squilliam");
  assert.equal(byId.squilliam.status, "presenter-ready");
  assert.equal(byId.squidward.status, "presenter-ready");
  for (const pack of catalog.packs.filter((candidate) => candidate.status === "presenter-ready")) {
    assert.equal(pack.format, "collada");
    assert.ok(pack.rig?.leftArm && pack.rig?.rightArm && pack.rig?.mouth && pack.rig?.blink);
    assert.ok(["none", "lids"].includes(pack.rig.blink.mode), `${pack.id} uses an unverified blink mode`);
    if (pack.rig.blink.mode === "none") {
      assert.match(pack.rig.blink.reason, /pupils/);
    }
    assert.ok(pack.transparentTextures?.length, `${pack.id} has no transparent face textures`);
    assert.ok(pack.transparentMaterials?.length, `${pack.id} has no stable transparent material mapping`);
    const model = await readFile(path.join(root, pack.model), "utf8");
    for (const material of pack.transparentMaterials) {
      assert.match(model, new RegExp(`name=["']${material.replace(".", "\\.")}["']`), `${pack.id} is missing ${material}`);
    }
  }
  for (const relative of await runtimeFilesUnder("assets/characters")) {
    assert.ok(documentedAssets.has(relative), `undocumented character asset: ${relative}`);
  }
});

test("every verified character has immutable visual smoke evidence", async () => {
  const report = JSON.parse(await readFile(path.join(root, "evidence", "character-packs", "quality-report.json"), "utf8"));
  const catalog = JSON.parse(await readFile(path.join(root, "assets", "character-packs.json"), "utf8"));
  assert.equal(report.status, "pass");
  assert.equal(report.runtimeHash, await currentRuntimeHash());
  assert.deepEqual(report.characters.map((item) => item.characterId).sort(), catalog.packs.map((pack) => pack.id).sort());
  for (const item of report.characters) {
    assert.equal(item.status, "pass");
    for (const [file, expected] of [[item.video, item.videoHash], [item.contactSheet, item.contactSheetHash]]) {
      const bytes = await readFile(path.join(root, "evidence", "character-packs", file));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
    }
  }
});

test("renderer contains no We The Artists proof facts", async () => {
  const renderer = await readFile(path.join(root, "runtime/renderer/app.js"), "utf8");
  for (const forbidden of ["We The Artists", "Bicentennial", "Gainbridge", "Eventbrite", "Indianapolis talent", "Wiggly Format Lab", "Goo Lagoon"]) {
    assert.equal(renderer.includes(forbidden), false, `renderer leaked proof content: ${forbidden}`);
  }
  assert.match(renderer, /transparentMaterials\?\.includes\(source\.name\)/);
  assert.equal(renderer.includes("depthWrite: !isTransparentOverlay"), false);
});

test("the two promotional proofs use one runtime but different content and outputs", async () => {
  const firstRoot = path.join(root, "examples", "we-the-artists");
  const secondRoot = path.join(root, "examples", "wiggly-format-lab");
  const first = JSON.parse(await readFile(path.join(firstRoot, "evidence", "quality-report.json"), "utf8"));
  const second = JSON.parse(await readFile(path.join(secondRoot, "evidence", "quality-report.json"), "utf8"));
  assert.equal(first.status, "pass");
  assert.equal(second.status, "pass");
  assert.equal(first.runtimeHash, second.runtimeHash);
  assert.equal(first.runtimeHash, await currentRuntimeHash());
  assert.notEqual(first.contentHash, second.contentHash);
  assert.notEqual(first.videoHash, second.videoHash);
  assert.equal(first.video, "review.mp4");
  assert.equal(second.video, "review.mp4");
  for (const [exampleRoot, report] of [[firstRoot, first], [secondRoot, second]]) {
    const video = await readFile(path.join(exampleRoot, "evidence", report.video));
    assert.equal(createHash("sha256").update(video).digest("hex"), report.videoHash);
    const provenance = JSON.parse(await readFile(path.join(exampleRoot, "narration-source.json"), "utf8"));
    assert.equal(provenance.providerCallsInCurrentRun, 0);
    await access(path.join(exampleRoot, provenance.sourceAudio));
    await access(path.join(exampleRoot, "evidence", "history", "v0.1"));
  }
  const finalization = JSON.parse(await readFile(path.join(firstRoot, "evidence", "finalization.json"), "utf8"));
  assert.equal(finalization.automaticReview, "pass");
  assert.equal(finalization.humanReview, "pass");
  assert.equal(finalization.runtimeHash, await currentRuntimeHash());
  const finalVideo = await readFile(path.join(firstRoot, "evidence", finalization.finalVideo));
  assert.equal(createHash("sha256").update(finalVideo).digest("hex"), finalization.videoHash);
});

test("the eye-regressed blind handoff is archived and cannot authorize the current runtime", async () => {
  const evidenceRoot = path.join(root, "evidence", "blind-handoff", "history", "v0.2.0-broken-eyes");
  const receipt = JSON.parse(await readFile(path.join(evidenceRoot, "handoff-receipt.json"), "utf8"));
  const report = JSON.parse(await readFile(path.join(evidenceRoot, "quality-report.json"), "utf8"));
  const state = JSON.parse(await readFile(path.join(evidenceRoot, "state.json"), "utf8"));
  assert.equal(receipt.status, "pass-at-human-gate");
  assert.equal(receipt.providerCalls, 0);
  assert.equal(receipt.rendererEdited, false);
  assert.equal(receipt.rendererAppSha256Before, receipt.rendererAppSha256After);
  assert.equal(receipt.finalizeRan, false);
  assert.equal(receipt.humanReviewRequired, true);
  assert.equal(report.status, "pass");
  assert.notEqual(report.runtimeHash, await currentRuntimeHash());
  assert.equal(report.videoHash, receipt.videoSha256);
  assert.equal(state.attempts.length, 1);
  assert.equal(state.attempts[0].providerCall, undefined);
  const correctedVideo = await readFile(path.join(root, "examples", "we-the-artists", "evidence", "review.mp4"));
  assert.notEqual(createHash("sha256").update(correctedVideo).digest("hex"), receipt.videoSha256);
  const renderer = await readFile(path.join(root, "runtime", "renderer", "app.js"));
  assert.notEqual(createHash("sha256").update(renderer).digest("hex"), receipt.rendererAppSha256After);
});

test("the current blind handoff reproduces the eye-safe proof and stops before finalization", async () => {
  const evidenceRoot = path.join(root, "evidence", "blind-handoff", "v0.2.1");
  const receipt = JSON.parse(await readFile(path.join(evidenceRoot, "handoff-receipt.json"), "utf8"));
  const report = JSON.parse(await readFile(path.join(evidenceRoot, "quality-report.json"), "utf8"));
  const state = JSON.parse(await readFile(path.join(evidenceRoot, "state.json"), "utf8"));
  assert.equal(receipt.status, "pass-at-human-gate");
  assert.equal(receipt.providerCalls, 0);
  assert.equal(receipt.retries, 0);
  assert.equal(receipt.rendererEdited, false);
  assert.equal(receipt.rendererAppSha256Before, receipt.rendererAppSha256After);
  assert.equal(receipt.finalizeRan, false);
  assert.equal(receipt.humanReviewRequired, true);
  assert.equal(receipt.visualReview.yellowEyeFieldsVisible, true);
  assert.equal(receipt.visualReview.redPupilsVisible, true);
  assert.equal(receipt.visualReview.opaqueFaceCutout, false);
  assert.equal(receipt.visualReview.oneSecondEyeSheetSamples, 30);
  assert.equal(report.status, "pass");
  assert.equal(report.runtimeHash, await currentRuntimeHash());
  assert.equal(report.videoHash, receipt.videoSha256);
  assert.equal(state.attempts.length, 1);
  assert.equal(state.attempts[0].providerCall, undefined);
  const packagedVideo = await readFile(path.resolve(evidenceRoot, receipt.packagedEquivalentVideo));
  assert.equal(createHash("sha256").update(packagedVideo).digest("hex"), receipt.videoSha256);
  const packagedSheet = await readFile(path.resolve(evidenceRoot, receipt.packagedEquivalentContactSheet));
  assert.equal(createHash("sha256").update(packagedSheet).digest("hex"), receipt.contactSheetSha256);
  const renderer = await readFile(path.join(root, "runtime", "renderer", "app.js"));
  assert.equal(createHash("sha256").update(renderer).digest("hex"), receipt.rendererAppSha256After);
  assert.equal(await missing(path.join(evidenceRoot, "finalization.json")), true);
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

test("validation rejects a character outside the verified catalog", async () => {
  await rm(testRun, { recursive: true, force: true });
  assert.equal(run("init", "--run=contract-test", "--from=wiggly-format-lab").status, 0);
  const contentFile = path.join(testRun, "content.json");
  const content = JSON.parse(await readFile(contentFile, "utf8"));
  content.characterId = "patrick";
  await writeFile(contentFile, `${JSON.stringify(content, null, 2)}\n`);
  const result = run("validate", "--run=contract-test");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Unknown characterId/);
});

test("validated narration-free run cannot contact a provider without approval", async () => {
  await rm(testRun, { recursive: true, force: true });
  assert.equal(run("init", "--run=contract-test", "--from=wiggly-format-lab").status, 0);
  await rm(path.join(testRun, "audio.wav"));
  assert.equal(run("validate", "--run=contract-test").status, 0);
  const result = run("render", "--run=contract-test");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Narration is missing/);
  assert.equal(await missing(path.join(testRun, "audio", "provider-receipt.json")), true);
  const state = JSON.parse(await readFile(path.join(testRun, "state.json"), "utf8"));
  assert.equal(state.attempts.length, 0, "an approval precondition must not consume a render attempt");
});

test("provider approval cannot bypass validation", async () => {
  await rm(testRun, { recursive: true, force: true });
  assert.equal(run("init", "--run=contract-test", "--from=wiggly-format-lab").status, 0);
  const result = run("render", "--run=contract-test", "--approve-provider");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Run validate before render/);
  assert.equal(await missing(path.join(testRun, "audio", "provider-receipt.json")), true);
  const state = JSON.parse(await readFile(path.join(testRun, "state.json"), "utf8"));
  assert.equal(state.attempts.length, 0);
});

test("finalization requires explicit human review", async () => {
  const result = run("finalize", "--run=contract-test");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /human-review=pass/);
});

test("human approval cannot override a failed automatic inspection", async () => {
  await rm(testRun, { recursive: true, force: true });
  assert.equal(run("init", "--run=contract-test", "--from=we-the-artists").status, 0);
  assert.equal(run("validate", "--run=contract-test").status, 0);
  await writeFile(path.join(testRun, "quality-report.json"), `${JSON.stringify({ status: "fail" }, null, 2)}\n`);
  const result = run("finalize", "--run=contract-test", "--human-review=pass");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Automatic inspection is not passing/);
  assert.equal(await missing(path.join(testRun, "final.mp4")), true);
});

test("finalization rejects stale runtime evidence", async () => {
  const validation = JSON.parse(await readFile(path.join(testRun, ".validation.json"), "utf8"));
  await writeFile(path.join(testRun, "quality-report.json"), `${JSON.stringify({
    status: "pass",
    contentHash: validation.contentHash,
    runtimeHash: "stale-runtime",
    video: "not-reached.mp4",
  }, null, 2)}\n`);
  const result = run("finalize", "--run=contract-test", "--human-review=pass");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Renderer changed after inspection/);
  assert.equal(await missing(path.join(testRun, "final.mp4")), true);
});

test.after(async () => {
  await rm(testRun, { recursive: true, force: true });
});
