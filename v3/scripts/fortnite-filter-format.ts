import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { imageSize } from "image-size";
import Replicate from "replicate";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const packageRoot = path.join(
  v3Root,
  "public",
  "format-repositories",
  "fortnite-filter-v1",
);
const defaultRunsRoot = path.join(packageRoot, "agent-runs");
const maxAttempts = 3;
const defaultPollTimeoutMs = 10 * 60 * 1_000;

const exactPrompt =
  "Transform the exact photo into a Fortnite-style character with a realistic, cinematic 3D look. Keep the subject's pose, expression, and features, reinterpreting them with stylized Fortnite proportions: a clean silhouette, detailed hands and face, voluminous yet polished hair, and slightly glossy materials. The clothing should feature realistic textures but a Fortnite-inspired design. Use warm lighting with the game's signature golden rim light, soft shadows, and realistic depth of field. Add soft airborne particles (dust/light) to enhance the atmosphere. Avoid a flat cartoon style; prioritize volume, AAA-quality textures, and a photographic look.";

const modelRoutes = {
  "nano-banana-2": {
    replicateModel: "google/nano-banana-2",
    label: "Nano Banana 2",
    lane: "default",
    resolution: "1K",
  },
  "nano-banana-2-lite": {
    replicateModel: "google/nano-banana-2-lite",
    label: "Nano Banana 2 Lite",
    lane: "economy",
  },
  "nano-banana-pro": {
    replicateModel: "google/nano-banana-pro",
    label: "Nano Banana Pro",
    lane: "premium",
    resolution: "1K",
  },
} as const;

type ModelKey = keyof typeof modelRoutes;
type RunStatus =
  | "draft"
  | "validated"
  | "generating"
  | "rendered"
  | "inspected"
  | "finalized";

type Attempt = {
  number: number;
  createdAt: string;
  model: string;
  status: string;
  predictionId?: string;
  completedAt?: string;
  error?: string;
};

type Inspection = {
  automaticPass: boolean;
  manualPass: boolean;
  reviewNotes?: string;
  inspectedAt: string;
  file: {
    path: string;
    bytes: number;
    width: number;
    height: number;
    type: string;
    aspectRatio: number;
    sha256: string;
  };
  checks: Array<{
    id: string;
    pass: boolean;
    detail: string;
  }>;
};

type RunState = {
  id: string;
  status: RunStatus;
  createdAt: string;
  model: ModelKey;
  prompt: string;
  input: {
    originalPath: string;
    storedPath: string;
    bytes?: number;
    width?: number;
    height?: number;
    type?: string;
    sha256?: string;
  };
  attempts: Attempt[];
  outputPath?: string;
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

function modelArgument(): ModelKey {
  const value = argument("model") ?? "nano-banana-2";
  if (!(value in modelRoutes)) {
    throw new Error(
      `--model must be one of ${Object.keys(modelRoutes).join(", ")}.`,
    );
  }
  return value as ModelKey;
}

function runsRoot() {
  const override = argument("runs-root");
  return override ? path.resolve(override) : defaultRunsRoot;
}

function runDirectory(runId: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(runId)) {
    throw new Error("Run id must use lowercase letters, numbers, and hyphens.");
  }
  return path.join(runsRoot(), runId);
}

