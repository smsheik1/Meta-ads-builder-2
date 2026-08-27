import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseCherryTsv } from "./lipsync.mjs";

const VENDOR_DIRECTORY = path.join("vendor", "cherry-lip-sync", "v0.1.0");
const MANIFEST_NAME = "VENDOR-MANIFEST.json";
const RUNNER = fileURLToPath(new URL("./cherry-wasi-runner.mjs", import.meta.url));

function digest(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function fileDigest(file) {
  return digest(await fs.readFile(file));
}

function exactKeys(value, allowed, context) {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length > 0) throw new Error(`${context} contains unsupported key(s): ${extras.join(", ")}`);
}

async function loadCherryEngine(root) {
  const vendorRoot = path.resolve(root, VENDOR_DIRECTORY);
  const manifestPath = path.join(vendorRoot, MANIFEST_NAME);
  const manifestBytes = await fs.readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  exactKeys(
    manifest,
    [
      "schemaVersion",
      "engine",
      "version",
      "source",
      "build",
      "module",
      "patches",
      "parityFixture",
      "redistributedFiles",
      "licenseExpression",
      "nativeExecutableIncluded",
    ],
    "Cherry vendor manifest",
  );
  if (manifest.schemaVersion !== "wiggly-vendor-artifact-v1"
    || manifest.engine !== "cherry-lip-sync"
    || manifest.version !== "0.1.0") {
    throw new Error("unsupported bundled Cherry vendor manifest");
  }
  if (manifest.build?.target !== "wasm32-wasip1") {
    throw new Error("bundled Cherry engine is not the expected WASI target");
  }
  if (manifest.module?.format !== "wasm" || manifest.module?.abi !== "wasi-preview1") {
    throw new Error("bundled Cherry module format is not WASI preview 1");
  }
  if (manifest.nativeExecutableIncluded !== false) {
    throw new Error("Cherry vendor payload must not contain a native executable");
  }
  if (typeof manifest.module?.path !== "string" || path.basename(manifest.module.path) !== manifest.module.path) {
    throw new Error("Cherry vendor manifest module path must be a local filename");
  }
  if (!/^[a-f0-9]{64}$/.test(manifest.module.sha256 ?? "")) {
    throw new Error("Cherry vendor manifest module checksum is invalid");
  }
  const modulePath = path.resolve(vendorRoot, manifest.module.path);
  if (path.dirname(modulePath) !== vendorRoot) throw new Error("Cherry module path escapes its vendor folder");
  const moduleSha256 = await fileDigest(modulePath);
  if (moduleSha256 !== manifest.module.sha256) throw new Error("bundled Cherry WASI module checksum mismatch");
  return {
    manifest,
    manifestPath,
    manifestSha256: digest(manifestBytes),
    modulePath,
    moduleSha256,
  };
}

function runWasi(values) {
  const result = spawnSync(process.execPath, ["--no-warnings", RUNNER, ...values], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`bundled Cherry WASI engine failed:\n${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  return `${result.stdout}${result.stderr}`;
}

async function verifyCherryEngine({ root }) {
  const engine = await loadCherryEngine(root);
  const versionText = runWasi(["version", engine.modulePath]).trim();
  if (versionText !== "cherrylipsync 0.1.0") {
    throw new Error(`bundled Cherry version mismatch: ${versionText || "no version output"}`);
  }
  return engine;
}

async function generateCherryCues({ root, audioPath, outputPath, totalFrames }) {
  if (!path.isAbsolute(audioPath ?? "") || !path.isAbsolute(outputPath ?? "")) {
    throw new Error("Cherry audio and output paths must be absolute");
  }
  if (path.resolve(audioPath) === path.resolve(outputPath)) {
    throw new Error("Cherry output must not overwrite its source audio");
  }
  await fs.access(audioPath);
  const engine = await verifyCherryEngine({ root });
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-cherry-wasi-"));
  try {
    // WASI sees only this private scratch folder. Preserve a safe extension
    // because Cherry's decoder uses it when selecting an audio format.
    const sourceExtension = path.extname(audioPath).toLowerCase();
    const extension = /^\.[a-z0-9]{1,8}$/.test(sourceExtension) ? sourceExtension : ".audio";
    const inputName = `input${extension}`;
    await fs.copyFile(audioPath, path.join(scratch, inputName));
    runWasi(["generate", engine.modulePath, scratch, inputName]);
    const generatedPath = path.join(scratch, "output.tsv");
    const cueText = await fs.readFile(generatedPath, "utf8");
    const parsed = parseCherryTsv(cueText, { fps: 24, totalFrames });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const temporaryOutput = path.join(
      path.dirname(outputPath),
      `.${path.basename(outputPath)}.${process.pid}.tmp`,
    );
    await fs.writeFile(temporaryOutput, cueText);
    await fs.rename(temporaryOutput, outputPath);
    const sourceAudioSha256 = await fileDigest(audioPath);
    const cueSha256 = digest(Buffer.from(cueText));
    return {
      engine: engine.manifest.engine,
      engineVersion: engine.manifest.version,
      execution: "node-wasi-preview1",
      cueSource: "bundled-wasi-engine",
      cueFile: path.basename(outputPath),
      cueSha256,
      cueCount: parsed.cues.length,
      sourceAudioSha256,
      engineManifestSha256: engine.manifestSha256,
      engineModuleSha256: engine.moduleSha256,
      fps: 24,
      filterSingleFrames: true,
      networkUsed: false,
      filesystemPreopens: ["private-run-scratch-only"],
    };
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

export { generateCherryCues, loadCherryEngine, verifyCherryEngine };
