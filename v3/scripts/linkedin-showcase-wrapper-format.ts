import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import {
  resolveInputAssetPath,
  resolveShowcaseIngredient,
  validateShowcaseInput,
  type LinkedInShowcaseInput,
  type ShowcaseIngredient,
} from "../features/formats/linkedin-showcase-wrapper/contracts";
import type { LinkedInShowcaseCompositionProps } from "../features/formats/linkedin-showcase-wrapper/LinkedInShowcase";
import { linkedInShowcaseCompositionId } from "../features/formats/linkedin-showcase-wrapper/Root";

const execFileAsync = promisify(execFile);
const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const publicRoot = path.join(v3Root, "public");
const packageRoot = path.join(publicRoot, "format-repositories", "linkedin-showcase-wrapper-v1");

type StoredAsset = {
  name: string;
  path: string;
  sourceUrl?: string;
  sha256: string;
};

type PreparedInput = {
  version: 1;
  brandWebsite: string;
  approvedVideo: StoredAsset & {
    approved: true;
    approvalNote: string;
    sourceFormat?: string;
    sourceRun?: string;
  };
  brand: { name: string; logo: StoredAsset };
  selectedIngredient: StoredAsset & { role: ShowcaseIngredient["role"] };
  wigglyLogo: StoredAsset;
  outputName: string;
};

type ProbeResult = {
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
    avg_frame_rate?: string;
  }>;
  format?: { duration?: string };
};

type Inspection = {
  automaticPass: boolean;
  durationSeconds: number;
  sourceDurationSeconds: number;
  durationWithinTolerance: boolean;
  width: number;
  height: number;
  videoStreams: number;
  audioStreams: number;
  sourceAudioStreams: number;
  audioPreserved: boolean;
  contactSheet: string;
};

type RunState = {
  id: string;
  status: "draft" | "validated" | "rendered" | "inspected" | "finalized";
  createdAt: string;
  validatedAt?: string;
  renderedAt?: string;
  inspectedAt?: string;
  finalizedAt?: string;
  output?: string;
  inspection?: Inspection;
  humanReview?: { approved: true; note: string };
};

function argument(name: string) {
  const equals = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (equals) return equals.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredArgument(name: string) {
  const value = argument(name);
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function runsRoot() {
  const root = argument("runs-root") ? path.resolve(requiredArgument("runs-root")) : path.join(packageRoot, "agent-runs");
  const relative = path.relative(publicRoot, root);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--runs-root must be a directory inside this kit's public directory.");
  }
  return root;
}

function runDirectory(runId: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(runId)) {
    throw new Error("Run id must use lowercase letters, numbers, and hyphens.");
  }
  return path.join(runsRoot(), runId);
}

