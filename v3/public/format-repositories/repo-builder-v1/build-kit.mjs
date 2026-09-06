import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile } from "node:fs/promises";
import { archiveFiles } from "./runtime/package.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const [manifest, pkg, files] = await Promise.all(["KIT-MANIFEST.json", "package.json", "release-files.json"].map(async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"))));
if (manifest.version !== pkg.version || manifest.kit !== pkg.name) throw new Error("Builder identity/version mismatch");
const output = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "downloads", `${manifest.kit}-${manifest.version}.zip`);
if (!process.argv[2]) await mkdir(path.join(root, "downloads")).catch((error) => { if (error.code !== "EEXIST") throw error; });
console.log(JSON.stringify(await archiveFiles({ root, files: files.files, output, metadata: { kind: manifest.kind, kit: manifest.kit, version: manifest.version, review: "baseline-see-proof-report" } }), null, 2));
