import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { imageSize } from "image-size";
import Replicate from "replicate";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const repositoriesRoot = path.join(v3Root, "public", "format-repositories");
const defaultPollTimeoutMs = 10 * 60 * 1_000;

type InputMode = "none" | "image";
type ModelFamily = "nano-banana" | "gpt-image";
type RunStatus =
  | "draft"
  | "validated"
  | "generating"
  | "rendered"
  | "inspected"
  | "finalized";

type ModelRoute = {
  label: string;
  lane: string;
  model: `${string}/${string}`;
  family: ModelFamily;
  aspectRatio: string;
  outputFormat: "jpg" | "jpeg" | "png";
  costEstimate?: string;
  timeEstimate?: string;
  resolution?: string;
  quality?: string;
};

type RuntimeConfig = {
  slug: string;
  version: string;
  promptPath: string;
  promptVariants?: Record<string, string>;
  input: {
    mode: InputMode;
    formats?: string[];
    minimumWidth?: number;
    minimumHeight?: number;
    maximumBytes?: number;
    aspectRatio?: string;
    aspectRatioTolerance?: number;
  };
  defaultModel: string;
  modelRoutes: Record<string, ModelRoute>;
  expectedOutputs: number;
  maximumAttempts: number;
  smokeInputPath?: string;
  smokeExamplePath: string;
  minimumOutputWidth: number;
  minimumOutputHeight: number;
  minimumOutputBytes: number;
  aspectRatioTolerance?: number;
  manualReview: string[];
};

type Attempt = {
  number: number;
  createdAt: string;
  model: string;
  status: string;
  predictionId?: string;
  completedAt?: string;
  error?: string;
};

type ImageEvidence = {
  path: string;
  bytes: number;
  width: number;
  height: number;
  type: string;
  aspectRatio: number;
  sha256: string;
};

type Inspection = {
  automaticPass: boolean;
  manualPass: boolean;
  reviewNotes?: string;
  inspectedAt: string;
  files: ImageEvidence[];
  checks: Array<{
    id: string;
    pass: boolean;
    detail: string;
  }>;
};

type RunState = {
  id: string;
  format: string;
  version: string;
  variant?: string;
  status: RunStatus;
  createdAt: string;
  model: string;
  prompt: string;
  input?: {
    originalPath: string;
    storedPath: string;
    bytes?: number;
    width?: number;
    height?: number;
    type?: string;
    sha256?: string;
  };
  attempts: Attempt[];
  outputPaths?: string[];
  inspection?: Inspection;
  validatedAt?: string;
  renderedAt?: string;
  finalizedAt?: string;
  lastError?: string;
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

function formatSlug() {
  const slug = requiredArgument("format");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error("Format slug must use lowercase letters, numbers, and hyphens.");
  }
  return slug;
}

function packageRoot(slug = formatSlug()) {
  return path.join(repositoriesRoot, `${slug}-v1`);
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, filePath);
}

async function runtimeConfig(slug = formatSlug()) {
  const configPath = path.join(packageRoot(slug), "runtime.json");
  if (!existsSync(configPath)) {
    throw new Error(`Missing runtime config for ${slug}: ${configPath}`);
  }
  const config = await readJson<RuntimeConfig>(configPath);
  if (config.slug !== slug) throw new Error(`Runtime config identity mismatch for ${slug}.`);
  return config;
}

async function promptText(config: RuntimeConfig, variant?: string) {
  const promptPath = variant
    ? config.promptVariants?.[variant]
    : config.promptPath;
  if (!promptPath) {
    throw new Error(
      `--variant must be one of ${Object.keys(config.promptVariants ?? {}).join(", ")}.`,
    );
  }
  return (await readFile(path.join(packageRoot(config.slug), promptPath), "utf8")).trim();
}

function runsRoot(slug: string) {
  const override = argument("runs-root");
  return override
    ? path.resolve(override)
    : path.join(packageRoot(slug), "agent-runs");
}

