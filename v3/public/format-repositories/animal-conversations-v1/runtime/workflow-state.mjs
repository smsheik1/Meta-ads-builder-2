import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { mkdir, open, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { canonicalHash } from "./identity.mjs";
import { readJson, resolveRunDirectory, writeJson } from "./common.mjs";

export function newWorkflowState(runId, kind = "episode") {
  return { schemaVersion: 2, runId, kind, createdAt: new Date().toISOString(), revisions: {}, export: null };
}

export async function readWorkflowState(runDirectory) {
  const state = await readJson(path.join(runDirectory, "state.json"));
  if (state.schemaVersion !== 2 || !state.revisions || Array.isArray(state.revisions)) {
    throw new Error("Legacy run state: preserve this run and use upgrade-run --new-run=<new-id>.");
  }
  return state;
}

export async function saveWorkflowState(runDirectory, state) {
  await writeJson(path.join(runDirectory, "state.json"), state);
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return true;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code !== "ESRCH"; }
}

// Recovery is serialized separately so two resumptions cannot remove a new owner's lock.
async function recoverDeadLock(lockPath) {
  const recovery = `${lockPath}.recovery`;
  let guard;
  try { guard = await open(recovery, "wx"); }
  catch { return false; }
  try {
    const record = JSON.parse(await readFile(lockPath, "utf8"));
    if (record.host !== hostname() || processAlive(record.pid)) return false;
    await rm(lockPath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return true;
    return false;
  } finally {
    await guard.close();
    await rm(recovery, { force: true });
  }
}

export async function withRunLock({ root, runId }, operation) {
  resolveRunDirectory(root, runId);
  const locks = path.join(root, "agent-runs", ".locks");
  await mkdir(locks, { recursive: true });
  const lockPath = path.join(locks, `${runId}.json`);
  let handle;
  try { handle = await open(lockPath, "wx"); }
  catch (error) {
    if (error.code !== "EEXIST" || !await recoverDeadLock(lockPath)) {
      throw new Error("Run is locked. Another process owns it, or an operator must inspect an interrupted/unknown lock; no work was overwritten.");
    }
    try { handle = await open(lockPath, "wx"); }
    catch { throw new Error("Run is locked by another resuming process."); }
  }
  const token = randomUUID();
  try {
    await handle.writeFile(JSON.stringify({ token, pid: process.pid, host: hostname(), createdAt: new Date().toISOString() }));
    return await operation();
  } finally {
    await handle.close();
    const current = await readJson(lockPath).catch(() => null);
    if (current?.token === token) await rm(lockPath, { force: true });
  }
}

export function cycleBucket(state, revisionId) {
  return state.revisions[revisionId] || { attempts: [] };
}

export function beginCycle(state, revisionId, repairIdentity, maximumAttempts = 3) {
  if (!Number.isInteger(maximumAttempts) || maximumAttempts !== 3) throw new Error("Episode policy must retain the approved three-cycle ceiling.");
  const bucket = state.revisions[revisionId] ||= { attempts: [] };
  const previous = bucket.attempts.at(-1);
  if (previous?.status === "running") return previous;
  if (bucket.attempts.length >= maximumAttempts) throw new Error("Attempt limit reached for this approved content-and-audio revision. Reapproval cannot reset it.");
  if (previous?.status === "failed" && previous.repairIdentity === repairIdentity) {
    throw new Error("No relevant repair is evidenced. An explanatory note or unchanged reapproval cannot unlock another cycle.");
  }
  const attempt = {
    id: `${revisionId.slice(0, 12)}-${bucket.attempts.length + 1}`,
    status: "running", stage: "render", startedAt: new Date().toISOString(), repairIdentity,
  };
  bucket.attempts.push(attempt);
  return attempt;
}

export function finishCycle(attempt, error = null) {
  attempt.status = error ? "failed" : "passed";
  attempt.finishedAt = new Date().toISOString();
  if (error) attempt.failure = { stage: attempt.stage, message: error.message || String(error) };
  else delete attempt.failure;
}

export function repairIdentity({ renderIdentity, policyHash, outputSha256 = null }) {
  // Notes, approval timestamps and edited report prose do not qualify as a repair.
  return canonicalHash({ renderIdentity, policyHash, outputSha256 });
}
