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

function include(source) {
  const relative = path.relative(root, source);
  if (!relative) return true;
  const parts = relative.split(path.sep);
  if (parts.some((part) => excludedNames.has(part))) return false;
  if (parts[0] === "downloads" && parts.length > 1) return false;
  if (parts[0] === "agent-runs" && parts.length > 1 && parts.at(-1) !== ".gitkeep") return false;
  if (parts[0] === "goldens") return false;
  if (relative === "evidence/blind-kit-operation.md") return false;
  if (relative === "runtime/compile-tvg-assets.mjs") return false;
  return true;
}

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
    commands: ["check", "smoke", "init", "validate", "render", "inspect", "finalize"],
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
