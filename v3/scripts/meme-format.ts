import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMemePrompt } from "../features/formats/meme/prompt";
import {
  createMemeScenesFromRun,
  memeResearchTemplate,
  parseMemeVariantPack,
  toStoredMemeResearch,
  validateMemeResearch,
  type MemeResearch,
  type MemeVariantPack,
} from "../features/formats/meme/repoRuntime";
import { MEME_TEMPLATES, MEME_VARIATIONS_PER_TEMPLATE } from "../features/formats/meme/templates";
import type { MemeAdScene } from "../features/scene/types";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const publicRoot = path.join(v3Root, "public");
const packageRoot = path.join(publicRoot, "format-repositories", "meme-v1");

function browserExecutable() {
  const candidates = [
    process.env.REMOTION_BROWSER_EXECUTABLE,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));
}

type RunStatus = "research" | "write" | "validated" | "rendered" | "inspected" | "finalized";

type RunState = {
  id: string;
  status: RunStatus;
  createdAt: string;
  promptedAt?: string;
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
    templatesValid: boolean;
    scenesValid: boolean;
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
  const research = await readJson<MemeResearch>(path.join(directory, "research.json"));
  const variants = await readJson<MemeVariantPack>(path.join(directory, "variants.json"));
  return { directory, research, state, variants };
}

function validateRun(research: MemeResearch, pack: MemeVariantPack) {
  const errors = validateMemeResearch(research);
  if (errors.length) return { errors, variants: [] };
  try {
    return { errors, variants: parseMemeVariantPack(pack, research) };
  } catch (error) {
    return {
      errors: [error instanceof Error ? error.message : "Meme variants are invalid."],
      variants: [],
    };
  }
}

async function check() {
  console.log("Step 1 of 4: Research - collect the brand, buyer moments, and proof.");
  console.log("Step 2 of 4: Write - create three angles for each of four fixed templates.");
  console.log("Step 3 of 4: Render - create twelve PNGs locally through AdRenderSurface.");
  console.log("Step 4 of 4: Deliver - inspect dimensions, templates, and text fit.");
  console.log("This kit needs no image, video, voice, Replicate, or Wiggly generation-provider call.");
}

async function init() {
  const runId = requiredArgument("run");
  const url = requiredArgument("url");
  new URL(url);
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, "research.json"), memeResearchTemplate(url));
  await writeJson(path.join(directory, "variants.json"), { templates: [] });
  await writeJson(path.join(directory, "state.json"), {
    id: runId,
    status: "research",
    createdAt: new Date().toISOString(),
  } satisfies RunState);
  console.log(`Step 1 of 4: Research - created ${path.relative(v3Root, directory)}.`);
  console.log("Fill research.json with evidence from the website.");
  console.log("No provider was called.");
}

async function prompt() {
  const runId = requiredArgument("run");
  const { directory, research, state } = await readRun(runId);
  const errors = validateMemeResearch(research);
  if (errors.length) throw new Error(errors.join("\n"));
  const output = path.join(directory, "meme-prompt.txt");
  await writeFile(output, `${buildMemePrompt(toStoredMemeResearch(research, runId))}\n`);
  state.status = "write";
  state.promptedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 2 of 4: Write - wrote ${path.relative(v3Root, output)}.`);
  console.log("Use this exact prompt yourself, then save the twelve variants in variants.json.");
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
  const scenes = createMemeScenesFromRun({ research, runId, variants: result.variants });
  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  await writeJson(path.join(directory, "scenes.json"), scenes);
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 2 of 4: Write - twelve variants and scenes are valid.");
}

async function estimate() {
  console.log("Run estimate");
  console.log("- Website research: host agent web tools - $0 Wiggly provider cost");
  console.log("- Twelve meme captions: host agent reasoning - $0 separate provider cost");
  console.log("- Twelve 1080x1350 PNGs: local Remotion still render - $0 provider cost");
  console.log("Total: $0 Wiggly provider cost, usually 3-7 min plus host-agent usage.");
}

async function render() {
  const [{ bundle }, { getCompositions, renderStill }, { adSceneCompositionId }] = await Promise.all([
    import("@remotion/bundler"),
    import("@remotion/renderer"),
    import("../remotion-entry/Root"),
  ]);
  const runId = requiredArgument("run");
  const { directory, research, state, variants: pack } = await readRun(runId);
  const result = validateRun(research, pack);
  if (result.errors.length) throw new Error(`Validate the run first:\n${result.errors.join("\n")}`);
  if (state.outputs?.length && !hasFlag("replace-outputs")) {
    throw new Error("This run already has PNGs. Fix the saved inputs, validate, then rerun with --replace-outputs.");
  }
  const scenes = createMemeScenesFromRun({ research, runId, variants: result.variants });
  const outputDirectory = path.join(directory, "outputs");
  await mkdir(outputDirectory, { recursive: true });
  const serveUrl = await bundle({
    entryPoint: path.join(v3Root, "remotion-entry", "index.ts"),
    publicDir: publicRoot,
    outDir: path.join(v3Root, "tmp", "meme-remotion"),
  });
  const executable = browserExecutable();
  const compositions = await getCompositions(serveUrl, {
    inputProps: { scene: scenes[0] },
    browserExecutable: executable,
  });
  const composition = compositions.find((candidate) => candidate.id === adSceneCompositionId);
  if (!composition) throw new Error(`Missing ${adSceneCompositionId} composition.`);

  const outputs: string[] = [];
  for (const [index, scene] of scenes.entries()) {
    const output = path.join(
      outputDirectory,
      `${String(index + 1).padStart(2, "0")}-${scene.layout.templateId}.png`,
    );
    const inputProps = { scene };
    await renderStill({
      serveUrl,
      composition: { ...composition, props: inputProps },
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
  state.inspectedAt = undefined;
  state.finalizedAt = undefined;
  state.inspection = undefined;
  await writeJson(path.join(directory, "scenes.json"), scenes);
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 3 of 4: Render - wrote ${outputs.length} PNGs.`);
  console.log("No provider was called.");
}

