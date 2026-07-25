import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const packageRoot = path.resolve("public", "format-repositories", "three-d-breakdown-v1");
const required = [
  "README.md",
  "SKILL.md",
  "format.json",
  "requirements.json",
  "inputs.json",
  "pipeline.json",
  "scene-contract.json",
  "assets.json",
  "quality.json",
  "fixtures/style-b-checkpoint.json",
  "fixtures/finalstraw-reproducibility.json",
  "assets/ecommerce-teardown-style-reference-clean-v7.jpg",
  "goldens/finalstraw.mp4",
  "goldens/finalstraw-contact-sheet.jpg",
];
const runtime = [
  "scripts/three-d-breakdown-format.ts",
  "scripts/smoke-three-d-breakdown-format.ts",
  "remotion-entry/index.ts",
  "remotion-entry/Root.tsx",
  "remotion-entry/RemotionAdScene.tsx",
  "features/audio/fishStudio.ts",
  "features/formats/three-d-breakdown/repoRuntime.ts",
  "features/formats/three-d-breakdown/render.tsx",
  "features/render/AdRenderSurface.tsx",
  "features/formats/three-d-breakdown/validate.ts",
];
const missing = [
  ...required.map((file) => path.join(packageRoot, file)),
  ...runtime.map((file) => path.resolve(file)),
].filter((file) => !existsSync(file));

if (missing.length) {
  console.error(`3D Breakdown Kit is incomplete:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  process.exitCode = 1;
} else {
  const skill = readFileSync(path.join(packageRoot, "SKILL.md"), "utf8");
  if (!/Do not rebuild/i.test(skill) || !/finalize --approve-final/i.test(skill)) {
    console.error("The skill must preserve the official renderer and explain final review.");
    process.exitCode = 1;
  } else {
    console.log("3D Breakdown Kit files are complete, including voice and the official final renderer.");
  }
}
