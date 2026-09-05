// Bootstrap deliberately imports only Node built-ins and the built-ins-only common helpers.
import { constants } from "node:fs";
import { access, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execute, readJson, sha256, toolExecutable } from "./common.mjs";

export const REQUIRED_FFMPEG_CAPABILITIES = {
  encoders: ["libx264", "aac", "pcm_s16le"],
  decoders: ["png", "pcm_s16le"],
  filters: ["sine", "volumedetect", "fps", "scale", "tile", "aresample"],
  muxers: ["mp4", "wav", "s16le", "null", "image2"],
  demuxers: ["image2", "wav"],
  devices: ["lavfi"],
};

export async function executablePath(program, env = process.env, cwd = process.cwd()) {
  const selected = toolExecutable(program, env);
  const candidates = selected.includes(path.sep)
    ? [path.resolve(cwd, selected)]
    : (env.PATH || "").split(path.delimiter).filter(Boolean).map((directory) => path.resolve(cwd, directory, selected));
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return await realpath(candidate);
    } catch { /* Continue through PATH without invoking a shell. */ }
  }
  return null;
}

function capabilityNames(output) {
  return new Set(output.split("\n").flatMap((line) => {
    const match = line.trim().match(/^[A-Z.]{1,6}\s+([^\s]+)/);
    return match ? match[1].split(",") : [];
  }));
}

export async function checkDependencies({ root, env = process.env }) {
  const issues = [];
  const tools = {};
  const versions = {};
  const addIssue = (id, message, action) => issues.push({ id, message, action });
  for (const tool of ["node", "npm", "ffmpeg", "ffprobe", "python3"]) {
    const required = tool !== "python3";
    const selected = toolExecutable(tool, env);
    const resolved = await executablePath(tool, env, root);
    tools[tool] = { required, executable: selected, path: resolved, status: "missing" };
    if (!resolved) {
      if (required) addIssue(`tool:${tool}`, `${tool} executable not found: ${selected}`, `Install ${tool} explicitly or configure its documented executable override; no global installation was changed.`);
      continue;
    }
    try {
      const version = (await execute(resolved, [tool.startsWith("ff") ? "-version" : "--version"], { capture: true, env, cwd: root, timeoutMs: 15000 })).trim().split("\n")[0];
      tools[tool] = { ...tools[tool], status: "pass", version };
      versions[tool] = version;
    } catch (error) {
      tools[tool] = { ...tools[tool], status: "unusable", error: error.message };
      if (required) addIssue(`tool:${tool}`, `${tool} exists but could not run: ${error.message}`, `Check the selected ${tool} executable and its permissions.`);
    }
  }
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 20 || (major === 20 && minor < 9)) {
    addIssue("node-version", `Running Node ${process.versions.node}; Sharp requires Node >=20.9.0.`, "Install a compatible Node version explicitly, then rerun this check.");
  }

  const capabilities = {};
  if (tools.ffmpeg.status === "pass") {
    for (const [kind, required] of Object.entries(REQUIRED_FFMPEG_CAPABILITIES)) {
      try {
        const output = await execute(tools.ffmpeg.path, ["-hide_banner", `-${kind}`], { capture: true, env, cwd: root, timeoutMs: 15000 });
        const available = capabilityNames(output);
        const missing = required.filter((name) => !available.has(name));
        capabilities[kind] = { required, missing, status: missing.length ? "fail" : "pass" };
        if (missing.length) addIssue(`ffmpeg:${kind}`, `Missing FFmpeg ${kind}: ${missing.join(", ")}`, "Select an FFmpeg build with these capabilities using FFMPEG; no installation was changed.");
      } catch (error) {
        capabilities[kind] = { required, status: "unavailable", error: error.message };
        addIssue(`ffmpeg:${kind}`, `Could not inspect FFmpeg ${kind}.`, "Check the selected FFMPEG executable.");
      }
    }
  }

  const dependencies = {};
  try {
    const expected = (await readJson(path.join(root, "package.json"))).dependencies.sharp;
    const installed = await readJson(path.join(root, "node_modules", "sharp", "package.json"));
    dependencies.sharp = { expected, version: installed.version, status: "pass" };
    if (installed.version !== expected) throw new Error(`Expected Sharp ${expected}, found ${installed.version}.`);
    const entry = createRequire(path.join(root, "package.json")).resolve("sharp");
    dependencies.sharp.path = entry;
    // Test native loading in a child only after bootstrap can collect every other issue.
    await execute("node", ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(entry).href)})`], { capture: true, cwd: root, env, timeoutMs: 15000 });
  } catch (error) {
    dependencies.sharp = { ...dependencies.sharp, status: "missing-or-unusable", error: error.message };
    addIssue("dependency:sharp", "The kit-local Sharp dependency is missing, mismatched, or cannot load.", "Run npm ci in this extracted kit, then rerun node runner.mjs doctor.");
  }

  let packagedAssets = 0;
  const assetProblems = [];
  try {
    const assets = await readJson(path.join(root, "assets.json"));
    const items = [...assets.backgrounds, ...assets.characters.flatMap((character) => character.poses)];
    packagedAssets = items.length;
    for (const asset of items) {
      try {
        const file = path.resolve(root, asset.path);
        if (!file.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error("Asset path escapes the kit.");
        if (await sha256(file) !== asset.sha256) throw new Error("Checksum mismatch.");
      } catch (error) {
        assetProblems.push({ path: asset.path, error: error.message });
      }
    }
  } catch (error) {
    assetProblems.push({ path: "assets.json", error: error.message });
  }
  for (const problem of assetProblems) addIssue("asset", `Packaged asset problem: ${problem.path}: ${problem.error}`, "Re-extract a verified kit archive; do not replace a missing asset with an invented substitute.");
  return {
    schemaVersion: 1, status: issues.length ? "setup-required" : "pass",
    platform: { os: process.platform, architecture: process.arch },
    tools, versions, dependencies, ffmpegCapabilities: capabilities,
    packagedAssets, assetProblems, issues,
    notes: ["Node is the initial prerequisite. This check makes no installation changes.", "Python is optional for intake/converter tooling; neither Python nor Cargo is required to render packaged poses.", "Additional source codecs are checked when that media is processed."],
  };
}
