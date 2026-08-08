import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "assets/background-options.json");

export async function resolveOuterBackground(id) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const selectedId = id || manifest.default;
  const option = manifest.options.find((candidate) => candidate.id === selectedId);
  if (!option) throw new Error(`Unknown outer background: ${selectedId}`);
  return { ...option, file: path.resolve(root, option.path) };
}
