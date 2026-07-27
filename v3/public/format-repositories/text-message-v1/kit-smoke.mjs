import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageRoot = path.join(root, "public", "format-repositories", "text-message-v1");
const required = [
  "SKILL.md",
  "README.md",
  "format.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "requirements.json",
  "goldens.json",
  "fixtures/davids-cookies.json",
  "fixtures/davids-conversations.json",
  "prompts/research.md",
  "prompts/conversations.md",
  "goldens/davids-birthday-text.png",
];

for (const relativePath of required) {
  if (!existsSync(path.join(packageRoot, relativePath))) {
    throw new Error(`Missing packaged file: ${relativePath}`);
  }
}

const format = JSON.parse(readFileSync(path.join(packageRoot, "format.json"), "utf8"));
const pipeline = JSON.parse(readFileSync(path.join(packageRoot, "pipeline.json"), "utf8"));
if (format.id !== "text-message" || format.outputs[0]?.count !== 6) {
  throw new Error("Invalid text message format manifest.");
}
if (pipeline.stages.length !== 4 || pipeline.stages.some((stage) => stage.paid)) {
  throw new Error("Text message pipeline must have four free stages.");
}
const deliver = pipeline.stages.find((stage) => stage.id === "deliver");
if (deliver?.approvalRequired || deliver?.qaAttestationRequired !== true) {
  throw new Error("Final delivery must use agent QA, not user spend approval.");
}
const dataFiles = format.outputs.find((output) => output.type === "application/json")?.files;
if (JSON.stringify(dataFiles) !== JSON.stringify([
  "research.json",
  "variants.json",
  "scenes.json",
  "state.json",
])) {
  throw new Error("Text message data deliverables must stay consistent.");
}

console.log("Text message kit smoke passed. No provider was called.");
