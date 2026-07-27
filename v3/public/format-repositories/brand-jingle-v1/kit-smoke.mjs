import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const packageRoot = path.resolve("public", "format-repositories", "brand-jingle-v1");
const required = [
  ".env.example",
  "README.md",
  "SKILL.md",
  "format.json",
  "requirements.json",
  "inputs.json",
  "pipeline.json",
  "song-contract.json",
  "quality.json",
  "goldens.json",
  "prompts/research.md",
  "prompts/angle.md",
  "prompts/jingle.md",
  "fixtures/ecommerce-20s.json",
  "fixtures/saas-30s.json",
  "fixtures/no-website-60s.json",
  "goldens/apple-all-in-one-place.mp3",
  "goldens/davids-no-time-to-bake.mp3",
  "goldens/ogtool-break-the-rules.mp3"
];
const runtime = [
  "scripts/brand-jingle-format.ts",
  "features/research/types.ts",
  "features/formats/jingle/prompt.ts",
  "features/formats/jingle/repoRuntime.ts"
];
const missing = [
  ...required.map((file) => path.join(packageRoot, file)),
  ...runtime.map((file) => path.resolve(file))
].filter((file) => !existsSync(file));

if (missing.length) {
  console.error(`Brand Jingle Kit is incomplete:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  process.exitCode = 1;
} else {
  const skill = readFileSync(path.join(packageRoot, "SKILL.md"), "utf8");
  if (!/Ready to make the song\?/i.test(skill) || !/Never retry automatically/i.test(skill)) {
    console.error("The skill must explain paid approval and retry behavior.");
    process.exitCode = 1;
  } else if (/music video/i.test(skill) && !/Music video is not part/i.test(skill)) {
    console.error("Music-video instructions leaked into the audio-only Format.");
    process.exitCode = 1;
  } else {
    console.log("Brand Jingle Kit is complete and keeps the paid call explicit.");
  }
}
