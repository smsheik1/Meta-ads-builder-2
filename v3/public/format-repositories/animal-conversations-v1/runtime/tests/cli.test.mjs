import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "../common.mjs";
import { newWorkflowState, withRunLock } from "../workflow-state.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function kit(t, { media = false } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "animal-cli-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const file of ["runner.mjs", "package.json", "package-lock.json", "assets.json", "quality.json", "composition-contract.json", "KIT-MANIFEST.json"]) await copyFile(path.join(sourceRoot, file), path.join(root, file));
  await cp(path.join(sourceRoot, "runtime"), path.join(root, "runtime"), { recursive: true });
  if (media) {
    await cp(path.join(sourceRoot, "fixtures"), path.join(root, "fixtures"), { recursive: true });
    await cp(path.join(sourceRoot, "assets"), path.join(root, "assets"), { recursive: true });
    await symlink(path.join(sourceRoot, "node_modules"), path.join(root, "node_modules"), "dir");
  }
  return root;
}

function cli(root, ...args) {
  const result = spawnSync(process.execPath, [path.join(root, "runner.mjs"), ...args], {
    encoding: "utf8", cwd: root, env: { ...process.env, PYTHON: "/not-required/python", CARGO: "/not-required/cargo" },
    timeout: 60000, maxBuffer: 8 * 1024 * 1024,
  });
  return { ...result, json: JSON.parse(result.stdout.trim() || result.stderr.trim()) };
}

test("CLI help/status work without installed Sharp, and status leaves a missing run untouched", async (t) => {
  const root = await kit(t);
  const before = await readdir(root);
  const help = cli(root, "help"); assert.equal(help.status, 0); assert.ok(help.json.commands.includes("setup-intake"));
  const status = cli(root, "status", "--run=not-created", "--json");
  assert.equal(status.status, 0); assert.equal(status.json.phase, "not-initialized");
  assert.deepEqual(await readdir(root), before);
  const failure = cli(root, "invented-command");
  assert.equal(failure.status, 1); assert.equal(failure.json.status, "blocked");
  assert.equal(failure.json.completionClaimed, false); assert.equal(failure.json.checkpoint, null);
});

test("CLI mutating commands honor exclusive locks while status remains read-only", async (t) => {
  const root = await kit(t); const runId = "locked-episode";
  const runDirectory = path.join(root, "agent-runs", runId);
  await mkdir(runDirectory, { recursive: true });
  await writeJson(path.join(runDirectory, "state.json"), newWorkflowState(runId));
  const before = await readFile(path.join(runDirectory, "state.json"));
  await withRunLock({ root, runId }, async () => {
    for (const command of ["run", "render", "inspect", "review-script", "approve-script", "validate", "record-playback-review", "finalize", "export", "intake", "init"]) {
      const result = cli(root, command, `--run=${runId}`);
      assert.equal(result.status, 1, command); assert.match(result.json.blocker.message, /locked/);
      assert.equal(result.json.completionClaimed, false); assert.ok(result.json.checkpoint.resume.includes("status"));
    }
    const status = cli(root, "status", `--run=${runId}`);
    assert.equal(status.status, 0); assert.equal(status.json.phase, "needs-intake");
  });
  assert.deepEqual(await readFile(path.join(runDirectory, "state.json")), before);
});

test("CLI smoke renders once, resumes its technical cycle, refuses finalization and preserves upgraded history", { skip: process.env.WIGGLY_CLI_MEDIA_TESTS !== "1" }, async (t) => {
  const root = await kit(t, { media: true }); const runId = "cli-smoke-proof";
  const runDirectory = path.join(root, "agent-runs", runId);
  const first = cli(root, "smoke", `--run=${runId}`);
  assert.equal(first.status, 0, first.stderr); assert.equal(first.json.status, "pass");
  assert.equal(first.json.scope, "mechanics-only");
  const state = await readJson(path.join(runDirectory, "state.json"));
  assert.equal(state.kind, "mechanics-smoke");
  assert.equal(Object.values(state.revisions).flatMap((revision) => revision.attempts).length, 1);
  const second = cli(root, "smoke", `--run=${runId}`);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(await readJson(path.join(runDirectory, "state.json")), state);
  const inspect = cli(root, "inspect", `--run=${runId}`); assert.equal(inspect.status, 0, inspect.stderr);
  assert.deepEqual(await readJson(path.join(runDirectory, "state.json")), state);
  const finalization = cli(root, "finalize", `--run=${runId}`);
  assert.equal(finalization.status, 1); assert.match(finalization.json.blocker.message, /fixture approval/);
  const currentUpgrade = cli(root, "upgrade-run", `--run=${runId}`, "--new-run=budget-reset");
  assert.equal(currentUpgrade.status, 1);
  assert.match(currentUpgrade.stderr, /already uses the current workflow/);
  // Deliberately represent a legacy state before exercising migration.
  const legacyState = { schemaVersion: 1, status: "historical-smoke" };
  await writeJson(path.join(runDirectory, "state.json"), legacyState);
  const upgrade = cli(root, "upgrade-run", `--run=${runId}`, "--new-run=upgraded-episode");
  assert.equal(upgrade.status, 0, upgrade.stderr); assert.equal(upgrade.json.requiresFreshApproval, true);
  assert.deepEqual(await readJson(path.join(runDirectory, "state.json")), legacyState);
  const nextRun = path.join(root, "agent-runs", "upgraded-episode");
  const render = cli(root, "render", "--run=upgraded-episode");
  assert.equal(render.status, 1); assert.match(render.json.blocker.message, /unapproved/);
  assert.equal(Object.keys((await readJson(path.join(nextRun, "state.json"))).revisions).length, 0);
  const collision = cli(root, "init", "--run=upgraded-episode", `--audio=${path.join(runDirectory, "smoke-audio.wav")}`, `--input=${path.join(runDirectory, "input.json")}`);
  assert.equal(collision.status, 1); assert.match(collision.json.blocker.message, /already exists/);
});