async function inspect() {
  const runId = requiredArgument("run");
  const { directory, state } = await readRun(runId);
  if (!state.outputs?.length) throw new Error("Render the meme pack before inspection.");
  const scenes = await readJson<MemeAdScene[]>(path.join(directory, "scenes.json"));
  const files = await Promise.all(state.outputs.map(async (relativePath) => {
    const filePath = path.join(publicRoot, relativePath);
    const bytes = await readFile(filePath);
    if (bytes.toString("ascii", 1, 4) !== "PNG" || bytes.length < 24) {
      throw new Error(`${relativePath} is not a valid PNG.`);
    }
    return {
      path: relativePath,
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }));
  const templateCounts = new Map<string, number>();
  scenes.forEach((scene) => {
    templateCounts.set(scene.layout.templateId, (templateCounts.get(scene.layout.templateId) || 0) + 1);
  });
  const inspection = {
    outputCount: files.length,
    expectedOutputCount: MEME_TEMPLATES.length * MEME_VARIATIONS_PER_TEMPLATE,
    uniqueOutputCount: new Set(files.map((file) => file.sha256)).size,
    dimensionsValid: files.every((file) => file.width === 1080 && file.height === 1350),
    templatesValid: MEME_TEMPLATES.every((template) => (
      templateCounts.get(template.id) === MEME_VARIATIONS_PER_TEMPLATE
    )),
    scenesValid: scenes.every((scene) => {
      const template = MEME_TEMPLATES.find((item) => item.id === scene.layout.templateId);
      return Boolean(template?.slots.every((slot) => scene.layout.slots[slot.id]?.trim()));
    }),
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
    !inspection.templatesValid ||
    !inspection.scenesValid
  ) {
    process.exitCode = 1;
  }
}

async function finalize() {
  const runId = requiredArgument("run");
  const { directory, state } = await readRun(runId);
  if (!hasFlag("approve-final")) {
    throw new Error("Use --approve-final only after the agent has viewed all twelve PNGs.");
  }
  if (
    state.status !== "inspected" ||
    !state.inspection ||
    state.inspection.outputCount !== 12 ||
    state.inspection.uniqueOutputCount !== 12 ||
    !state.inspection.dimensionsValid ||
    !state.inspection.templatesValid ||
    !state.inspection.scenesValid
  ) {
    throw new Error("The meme pack has not passed inspection.");
  }
  state.status = "finalized";
  state.finalizedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 4 of 4: Deliver - agent QA confirmed and twelve meme PNGs finalized.");
}

async function resume() {
  const runId = requiredArgument("run");
  const { state } = await readRun(runId);
  const next = state.status === "research"
    ? "Fill research.json with website evidence, then run prompt."
    : state.status === "write"
      ? "Fill variants.json with twelve captions, then validate."
    : state.status === "validated"
      ? "Review the twelve scene contracts, then render."
      : state.status === "rendered"
        ? "Inspect the PNG pack."
        : state.status === "inspected"
          ? "View all twelve PNGs, then finalize with --approve-final."
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
    status: "research",
    createdAt: new Date().toISOString(),
  } satisfies RunState);
  const { research, variants: pack } = await readRun(runId);
  const result = validateRun(research, pack);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  const scenes = createMemeScenesFromRun({ research, runId, variants: result.variants });
  await writeJson(path.join(directory, "scenes.json"), scenes);
  const state = await readJson<RunState>(path.join(directory, "state.json"));
  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Free smoke passed: four templates, three angles each, twelve valid scenes.");
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
if (!handler) throw new Error(`Unknown command "${command}". Use: ${Object.keys(commands).join(", ")}.`);
await handler();
