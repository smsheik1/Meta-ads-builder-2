#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { loadManifest, renderRigFrame } from "./rig-v2-renderer.mjs";

function parseArgs(values) {
  const args = { manifest: null, frame: null, assets: null, output: null, receipt: null };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--manifest") args.manifest = values[++index];
    else if (value === "--frame") args.frame = Number(values[++index]);
    else if (value === "--assets") args.assets = values[++index];
    else if (value === "--output") args.output = values[++index];
    else if (value === "--receipt") args.receipt = values[++index];
    else throw new Error(`unknown argument ${value}`);
  }
  if (!args.manifest || !Number.isInteger(args.frame) || !args.assets || !args.output) {
    throw new Error("usage: render-xstage-frame.mjs --manifest runtime.json --frame N --assets rig-v2 --output frame.png [--receipt receipt.json]");
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = await loadManifest(path.resolve(args.manifest));
  const rendered = await renderRigFrame({
    manifest,
    frame: args.frame,
    assetRoot: path.resolve(args.assets),
  });
  await fs.mkdir(path.dirname(path.resolve(args.output)), { recursive: true });
  await fs.writeFile(path.resolve(args.output), rendered.buffer);
  if (args.receipt) {
    await fs.mkdir(path.dirname(path.resolve(args.receipt)), { recursive: true });
    await fs.writeFile(path.resolve(args.receipt), `${JSON.stringify(rendered.receipt, null, 2)}\n`);
  }
  process.stdout.write(`${path.resolve(args.output)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
