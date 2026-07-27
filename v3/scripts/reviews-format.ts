import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";
import { PNG } from "pngjs";
import {
  createReviewsScenesFromRun,
  parseReviewsVariantPack,
  reviewsResearchTemplate,
  toReviewsProofItems,
  toStoredReviewsResearch,
  validateReviewsResearch,
  type ReviewsResearch,
  type ReviewsVariantPack,
} from "../features/formats/reviews/repoRuntime";
import { buildReviewsPrompt } from "../features/formats/reviews/prompt";
import type { ReviewsAdScene } from "../features/scene/types";
import { adSceneCompositionId } from "../remotion-entry/Root";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const publicRoot = path.join(v3Root, "public");
const packageRoot = path.join(publicRoot, "format-repositories", "reviews-v1");

function browserExecutable() {
  const candidates = [
    process.env.REMOTION_BROWSER_EXECUTABLE,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));
}

type RunStatus = "draft" | "validated" | "rendered" | "inspected" | "finalized";

type RunState = {
  id: string;
  status: RunStatus;
  createdAt: string;
  validatedAt?: string;
  renderedAt?: string;
  inspectedAt?: string;
  finalizedAt?: string;
  outputs?: string[];
  inspection?: {
    outputCount: number;
    expectedOutputCount: number;
    uniqueOutputCount: number;
    dimensionsValid: boolean;
    sourceProofPreserved: boolean;
    templatesValid: boolean;
    files: Array<{
      path: string;
      width: number;
      height: number;
      bytes: number;
      sha256: string;
    }>;
  };
};

function argument(name: string) {
  const equals = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (equals) return equals.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function requiredArgument(name: string) {
  const value = argument(name);
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

function runsRoot() {
  const override = argument("runs-root");
  return override ? path.resolve(override) : path.join(packageRoot, "agent-runs");
}

function runDirectory(runId: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(runId)) {
    throw new Error("Run id must use lowercase letters, numbers, and hyphens.");
  }
  return path.join(runsRoot(), runId);
}

const readJson = async <T,>(filePath: string) => JSON.parse(await readFile(filePath, "utf8")) as T;

const writeJson = async (filePath: string, value: unknown) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

async function readRun(runId: string) {
  const directory = runDirectory(runId);
  const state = await readJson<RunState>(path.join(directory, "state.json"));
  const research = await readJson<ReviewsResearch>(path.join(directory, "research.json"));
  const variants = await readJson<ReviewsVariantPack>(path.join(directory, "variants.json"));
  return { directory, research, state, variants };
}

function validateRun(research: ReviewsResearch, pack: ReviewsVariantPack) {
  const errors = validateReviewsResearch(research);
  if (errors.length) return { errors, variants: [] };
  try {
    return { errors, variants: parseReviewsVariantPack(pack, research) };
  } catch (error) {
    return {
      errors: [error instanceof Error ? error.message : "Review variants are invalid."],
      variants: [],
    };
  }
}

async function check() {
  console.log("Step 1 of 4: Research - find real website reviews and source URLs.");
  console.log("Step 2 of 4: Frame - write four headline and CTA framings with the packaged prompt.");
  console.log("Step 3 of 4: Render - create eight PNGs locally through AdRenderSurface.");
  console.log("Step 4 of 4: Deliver - inspect dimensions, templates, and verbatim proof.");
  console.log("This kit needs no image, video, voice, Replicate, or Wiggly generation-provider call.");
}

async function init() {
  const runId = requiredArgument("run");
  const url = requiredArgument("url");
  new URL(url);
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, "research.json"), reviewsResearchTemplate(url));
  await writeJson(path.join(directory, "variants.json"), { variants: [] });
  await writeJson(path.join(directory, "state.json"), {
    id: runId,
    status: "draft",
    createdAt: new Date().toISOString(),
  } satisfies RunState);
  console.log(`Step 1 of 4: Research - created ${path.relative(v3Root, directory)}.`);
  console.log("Fill research.json with exact customer quotes and the URL where each quote appears.");
  console.log("No provider was called.");
}