const readJson = async <T,>(filePath: string) => JSON.parse(await readFile(filePath, "utf8")) as T;

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function publicPath(filePath: string) {
  const relative = path.relative(publicRoot, filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${filePath} must be inside ${publicRoot}.`);
  }
  return relative.split(path.sep).join("/");
}

function publicFile(assetPath: string) {
  const filePath = path.join(publicRoot, assetPath.replace(/^\//, ""));
  const relative = path.relative(publicRoot, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Invalid stored public asset path.");
  return filePath;
}

async function sha256(filePath: string) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function storeAsset(
  sourcePath: string,
  destinationDirectory: string,
  basename: string,
  metadata: { name: string; sourceUrl?: string },
): Promise<StoredAsset> {
  if (!existsSync(sourcePath)) throw new Error(`Missing input asset: ${sourcePath}`);
  const extension = path.extname(sourcePath).toLowerCase();
  const destination = path.join(destinationDirectory, `${basename}${extension}`);
  await copyFile(sourcePath, destination);
  return {
    name: metadata.name,
    path: publicPath(destination),
    sourceUrl: metadata.sourceUrl,
    sha256: await sha256(destination),
  };
}

async function probe(filePath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,width,height,avg_frame_rate",
    "-show_entries", "format=duration",
    "-of", "json",
    filePath,
  ]);
  return JSON.parse(stdout) as ProbeResult;
}

function parseFps(value = "30/1") {
  const [numerator, denominator = 1] = value.split("/").map(Number);
  const fps = numerator / denominator;
  return Number.isFinite(fps) && fps >= 20 && fps <= 60 ? fps : 30;
}

async function readRun(runId: string) {
  const directory = runDirectory(runId);
  return {
    directory,
    input: await readJson<PreparedInput>(path.join(directory, "input.json")),
    state: await readJson<RunState>(path.join(directory, "state.json")),
  };
}

async function check() {
  await Promise.all([
    execFileAsync("ffmpeg", ["-version"]),
    execFileAsync("ffprobe", ["-version"]),
  ]);
  console.log("Approve -> Source -> Prepare -> Validate -> Render -> Inspect -> Finalize");
  console.log("Local Remotion render only; no API key, provider call, or generation charge.");
  console.log("The wrapper is independent and never changes its source Format or approved video.");
}

async function init() {
  const runId = requiredArgument("run");
  const sourceInputPath = path.resolve(requiredArgument("input"));
  const raw = await readJson<LinkedInShowcaseInput>(sourceInputPath);
  const errors = validateShowcaseInput(raw);
  if (errors.length) throw new Error(errors.join("\n"));
  const ingredient = resolveShowcaseIngredient(raw);
  if (!ingredient) throw new Error("No featured product or hero product was provided.");
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  const assetDirectory = path.join(directory, "assets");
  await mkdir(assetDirectory, { recursive: true });
  const wigglyLogoSource = path.join(packageRoot, "assets", "wiggly-wordmark.png");
  const prepared: PreparedInput = {
    version: 1,
    brandWebsite: raw.brandWebsite,
    approvedVideo: {
      ...(await storeAsset(
        resolveInputAssetPath(sourceInputPath, raw.approvedVideo.path),
        assetDirectory,
        "approved-video",
        raw.approvedVideo,
      )),
      approved: true,
      approvalNote: raw.approvedVideo.approvalNote,
      sourceFormat: raw.approvedVideo.sourceFormat,
      sourceRun: raw.approvedVideo.sourceRun,
    },
    brand: {
      name: raw.brand.name,
      logo: await storeAsset(
        resolveInputAssetPath(sourceInputPath, raw.brand.logo.path),
        assetDirectory,
        "brand-logo",
        raw.brand.logo,
      ),
    },
    selectedIngredient: {
      ...(await storeAsset(
        resolveInputAssetPath(sourceInputPath, ingredient.path),
        assetDirectory,
        "product-or-offering",
        ingredient,
      )),
      role: ingredient.role,
    },
    wigglyLogo: await storeAsset(
      wigglyLogoSource,
      assetDirectory,
      "wiggly-wordmark",
      { name: "Wiggly" },
    ),
    outputName: raw.outputName || `${runId}-linkedin-showcase`,
  };
  const state: RunState = { id: runId, status: "draft", createdAt: new Date().toISOString() };
  await writeJson(path.join(directory, "input.json"), prepared);
  await writeJson(path.join(directory, "source-input.json"), raw);
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Prepare - copied one approved video and three ingredient assets into ${publicPath(directory)}.`);
  console.log(`Ingredient 2 resolved to ${prepared.selectedIngredient.role}.`);
}

async function validate() {
  const runId = requiredArgument("run");
  const { directory, input, state } = await readRun(runId);
  if (!input.approvedVideo.approved || !input.approvedVideo.approvalNote.trim()) {
    throw new Error("The source video approval is missing.");
  }
  const required = [input.approvedVideo, input.brand.logo, input.selectedIngredient, input.wigglyLogo];
  const missing = required.filter((asset) => !existsSync(publicFile(asset.path)));
  if (missing.length) throw new Error(`Missing copied assets: ${missing.map((asset) => asset.name).join(", ")}`);
  const result = await probe(publicFile(input.approvedVideo.path));
  const video = result.streams?.find((stream) => stream.codec_type === "video");
  const durationSeconds = Number(result.format?.duration || 0);
  if (!video || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("The approved source is not a readable video.");
  }
  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  await writeJson(path.join(directory, "validation.json"), {
    pass: true,
    brandWebsite: input.brandWebsite,
    durationSeconds,
    width: video.width,
    height: video.height,
    fps: parseFps(video.avg_frame_rate),
    audioStreams: result.streams?.filter((stream) => stream.codec_type === "audio").length || 0,
    selectedIngredientRole: input.selectedIngredient.role,
  });
  console.log(`Validate - approved ${durationSeconds.toFixed(3)}s source with ${input.selectedIngredient.role}.`);
}

