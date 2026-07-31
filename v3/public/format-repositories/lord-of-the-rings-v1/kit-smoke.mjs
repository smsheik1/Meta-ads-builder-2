import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const slug = "lord-of-the-rings";
const packageRoot = path.resolve("public", "format-repositories", `${slug}-v1`);
const required = [
  ".env.example",
  ".gitignore",
  "README.md",
  "SKILL.md",
  "assets.json",
  "assets/source/guide.txt",
  "assets/source/reference-input.jpg",
  "assets/source/wiggly-proof.jpg",
  "assets/source/skai-hero.jpg",
  "assets/source/skai-example-01.jpg",
  "assets/source/skai-example-05.jpg",
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
const goldens = JSON.parse(readFileSync(path.join(packageRoot, "goldens.json"), "utf8"));
if (format.id !== slug || format.version !== "1.0.0" || runtime.slug !== slug) {
  throw new Error("Format identity is invalid.");
}
if (
  runtime.maximumAttempts !== 3 ||
  runtime.expectedOutputs !== 1 ||
  goldens.examples.length !== 7
) {
  throw new Error("Lord of the Rings runtime limits are invalid.");
}
for (const example of goldens.examples) {
  if (!existsSync(path.join(packageRoot, example.imagePath))) {
    throw new Error(`Missing example: ${example.imagePath}`);
  }
}
console.log("Lord of the Rings Format Kit files are complete.");
