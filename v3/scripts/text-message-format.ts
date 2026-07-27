import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTextMessagePrompt, DEFAULT_TEXT_MESSAGE_VARIANT_COUNT } from "../features/formats/text-message/prompt";
import {
  createTextMessageScenesFromRun,
  parseTextMessageVariantPack,
  textMessageResearchTemplate,
  toStoredTextMessageResearch,
  validateTextMessageResearch,
  type TextMessageResearch,
  type TextMessageVariantPack,
} from "../features/formats/text-message/repoRuntime";
import { validateTextMessageScene } from "../features/formats/text-message/validate";
import type { TextMessageAdScene } from "../features/scene/types";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const publicRoot = path.join(v3Root, "public");
const packageRoot = path.join(publicRoot, "format-repositories", "text-message-v1");

function browserExecutable() {
  const candidates = [
    process.env.REMOTION_BROWSER_EXECUTABLE,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));
}

type RunStatus = "research" | "write" | "validated" | "rendering" | "rendered" | "inspected" | "finalized";

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
  renderInputHash?: string;
  inspection?: {
    outputCount: number;
    expectedOutputCount: number;
    uniqueOutputCount: number;
    dimensionsValid: boolean;
    conversationsValid: boolean;
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
  const research = await readJson<TextMessageResearch>(path.join(directory, "research.json"));
  const variants = await readJson<TextMessageVariantPack>(path.join(directory, "variants.json"));
  return { directory, research, state, variants };
}

function validateRun(research: TextMessageResearch, pack: TextMessageVariantPack) {
  const errors = validateTextMessageResearch(research);
  if (errors.length) return { errors, variants: [] };
  try {
    return { errors, variants: parseTextMessageVariantPack(pack, research) };
  } catch (error) {
    return {
      errors: [error instanceof Error ? error.message : "Text message variants are invalid."],
      variants: [],
    };
  }
}

const inputHash = (research: TextMessageResearch, pack: TextMessageVariantPack) => createHash("sha256")
  .update(JSON.stringify({ research, pack }))
  .digest("hex");

async function check() {
  console.log("Step 1 of 4: Research - collect the offer, buyer moments, and proof.");
  console.log("Step 2 of 4: Write - create six believable text conversations.");
  console.log("Step 3 of 4: Render - create six PNGs locally through AdRenderSurface.");
  console.log("Step 4 of 4: Deliver - inspect dimensions, text fit, and conversation structure.");
  console.log("This kit needs no image, video, voice, Replicate, NVIDIA NIM, or Wiggly generation-provider call.");
}