async function render() {
  const runId = requiredArgument("run");
  const { directory, input, state } = await readRun(runId);
  if (state.status !== "validated") throw new Error("Validate the run before rendering.");
  const source = await probe(publicFile(input.approvedVideo.path));
  const sourceVideo = source.streams?.find((stream) => stream.codec_type === "video");
  const durationSeconds = Number(source.format?.duration || 0);
  const fps = parseFps(sourceVideo?.avg_frame_rate);
  const inputProps: LinkedInShowcaseCompositionProps = {
    brandLogoUrl: input.brand.logo.path,
    durationInFrames: Math.ceil(durationSeconds * fps),
    fps,
    productUrl: input.selectedIngredient.path,
    videoUrl: input.approvedVideo.path,
    wigglyLogoUrl: input.wigglyLogo.path,
  };
  const renderBundleDirectory = await mkdtemp(path.join(tmpdir(), "wiggly-linkedin-showcase-"));
  const output = path.join(directory, `${input.outputName}.mp4`);
  try {
    const serveUrl = await bundle({
      entryPoint: path.join(v3Root, "remotion-entry", "linkedin-showcase-wrapper.ts"),
      publicDir: publicRoot,
      outDir: renderBundleDirectory,
    });
    const compositions = await getCompositions(serveUrl, { inputProps });
    const composition = compositions.find((candidate) => candidate.id === linkedInShowcaseCompositionId);
    if (!composition) throw new Error(`Missing ${linkedInShowcaseCompositionId} composition.`);
    await renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      crf: 20,
      imageFormat: "jpeg",
      jpegQuality: 92,
      inputProps,
      outputLocation: output,
      pixelFormat: "yuv420p",
      overwrite: true,
      concurrency: 1,
      logLevel: "warn",
    });
  } finally {
    await rm(renderBundleDirectory, { force: true, recursive: true });
  }
  state.status = "rendered";
  state.renderedAt = new Date().toISOString();
  state.output = publicPath(output);
  await writeJson(path.join(directory, "render-input.json"), inputProps);
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Render - wrote ${state.output} at the approved video's duration and frame rate.`);
}

