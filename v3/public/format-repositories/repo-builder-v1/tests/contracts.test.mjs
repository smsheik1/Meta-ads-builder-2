import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, realpath, symlink, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  approveBlueprint, checkRepo, hashFile, initBlueprint, loadValidatedRun, readJson,
  regularFile, safeRelativePath, scaffoldRepo, validateBlueprint, writeJson,
} from "../runtime/contracts.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "wiggly-builder-contracts-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runDirectory = path.join(root, "run");
  await mkdir(path.join(runDirectory, "private"), { recursive: true });
  await mkdir(path.join(runDirectory, "frames"));
  await writeFile(path.join(runDirectory, "private/source.mp4"), "test-only source bytes; no media execution");
  await writeFile(path.join(runDirectory, "frames/000.jpg"), "test-only sampled frame");
  const evidence = {
    schemaVersion: 1,
    source: { file: "private/source.mp4", sha256: await hashFile(path.join(runDirectory, "private/source.mp4")), durationSeconds: 4, width: 320, height: 180, fps: 24, hasAudio: false },
    sampling: { method: "uniform", limitations: ["Samples do not establish motion or audio perception."] },
    frames: [{ atSeconds: 0, file: "frames/000.jpg", sha256: await hashFile(path.join(runDirectory, "frames/000.jpg")) }],
  };
  await writeJson(path.join(runDirectory, "evidence.json"), evidence);
  const blueprint = {
    schemaVersion: 1, slug: "test-format", title: "Test Format", referenceSha256: evidence.source.sha256,
    summary: "A fixed border surrounds replaceable product text.",
    observations: [{ id: "opening", atSeconds: 0, description: "The opening sampled frame has a white border and a product title.", channel: "visual", basis: "frame" }],
    rules: [
      { id: "border", description: "Keep a white border.", classification: "fixed", observationIds: ["opening"], reasoning: "The border establishes the visual layout." },
      { id: "title", description: "Replace the product title.", classification: "variable", observationIds: ["opening"], reasoning: "The title carries the specific product content." },
    ],
    inputs: [{ name: "title", type: "string", description: "A concise product title." }],
    runtime: { approach: "One local FFmpeg compositor consuming a JSON input.", entrypoint: "runtime/render.mjs" },
    review: { visual: "sampled-frames", audio: "not-applicable", limitations: ["The test only has sampled-frame evidence, not direct moving-video review."] },
    assets: [], proofs: [{ id: "coffee", description: "Coffee launch with a compact title." }, { id: "shoes", description: "Shoe collection with a longer title." }],
  };
  return { root, runDirectory, evidence, blueprint, outputDirectory: path.join(root, "child") };
}

async function approved(t, scope = "benchmark") {
  const f = await fixture(t);
  await writeJson(path.join(f.runDirectory, "blueprint.json"), f.blueprint);
  await approveBlueprint({ runDirectory: f.runDirectory, reviewer: "Synthetic contract test", note: "Fixture-only benchmark plan, not user or creative approval.", scope });
  return f;
}

async function transcriptFixture(t) {
  const f = await fixture(t);
  await mkdir(path.join(f.runDirectory, "evidence"));
  await writeFile(path.join(f.runDirectory, "evidence/audio.wav"), "synthetic test-only audio evidence");
  f.evidence.source.hasAudio = true;
  f.evidence.audio = { file: "evidence/audio.wav", sha256: await hashFile(path.join(f.runDirectory, "evidence/audio.wav")) };
  f.blueprint.review.audio = "transcript-only";
  f.blueprint.review.limitations.push("Local machine transcript is uncertain and does not establish direct hearing.");
  f.blueprint.observations.push({ id: "spoken-title", atSeconds: 0.5, description: "The local machine transcript proposes a spoken product title.", channel: "audio", basis: "local-transcript" });
  const transcript = {
    schemaVersion: 1, sourceAudioSha256: f.evidence.audio.sha256, sourceVideoSha256: f.evidence.source.sha256,
    engine: "whisper.cpp", language: "en", modelSha256: "b".repeat(64),
    text: "A coffee launch.", segments: [{ startSeconds: 0, endSeconds: 1, text: "A coffee launch." }],
    uncertain: true, limitations: ["Synthetic ASR receipt fixture; not actual speech recognition or direct audio review."],
  };
  await writeJson(path.join(f.runDirectory, "evidence.json"), f.evidence);
  await writeJson(path.join(f.runDirectory, "blueprint.json"), f.blueprint);
  await writeJson(path.join(f.runDirectory, "transcript.json"), transcript);
  return { ...f, transcript };
}

