import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const smokeSource = readFileSync(join(repoRoot, "scripts/create-browser-smoke.ts"), "utf8");

assert(
  packageJson.scripts?.["smoke:create"] === "tsx scripts/create-browser-smoke.ts",
  "v3 package.json must expose the create browser smoke script.",
);
assert(
  packageJson.scripts?.test?.includes("tests/create-browser-smoke.test.ts"),
  "v3 npm test must include the create browser smoke guard.",
);
assert(
  Boolean(packageJson.devDependencies?.playwright),
  "The create browser smoke must pin Playwright as a v3 dev dependency.",
);

[
  "spacebar-reroll-button",
  "1 reroll this session",
  "Add audio for this ad",
  "Audio CTA should stay compact inside the canvas.",
  ".first()",
  "Fresh visitor must be able to add audio before submitting a website.",
  "data-dialogue-editor='modal'",
  "data-create-download-action='true'",
  "create share link",
  "data-create-format-rail='v3'",
  "name: \"Text\"",
  "name: \"Style\"",
  "name: \"Format\"",
  "CREATE_BROWSER_SMOKE_PASS",
].forEach((needle) => {
  assert(smokeSource.includes(needle), `create-browser-smoke.ts must assert ${needle}.`);
});

[
  "data-preview-selection-overlay",
  "data-preview-selectable-slot",
  "Spacebar rerolls the",
  "wiggly:v3:create-session",
  "defaultRenderScene",
  "localStorage.setItem",
].forEach((needle) => {
  assert(!smokeSource.includes(needle), `create-browser-smoke.ts must not rely on mini-editor behavior: ${needle}.`);
});

[
  "api.researchRuns",
  "api.adScenes",
  "api.sharePages",
  "api.renderJobs",
  "runWebsiteResearch",
  "generateFromResearch",
  "createFromScene",
].forEach((needle) => {
  assert(!smokeSource.includes(needle), `create-browser-smoke.ts must not call backend money-flow mutations: ${needle}.`);
});

console.log("create-browser-smoke tests passed");