function runDirectory(slug: string, runId: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(runId)) {
    throw new Error("Run id must use lowercase letters, numbers, and hyphens.");
  }
  return path.join(runsRoot(slug), runId);
}

function relativeToV3(filePath: string) {
  const relative = path.relative(v3Root, filePath);
  return relative.startsWith("..") ? filePath : relative;
}

async function readRun(slug: string, runId: string) {
  const directory = runDirectory(slug, runId);
  const statePath = path.join(directory, "state.json");
  if (!existsSync(statePath)) throw new Error(`Run ${runId} does not exist. Start with init.`);
  const state = await readJson<RunState>(statePath);
  if (state.format !== slug) throw new Error("Run belongs to a different Format.");
  return { directory, state, statePath };
}

async function inspectImage(filePath: string) {
  const buffer = await readFile(filePath);
  const dimensions = imageSize(buffer);
  if (!dimensions.width || !dimensions.height || !dimensions.type) {
    throw new Error(`Could not decode image metadata for ${filePath}.`);
  }
  return {
    bytes: buffer.byteLength,
    width: dimensions.width,
    height: dimensions.height,
    type: dimensions.type,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

function ratioValue(value: string) {
  const [width, height] = value.split(":").map(Number);
  if (!width || !height) throw new Error(`Invalid aspect ratio: ${value}.`);
  return width / height;
}

function selectedModel(config: RuntimeConfig) {
  const key = argument("model") ?? config.defaultModel;
  const route = config.modelRoutes[key];
  if (!route) {
    throw new Error(`--model must be one of ${Object.keys(config.modelRoutes).join(", ")}.`);
  }
  return { key, route };
}

function outputUrls(output: unknown): string[] {
  const candidates = Array.isArray(output) ? output : [output];
  return candidates.map((candidate) => {
    if (typeof candidate === "string") return candidate;
    if (candidate && typeof candidate === "object" && "url" in candidate) {
      const value = (candidate as { url: unknown }).url;
      if (typeof value === "string") return value;
      if (typeof value === "function") {
        const result = value.call(candidate);
        if (typeof result === "string") return result;
        if (result instanceof URL) return result.toString();
      }
    }
    throw new Error("Replicate completed without a downloadable image URL.");
  });
}

async function downloadOutput(url: string, destination: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not save Replicate output (${response.status}).`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.byteLength) throw new Error("Replicate returned an empty file.");
  await writeFile(destination, bytes);
}

async function check() {
  const config = await runtimeConfig();
  const prompt = await promptText(config);
  console.log(`${config.slug} v${config.version}`);
  console.log(`Input mode: ${config.input.mode}`);
  console.log(`Prompt: ${prompt.length} characters, packaged and ready.`);
  if (config.promptVariants) {
    console.log(`Prompt variants: ${Object.keys(config.promptVariants).join(", ")}`);
  }
  console.log(`Expected outputs: ${config.expectedOutputs}`);
  console.log("Model routes:");
  for (const [key, route] of Object.entries(config.modelRoutes)) {
    console.log(`- ${route.lane}: ${key} -> ${route.model} (${route.aspectRatio})`);
  }
  console.log(
    `REPLICATE_API_TOKEN: ${process.env.REPLICATE_API_TOKEN ? "available" : "missing"}`,
  );
  console.log("No provider call was made.");
}

async function init() {
  const slug = formatSlug();
  const config = await runtimeConfig(slug);
  const runId = requiredArgument("run");
  const { key, route } = selectedModel(config);
  const variant = argument("variant");
  const prompt = await promptText(config, variant);
  const directory = runDirectory(slug, runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  await mkdir(directory, { recursive: true });

  let input: RunState["input"];
  const inputArgument = argument("input");
  if (config.input.mode === "image" && !inputArgument) {
    throw new Error("--input is required for this Format.");
  }
  if (inputArgument) {
    const sourcePath = path.resolve(inputArgument);
    if (!existsSync(sourcePath)) throw new Error(`Input does not exist: ${sourcePath}`);
    const extension = path.extname(sourcePath).toLowerCase() || ".jpg";
    const storedPath = path.join(directory, `input${extension}`);
    await copyFile(sourcePath, storedPath);
    input = {
      originalPath: sourcePath,
      storedPath: path.basename(storedPath),
    };
  }

  const state: RunState = {
    id: runId,
    format: slug,
    version: config.version,
    variant,
    status: "draft",
    createdAt: new Date().toISOString(),
    model: key,
    prompt,
    input,
    attempts: [],
  };
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Prepare - created ${relativeToV3(directory)}.`);
  console.log(`Model: ${route.label} (${route.lane}).`);
  console.log("Next: validate this run. No provider was called.");
}

async function validate() {
  const slug = formatSlug();
  const config = await runtimeConfig(slug);
  const runId = requiredArgument("run");
  const { directory, state, statePath } = await readRun(slug, runId);
  if (state.attempts.length) throw new Error("Validation is locked after a paid attempt starts.");
  if (state.prompt !== await promptText(config, state.variant)) {
    throw new Error("Run prompt differs from the packaged prompt.");
  }

  if (config.input.mode === "image") {
    if (!state.input) throw new Error("This Format requires one input image.");
    const inputPath = path.join(directory, state.input.storedPath);
    const metadata = await inspectImage(inputPath);
    const formats = config.input.formats ?? ["jpg", "png", "webp"];
    const errors: string[] = [];
    if (!formats.includes(metadata.type)) errors.push(`Input must be ${formats.join(", ")}.`);
    if (metadata.bytes > (config.input.maximumBytes ?? 25 * 1024 * 1024)) {
      errors.push("Input is larger than the packaged maximum.");
    }
    if (
      metadata.width < (config.input.minimumWidth ?? 512) ||
      metadata.height < (config.input.minimumHeight ?? 512)
    ) {
      errors.push("Input is smaller than the packaged minimum.");
    }
    if (config.input.aspectRatio) {
      const actualRatio = metadata.width / metadata.height;
      const targetRatio = ratioValue(config.input.aspectRatio);
      if (
        Math.abs(actualRatio - targetRatio) >
        (config.input.aspectRatioTolerance ?? 0.02)
      ) {
        errors.push(`Input aspect ratio must be ${config.input.aspectRatio}.`);
      }
    }
    if (errors.length) throw new Error(errors.join("\n"));
    state.input = { ...state.input, ...metadata };
  }

  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  await writeJson(statePath, state);
  console.log(`Validate - ${slug} run is valid. No provider was called.`);
}

async function estimate() {
  const slug = formatSlug();
  const config = await runtimeConfig(slug);
  const runId = argument("run");
  const modelKey = runId
    ? (await readRun(slug, runId)).state.model
    : selectedModel(config).key;
  const route = config.modelRoutes[modelKey];
  if (!route) throw new Error(`Unknown model route in run state: ${modelKey}.`);
  console.log("Packaged paid-call planning estimate");
  console.log(`- Route: ${route.lane}`);
  console.log(`- Model: ${route.model}`);
  console.log("- Predictions: one per render attempt");
  console.log(`- Expected outputs: ${config.expectedOutputs}`);
  console.log(`- Attempt cap: ${config.maximumAttempts}`);
  console.log(`- Price: ${route.costEstimate ?? "the selected model's current Replicate rate"}.`);
  console.log(`- Time: ${route.timeEstimate ?? "varies with provider load"}.`);
  console.log("- Verify the current Replicate rate before approving a paid prediction.");
  console.log("No provider call was made.");
}

async function replicateClient() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN is missing. Put it in the environment; never commit it.");
  }
  return new Replicate({ auth: token });
}

