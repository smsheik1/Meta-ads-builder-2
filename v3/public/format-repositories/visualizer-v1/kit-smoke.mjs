import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const packageRoot = path.resolve("public", "format-repositories", "visualizer-v1");
const required = [
  ".env.example",
  "README.md",
  "SKILL.md",
  "format.json",
  "requirements.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "goldens.json",
  "prompts/research.md",
  "prompts/dialogue.md",
  "prompts/selection.md",
  "fixtures/davids-cookies.json",
  "fixtures/davids-dialogue.wav",
  "fixtures/saas-call-recovery.json",
  "goldens/davids-cookies.mp4"
];
const runtime = [
  "scripts/visualizer-format.ts",
  "features/formats/visualizer/repoRuntime.ts",
  "features/formats/visualizer/render.tsx",
  "features/audio/geminiTts.ts",
  "features/dialogue/dialogueScripts.ts"
];
const missing = [
  ...required.map((file) => path.join(packageRoot, file)),
  ...runtime.map((file) => path.resolve(file))
].filter((file) => !existsSync(file));

if (missing.length) {
  console.error(`Visualizer Kit is incomplete:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  process.exitCode = 1;
} else {
  const skill = readFileSync(path.join(packageRoot, "SKILL.md"), "utf8");
  const runner = readFileSync("scripts/visualizer-format.ts", "utf8");
  if (!/Ready to make the two voices\?/i.test(skill) || !/Never retry automatically/i.test(skill)) {
    console.error("The skill must explain voice approval and retry behavior.");
    process.exitCode = 1;
  } else if (!/--approve-voice/.test(runner) || !/No provider was called/.test(runner)) {
    console.error("The runner must keep provider spending explicit.");
    process.exitCode = 1;
  } else if (/replicate\.com|api\.replicate|from ["']replicate/i.test(runner)) {
    console.error("The Visualizer runner must not contain a Replicate path.");
    process.exitCode = 1;
  } else {
    console.log("Visualizer Kit is complete and keeps the only provider call explicit.");
  }
}
