import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { execute } from "./runtime/common.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.dirname(scriptPath);
const downloads = path.join(root, "downloads");
const defaultOutput = path.join(downloads, "wiggly-animal-conversations-format-kit.zip");

export const KIT_EXCLUDES = Object.freeze([
  "node_modules/*",
  "agent-runs/*",
  "downloads/*",
  "converter/source/target/*",
  // Real authoring binaries and their cross-format parser regression remain
  // source-repo-only. They must never enter a public Format download.
  "converter/fixtures/regression/*",
  "converter/tests/render_tvg.test.mjs",
  ".DS_Store",
]);

export async function buildKit({ sourceRoot = root, output = defaultOutput } = {}) {
  await mkdir(path.dirname(output), { recursive: true });
  await rm(output, { force: true });
  await execute("zip", [
    "-X", "-r", output,
    ".",
    "-x", ...KIT_EXCLUDES,
  ], { cwd: sourceRoot });
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  console.log(await buildKit());
}
