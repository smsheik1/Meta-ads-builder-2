import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageRoot = path.join(root, "public", "format-repositories", "newsletter-writer-v1");
const required = [
  "SKILL.md",
  "README.md",
  "format.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "requirements.json",
  "goldens.json",
  "prompts/voice-profile.md",
  "prompts/draft.md",
  "prompts/review.md",
  "references/research.md",
  "references/holden-controlled-evaluation.md",
  "references/brightmark-holdout-evaluation.md",
  "references/blind-customer-stress-2026-07-30.md",
  "fixtures/brightmark-sources.json",
  "fixtures/brightmark-brief.json",
  "fixtures/brightmark-holdout-sources.json",
  "fixtures/brightmark-holdout-brief.json",
  "fixtures/samples/01-client-thank-you.md",
  "fixtures/samples/02-trade-show.md",
  "fixtures/samples/03-onboarding-kits.md",
  "goldens/brightmark-brand-profile.json",
  "goldens/brightmark-draft.json",
  "goldens/brightmark-newsletter.json",
  "comparisons/holden-current-controlled-run.json",
  "comparisons/holden-current-controlled-run.md",
  "comparisons/holden-improved-controlled-run.json",
  "comparisons/holden-improved-controlled-run.md",
  "comparisons/brightmark-holdout-run.json",
];

for (const relativePath of required) {
  if (!existsSync(path.join(packageRoot, relativePath))) {
    throw new Error(`Missing packaged file: ${relativePath}`);
  }
}

const format = JSON.parse(readFileSync(path.join(packageRoot, "format.json"), "utf8"));
const pipeline = JSON.parse(readFileSync(path.join(packageRoot, "pipeline.json"), "utf8"));
if (format.id !== "newsletter-writer" || format.outputs[0]?.files?.[0] !== "newsletter.md") {
  throw new Error("Invalid newsletter writer format manifest.");
}
if (pipeline.stages.length !== 4 || pipeline.stages.some((stage) => stage.paid)) {
  throw new Error("Newsletter writer pipeline must have four free stages.");
}
if (pipeline.stages.at(-1)?.qaAttestationRequired !== true) {
  throw new Error("Final newsletter delivery must require agent QA.");
}

console.log("Newsletter writer kit smoke passed. No provider was called.");