async function pollPrediction(
  client: Replicate,
  slug: string,
  runId: string,
  predictionId: string,
) {
  const timeoutMs = Number(argument("poll-timeout-ms") ?? defaultPollTimeoutMs);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000) {
    throw new Error("--poll-timeout-ms must be at least 1000.");
  }
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const prediction = await client.predictions.get(predictionId);
    const { state, statePath } = await readRun(slug, runId);
    const attempt = state.attempts.find(
      (candidate) => candidate.predictionId === predictionId,
    );
    if (!attempt) throw new Error("Prediction is not recorded in the run state.");
    attempt.status = prediction.status;
    await writeJson(statePath, state);
    if (prediction.status === "succeeded") return prediction;
    if (prediction.status === "failed" || prediction.status === "canceled") {
      const detail =
        typeof prediction.error === "string"
          ? prediction.error
          : `Prediction ${prediction.status}.`;
      attempt.completedAt = new Date().toISOString();
      attempt.error = detail;
      state.status = "validated";
      state.lastError = detail;
      await writeJson(statePath, state);
      throw new Error(detail);
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(
    `Polling timed out. The prediction id is saved; run resume --format=${slug} --run=${runId}.`,
  );
}

async function saveSuccessfulPrediction(
  slug: string,
  runId: string,
  prediction: Awaited<ReturnType<Replicate["predictions"]["get"]>>,
) {
  const config = await runtimeConfig(slug);
  const { directory, state, statePath } = await readRun(slug, runId);
  const attempt = state.attempts.find(
    (candidate) => candidate.predictionId === prediction.id,
  );
  if (!attempt) throw new Error("Prediction is not recorded in the run state.");
  const urls = outputUrls(prediction.output);
  if (urls.length !== config.expectedOutputs) {
    throw new Error(`Expected ${config.expectedOutputs} outputs but Replicate returned ${urls.length}.`);
  }
  const route = config.modelRoutes[state.model];
  if (!route) throw new Error(`Unknown model route in run state: ${state.model}.`);
  const extension = route.outputFormat === "png" ? "png" : "jpg";
  const outputDirectory = path.join(directory, "outputs");
  await mkdir(outputDirectory, { recursive: true });
  const outputPaths: string[] = [];
  for (const [index, url] of urls.entries()) {
    const outputName = `${String(index + 1).padStart(2, "0")}.${extension}`;
    const destination = path.join(outputDirectory, outputName);
    await downloadOutput(url, destination);
    outputPaths.push(path.join("outputs", outputName));
  }
  attempt.status = "succeeded";
  attempt.completedAt = new Date().toISOString();
  state.status = "rendered";
  state.outputPaths = outputPaths;
  state.renderedAt = new Date().toISOString();
  state.lastError = undefined;
  await writeJson(statePath, state);
  console.log(`Transform - saved ${outputPaths.length} output(s) from ${prediction.id}.`);
  console.log("Next: inspect the actual output before finalizing.");
}