async function inspect() {
  const runId = requiredArgument("run");
  const { directory, input, state } = await readRun(runId);
  if (state.status !== "rendered" || !state.output) throw new Error("Render the run before inspection.");
  const sourcePath = publicFile(input.approvedVideo.path);
  const outputPath = publicFile(state.output);
  const [source, output] = await Promise.all([probe(sourcePath), probe(outputPath)]);
  const sourceVideo = source.streams?.find((stream) => stream.codec_type === "video");
  const outputVideo = output.streams?.find((stream) => stream.codec_type === "video");
  const sourceDurationSeconds = Number(source.format?.duration || 0);
  const durationSeconds = Number(output.format?.duration || 0);
  const fps = parseFps(sourceVideo?.avg_frame_rate);
  const durationWithinTolerance = Math.abs(durationSeconds - sourceDurationSeconds) <= Math.max(0.05, 1 / fps + 0.02);
  const sourceAudioStreams = source.streams?.filter((stream) => stream.codec_type === "audio").length || 0;
  const audioStreams = output.streams?.filter((stream) => stream.codec_type === "audio").length || 0;
  const audioPreserved = sourceAudioStreams === 0 || audioStreams > 0;
  const contactSheet = path.join(directory, "contact-sheet.jpg");
  const sampleRate = Math.max(0.1, 4 / Math.max(durationSeconds, 0.1));
  await execFileAsync("ffmpeg", [
    "-y", "-i", outputPath,
    "-vf", `fps=${sampleRate},scale=640:-2,tile=2x2`,
    "-frames:v", "1",
    contactSheet,
  ]);
  const inspection: Inspection = {
    automaticPass: Boolean(
      durationWithinTolerance &&
      outputVideo?.width === 1920 &&
      outputVideo?.height === 1080 &&
      (output.streams?.filter((stream) => stream.codec_type === "video").length || 0) === 1 &&
      audioPreserved
    ),
    durationSeconds,
    sourceDurationSeconds,
    durationWithinTolerance,
    width: outputVideo?.width || 0,
    height: outputVideo?.height || 0,
    videoStreams: output.streams?.filter((stream) => stream.codec_type === "video").length || 0,
    audioStreams,
    sourceAudioStreams,
    audioPreserved,
    contactSheet: publicPath(contactSheet),
  };
  state.status = "inspected";
  state.inspectedAt = new Date().toISOString();
  state.inspection = inspection;
  await writeJson(path.join(directory, "inspection.json"), inspection);
  await writeJson(path.join(directory, "provenance.json"), {
    format: "linkedin-showcase-wrapper",
    version: "1.0.0",
    sourceFormat: input.approvedVideo.sourceFormat || null,
    sourceRun: input.approvedVideo.sourceRun || null,
    brandWebsite: input.brandWebsite,
    sourceApproval: input.approvedVideo.approvalNote,
    selectedIngredientRole: input.selectedIngredient.role,
    inputs: {
      approvedVideo: { path: input.approvedVideo.path, sha256: input.approvedVideo.sha256 },
      brandLogo: { path: input.brand.logo.path, sha256: input.brand.logo.sha256 },
      productOrOffering: { path: input.selectedIngredient.path, sha256: input.selectedIngredient.sha256 },
      wigglyLogo: { path: input.wigglyLogo.path, sha256: input.wigglyLogo.sha256 },
    },
    output: { path: state.output, sha256: await sha256(outputPath) },
  });
  await writeJson(path.join(directory, "state.json"), state);
  console.log(JSON.stringify(inspection, null, 2));
  if (!inspection.automaticPass) process.exitCode = 1;
}

async function finalize() {
  const runId = requiredArgument("run");
  const { directory, state } = await readRun(runId);
  const note = requiredArgument("review-note").trim();
  if (!hasFlag("approve-final")) throw new Error("Use --approve-final only after watching the complete output.");
  if (!note) throw new Error("The visual review note cannot be empty.");
  if (state.status !== "inspected" || !state.inspection?.automaticPass) {
    throw new Error("The output must pass automatic inspection before final approval.");
  }
  state.status = "finalized";
  state.finalizedAt = new Date().toISOString();
  state.humanReview = { approved: true, note };
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Finalize - approved ${state.output}.`);
}

async function resume() {
  const runId = requiredArgument("run");
  const { state } = await readRun(runId);
  const next = state.status === "draft"
    ? `npm run format:linkedin-showcase -- validate --run=${runId}`
    : state.status === "validated"
      ? `npm run format:linkedin-showcase -- render --run=${runId}`
      : state.status === "rendered"
        ? `npm run format:linkedin-showcase -- inspect --run=${runId}`
        : state.status === "inspected"
          ? `Watch the full MP4, then finalize --run=${runId} --approve-final --review-note=<note>`
          : `Complete: ${state.output}`;
  console.log(`Run ${runId}: ${state.status}.`);
  console.log(`Next: ${next}`);
}

const command = process.argv[2] || "check";
const commands: Record<string, () => Promise<void>> = { check, init, validate, render, inspect, finalize, resume };
const run = commands[command];
if (!run) throw new Error(`Unknown command ${command}. Use check, init, validate, render, inspect, finalize, or resume.`);
await run();
