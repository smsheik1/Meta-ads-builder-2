#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { inspectPose } from "./inspect-pose.mjs";
import { loadManifest } from "./rig-v2-renderer.mjs";
import { loadPoseRegistry } from "./run-common.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function inspectRegistry() {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  const registry = await loadPoseRegistry(root, manifest);
  const entries = [...registry.byId.values()];
  const reports = [];

  // Bound image memory while checking every registered action.
  for (let index = 0; index < entries.length; index += 3) {
    const batch = await Promise.all(entries.slice(index, index + 3).map(async (pose) => {
      const report = await inspectPose({
        manifest,
        assetRoot: path.join(root, "rig-v2", "assets"),
        propRoot: path.join(root, "assets", "props"),
        recipe: pose.recipe,
      });
      return {
        id: pose.id,
        status: report.status,
        frames: report.frames.length,
        failures: report.failures,
      };
    }));
    reports.push(...batch);
  }

  const failed = reports.filter(({ status }) => status !== "pass");
  const result = {
    schemaVersion: 1,
    status: failed.length === 0 ? "pass" : "fail",
    registrySha256: registry.sha256,
    poseCount: reports.length,
    frameCount: reports.reduce((sum, report) => sum + report.frames, 0),
    reports,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (failed.length > 0) process.exitCode = 1;
  return result;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  inspectRegistry().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { inspectRegistry };