async function init() {
  const runId = requiredArgument("run");
  const url = requiredArgument("url");
  new URL(url);
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, "research.json"), textMessageResearchTemplate(url));
  await writeJson(path.join(directory, "variants.json"), { variants: [] });
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
  const errors = validateTextMessageResearch(research);
  if (errors.length) throw new Error(errors.join("\n"));
  const output = path.join(directory, "text-message-prompt.txt");
  await writeFile(
    output,
    `${buildTextMessagePrompt(toStoredTextMessageResearch(research, runId), DEFAULT_TEXT_MESSAGE_VARIANT_COUNT)}\n`,
  );
  state.status = "write";
  state.promptedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 2 of 4: Write - wrote ${path.relative(v3Root, output)}.`);
  console.log("Use this exact prompt yourself, then save the six conversations in variants.json.");
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
  const scenes = createTextMessageScenesFromRun({ research, runId, variants: result.variants });
  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  delete state.outputs;
  delete state.renderedAt;
  delete state.inspectedAt;
  delete state.finalizedAt;
  delete state.inspection;
  delete state.renderInputHash;
  await writeJson(path.join(directory, "scenes.json"), scenes);
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 2 of 4: Write - six conversations and scenes are valid.");
}

async function estimate() {
  console.log("Run estimate");
  console.log("- Website research: host agent web tools - $0 Wiggly provider cost");
  console.log("- Six conversations: host agent reasoning - $0 separate provider cost");
  console.log("- Six 1080x1350 PNGs: local Remotion still render - $0 provider cost");
  console.log("Total: $0 Wiggly provider cost, usually 3-6 min plus host-agent usage.");
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
  const currentInputHash = inputHash(research, pack);
  state.status = "rendering";
  delete state.outputs;
  delete state.renderedAt;
  delete state.inspectedAt;
  delete state.finalizedAt;
  delete state.inspection;
  delete state.renderInputHash;
  await writeJson(path.join(directory, "state.json"), state);
  const scenes = createTextMessageScenesFromRun({ research, runId, variants: result.variants });
  const outputDirectory = path.join(directory, "outputs");
  await mkdir(outputDirectory, { recursive: true });
  const serveUrl = await bundle({
    entryPoint: path.join(v3Root, "remotion-entry", "index.ts"),
    publicDir: publicRoot,
    outDir: path.join(v3Root, "tmp", "text-message-remotion"),
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
    const output = path.join(outputDirectory, `${String(index + 1).padStart(2, "0")}-text-message.png`);
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
  state.renderInputHash = currentInputHash;
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
  const { directory, research, state, variants } = await readRun(runId);
  if (state.status !== "rendered") throw new Error("Render after the latest validation before inspection.");
  if (!state.renderInputHash || state.renderInputHash !== inputHash(research, variants)) {
    throw new Error("Research or conversations changed after rendering. Validate and render again.");
  }
  if (!state.outputs?.length) throw new Error("Render the text message pack before inspection.");
  const scenes = await readJson<TextMessageAdScene[]>(path.join(directory, "scenes.json"));
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
  const inspection = {
    outputCount: files.length,
    expectedOutputCount: DEFAULT_TEXT_MESSAGE_VARIANT_COUNT,
    uniqueOutputCount: new Set(files.map((file) => file.sha256)).size,
    dimensionsValid: files.every((file) => file.width === 1080 && file.height === 1350),
    conversationsValid: scenes.every((scene) => validateTextMessageScene(scene).valid),
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
    !inspection.conversationsValid
  ) {
    process.exitCode = 1;
  }
}

async function finalize() {
  const runId = requiredArgument("run");
  const { directory, research, state, variants } = await readRun(runId);
  if (!hasFlag("approve-final")) {
    throw new Error("Use --approve-final only after the agent has viewed all six PNGs.");
  }
  if (
    state.status !== "inspected" ||
    !state.renderInputHash ||
    state.renderInputHash !== inputHash(research, variants) ||
    !state.inspection ||
    state.inspection.outputCount !== DEFAULT_TEXT_MESSAGE_VARIANT_COUNT ||
    state.inspection.uniqueOutputCount !== DEFAULT_TEXT_MESSAGE_VARIANT_COUNT ||
    !state.inspection.dimensionsValid ||
    !state.inspection.conversationsValid
  ) {
    throw new Error("The text message pack has not passed inspection.");
  }
  state.status = "finalized";
  state.finalizedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 4 of 4: Deliver - agent QA confirmed and six text message PNGs finalized.");
}

async function resume() {
  const runId = requiredArgument("run");
  const { state } = await readRun(runId);
  const next = state.status === "research"
    ? "Fill research.json with website evidence, then run prompt."
    : state.status === "write"
      ? "Fill variants.json with six conversations, then validate."
      : state.status === "validated"
        ? "Review the six scene contracts, then render."
        : state.status === "rendered"
          ? "Inspect the PNG pack."
          : state.status === "inspected"
            ? "View all six PNGs, then finalize with --approve-final."
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
  await copyFile(path.join(packageRoot, "fixtures", "davids-conversations.json"), path.join(directory, "variants.json"));
  await writeJson(path.join(directory, "state.json"), {
    id: runId,
    status: "research",
    createdAt: new Date().toISOString(),
  } satisfies RunState);
  const { research, variants: pack } = await readRun(runId);
  const result = validateRun(research, pack);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  const scenes = createTextMessageScenesFromRun({ research, runId, variants: result.variants });
  await writeJson(path.join(directory, "scenes.json"), scenes);
  const state = await readJson<RunState>(path.join(directory, "state.json"));
  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Free smoke passed: six distinct conversations and six valid scenes.");
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