async function completeChild(t) {
  const f = await approved(t);
  await scaffoldRepo(f);
  await mkdir(path.join(f.outputDirectory, "runtime"));
  await mkdir(path.join(f.outputDirectory, "proofs"));
  await writeFile(path.join(f.outputDirectory, "runtime/render.mjs"), "throw new Error('Must never execute child code in contract tests');\n");
  const manifest = await readJson(path.join(f.outputDirectory, "FORMAT-REPO.json"));
  manifest.status = "ready-for-review";
  manifest.releaseFiles.push("runtime/render.mjs");
  for (const [index, brief] of f.blueprint.proofs.entries()) {
    const input = `proofs/${brief.id}.json`;
    const output = `proofs/${brief.id}.mp4`;
    const inspection = `proofs/${brief.id}.inspection.json`;
    await writeJson(path.join(f.outputDirectory, input), { title: brief.id });
    const bytes = Buffer.from(`Synthetic test media ${index}; technical-schema test only`);
    await writeFile(path.join(f.outputDirectory, output), bytes);
    await writeJson(path.join(f.outputDirectory, inspection), {
      schemaVersion: 1, kind: "technical-media-inspection",
      media: { file: `${brief.id}.mp4`, sha256: await hashFile(path.join(f.outputDirectory, output)), sizeBytes: bytes.length, durationSeconds: 4, width: 320, height: 180, fps: 24, hasAudio: false },
      streams: [], review: { status: "not-assessed", limitations: ["Synthetic fixture for validation tests, not real-media proof."] },
    });
    manifest.releaseFiles.push(input, output, inspection);
    manifest.proofs.push({ id: brief.id, input, output, inspection });
  }
  await writeJson(path.join(f.outputDirectory, "FORMAT-REPO.json"), manifest);
  return { ...f, manifest };
}

test("safe paths reject traversal, absolute paths, Windows separators and ambiguous segments", () => {
  for (const value of ["../secret", "/tmp/source", "C:/secret", "a\\b", "a//b", "a/./b", "a/../b", "a\0b", "./hello", "file\nname", " name ", "a/"]) {
    assert.throws(() => safeRelativePath(value), /Unsafe relative path/);
  }
  assert.equal(safeRelativePath("proofs/coffee.input.json"), "proofs/coffee.input.json");
});

test("regular files reject final and parent symlinks", async (t) => {
  const f = await fixture(t);
  await symlink("private/source.mp4", path.join(f.runDirectory, "link.mp4"));
  await symlink("private", path.join(f.runDirectory, "linked-directory"));
  await assert.rejects(regularFile(f.runDirectory, "link.mp4"), /Symlink/);
  await assert.rejects(regularFile(f.runDirectory, "linked-directory/source.mp4"), /Symlink/);
  await symlink(f.root, path.join(f.root, "ancestor"));
  await assert.rejects(regularFile(path.join(f.root, "ancestor", "run"), "private/source.mp4"), /Symlink ancestors/);
  assert.equal(await regularFile(f.runDirectory, "private/source.mp4"), await realpath(path.join(f.runDirectory, "private/source.mp4")));
});

test("JSON exclusive writes never overwrite existing content", async (t) => {
  const f = await fixture(t);
  const file = path.join(f.root, "exclusive.json");
  await writeJson(file, { first: true }, { exclusive: true });
  await assert.rejects(writeJson(file, { second: true }, { exclusive: true }), /EEXIST/);
  assert.deepEqual(await readJson(file), { first: true });
  assert.equal((await readdir(f.root)).some((name) => name.endsWith(".tmp")), false);
});

test("real init is unresolved, rejects validation and preserves existing blueprints", async (t) => {
  const f = await fixture(t);
  const initial = await initBlueprint({ ...f, slug: "real-run", title: "Real Run" });
  assert.deepEqual(initial.observations, []);
  await assert.rejects(loadValidatedRun(f.runDirectory), /resolved/);
  await assert.rejects(initBlueprint({ ...f, slug: "different", title: "Different" }), /EEXIST/);
  assert.equal((await readJson(path.join(f.runDirectory, "blueprint.json"))).slug, "real-run");
});