async function prompt() {
  const runId = requiredArgument("run");
  const { directory, research } = await readRun(runId);
  const errors = validateReviewsResearch(research);
  if (errors.length) throw new Error(errors.join("\n"));
  const output = path.join(directory, "framing-prompt.txt");
  await writeFile(
    output,
    `${buildReviewsPrompt(toStoredReviewsResearch(research, runId), toReviewsProofItems(research))}\n`,
  );
  console.log(`Step 2 of 4: Frame - wrote ${path.relative(v3Root, output)}.`);
  console.log("Use this exact prompt yourself, then save the four framings in variants.json.");
  console.log("No provider was called.");
}

async function validate() {
  const runId = requiredArgument("run");
  const { directory, research, state, variants: pack } = await readRun(runId);
  const result = validateRun(research, pack);
  if (result.errors.length) {
    console.error(result.errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  const scenes = createReviewsScenesFromRun({
    research,
    runId,
    variants: result.variants,
  });
  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  await writeJson(path.join(directory, "scenes.json"), scenes);
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 2 of 4: Frame - four framings and eight scenes are valid.");
  console.log("Every rendered quote is copied verbatim from research.json.");
}

async function estimate() {
  const runId = requiredArgument("run");
  const { research, variants: pack } = await readRun(runId);
  const result = validateRun(research, pack);
  if (result.errors.length) throw new Error(`Validate the run first:\n${result.errors.join("\n")}`);
  console.log("Run estimate");
  console.log("- Website research: host agent web tools - $0 Wiggly provider cost");
  console.log("- Four proof framings: host agent reasoning - $0 separate provider cost");
  console.log("- Eight 1080x1350 PNGs: local Remotion still render - $0 provider cost");
  console.log("Total: $0 Wiggly provider cost, usually 2-5 min plus host-agent usage.");
}

async function render() {
  const runId = requiredArgument("run");
  const { directory, research, state, variants: pack } = await readRun(runId);
  const result = validateRun(research, pack);
  if (result.errors.length) throw new Error(`Validate the run first:\n${result.errors.join("\n")}`);
  if (state.outputs?.length) {
    throw new Error("This run already has rendered PNGs. Start a new run for another pack.");
  }
  const scenes = createReviewsScenesFromRun({
    research,
    runId,
    variants: result.variants,
  });
  const outputDirectory = path.join(directory, "outputs");
  await mkdir(outputDirectory, { recursive: true });
  const serveUrl = await bundle({
    entryPoint: path.join(v3Root, "remotion-entry", "index.ts"),
    publicDir: publicRoot,
    outDir: path.join(v3Root, "tmp", "reviews-remotion"),
  });
  const outputs: string[] = [];
  const executable = browserExecutable();
  const compositions = await getCompositions(serveUrl, {
    inputProps: { scene: scenes[0] },
    browserExecutable: executable,
  });
  const composition = compositions.find((candidate) => candidate.id === adSceneCompositionId);
  if (!composition) throw new Error(`Missing ${adSceneCompositionId} composition.`);

  for (const [index, scene] of scenes.entries()) {
    const inputProps = { scene };
    const template = scene.layout.template || "proof-card";
    const output = path.join(outputDirectory, `${String(index + 1).padStart(2, "0")}-${template}.png`);
    await renderStill({
      serveUrl,
      composition: {
        ...composition,
        props: inputProps,
      },
      inputProps,
      output,
      imageFormat: "png",
      frame: 0,
      overwrite: true,
      logLevel: "warn",
      browserExecutable: executable,
    });
    outputs.push(path.relative(publicRoot, output).split(path.sep).join("/"));
  }

  state.status = "rendered";
  state.renderedAt = new Date().toISOString();
  state.outputs = outputs;
  await writeJson(path.join(directory, "scenes.json"), scenes);
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 3 of 4: Render - wrote ${outputs.length} PNGs.`);
  console.log("No provider was called.");
}

async function inspect() {
  const runId = requiredArgument("run");
  const { directory, research, state } = await readRun(runId);
  if (!state.outputs?.length) throw new Error("Render the review pack before inspection.");
  const scenes = await readJson<ReviewsAdScene[]>(path.join(directory, "scenes.json"));
  const proofTexts = new Set(research.reviews.map((review) => review.text.trim()));
  const files = await Promise.all(state.outputs.map(async (relativePath) => {
    const filePath = path.join(publicRoot, relativePath);
    const bytes = await readFile(filePath);
    const png = PNG.sync.read(bytes);
    return {
      path: relativePath,
      width: png.width,
      height: png.height,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }));
  const inspection = {
    outputCount: files.length,
    expectedOutputCount: 8,
    uniqueOutputCount: new Set(files.map((file) => file.sha256)).size,
    dimensionsValid: files.every((file) => file.width === 1080 && file.height === 1350),
    sourceProofPreserved: scenes.every((scene) => proofTexts.has(scene.layout.proof.text.trim())),
    templatesValid: (
      scenes.filter((scene) => scene.layout.template === "proof-card").length === 4 &&
      scenes.filter((scene) => scene.layout.template === "minimal-quote").length === 4
    ),
    files,
  };
  state.status = "inspected";
  state.inspectedAt = new Date().toISOString();
  state.inspection = inspection;
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 4 of 4: Deliver - inspection complete.");
  console.log(JSON.stringify(inspection, null, 2));
  if (
    inspection.outputCount !== inspection.expectedOutputCount ||
    inspection.uniqueOutputCount !== inspection.expectedOutputCount ||
    !inspection.dimensionsValid ||
    !inspection.sourceProofPreserved ||
    !inspection.templatesValid
  ) {
    process.exitCode = 1;
  }
}

async function finalize() {
  const runId = requiredArgument("run");
  const { directory, state } = await readRun(runId);
  if (!hasFlag("approve-final")) throw new Error("Use --approve-final after viewing all eight PNGs.");
  if (
    state.status !== "inspected" ||
    !state.inspection ||
    state.inspection.outputCount !== 8 ||
    state.inspection.uniqueOutputCount !== 8 ||
    !state.inspection.dimensionsValid ||
    !state.inspection.sourceProofPreserved ||
    !state.inspection.templatesValid
  ) {
    throw new Error("The review pack has not passed inspection.");
  }
  state.status = "finalized";
  state.finalizedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 4 of 4: Deliver - finalized eight review proof PNGs.");
}

async function resume() {
  const runId = requiredArgument("run");
  const { state } = await readRun(runId);
  const next = state.status === "draft"
    ? "Fill research.json and variants.json, then validate."
    : state.status === "validated"
      ? "Review the eight scene contracts, then render."
      : state.status === "rendered"
        ? "Inspect the PNG pack."
        : state.status === "inspected"
          ? "View all eight PNGs, then finalize with --approve-final."
          : "This run is finalized.";
  console.log(`Current status: ${state.status}.`);
  console.log(`Next: ${next}`);
}

async function smoke() {
  const runId = argument("run") || "free-proof";
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  await mkdir(directory, { recursive: true });
  await copyFile(path.join(packageRoot, "fixtures", "davids-cookies.json"), path.join(directory, "research.json"));
  await copyFile(path.join(packageRoot, "fixtures", "davids-variants.json"), path.join(directory, "variants.json"));
  await writeJson(path.join(directory, "state.json"), {
    id: runId,
    status: "draft",
    createdAt: new Date().toISOString(),
  } satisfies RunState);
  const { research, variants: pack } = await readRun(runId);
  const result = validateRun(research, pack);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  const scenes = createReviewsScenesFromRun({ research, runId, variants: result.variants });
  await writeJson(path.join(directory, "scenes.json"), scenes);
  const state = await readJson<RunState>(path.join(directory, "state.json"));
  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Free smoke passed: four framings, two templates, eight valid scenes.");
  console.log("No provider was called.");
}

const command = process.argv[2] || "check";
const commands: Record<string, () => Promise<void>> = {
  check,
  estimate,
  finalize,
  init,
  inspect,
  prompt,
  render,
  resume,
  smoke,
  validate,
};

const handler = commands[command];
if (!handler) {
  throw new Error(`Unknown command "${command}". Use: ${Object.keys(commands).join(", ")}.`);
}
await handler();
