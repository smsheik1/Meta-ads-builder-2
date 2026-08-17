import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { createPoseRuntime, loadPoseRecipe } from "./pose-recipe.mjs";
import { loadManifest } from "./rig-v2-renderer.mjs";

const RUN_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const INPUT_SCHEMA = "shaz-sequence-input-v1";
const MAX_ACTIONS = 24;
const MAX_OUTPUT_FRAMES = 1800;

function parseArgs(values) {
  const result = {};
  for (const value of values) {
    if (!value.startsWith("--") || !value.includes("=")) {
      throw new Error(`arguments must use --name=value: ${value}`);
    }
    const [name, ...rest] = value.slice(2).split("=");
    result[name] = rest.join("=");
  }
  return result;
}

function requireRunId(value) {
  if (!RUN_ID.test(value ?? "")) {
    throw new Error("--run must be 1-64 lowercase letters, digits, or internal hyphens");
  }
  return value;
}

function resolveRunDirectory(root, runId) {
  return path.join(root, "agent-runs", requireRunId(runId));
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function sha256(file) {
  return sha256Buffer(await fs.readFile(file));
}

function execute(program, values, { cwd, capture = true } = {}) {
  const result = spawnSync(program, values, {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${program} failed:\n${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  return capture ? result.stdout : "";
}

function exactKeys(value, allowed, context) {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length > 0) throw new Error(`${context} contains unsupported key(s): ${extras.join(", ")}`);
}

async function loadPoseRegistry(root, manifest) {
  const registryPath = path.join(root, "poses", "index.json");
  const registry = await readJson(registryPath);
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.poses) || registry.poses.length === 0) {
    throw new Error("poses/index.json is invalid");
  }
  const posesRoot = path.join(root, "poses");
  const byId = new Map();
  for (const record of registry.poses) {
    exactKeys(record, ["id", "kind", "path", "sha256"], `pose registry entry ${record.id ?? "?"}`);
    if (!RUN_ID.test(record.id ?? "") || byId.has(record.id)) {
      throw new Error(`pose registry has invalid or duplicate id ${record.id}`);
    }
    if (path.isAbsolute(record.path ?? "")) throw new Error(`pose ${record.id} path must be relative`);
    const recipePath = path.resolve(posesRoot, record.path ?? "");
    if (!recipePath.startsWith(`${posesRoot}${path.sep}`)) {
      throw new Error(`pose ${record.id} path escapes poses/`);
    }
    if (await sha256(recipePath) !== record.sha256) {
      throw new Error(`pose registry checksum mismatch for ${record.id}`);
    }
    const recipe = await loadPoseRecipe(recipePath);
    if (recipe.id !== record.id) throw new Error(`pose registry id mismatch for ${record.id}`);
    const poseRuntime = createPoseRuntime(manifest, recipe);
    byId.set(record.id, { ...record, recipePath, recipe, poseRuntime });
  }
  return { path: registryPath, sha256: await sha256(registryPath), byId };
}

function integerInRange(value, fallback, minimum, maximum, context) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < minimum || resolved > maximum) {
    throw new Error(`${context} must be an integer from ${minimum} to ${maximum}`);
  }
  return resolved;
}

function validateInput(input, registry) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("input must be an object");
  exactKeys(input, ["schemaVersion", "title", "sequence"], "input");
  if (input.schemaVersion !== INPUT_SCHEMA) throw new Error(`unsupported input schema ${input.schemaVersion}`);
  if (typeof input.title !== "string" || input.title.trim().length < 1 || input.title.length > 120) {
    throw new Error("input.title must contain 1-120 characters");
  }
  if (!Array.isArray(input.sequence) || input.sequence.length < 1 || input.sequence.length > MAX_ACTIONS) {
    throw new Error(`input.sequence must contain 1-${MAX_ACTIONS} actions`);
  }
  let totalFrames = 0;
  const entries = input.sequence.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`sequence[${index}] must be an object`);
    }
    exactKeys(entry, ["poseId", "holdFrames", "gapFrames"], `sequence[${index}]`);
    const pose = registry.byId.get(entry.poseId);
    if (!pose) throw new Error(`sequence[${index}] references unknown pose ${entry.poseId}`);
    const holdFrames = integerInRange(entry.holdFrames, 12, 0, 120, `sequence[${index}].holdFrames`);
    const gapFrames = integerInRange(entry.gapFrames, index === input.sequence.length - 1 ? 0 : 3, 0, 24, `sequence[${index}].gapFrames`);
    if (index === input.sequence.length - 1 && gapFrames !== 0) {
      throw new Error("the final sequence entry must use gapFrames: 0");
    }
    const outputFrames = pose.recipe.durationFrames + holdFrames + gapFrames;
    totalFrames += outputFrames;
    return { index, poseId: pose.id, pose, holdFrames, gapFrames, outputFrames };
  });
  if (totalFrames > MAX_OUTPUT_FRAMES) {
    throw new Error(`sequence produces ${totalFrames} frames; maximum is ${MAX_OUTPUT_FRAMES}`);
  }
  return { title: input.title.trim(), entries, totalFrames, durationSeconds: totalFrames / 24 };
}

async function validateRun({ root, runDirectory }) {
  const inputPath = path.join(runDirectory, "input.json");
  if (!(await exists(inputPath))) throw new Error(`missing run input: ${inputPath}`);
  const manifestPath = path.join(root, "rig-v2", "runtime.json");
  const manifest = await loadManifest(manifestPath);
  const registry = await loadPoseRegistry(root, manifest);
  const input = await readJson(inputPath);
  const timeline = validateInput(input, registry);
  const receipt = {
    schemaVersion: 1,
    status: "pass",
    validatedAt: new Date().toISOString(),
    formatVersion: (await readJson(path.join(root, "format.json"))).version,
    inputSha256: await sha256(inputPath),
    sourceXstageSha256: manifest.source.sha256,
    poseRegistrySha256: registry.sha256,
    artistRenderedFramesUsed: false,
    totalFrames: timeline.totalFrames,
    durationSeconds: timeline.durationSeconds,
    poses: timeline.entries.map(({ index, poseId, pose, holdFrames, gapFrames }) => ({
      index,
      poseId,
      recipeSha256: pose.poseRuntime.recipeSha256,
      fileSha256: pose.sha256,
      holdFrames,
      gapFrames,
    })),
    providerCalls: 0,
    estimatedCost: "$0",
  };
  await writeJson(path.join(runDirectory, "validation-receipt.json"), receipt);
  return { input, inputPath, manifest, manifestPath, registry, timeline, receipt };
}

export {
  execute,
  exists,
  loadPoseRegistry,
  parseArgs,
  readJson,
  requireRunId,
  resolveRunDirectory,
  sha256,
  sha256Buffer,
  validateInput,
  validateRun,
  writeJson,
};