test("blueprint validates observed timecodes, referenced rules and fixed versus replaceable content", async (t) => {
  const f = await fixture(t);
  assert.equal(validateBlueprint(f.blueprint, f.evidence), f.blueprint);
  for (const [mutate, message] of [
    [(b) => { b.observations[0].atSeconds = 5; }, /outside source duration/],
    [(b) => { b.observations[0].atSeconds = 2; }, /extracted frame time/],
    [(b) => { b.rules[0].observationIds = ["imagined"]; }, /unknown observation/],
    [(b) => { b.rules[1].classification = "fixed"; }, /fixed mechanics from variable/],
    [(b) => { b.referenceSha256 = "0".repeat(64); }, /reference hash/],
    [(b) => { b.runtime.entrypoint = "../other/render.mjs"; }, /Unsafe/],
    [(b) => { b.proofs[1].description = b.proofs[0].description; }, /descriptions must be unique/],
  ]) {
    const b = structuredClone(f.blueprint);
    mutate(b);
    assert.throws(() => validateBlueprint(b, f.evidence), message);
  }
});

test("perception validation cannot promote screenshots or transcripts to audiovisual review", async (t) => {
  const f = await fixture(t);
  let b = structuredClone(f.blueprint);
  b.observations[0].channel = "audio";
  assert.throws(() => validateBlueprint(b, f.evidence), /cannot claim audio/);
  b = structuredClone(f.blueprint);
  b.observations[0].basis = "direct-playback";
  assert.throws(() => validateBlueprint(b, f.evidence), /direct perception/);
  b = structuredClone(f.blueprint);
  b.review.limitations = [];
  assert.throws(() => validateBlueprint(b, f.evidence), /explicit review limitations/);
  b = structuredClone(f.blueprint);
  b.review.audio = "direct";
  assert.throws(() => validateBlueprint(b, f.evidence), /source audio presence/);
});

test("run validation rehashes source and sampled evidence instead of trusting receipts", async (t) => {
  const f = await approved(t);
  assert.equal((await loadValidatedRun(f.runDirectory)).blueprint.slug, "test-format");
  await writeFile(path.join(f.runDirectory, "frames/000.jpg"), "changed evidence");
  await assert.rejects(loadValidatedRun(f.runDirectory), /Frame hash mismatch/);
});

test("local transcripts are audio-language evidence, not direct visual or auditory perception", async (t) => {
  const f = await transcriptFixture(t);
  assert.equal(validateBlueprint(f.blueprint, f.evidence), f.blueprint);
  const run = await loadValidatedRun(f.runDirectory);
  assert.equal(run.transcriptSha256, await hashFile(path.join(f.runDirectory, "transcript.json")));
  const visual = structuredClone(f.blueprint);
  visual.observations.at(-1).channel = "visual";
  assert.throws(() => validateBlueprint(visual, f.evidence), /not visual evidence/);
  const unavailable = structuredClone(f.blueprint);
  unavailable.review.audio = "unavailable";
  assert.throws(() => validateBlueprint(unavailable, f.evidence), /matching audio review basis/);
  const direct = structuredClone(f.blueprint);
  direct.observations.at(-1).basis = "direct-playback";
  assert.throws(() => validateBlueprint(direct, f.evidence), /direct perception/);
});