async function render() {
  if (!hasFlag("approve-paid")) {
    throw new Error("Paid generation requires the explicit --approve-paid flag.");
  }
  const slug = formatSlug();
  const config = await runtimeConfig(slug);
  const runId = requiredArgument("run");
  const { directory, state, statePath } = await readRun(slug, runId);
  if (state.status !== "validated") throw new Error("Run validate before paid generation.");
  if (state.outputPaths?.length) throw new Error("This run already has output.");
  if (state.attempts.length >= config.maximumAttempts) {
    throw new Error(`Attempt cap reached (${config.maximumAttempts}).`);
  }
  const route = config.modelRoutes[state.model];
  if (!route) throw new Error(`Unknown model route in run state: ${state.model}.`);
  const client = await replicateClient();
  const attempt: Attempt = {
    number: state.attempts.length + 1,
    createdAt: new Date().toISOString(),
    model: route.model,
    status: "creating",
  };
  state.attempts.push(attempt);
  state.status = "generating";
  await writeJson(statePath, state);

  try {
    const source = state.input
      ? await readFile(path.join(directory, state.input.storedPath))
      : null;
    const providerInput: Record<string, unknown> = {
      prompt: state.prompt,
      aspect_ratio: route.aspectRatio,
      output_format: route.outputFormat,
    };
    if (route.family === "nano-banana") {
      providerInput.image_input = source ? [source] : [];
      if (route.resolution) providerInput.resolution = route.resolution;
    } else {
      if (source) providerInput.input_images = [source];
      providerInput.number_of_images = config.expectedOutputs;
      if (route.quality) providerInput.quality = route.quality;
    }
    const prediction = await client.predictions.create({
      model: route.model,
      input: providerInput,
    });
    attempt.predictionId = prediction.id;
    attempt.status = prediction.status;
    await writeJson(statePath, state);
    console.log(`Prediction ${prediction.id} created and persisted.`);
    const completed =
      prediction.status === "succeeded"
        ? prediction
        : await pollPrediction(client, slug, runId, prediction.id);
    await saveSuccessfulPrediction(slug, runId, completed);
  } catch (error) {
    if (!attempt.predictionId) {
      attempt.status = "failed-before-id";
      attempt.completedAt = new Date().toISOString();
      attempt.error = error instanceof Error ? error.message : String(error);
      state.status = "validated";
      state.lastError = attempt.error;
      await writeJson(statePath, state);
    }
    throw error;
  }
}