function relativeToV3(filePath: string) {
  const relative = path.relative(v3Root, filePath);
  return relative.startsWith("..") ? filePath : relative;
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

async function readRun(runId: string) {
  const directory = runDirectory(runId);
  const statePath = path.join(directory, "state.json");
  if (!existsSync(statePath)) {
    throw new Error(`Run ${runId} does not exist. Start with init.`);
  }
  const state = await readJson<RunState>(statePath);
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

function validateInputMetadata(metadata: Awaited<ReturnType<typeof inspectImage>>) {
  const errors: string[] = [];
  if (!["jpg", "png", "webp"].includes(metadata.type)) {
    errors.push("Input must be a JPEG, PNG, or WebP image.");
  }
  if (metadata.bytes > 25 * 1024 * 1024) {
    errors.push("Input must be 25 MB or smaller.");
  }
  if (metadata.width < 512 || metadata.height < 512) {
    errors.push("Input must be at least 512 px on both axes.");
  }
  return errors;
}

function outputUrl(output: unknown): string {
  const candidate = Array.isArray(output) ? output[0] : output;
  if (typeof candidate === "string") return candidate;
  if (
    candidate &&
    typeof candidate === "object" &&
    "url" in candidate
  ) {
    const value = (candidate as { url: unknown }).url;
    if (typeof value === "string") return value;
    if (typeof value === "function") {
      const result = value.call(candidate);
      if (typeof result === "string") return result;
      if (result instanceof URL) return result.toString();
    }
  }
  throw new Error("Replicate completed without a downloadable image URL.");
}

async function downloadOutput(url: string, destination: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not save Replicate output (${response.status}).`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("Replicate returned an empty file.");
  await writeFile(destination, bytes);
}

async function check() {
  console.log("Fortnite Filter v1");
  console.log("Step 1 of 4: Prepare - provide one JPEG, PNG, or WebP portrait.");
  console.log("Step 2 of 4: Validate - check the file locally before spending.");
  console.log("Step 3 of 4: Transform - make one approved Replicate prediction.");
  console.log("Step 4 of 4: Inspect - verify the file and review resemblance and quality.");
  console.log("");
  console.log("Model routes:");
  for (const [key, route] of Object.entries(modelRoutes)) {
    console.log(`- ${route.lane}: ${key} -> ${route.replicateModel}`);
  }
  console.log("");
  console.log(
    `REPLICATE_API_TOKEN: ${process.env.REPLICATE_API_TOKEN ? "available" : "missing"}`,
  );
  console.log("No provider call was made.");
}

async function init() {
  const runId = requiredArgument("run");
  const sourcePath = path.resolve(requiredArgument("input"));
  const model = modelArgument();
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  if (!existsSync(sourcePath)) throw new Error(`Input does not exist: ${sourcePath}`);

  await mkdir(directory, { recursive: true });
  const extension = path.extname(sourcePath).toLowerCase() || ".jpg";
  const storedPath = path.join(directory, `input${extension}`);
  await copyFile(sourcePath, storedPath);
  const state: RunState = {
    id: runId,
    status: "draft",
    createdAt: new Date().toISOString(),
    model,
    prompt: exactPrompt,
    input: {
      originalPath: sourcePath,
      storedPath: path.basename(storedPath),
    },
    attempts: [],
  };
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 1 of 4: Prepare - created ${relativeToV3(directory)}.`);
  console.log(`Model: ${modelRoutes[model].label} (${modelRoutes[model].lane}).`);
  console.log("Next: validate this run. No provider was called.");
}

async function validate() {
  const runId = requiredArgument("run");
  const { directory, state, statePath } = await readRun(runId);
  if (state.attempts.length > 0) {
    throw new Error("Validation is locked after a paid attempt starts.");
  }
  const inputPath = path.join(directory, state.input.storedPath);
  const metadata = await inspectImage(inputPath);
  const errors = validateInputMetadata(metadata);
  if (errors.length) throw new Error(errors.join("\n"));

  state.input = {
    ...state.input,
    ...metadata,
  };
  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  await writeJson(statePath, state);
  console.log(
    `Step 2 of 4: Validate - ${metadata.width}x${metadata.height} ${metadata.type.toUpperCase()}, ${Math.round(metadata.bytes / 1024)} KB.`,
  );
  console.log("The run is valid. No provider was called.");
}

async function estimate() {
  const requestedModel = argument("run")
    ? (await readRun(requiredArgument("run"))).state.model
    : modelArgument();
  const route = modelRoutes[requestedModel];
  console.log("Paid-call estimate");
  console.log(`- Route: ${route.lane}`);
  console.log(`- Model: ${route.replicateModel}`);
  console.log("- Predictions: exactly one per render attempt");
  console.log("- Output: one 3:4 JPG");
  console.log(
    "- Price: the model's live Replicate image rate; Nano Banana 2 Lite is the lowest-cost route.",
  );
  console.log("- Attempt cap: 3 total");
  console.log("No provider call was made.");
}

async function pollPrediction(
  client: Replicate,
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
    const { state, statePath } = await readRun(runId);
    const attempt = state.attempts.find(
      (candidate) => candidate.predictionId === predictionId,
    );
    if (!attempt) throw new Error("Prediction is not recorded in the run state.");
    attempt.status = prediction.status;
    await writeJson(statePath, state);

    if (prediction.status === "succeeded") {
      return prediction;
    }
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
    `Polling timed out. The prediction id is saved; run resume --run=${runId} to continue the same job.`,
  );
}

