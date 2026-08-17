#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { indexColumns, resolveReadDrawing, sampleNode } from "./runtime_channels.mjs";

function parseArgs(values) {
  const args = { manifest: null, frame: null, match: null };
  for (const value of values) {
    if (value.startsWith("--match=")) args.match = value.slice("--match=".length);
    else if (!args.manifest) args.manifest = value;
    else if (args.frame === null) args.frame = Number(value);
    else throw new Error(`unexpected argument: ${value}`);
  }
  if (!args.manifest || !Number.isInteger(args.frame) || args.frame < 1) {
    throw new Error("usage: node sample_scene.mjs <runtime-manifest.json> <frame> [--match=pattern]");
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(path.resolve(args.manifest), "utf8"));
  if (manifest.schemaVersion !== "harmony-xstage-runtime-v1") {
    throw new Error(`unsupported manifest schema: ${manifest.schemaVersion}`);
  }
  const scene = manifest.scenes[0];
  if (!scene) throw new Error("manifest has no scene");
  if (args.frame < scene.startFrame || args.frame > scene.stopFrame) {
    throw new Error(`frame ${args.frame} is outside ${scene.startFrame}-${scene.stopFrame}`);
  }
  const matcher = args.match ? new RegExp(args.match, "i") : null;
  const columns = indexColumns(scene);
  const nodes = scene.nodes
    .filter((node) => !matcher || matcher.test(node.path) || matcher.test(node.type))
    .map((node) => ({
      ...sampleNode(node, columns, args.frame),
      ...(node.type === "READ" ? { drawing: resolveReadDrawing(manifest, scene, node, args.frame) } : {}),
    }));
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "harmony-scene-state-v1",
    sourceManifestSha256: manifest.source.sha256,
    sceneId: scene.id,
    frame: args.frame,
    nodes,
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
