import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const formatRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const starterManifestPath = path.join(formatRoot, "assets/motions/manifest.json");
export const userManifestPath = path.join(formatRoot, "user-motions/manifest.json");

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function loadMotionCatalog() {
  const starter = await readJson(starterManifestPath);
  const user = await exists(userManifestPath)
    ? await readJson(userManifestPath)
    : { schemaVersion: 1, library: "user", motions: [] };
  const seen = new Set();
  const motions = [];
  for (const [library, manifest] of [["starter", starter], ["user", user]]) {
    for (const motion of manifest.motions || []) {
      if (seen.has(motion.id)) throw new Error(`Duplicate motion id across libraries: ${motion.id}`);
      seen.add(motion.id);
      motions.push({ ...motion, library });
    }
  }
  return { starter, user, motions };
}
