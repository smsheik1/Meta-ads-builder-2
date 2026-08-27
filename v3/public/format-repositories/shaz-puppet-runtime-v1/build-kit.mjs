import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { execute, sha256, writeJson } from "./runtime/run-common.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const archiveName = "wiggly-shaz-puppet-runtime-format-kit";
const downloads = path.join(root, "downloads");
const output = path.join(downloads, `${archiveName}.zip`);
const checksumOutput = `${output}.sha256`;
const excludedNames = new Set(["node_modules", ".DS_Store", ".git"]);
const packagedPropFiles = new Set(["phone.svg", "crossed-arms-pose.png"]);
const packagedBackgroundFiles = new Set(["sisters-room.png"]);

export function include(source) {
  const relative = path.relative(root, source);
  if (!relative) return true;
  const parts = relative.split(path.sep);
  if (parts.some((part) => excludedNames.has(part))) return false;
  if (parts[0] === "downloads") return false;
  if (parts[0] === "agent-runs" && parts.length > 1 && parts.at(-1) !== ".gitkeep") return false;
  if (parts[0] === "goldens" || relative === "goldens.json") return false;
  if (
    parts[0] === "assets" &&
    parts[1] === "props" &&
    parts.length > 2 &&
    !packagedPropFiles.has(parts.slice(2).join(path.sep))
  ) {
    return false;
  }
  if (
    parts[0] === "assets" &&
    parts[1] === "backgrounds" &&
    parts.length > 2 &&
    !packagedBackgroundFiles.has(parts.slice(2).join(path.sep))
  ) {
    return false;
  }
  if (relative === "evidence/blind-kit-operation.md") return false;
  if (relative === "runtime/build-crossed-arms-assembly.mjs") return false;
  if (relative === "runtime/compile-tvg-assets.mjs") return false;
  return true;
}

export async function buildKit() {
  await fs.mkdir(downloads, { recursive: true });
  await fs.rm(output, { force: true });
  await fs.rm(checksumOutput, { force: true });
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-format-kit-"));
  const staged = path.join(scratch, archiveName);
  try {
    await fs.cp(root, staged, { recursive: true, filter: include });
    await writeJson(path.join(staged, "KIT-MANIFEST.json"), {
      schemaVersion: 1,
      id: "shaz-puppet-runtime",
      version: (await import("./format.json", { with: { type: "json" } })).default.version,
      officialRuntime: "runner.mjs",
      commands: ["check", "inspect:registry", "smoke", "lipsync", "init", "validate", "render", "inspect", "finalize"],
      networkRequired: false,
      providerCost: "$0",
      artistRenderedFramesUsed: false,
    });
    execute("zip", ["-q", "-r", output, archiveName], { cwd: scratch });
    const digest = await sha256(output);
    await fs.writeFile(checksumOutput, `${digest}  ${path.basename(output)}\n`);
    console.log(JSON.stringify({ status: "built", output, sha256: digest }, null, 2));
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildKit();
}
