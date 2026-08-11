import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execute } from "./runtime/common.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const downloads = path.join(root, "downloads");
await mkdir(downloads, { recursive: true });
const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
const output = path.join(downloads, `wiggly-animal-conversations-format-kit-${stamp}.zip`);
await execute("zip", [
  "-r", output,
  ".",
  "-x", "node_modules/*", "agent-runs/*", "downloads/*", "converter/source/target/*", ".DS_Store",
], { cwd: root });
console.log(output);
