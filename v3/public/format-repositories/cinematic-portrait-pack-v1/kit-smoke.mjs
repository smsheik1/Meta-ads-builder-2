import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const slug = "cinematic-portrait-pack";
const packageRoot = path.resolve("public", "format-repositories", `${slug}-v1`);
const required = [
  ".env.example",
  ".gitignore",
  "README.md",
  "SKILL.md",
  "assets.json",
  "assets/source/guide.txt",
  "assets/source/skai-carousel-01.jpg",
  "assets/source/smoke-input.jpg",
  "format.json",
  "goldens.json",
  "inputs.json",
  "pipeline.json",
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
const goldens = JSON.parse(readFileSync(path.join(packageRoot, "goldens.json"), "utf8"));
if (format.id !== slug || format.version !== "1.0.0" || runtime.slug !== slug) {
  throw new Error("Format identity is invalid.");
}
if (
  runtime.maximumAttempts !== 3 ||
  runtime.expectedOutputs !== 1 ||
  Object.keys(runtime.promptVariants).length !== 8 ||
  goldens.examples.length !== 8
) {
  throw new Error("Eight-look runtime limits are invalid.");
}
for (const promptPath of Object.values(runtime.promptVariants)) {
  if (!existsSync(path.join(packageRoot, promptPath))) throw new Error(`Missing prompt: ${promptPath}`);
}
for (const example of goldens.examples) {
  if (!existsSync(path.join(packageRoot, example.imagePath))) {
    throw new Error(`Missing source example: ${example.imagePath}`);
  }
  if (!existsSync(path.join(packageRoot, example.cleanImagePath))) {
    throw new Error(`Missing clean guide example: ${example.cleanImagePath}`);
  }
}
console.log("Cinematic Portrait Pack Format Kit files are complete.");
