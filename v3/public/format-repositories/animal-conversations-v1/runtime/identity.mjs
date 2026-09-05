import path from "node:path";
import { execute, hashValue, readJson, sha256 } from "./common.mjs";

// JSON key order is not an episode revision. Array order remains meaningful.
export function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined)
      .map((key) => [key, canonicalValue(value[key])]));
  }
  return value;
}

export function canonicalHash(value) {
  return hashValue(canonicalValue(value));
}

export function semanticContent(input) {
  // The audio's bytes are bound separately; a local filename is not a creative choice.
  const { audioFile, ...content } = input;
  return canonicalValue(content);
}

export function approvedRevisionId(input, audioSha256) {
  if (typeof audioSha256 !== "string" || !audioSha256) throw new Error("Audio hash is required for revision identity.");
  return canonicalHash({ content: semanticContent(input), audioSha256 });
}

export function runAudioPath(runDirectory, input) {
  if (typeof input.audioFile !== "string" || !input.audioFile) throw new Error("The run has no audio file.");
  const file = path.resolve(runDirectory, input.audioFile);
  if (path.dirname(file) !== path.resolve(runDirectory)) throw new Error("audioFile must name a file directly inside the run folder.");
  return file;
}

export async function currentRevision(runDirectory) {
  const input = await readJson(path.join(runDirectory, "input.json"));
  const audioSha256 = await sha256(runAudioPath(runDirectory, input));
  return { input, audioSha256, revisionId: approvedRevisionId(input, audioSha256) };
}

export async function collectRenderIdentity({ root, runDirectory }) {
  const { input, audioSha256, revisionId } = await currentRevision(runDirectory);
  const assets = await readJson(path.join(root, "assets.json"));
  const background = assets.backgrounds.find((entry) => entry.id === input.background);
  if (!background) throw new Error("Unknown packaged background.");
  const selected = [background, ...assets.characters.flatMap((character) => character.poses)];
  const assetHashes = [];
  for (const asset of selected) {
    const file = path.resolve(root, asset.path);
    if (!file.startsWith(path.resolve(root) + path.sep)) throw new Error("Packaged asset escapes the kit.");
    assetHashes.push({ path: asset.path, sha256: await sha256(file) });
  }
  const rendererFiles = [
    "runtime/render.mjs", "runtime/common.mjs", "runtime/validate.mjs",
    "runtime/identity.mjs", "composition-contract.json", "package-lock.json",
  ];
  const files = [];
  for (const file of rendererFiles) files.push({ path: file, sha256: await sha256(path.join(root, file)) });
  const sharp = (await import("sharp")).default;
  const ffmpeg = (await execute("ffmpeg", ["-version"], { capture: true })).split("\n")[0];
  return {
    schemaVersion: 1,
    revisionId,
    inputHash: canonicalHash(input),
    audioSha256,
    assets: assetHashes,
    // Pose IDs determine which pixels are used for each state. Hash the mapping
    // as well as the image bytes so remapping an unchanged PNG invalidates caches.
    assetMappingHash: canonicalHash(assets),
    renderer: { files, nodeVersion: process.version, sharpVersions: sharp.versions, ffmpeg },
  };
}

export async function qualityPolicyIdentity(root) {
  return canonicalHash(await readJson(path.join(root, "quality.json")));
}

export function assertMatchingIdentity(expected, actual, description = "render") {
  if (!expected || canonicalHash(expected) !== canonicalHash(actual)) {
    throw new Error(`Stale ${description} evidence: current content, audio, assets or renderer no longer match.`);
  }
}
