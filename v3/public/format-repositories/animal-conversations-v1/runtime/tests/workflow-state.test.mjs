import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { approvedRevisionId } from "../identity.mjs";
import { beginCycle, finishCycle, newWorkflowState, repairIdentity, withRunLock } from "../workflow-state.mjs";

const content = { title: "A", background: "pool", timeline: [{ start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "Hi" }] };
const revision = approvedRevisionId(content, "audio");

test("same-content reapproval never resets three-cycle history", () => {
  const state = newWorkflowState("test-run");
  for (let i = 0; i < 3; i++) finishCycle(beginCycle(state, revision, `repair-${i}`), new Error("observed failure"));
  const reapproved = approvedRevisionId({ ...content }, "audio");
  assert.equal(reapproved, revision);
  assert.throws(() => beginCycle(state, reapproved, "new-repair"), /Attempt limit/);
  assert.equal(beginCycle(state, approvedRevisionId(content, "different-audio"), "first").id.endsWith("-1"), true);
});

test("interrupted cycles resume the same attempt ID and unchanged failed retries are blocked", () => {
  const state = newWorkflowState("test-run");
  const first = beginCycle(state, revision, "source-a");
  assert.strictEqual(beginCycle(state, revision, "source-a"), first);
  first.stage = "inspect";
  assert.equal(beginCycle(state, revision, "source-a").stage, "inspect");
  finishCycle(first, new Error("technical failure"));
  assert.throws(() => beginCycle(state, revision, "source-a"), /No relevant repair/);
  const second = beginCycle(state, revision, "source-b");
  assert.notEqual(first.id, second.id);
  assert.equal(state.revisions[revision].attempts.length, 2);
});

test("repair identity excludes notes and approval-time bookkeeping", () => {
  const evidence = { renderIdentity: { source: "A" }, policyHash: "P", outputSha256: "V" };
  assert.equal(repairIdentity(evidence), repairIdentity({ ...evidence, note: "try again", approvedAt: "later" }));
  assert.notEqual(repairIdentity(evidence), repairIdentity({ ...evidence, outputSha256: "changed" }));
});

test("run lock rejects concurrent mutation and releases after failure", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "animal-lock-"));
  try {
    await withRunLock({ root, runId: "test-run" }, async () => {
      await assert.rejects(withRunLock({ root, runId: "test-run" }, async () => {}), /locked/);
    });
    await assert.rejects(withRunLock({ root, runId: "test-run" }, async () => { throw Error("operation failed"); }), /operation failed/);
    await withRunLock({ root, runId: "test-run" }, async () => {});
  } finally { await rm(root, { recursive: true, force: true }); }
});