test("local transcript schema, uncertainty, source binding, text and segment times are validated", async (t) => {
  for (const [mutate, message] of [
    [(receipt) => { receipt.sourceAudioSha256 = "a".repeat(64); }, /source audio\/video hashes/],
    [(receipt) => { receipt.sourceVideoSha256 = "a".repeat(64); }, /source audio\/video hashes/],
    [(receipt) => { receipt.schemaVersion = 2; }, /supported schema/],
    [(receipt) => { receipt.uncertain = false; }, /explicit uncertainty/],
    [(receipt) => { receipt.segments = []; }, /segments must contain/],
    [(receipt) => { receipt.segments[0].endSeconds = 5; }, /within source duration/],
    [(receipt) => { receipt.segments[0].text = ""; }, /require text/],
    [(receipt) => { receipt.text = "Words absent from timed segments."; }, /text must match/],
    [(receipt) => { receipt.limitations = []; }, /limitations must contain/],
  ]) {
    const f = await transcriptFixture(t);
    mutate(f.transcript);
    await writeJson(path.join(f.runDirectory, "transcript.json"), f.transcript);
    await assert.rejects(loadValidatedRun(f.runDirectory), message);
  }
  const f = await transcriptFixture(t);
  f.blueprint.observations.at(-1).atSeconds = 3;
  await writeJson(path.join(f.runDirectory, "blueprint.json"), f.blueprint);
  await assert.rejects(loadValidatedRun(f.runDirectory), /time covered by a transcript segment/);
});

test("only used local transcripts are required and bound; existing user-transcript behavior remains compatible", async (t) => {
  const f = await transcriptFixture(t);
  await rm(path.join(f.runDirectory, "transcript.json"));
  await assert.rejects(loadValidatedRun(f.runDirectory), /ENOENT/);
  f.blueprint.observations.at(-1).basis = "user-transcript";
  await writeJson(path.join(f.runDirectory, "blueprint.json"), f.blueprint);
  assert.equal(Object.hasOwn(await loadValidatedRun(f.runDirectory), "transcriptSha256"), false);
  const g = await approved(t);
  assert.equal(Object.hasOwn(await loadValidatedRun(g.runDirectory), "transcriptSha256"), false);
  assert.equal(Object.hasOwn(await readJson(path.join(g.runDirectory, "approval.json")), "transcriptSha256"), false);
});

test("blueprint approval binds a used transcript and scaffold rejects stale or omitted transcript hashes", async (t) => {
  const f = await transcriptFixture(t);
  const options = { ...f, reviewer: "Synthetic test", note: "Benchmark-only transcript evidence decision.", scope: "benchmark" };
  const receipt = await approveBlueprint(options);
  assert.equal(receipt.transcriptSha256, await hashFile(path.join(f.runDirectory, "transcript.json")));
  assert.equal(receipt.creativeApproval, false);
  const omitted = { ...receipt };
  delete omitted.transcriptSha256;
  await writeJson(path.join(f.runDirectory, "approval.json"), omitted);
  await assert.rejects(scaffoldRepo(f), /stale blueprint approval/);
  await writeJson(path.join(f.runDirectory, "approval.json"), receipt);
  f.transcript.text = "A revised coffee launch.";
  f.transcript.segments[0].text = f.transcript.text;
  await writeJson(path.join(f.runDirectory, "transcript.json"), f.transcript);
  await assert.rejects(scaffoldRepo(f), /stale blueprint approval/);
  const fresh = await approveBlueprint(options);
  assert.notEqual(fresh.transcriptSha256, receipt.transcriptSha256);
  assert.equal((await scaffoldRepo(f)).status, "draft");
  assert.equal((await readdir(f.outputDirectory)).includes("transcript.json"), false);
});

test("benchmark approval is explicitly distinct from user and creative approval", async (t) => {
  const f = await approved(t);
  const receipt = await readJson(path.join(f.runDirectory, "approval.json"));
  assert.equal(receipt.scope, "benchmark");
  assert.equal(receipt.userApproval, false);
  assert.equal(receipt.creativeApproval, false);
  assert.equal(receipt.blueprintSha256, await hashFile(path.join(f.runDirectory, "blueprint.json")));
  assert.equal(receipt.evidenceSha256, await hashFile(path.join(f.runDirectory, "evidence.json")));
  await approveBlueprint({ ...f, reviewer: "Test", note: "Second benchmark decision", scope: "benchmark" });
  assert.equal((await readdir(path.join(f.runDirectory, "approval-history"))).length, 1);
});