async function resume() {
  const slug = formatSlug();
  const runId = requiredArgument("run");
  const { state } = await readRun(slug, runId);
  const active = [...state.attempts].reverse().find(
    (attempt) =>
      attempt.predictionId &&
      !["failed", "canceled"].includes(attempt.status),
  );
  if (!active?.predictionId) {
    console.log(`Run ${runId}: ${state.status}.`);
    return;
  }
  const client = await replicateClient();
  console.log(`Resuming saved prediction ${active.predictionId}.`);
  const completed = await pollPrediction(client, slug, runId, active.predictionId);
  await saveSuccessfulPrediction(slug, runId, completed);
}

async function inspect() {
  const slug = formatSlug();
  const config = await runtimeConfig(slug);
  const runId = requiredArgument("run");
  const { directory, state, statePath } = await readRun(slug, runId);
  if (!state.outputPaths?.length || !["rendered", "inspected"].includes(state.status)) {
    throw new Error("Render output before inspection.");
  }
  const route = config.modelRoutes[state.model];
  if (!route) throw new Error(`Unknown model route in run state: ${state.model}.`);
  const targetRatio = ratioValue(route.aspectRatio);
  const files: ImageEvidence[] = [];
  const checks: Inspection["checks"] = [];
  for (const outputPath of state.outputPaths) {
    const metadata = await inspectImage(path.join(directory, outputPath));
    const aspectRatio = metadata.width / metadata.height;
    files.push({ path: outputPath, ...metadata, aspectRatio });
    checks.push(
      {
        id: `${outputPath}:decode`,
        pass: ["jpg", "png", "webp"].includes(metadata.type),
        detail: `Decoded ${metadata.type.toUpperCase()} image.`,
      },
      {
        id: `${outputPath}:minimum-size`,
        pass:
          metadata.width >= config.minimumOutputWidth &&
          metadata.height >= config.minimumOutputHeight,
        detail: `${metadata.width}x${metadata.height}.`,
      },
      {
        id: `${outputPath}:aspect-ratio`,
        pass:
          Math.abs(aspectRatio - targetRatio) <=
          (config.aspectRatioTolerance ?? 0.02),
        detail: `${aspectRatio.toFixed(4)}; target ${targetRatio.toFixed(4)}.`,
      },
      {
        id: `${outputPath}:non-empty`,
        pass: metadata.bytes >= config.minimumOutputBytes,
        detail: `${Math.round(metadata.bytes / 1024)} KB.`,
      },
    );
  }
  checks.push({
    id: "output-count",
    pass: files.length === config.expectedOutputs,
    detail: `${files.length}/${config.expectedOutputs} outputs.`,
  });
  const automaticPass = checks.every((check) => check.pass);
  const manualPass = hasFlag("visual-pass");
  const reviewNotes = argument("review-notes");
  if (manualPass && !reviewNotes) {
    throw new Error("--visual-pass requires --review-notes.");
  }
  state.inspection = {
    automaticPass,
    manualPass,
    reviewNotes,
    inspectedAt: new Date().toISOString(),
    files,
    checks,
  };
  state.status = "inspected";
  await writeJson(path.join(directory, "quality-report.json"), state.inspection);
  await writeJson(statePath, state);
  console.log(`Inspect - automatic checks ${automaticPass ? "passed" : "failed"}.`);
  console.log(
    manualPass
      ? "Visual review recorded."
      : `Visual review required: ${config.manualReview.join("; ")}.`,
  );
  if (!automaticPass) process.exitCode = 1;
}

