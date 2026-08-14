#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = Object.fromEntries(process.argv.slice(2).filter((value) => value.startsWith("--")).map((value) => {
  const [key, ...parts] = value.slice(2).split("=");
  return [key, parts.join("=") || true];
}));
const catalog = JSON.parse(await readFile(path.join(root, "assets/character-packs.json"), "utf8"));
const requestedId = typeof args.character === "string" ? args.character : null;
const motionIds = typeof args.motions === "string" ? args.motions.split(",").filter(Boolean) : ["silly-dancing", "macarena-dance"];
if (!requestedId) throw new Error("Pass exactly one --character=<motion-ready-id>.");
const character = catalog.packs.find((candidate) => candidate.status === "motion-ready" && candidate.id === requestedId);
if (!character) throw new Error(`Unknown or non-ready character: ${requestedId}`);
const proofRoot = path.join(root, "agent-runs", String(args.run || "character-catalog-proof"));
const results = [];

function execute(program, values) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, values, { cwd: root, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${program} exited ${code}`)));
  });
}

for (const motionId of motionIds) {
    const directory = path.join(proofRoot, character.id, motionId);
    await mkdir(directory, { recursive: true });
    const inputPath = path.join(directory, "input.json");
    const outputPath = path.join(directory, "smoke.mp4");
    const reportPath = path.join(directory, "motion-report.json");
    await writeFile(inputPath, `${JSON.stringify({
      characterId: character.id,
      motionId,
      title: `${character.label} · ${motionId}`,
      background: "#0b3558",
    }, null, 2)}\n`);
    process.stdout.write(`PROVING ${character.id} / ${motionId}\n`);
    const startedAt = Date.now();
    try {
      await execute("node", [
        "runtime/render.mjs",
        `--input=${path.relative(root, inputPath)}`,
        `--output=${path.relative(root, outputPath)}`,
        `--work-dir=${path.relative(root, directory)}`,
        `--report=${path.relative(root, reportPath)}`,
        "--smoke",
      ]);
      const report = JSON.parse(await readFile(reportPath, "utf8"));
      results.push({
        status: "pass",
        characterId: character.id,
        motionId,
        output: path.relative(root, outputPath),
        report: path.relative(root, reportPath),
        mappedBoneCount: report.retarget.mappedBoneCount,
        maximumFootPenetration: report.retarget.maximumFootPenetration,
        maximumFootTargetError: report.retarget.maximumFootTargetError,
        elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
      });
    } catch (error) {
      results.push({
        status: "fail",
        characterId: character.id,
        motionId,
        error: error instanceof Error ? error.message : String(error),
        elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
      });
    }
}

const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  motions: motionIds,
  character: { id: character.id, label: character.label },
  passed: results.filter((result) => result.status === "pass").length,
  failed: results.filter((result) => result.status === "fail").length,
  results,
};
await writeFile(path.join(proofRoot, "catalog-proof.json"), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ proof: path.relative(root, path.join(proofRoot, "catalog-proof.json")), passed: summary.passed, failed: summary.failed }, null, 2)}\n`);
if (summary.failed) process.exitCode = 1;