test("reapproval archives the old exact decision then approves the revised blueprint", async (t) => {
  const f = await approved(t);
  const oldBytes = await readFile(path.join(f.runDirectory, "approval.json"));
  const oldReceipt = JSON.parse(oldBytes);
  f.blueprint.summary = "A revised border layout with separately variable product text.";
  await writeJson(path.join(f.runDirectory, "blueprint.json"), f.blueprint);
  await assert.rejects(scaffoldRepo(f), /stale blueprint approval/);
  const fresh = await approveBlueprint({ ...f, reviewer: "Benchmark reviewer", note: "Explicit benchmark decision on the revised plan.", scope: "benchmark" });
  assert.notEqual(fresh.blueprintSha256, oldReceipt.blueprintSha256);
  const history = await readdir(path.join(f.runDirectory, "approval-history"));
  assert.equal(history.length, 1);
  assert.ok(history[0].startsWith(`${oldReceipt.blueprintSha256}-${oldReceipt.evidenceSha256}-`));
  assert.deepEqual(await readFile(path.join(f.runDirectory, "approval-history", history[0])), oldBytes);
  assert.equal((await scaffoldRepo(f)).status, "draft");
});

test("reapproval and scaffold reject symlink targets rather than following them", async (t) => {
  const f = await approved(t);
  await mkdir(path.join(f.root, "outside"));
  await symlink(path.join(f.root, "outside"), path.join(f.runDirectory, "approval-history"));
  await assert.rejects(approveBlueprint({ ...f, reviewer: "Test", note: "Decision", scope: "benchmark" }), /Symlink ancestors/);
  await symlink(path.join(f.root, "outside"), path.join(f.root, "destination-link"));
  await assert.rejects(scaffoldRepo({ ...f, outputDirectory: path.join(f.root, "destination-link", "child") }), /Symlink ancestors/);
  const g = await fixture(t);
  await writeJson(path.join(g.runDirectory, "blueprint.json"), g.blueprint);
  await writeFile(path.join(g.root, "outside.json"), "{}");
  await symlink(path.join(g.root, "outside.json"), path.join(g.runDirectory, "approval.json"));
  await assert.rejects(approveBlueprint({ ...g, reviewer: "Test", note: "Decision", scope: "benchmark" }), /Symlink/);
  assert.equal(await readFile(path.join(g.root, "outside.json"), "utf8"), "{}");
});

test("scaffold rejects unapproved or altered blueprints and altered evidence receipts", async (t) => {
  const f = await approved(t);
  f.blueprint.summary = "A newly changed proposal requiring fresh approval.";
  await writeJson(path.join(f.runDirectory, "blueprint.json"), f.blueprint);
  await assert.rejects(scaffoldRepo(f), /stale blueprint approval/);
  const g = await approved(t);
  g.evidence.sampling.limitations.push("Added evidence qualification after approval.");
  await writeJson(path.join(g.runDirectory, "evidence.json"), g.evidence);
  await assert.rejects(scaffoldRepo(g), /stale blueprint approval/);
});

test("scaffold is exclusively new, draft and contains no fake renderer or source media", async (t) => {
  const f = await approved(t);
  const result = await scaffoldRepo(f);
  assert.equal(result.status, "draft");
  assert.equal(result.manifest.review.status, "pending");
  assert.deepEqual((await readdir(f.outputDirectory)).sort(), ["AGENTS.md", "FORMAT-REPO.json", "README.md", "SKILL.md", "blueprint.json", "requirements.json"].sort());
  assert.match(await readFile(path.join(f.outputDirectory, "SKILL.md"), "utf8"), /DRAFT scaffold/);
  await assert.rejects(checkRepo(f.outputDirectory), /still draft/);
  await assert.rejects(scaffoldRepo(f), /EEXIST/);
});

test("completed child contract checks two proofs without executing its runtime or approving creative quality", async (t) => {
  const f = await completeChild(t);
  const report = await checkRepo(f.outputDirectory);
  assert.equal(report.status, "ready-for-review");
  assert.equal(report.creativeReview.status, "pending");
  assert.equal(report.proofs.length, 2);
  assert.equal(report.files.length, f.manifest.releaseFiles.length);
  assert.match(report.limitations.join(" "), /Child code was not executed/);
});

