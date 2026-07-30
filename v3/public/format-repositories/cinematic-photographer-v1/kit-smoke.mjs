import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const slug = "cinematic-photographer";
const packageRoot = path.resolve("public", "format-repositories", `${slug}-v1`);
const required = [
  ".env.example",
  ".gitignore",
  "README.md",
  "SKILL.md",
  "assets.json",
  "assets/source/example-output.png",
  "assets/source/guide.pdf",
  "assets/source/style-reference.jpg",
  "format.json",
  "goldens.json",
  "inputs.json",
  "pipeline.json",
  "prompts/transform.txt",
  "quality.json",
  "requirements.json",
  "runtime.json",
];
for (const file of required) {
  if (!existsSync(path.join(packageRoot, file))) throw new Error(`Missing kit file: ${file}`);
}
if (!existsSync(path.resolve("scripts", "skai-image-format.ts"))) {
  throw new Error("Missing official runner.");
}
const format = JSON.parse(readFileSync(path.join(packageRoot, "format.json"), "utf8"));
const runtime = JSON.parse(readFileSync(path.join(packageRoot, "runtime.json"), "utf8"));
if (format.id !== slug || format.version !== "1.0.0" || runtime.slug !== slug) {
  throw new Error("Format identity is invalid.");
}
if (runtime.maximumAttempts !== 3 || runtime.expectedOutputs !== 1) {
  throw new Error("Runtime limits are invalid.");
}
console.log("Cinematic Photographer Format Kit files are complete.");