async function finalize() {
  if (!hasFlag("approve-final")) {
    throw new Error("Finalization requires the explicit --approve-final flag.");
  }
  const slug = formatSlug();
  const runId = requiredArgument("run");
  const { directory, state, statePath } = await readRun(slug, runId);
  if (!state.inspection?.automaticPass) {
    throw new Error("Automatic inspection must pass before finalization.");
  }
  if (!state.inspection.manualPass || !state.inspection.reviewNotes) {
    throw new Error("Visual inspection and review notes are required.");
  }
  state.status = "finalized";
  state.finalizedAt = new Date().toISOString();
  await writeJson(statePath, state);
  console.log(`Finalized: ${directory}`);
}

async function smoke() {
  const slug = formatSlug();
  const config = await runtimeConfig(slug);
  const temporaryRoot = path.join(os.tmpdir(), `wiggly-${slug}-smoke-${process.pid}`);
  const previousArgv = [...process.argv];
  try {
    const initArgs = [
      previousArgv[0]!,
      previousArgv[1]!,
      "init",
      `--format=${slug}`,
      "--run=smoke",
      `--runs-root=${temporaryRoot}`,
    ];
    if (config.input.mode === "image") {
      if (!config.smokeInputPath) {
        throw new Error("Image-input smoke fixture is not configured.");
      }
      const fixturePath = path.join(packageRoot(slug), config.smokeInputPath);
      if (!existsSync(fixturePath)) throw new Error("Image-input smoke fixture is missing.");
      initArgs.push(`--input=${fixturePath}`);
    }
    process.argv = initArgs;
    await init();
    process.argv = [
      previousArgv[0]!,
      previousArgv[1]!,
      "validate",
      `--format=${slug}`,
      "--run=smoke",
      `--runs-root=${temporaryRoot}`,
    ];
    await validate();
    const { directory, state, statePath } = await readRun(slug, "smoke");
    const outputDirectory = path.join(directory, "outputs");
    await mkdir(outputDirectory, { recursive: true });
    const smokeRoute = config.modelRoutes[state.model];
    if (!smokeRoute) throw new Error(`Unknown smoke model route: ${state.model}.`);
    const smokeOutput = smokeRoute.outputFormat === "png" ? "01.png" : "01.jpg";
    await copyFile(
      path.join(packageRoot(slug), config.smokeExamplePath),
      path.join(outputDirectory, smokeOutput),
    );
    state.status = "rendered";
    state.outputPaths = [path.join("outputs", smokeOutput)];
    state.renderedAt = new Date().toISOString();
    await writeJson(statePath, state);
    process.argv = [
      previousArgv[0]!,
      previousArgv[1]!,
      "inspect",
      `--format=${slug}`,
      "--run=smoke",
      `--runs-root=${temporaryRoot}`,
    ];
    await inspect();
    const inspected = (await readRun(slug, "smoke")).state;
    if (!inspected.inspection?.automaticPass) throw new Error("Smoke inspection failed.");
    if (inspected.inspection.manualPass) throw new Error("Smoke bypassed visual review.");
    console.log("Free smoke passed. No provider was called and finalization stayed gated.");
  } finally {
    process.argv = previousArgv;
  }
}

const command = process.argv[2] ?? "check";
const commands: Record<string, () => Promise<void>> = {
  check,
  estimate,
  finalize,
  init,
  inspect,
  render,
  resume,
  smoke,
  validate,
};
if (!commands[command]) {
  throw new Error(`Unknown command: ${command}. Try ${Object.keys(commands).join(", ")}.`);
}
await commands[command]();