test("release allowlist rejects private paths, undeclared assets, references and symlinks", async (t) => {
  for (const value of ["../secret", "private/source.mp4", ".env.local", "secrets.env", "references/source.mp4", "node_modules/module.js", "cookies.txt", "token.json", "env.json", "cache/item", "models/model.bin", "weights.pt"]) {
    const f = await completeChild(t);
    f.manifest.releaseFiles.push(value);
    await writeJson(path.join(f.outputDirectory, "FORMAT-REPO.json"), f.manifest);
    await assert.rejects(checkRepo(f.outputDirectory), /Unsafe|Private or secret/);
  }
  const f = await completeChild(t);
  await mkdir(path.join(f.outputDirectory, "assets"));
  await writeFile(path.join(f.outputDirectory, "assets/art.png"), "art");
  f.manifest.releaseFiles.push("assets/art.png");
  await writeJson(path.join(f.outputDirectory, "FORMAT-REPO.json"), f.manifest);
  await assert.rejects(checkRepo(f.outputDirectory), /no source\/usage declaration/);
  f.manifest.assets = [{ path: "assets/art.png", source: "Reference screenshot", usage: "reference-only", notes: "Research use, not redistribution." }];
  await writeJson(path.join(f.outputDirectory, "FORMAT-REPO.json"), f.manifest);
  await assert.rejects(checkRepo(f.outputDirectory), /Reference-only/);
  const g = await completeChild(t);
  await symlink("proofs/coffee.mp4", path.join(g.outputDirectory, "linked.mp4"));
  g.manifest.releaseFiles.push("linked.mp4");
  await writeJson(path.join(g.outputDirectory, "FORMAT-REPO.json"), g.manifest);
  await assert.rejects(checkRepo(g.outputDirectory), /Symlink/);
});

test("renamed original media cannot be shipped as an asset", async (t) => {
  const f = await completeChild(t);
  const file = "renamed-source.mp4";
  await writeFile(path.join(f.outputDirectory, file), await readFile(path.join(f.runDirectory, "private/source.mp4")));
  f.manifest.releaseFiles.push(file);
  await writeJson(path.join(f.outputDirectory, "FORMAT-REPO.json"), f.manifest);
  await assert.rejects(checkRepo(f.outputDirectory), /Original reference media/);
});

test("technical reports bind actual output bytes and cannot claim creative passes", async (t) => {
  const f = await completeChild(t);
  await writeFile(path.join(f.outputDirectory, "proofs/coffee.mp4"), "changed rendered bytes");
  await assert.rejects(checkRepo(f.outputDirectory), /actual output bytes/);
  const g = await completeChild(t);
  const file = path.join(g.outputDirectory, "proofs/coffee.inspection.json");
  const report = await readJson(file);
  report.review.status = "approved";
  await writeJson(file, report);
  await assert.rejects(checkRepo(g.outputDirectory), /honest technical media inspection/);
});

test("whitespace-only input changes and repeated outputs cannot satisfy two proof gate", async (t) => {
  const f = await completeChild(t);
  await writeFile(path.join(f.outputDirectory, "proofs/shoes.json"), '{ "title": "coffee" }\n');
  await assert.rejects(checkRepo(f.outputDirectory), /Proof JSON content hashes/);
  const g = await completeChild(t);
  const bytes = await readFile(path.join(g.outputDirectory, "proofs/coffee.mp4"));
  await writeFile(path.join(g.outputDirectory, "proofs/shoes.mp4"), bytes);
  const inspection = await readJson(path.join(g.outputDirectory, "proofs/shoes.inspection.json"));
  inspection.media.sha256 = await hashFile(path.join(g.outputDirectory, "proofs/shoes.mp4"));
  inspection.media.sizeBytes = bytes.length;
  await writeJson(path.join(g.outputDirectory, "proofs/shoes.inspection.json"), inspection);
  await assert.rejects(checkRepo(g.outputDirectory), /Proof output hashes/);
});

test("required runtime and explicit paid approval remain release gates", async (t) => {
  const f = await completeChild(t);
  f.manifest.releaseFiles = f.manifest.releaseFiles.filter((file) => file !== f.manifest.runtime);
  await writeJson(path.join(f.outputDirectory, "FORMAT-REPO.json"), f.manifest);
  await assert.rejects(checkRepo(f.outputDirectory), /Required release file/);
  const g = await completeChild(t);
  await writeJson(path.join(g.outputDirectory, "requirements.json"), { localTools: [], providers: [], paidApprovalRequired: false });
  await assert.rejects(checkRepo(g.outputDirectory), /explicit paid-provider approval/);
});