async function saveSuccessfulPrediction(
  runId: string,
  prediction: Awaited<ReturnType<Replicate["predictions"]["get"]>>,
) {
  const { directory, state, statePath } = await readRun(runId);
  const attempt = state.attempts.find(
    (candidate) => candidate.predictionId === prediction.id,
  );
  if (!attempt) throw new Error("Prediction is not recorded in the run state.");
  const destination = path.join(directory, "output.jpg");
  await downloadOutput(outputUrl(prediction.output), destination);
  attempt.status = "succeeded";
  attempt.completedAt = new Date().toISOString();
  state.status = "rendered";
  state.outputPath = path.basename(destination);
  state.renderedAt = new Date().toISOString();
  state.lastError = undefined;
  await writeJson(statePath, state);
  console.log(
    `Step 3 of 4: Transform - saved ${relativeToV3(destination)} from prediction ${prediction.id}.`,
  );
  console.log("Next: inspect the image before finalizing.");
}

async function replicateClient() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN is missing. Put it in the environment; never commit it.",
    );
  }
  return new Replicate({ auth: token });
}

async function render() {
  if (!hasFlag("approve-paid")) {
    throw new Error("Paid generation requires the explicit --approve-paid flag.");
  }
  const runId = requiredArgument("run");
  const { directory, state, statePath } = await readRun(runId);
  if (state.status !== "validated") {
    throw new Error("Run validate successfully before paid generation.");
  }
  if (state.outputPath) {
    throw new Error("This run already has an output. Start a new run for another image.");
  }
  if (state.attempts.length >= maxAttempts) {
    throw new Error(`Attempt cap reached (${maxAttempts}).`);
  }

  const client = await replicateClient();
  const route = modelRoutes[state.model];
  const inputPath = path.join(directory, state.input.storedPath);
  const source = await readFile(inputPath);
  const attempt: Attempt = {
    number: state.attempts.length + 1,
    createdAt: new Date().toISOString(),
    model: route.replicateModel,
    status: "creating",
  };
  state.attempts.push(attempt);
  state.status = "generating";
  await writeJson(statePath, state);

  try {
    const providerInput: Record<string, unknown> = {
      prompt: exactPrompt,
      image_input: [source],
      aspect_ratio: "3:4",
      output_format: "jpg",
    };
    if ("resolution" in route) providerInput.resolution = route.resolution;
    const prediction = await client.predictions.create({
      model: route.replicateModel,
      input: providerInput,
    });
    attempt.predictionId = prediction.id;
    attempt.status = prediction.status;
    await writeJson(statePath, state);
    console.log(`Prediction ${prediction.id} created and persisted.`);
    const completed =
      prediction.status === "succeeded"
        ? prediction
        : await pollPrediction(client, runId, prediction.id);
    await saveSuccessfulPrediction(runId, completed);
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
  const runId = requiredArgument("run");
  const { state } = await readRun(runId);
  const active = [...state.attempts]
    .reverse()
    .find(
      (attempt) =>
        attempt.predictionId &&
        !["succeeded", "failed", "canceled"].includes(attempt.status),
    );
  if (!active?.predictionId) {
    console.log(`Run ${runId}: ${state.status}.`);
    if (state.status === "draft") console.log(`Next: validate --run=${runId}`);
    if (state.status === "validated") console.log(`Next: render --run=${runId} --approve-paid`);
    if (state.status === "rendered") console.log(`Next: inspect --run=${runId}`);
    if (state.status === "inspected") console.log(`Next: finalize --run=${runId} --approve-final`);
    if (state.status === "finalized") console.log(`Final: ${state.outputPath}`);
    return;
  }
  const client = await replicateClient();
  console.log(`Resuming saved prediction ${active.predictionId}.`);
  const completed = await pollPrediction(client, runId, active.predictionId);
  await saveSuccessfulPrediction(runId, completed);
}

async function inspect() {
  const runId = requiredArgument("run");
  const { directory, state, statePath } = await readRun(runId);
  if (!state.outputPath || !["rendered", "inspected"].includes(state.status)) {
    throw new Error("Render an output before inspection.");
  }
  const outputPath = path.join(directory, state.outputPath);
  const metadata = await inspectImage(outputPath);
  const aspectRatio = metadata.width / metadata.height;
  const checks = [
    {
      id: "decode",
      pass: ["jpg", "png"].includes(metadata.type),
      detail: `Decoded ${metadata.type.toUpperCase()} image.`,
    },
    {
      id: "minimum-size",
      pass: metadata.width >= 768 && metadata.height >= 1024,
      detail: `${metadata.width}x${metadata.height}; minimum is 768x1024.`,
    },
    {
      id: "aspect-ratio",
      pass: Math.abs(aspectRatio - 0.75) <= 0.015,
      detail: `${aspectRatio.toFixed(4)}; target is 0.7500 (3:4).`,
    },
    {
      id: "non-empty",
      pass: metadata.bytes >= 50 * 1024,
      detail: `${Math.round(metadata.bytes / 1024)} KB; minimum is 50 KB.`,
    },
  ];
  const automaticPass = checks.every((check) => check.pass);
  const manualPass = hasFlag("visual-pass");
  const reviewNotes = argument("review-notes");
  if (manualPass && !reviewNotes) {
    throw new Error("--visual-pass requires --review-notes describing what was checked.");
  }
  state.inspection = {
    automaticPass,
    manualPass,
    reviewNotes,
    inspectedAt: new Date().toISOString(),
    file: {
      path: state.outputPath,
      ...metadata,
      aspectRatio,
    },
    checks,
  };
  state.status = "inspected";
  await writeJson(path.join(directory, "quality-report.json"), state.inspection);
  await writeJson(statePath, state);
  console.log(
    `Step 4 of 4: Inspect - automatic checks ${automaticPass ? "passed" : "failed"}.`,
  );
  console.log(
    manualPass
      ? "Visual review recorded."
      : "Visual review is still required. View output.jpg, then rerun inspect with --visual-pass and --review-notes.",
  );
  if (!automaticPass) process.exitCode = 1;
}

async function finalize() {
  const runId = requiredArgument("run");
  if (!hasFlag("approve-final")) {
    throw new Error("Finalization requires the explicit --approve-final flag.");
  }
  const { directory, state, statePath } = await readRun(runId);
  if (!state.inspection?.automaticPass) {
    throw new Error("Automatic inspection must pass before finalization.");
  }
  if (!state.inspection.manualPass || !state.inspection.reviewNotes) {
    throw new Error("Visual inspection and review notes are required before finalization.");
  }
  state.status = "finalized";
  state.finalizedAt = new Date().toISOString();
  await writeJson(statePath, state);
  console.log(`Finalized: ${path.join(directory, state.outputPath ?? "output.jpg")}`);
  console.log(`Attempts used: ${state.attempts.length}/${maxAttempts}.`);
}

async function smoke() {
  const temporaryRoot = path.join(
    os.tmpdir(),
    `wiggly-fortnite-filter-smoke-${process.pid}`,
  );
  const previousArgv = [...process.argv];
  try {
    process.argv = [
      previousArgv[0]!,
      previousArgv[1]!,
      "init",
      "--run=smoke",
      `--runs-root=${temporaryRoot}`,
      `--input=${path.join(packageRoot, "fixtures", "trevor-chris-hutchinson-man.jpg")}`,
    ];
    await init();
    process.argv = [
      previousArgv[0]!,
      previousArgv[1]!,
      "validate",
      "--run=smoke",
      `--runs-root=${temporaryRoot}`,
    ];
    await validate();
    const { directory, state, statePath } = await readRun("smoke");
    await copyFile(
      path.join(packageRoot, "assets", "source", "skai-example-output.jpg"),
      path.join(directory, "output.jpg"),
    );
    state.status = "rendered";
    state.outputPath = "output.jpg";
    state.renderedAt = new Date().toISOString();
    await writeJson(statePath, state);
    process.argv = [
      previousArgv[0]!,
      previousArgv[1]!,
      "inspect",
      "--run=smoke",
      `--runs-root=${temporaryRoot}`,
    ];
    await inspect();
    const inspected = (await readRun("smoke")).state;
    if (!inspected.inspection?.automaticPass) {
      throw new Error("Smoke inspection did not pass.");
    }
    if (inspected.inspection.manualPass) {
      throw new Error("Smoke must not bypass the visual-review gate.");
    }
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
