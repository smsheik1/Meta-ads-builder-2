#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const converterRoot = path.dirname(fileURLToPath(import.meta.url));
const formatRoot = path.dirname(converterRoot);
const args = parseArgs(process.argv.slice(2));

function parseArgs(values) {
  return Object.fromEntries(values.filter((value) => value.startsWith("--")).map((value) => {
    const [key, ...rest] = value.slice(2).split("=");
    return [key, rest.length ? rest.join("=") : true];
  }));
}

function execute(program, values, { cwd = converterRoot, capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, values, { cwd, stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit" });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve(stdout)
      : reject(new Error(`${program} exited ${code}\n${stderr.slice(-8000)}`)));
  });
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function validateManifest(manifest) {
  if (!manifest.id || !manifest.character) throw new Error("Manifest requires id and character.");
  if (!Array.isArray(manifest.layers) || manifest.layers.length !== manifest.expectedLayerCount) {
    throw new Error(`Manifest ${manifest.id} expected ${manifest.expectedLayerCount} layers.`);
  }
  const ids = new Set();
  for (const layer of manifest.layers) {
    if (!layer.id || !layer.file) throw new Error(`Manifest ${manifest.id} has an invalid layer.`);
    if (ids.has(layer.id)) throw new Error(`Manifest ${manifest.id} repeats layer id ${layer.id}.`);
    ids.add(layer.id);
  }
}

function resolveLayers(manifest, variants) {
  return manifest.layers.map((layer) => {
    const variant = variants[layer.id];
    if (variant === undefined) return layer;
    if (!/^\d+$/.test(String(variant))) throw new Error(`${layer.id} variant must be a drawing number.`);
    if (!/-\d+\.tvg$/i.test(layer.file)) throw new Error(`${layer.id} source cannot select a numbered drawing: ${layer.file}`);
    return { ...layer, file: layer.file.replace(/-\d+\.tvg$/i, `-${variant}.tvg`) };
  });
}

function transformArguments(transform = {}) {
  return [
    transform.positionXFields ?? 0,
    transform.positionYFields ?? 0,
    transform.scaleX ?? 1,
    transform.scaleY ?? 1,
    transform.rotationDegrees ?? 0,
    transform.pivotXFields ?? 0,
    transform.pivotYFields ?? 0,
  ].map(String);
}

function applySeedOverrides(spec, layer) {
  for (const override of layer.seedOverrides || []) {
    const matches = spec.seeds.filter((seed) => seed.color_id === override.colorId);
    if (matches.length !== 1) {
      throw new Error(`${layer.id} seed override expected one ${override.colorId} record, found ${matches.length}.`);
    }
    matches[0].boundary_index = override.boundaryIndex;
    matches[0].side = override.side;
    if (override.color) matches[0].color = override.color;
  }
  return spec;
}

async function inspectOutput(outputPath, manifest) {
  const { data, info } = await sharp(outputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaquePixels = 0;
  let borderOpaquePixels = 0;
  const colors = new Set();
  const offset = (x, y) => (y * info.width + x) * info.channels;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const at = offset(x, y);
      if (data[at + 3] === 0) continue;
      opaquePixels += 1;
      colors.add(`${data[at]},${data[at + 1]},${data[at + 2]}`);
      if (x === 0 || y === 0 || x + 1 === info.width || y + 1 === info.height) borderOpaquePixels += 1;
    }
  }
  const coverage = opaquePixels / (info.width * info.height);
  const missingColors = (manifest.requiredRgb || []).filter((color) => !colors.has(color.join(",")));
  const transparentRequiredPoints = (manifest.requiredOpaquePoints || []).filter(([normalizedX, normalizedY]) => {
    const x = Math.min(info.width - 1, Math.max(0, Math.round(normalizedX * info.width)));
    const y = Math.min(info.height - 1, Math.max(0, Math.round(normalizedY * info.height)));
    return data[offset(x, y) + 3] === 0;
  });
  const checks = {
    dimensions: info.width >= 500 && info.height >= 500,
    alphaCoverage: coverage > 0.08 && coverage < 0.85,
    transparentBorder: borderOpaquePixels === 0,
    requiredPaletteColors: missingColors.length === 0,
    requiredInteriorCoverage: transparentRequiredPoints.length === 0,
  };
  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error(`Pose inspection failed: ${JSON.stringify({ checks, coverage, borderOpaquePixels, missingColors, transparentRequiredPoints })}`);
  }
  return { width: info.width, height: info.height, opaquePixels, coverage, borderOpaquePixels, checks };
}

