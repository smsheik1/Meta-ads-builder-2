import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
const packageRoot = path.resolve("public", "format-repositories", "reviews-v1");
const required = [
  ".env.example",
  "README.md",
  "SKILL.md",
  "format.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "requirements.json",
  "goldens.json",
  "prompts/research.md",
  "prompts/framing.md",
  "fixtures/davids-cookies.json",
  "fixtures/davids-variants.json",
  "goldens/davids-cookies.jpg"
];

for (const file of required) {
  if (!existsSync(path.join(packageRoot, file))) throw new Error(`Missing kit file: ${file}`);
}

const runtime = [
  "scripts/reviews-format.ts",
  "features/formats/reviews/repoRuntime.ts",
  "features/formats/reviews/render.tsx",
  "features/render/AdRenderSurface.tsx",
];
for (const file of runtime) {
  if (!existsSync(path.resolve(file))) throw new Error(`Missing runtime file: ${file}`);
}

const format = JSON.parse(readFileSync(path.join(packageRoot, "format.json"), "utf8"));
const pipeline = JSON.parse(readFileSync(path.join(packageRoot, "pipeline.json"), "utf8"));
const requirements = JSON.parse(readFileSync(path.join(packageRoot, "requirements.json"), "utf8"));
if (format.id !== "reviews" || format.version !== "1.0.0") throw new Error("Format identity is invalid.");
if (pipeline.stages.length !== 4) throw new Error("Reviews must have four assembly steps.");
if (pipeline.stages.some((stage) => stage.paid)) throw new Error("Reviews must not declare a paid provider step.");
if (requirements.providers.length || requirements.environment.length) throw new Error("Reviews must not require provider keys.");

console.log("Reviews Format Kit files are complete.");
