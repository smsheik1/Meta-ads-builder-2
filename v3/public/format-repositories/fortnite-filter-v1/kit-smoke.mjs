import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const packageRoot = path.resolve(
  "public",
  "format-repositories",
  "fortnite-filter-v1",
);
const required = [
  ".env.example",
  ".gitignore",
  "README.md",
  "SKILL.md",
  "assets.json",
  "assets/source/example-02.jpg",
  "assets/source/example-03.jpg",
  "assets/source/example-04.jpg",
  "assets/source/example-05.jpg",
  "assets/source/example-06.jpg",
  "assets/source/example-07.jpg",
  "assets/source/example-08.jpg",
  "assets/source/skai-example-output.jpg",
  "assets/source/skai-guide-screenshot.png",
  "fixtures/rao-qingwei-woman.jpg",
  "fixtures/trevor-chris-hutchinson-man.jpg",
  "format.json",
  "goldens.json",
  "goldens/nano-banana-2-lite-sunset-woman.jpg",
  "goldens/nano-banana-2-lite-sunset-woman.quality.json",
  "goldens/nano-banana-2-seated-man.jpg",
  "goldens/nano-banana-2-seated-man.quality.json",
  "inputs.json",
  "pipeline.json",
  "prompts/transform.txt",
  "proofs.json",
  "quality.json",
  "requirements.json",
  "runtime.json",
];

for (const file of required) {
  if (!existsSync(path.join(packageRoot, file))) {
    throw new Error(`Missing kit file: ${file}`);
  }
}
if (!existsSync(path.resolve("scripts", "skai-image-format.ts"))) {
  throw new Error("Missing official runner: scripts/skai-image-format.ts");
}

const format = JSON.parse(
  readFileSync(path.join(packageRoot, "format.json"), "utf8"),
);
const pipeline = JSON.parse(
  readFileSync(path.join(packageRoot, "pipeline.json"), "utf8"),
);
const requirements = JSON.parse(
  readFileSync(path.join(packageRoot, "requirements.json"), "utf8"),
);
const runtime = JSON.parse(
  readFileSync(path.join(packageRoot, "runtime.json"), "utf8"),
);
if (format.id !== "fortnite-filter" || format.version !== "1.0.0") {
  throw new Error("Format identity is invalid.");
}
if (pipeline.stages.length !== 4 || pipeline.attemptCap !== 3) {
  throw new Error("Pipeline contract is invalid.");
}
if (runtime.slug !== format.id || runtime.maximumAttempts !== pipeline.attemptCap) {
  throw new Error("Runtime contract is invalid.");
}
if (pipeline.stages.filter((stage) => stage.paid).length !== 1) {
  throw new Error("Exactly one pipeline stage must be paid.");
}
if (
  !requirements.environment.some(
    (variable) =>
      variable.name === "REPLICATE_API_TOKEN" && variable.secret === true,
  )
) {
  throw new Error("Replicate BYOK requirement is missing.");
}

console.log("Fortnite Filter Format Kit files are complete.");