async function main() {
  if (!args.rig || !args.manifest || !args.output) {
    throw new Error("usage: node convert_pose.mjs --rig=/absolute/Harmony/project --manifest=cat-frame1 --output=/absolute/pose.png [--mouth=2] [--eyes=1] [--debug]");
  }
  const rigRoot = path.resolve(String(args.rig));
  const manifestPath = args.manifest.endsWith(".json")
    ? path.resolve(String(args.manifest))
    : path.join(converterRoot, "manifests", `${args.manifest}.json`);
  const outputPath = path.resolve(String(args.output));
  const receiptPath = outputPath.replace(/\.png$/i, ".receipt.json");
  const manifest = await readJson(manifestPath);
  validateManifest(manifest);
  const layers = resolveLayers(manifest, { mouth: args.mouth, eyes: args.eyes });
  if (!outputPath.toLowerCase().endsWith(".png")) throw new Error("Output must be a PNG file.");

  for (const layer of layers) {
    const source = path.join(rigRoot, layer.file);
    if (!(await exists(source))) throw new Error(`Missing ${layer.id} source drawing: ${source}`);
  }

  const automaticWorkDirectory = !args.work;
  const workDirectory = automaticWorkDirectory
    ? await mkdtemp(path.join(tmpdir(), `animal-conversations-${manifest.id}-`))
    : path.resolve(String(args.work));
  await mkdir(workDirectory, { recursive: true });
  await mkdir(path.dirname(outputPath), { recursive: true });

  const rustRoot = path.join(converterRoot, "source");
  const standardCargo = path.join(homedir(), ".cargo", "bin", "cargo");
  const cargo = process.env.CARGO || (await exists(standardCargo) ? standardCargo : "cargo");
  await execute(cargo, ["build", "--quiet", "-p", "tvg", "--example", "export_spec"], { cwd: rustRoot });
  const exporter = path.join(rustRoot, "target", "debug", "examples", "export_spec");
  const specPaths = [];
  const sources = [];
  for (const [index, layer] of layers.entries()) {
    const source = path.join(rigRoot, layer.file);
    const stem = `${String(index).padStart(2, "0")}-${layer.id}`;
    const rawSpecPath = path.join(workDirectory, `${stem}.raw.json`);
    const transformedSpecPath = path.join(workDirectory, `${stem}.json`);
    const exported = JSON.parse(await execute(exporter, [source], { capture: true }));
    await writeJson(rawSpecPath, applySeedOverrides(exported, layer));
    await execute("node", [
      path.join(converterRoot, "transform_spec.cjs"),
      rawSpecPath,
      transformedSpecPath,
      ...transformArguments(layer.transform),
    ]);
    specPaths.push(transformedSpecPath);
    sources.push({
      id: layer.id,
      file: layer.file,
      sha256: await sha256(source),
      transform: layer.transform || null,
      seedOverrides: layer.seedOverrides || null,
    });
  }

  const boundedDirectory = path.join(workDirectory, "bounded");
  const prepared = JSON.parse(await execute("node", [
    path.join(converterRoot, "prepare_layered_specs.cjs"),
    boundedDirectory,
    ...specPaths,
  ], { capture: true }));
  const layerPngs = [];
  for (const [index, specPath] of prepared.outputs.entries()) {
    const layerPng = path.join(workDirectory, `${String(index).padStart(2, "0")}.png`);
    const renderArgs = [path.join(converterRoot, "render_tvg.cjs"), specPath, layerPng, formatRoot];
    if (args.debug) renderArgs.push("--debug");
    await execute("node", renderArgs, { capture: true });
    layerPngs.push(layerPng);
  }
  await execute("node", [
    path.join(converterRoot, "composite_layers.cjs"),
    outputPath,
    formatRoot,
    ...layerPngs,
  ], { capture: true });

  const inspection = await inspectOutput(outputPath, manifest);
  const receipt = {
    status: "pass",
    converter: "harmony-tvg-layered-pose-v1",
    harmonyRequired: false,
    manifest: manifest.id,
    manifestSha256: await sha256(manifestPath),
    output: path.basename(outputPath),
    outputSha256: await sha256(outputPath),
    bounds: prepared.bounds,
    layerCount: layerPngs.length,
    sources,
    inspection,
  };
  await writeJson(receiptPath, receipt);
  if (automaticWorkDirectory) await rm(workDirectory, { recursive: true });
  process.stdout.write(`${JSON.stringify({ outputPath, receiptPath, ...inspection })}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
