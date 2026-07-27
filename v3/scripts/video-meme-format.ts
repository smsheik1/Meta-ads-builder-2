import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import {
  createVideoMemeSceneFromPlan,
  toStoredVideoMemeResearch,
  validateVideoMemePlan,
  validateVideoMemeResearch,
  type VideoMemePlan,
  type VideoMemeResearch,
} from "../features/formats/video-meme/repoRuntime";
import { buildVideoMemePrompt } from "../features/formats/video-meme/prompt";
import { getVideoMemeTemplate } from "../features/formats/video-meme/templates";
import { adSceneCompositionId } from "../remotion-entry/Root";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const packageRoot = path.join(v3Root, "public", "format-repositories", "video-meme-v1");

type RunState = {
  id: string;
  status: "draft" | "validated" | "rendered" | "inspected" | "finalized";
  createdAt: string;
  validatedAt?: string;
  renderedAt?: string;
  inspectedAt?: string;
  finalizedAt?: string;
  output?: string;
  inspection?: {
    durationSeconds: number;
    durationWithinTolerance: boolean;
    width: number;
    height: number;
    videoStreams: number;
    audioStreams: number;
    sourceAudioStreams: number;
    sourceAudioPreserved: boolean;
  };
};

type ProbeResult = {
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
  }>;
  format?: {
    duration?: string;
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
  const research = await readJson<VideoMemeResearch>(path.join(directory, "research.json"));
  const plan = await readJson<VideoMemePlan>(path.join(directory, "meme-plan.json"));
  return { directory, plan, research, state };
}

function evidence(text: string, sourceUrl: string | null) {
  return text ? [{ text, sourceUrl }] : [];
}

function researchTemplate({
  brief,
  url,
}: {
  brief?: string;
  url?: string;
}): VideoMemeResearch {
  const sourceUrl = url || null;
  return {
    sourceType: url ? "website" : "brief",
    websiteUrl: sourceUrl,
    brandName: "",
    offer: brief || "",
    audience: "",
    buyerMoments: evidence("", sourceUrl),
    proof: evidence(brief || "", sourceUrl),
    siteLanguage: evidence("", sourceUrl),
    colors: [],
    adAngles: [],
  };
}

function planTemplate(): VideoMemePlan {
  return {
    version: 1,
    angle: "",
    target: "",
    templateId: "bear-sniff",
    mode: "caught",
    slots: { caption: "" },
    selfCheckPassed: "",
    selectedEvidenceIndexes: [],
  };
}

async function probe(filePath: string) {
  return await new Promise<ProbeResult>((resolve, reject) => {
    const child = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "stream=codec_type,width,height",
      "-show_entries", "format=duration",
      "-of", "json",
      filePath,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${stderr.trim()}`));
        return;
      }
      resolve(JSON.parse(stdout) as ProbeResult);
    });
  });
}

async function check() {
  console.log("Step 1 of 5: Research - host agent web tools; no Wiggly provider call.");
  console.log("Step 2 of 5: Pattern - host agent chooses one bundled reaction clip.");
  console.log("Step 3 of 5: Caption - host agent reasoning and local validation.");
  console.log("Step 4 of 5: Render - bundled clip and local Remotion render.");
  console.log("Step 5 of 5: Deliver - local media inspection.");
  console.log("No API key is required. This runner makes no image, video, voice, or Replicate call.");
}

async function init() {
  const runId = requiredArgument("run");
  const url = argument("url");
  const brief = argument("brief");
  if (Boolean(url) === Boolean(brief)) throw new Error("Use exactly one of --url or --brief.");
  if (url) new URL(url);
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  const state: RunState = {
    id: runId,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  await writeJson(path.join(directory, "research.json"), researchTemplate({ brief, url }));
  await writeJson(path.join(directory, "meme-plan.json"), planTemplate());
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 1 of 5: Research - created ${path.relative(v3Root, directory)}.`);
  console.log("Fill research.json, then use prompts/template-selection.md.");
  console.log("No provider was called.");
}

async function prompt() {
  const runId = requiredArgument("run");
  const { directory, plan, research } = await readRun(runId);
  const researchErrors = validateVideoMemeResearch(research);
  if (researchErrors.length) throw new Error(researchErrors.join("\n"));
  const template = getVideoMemeTemplate(plan.templateId);
  if (!template) throw new Error(`Unknown video meme template: ${plan.templateId}`);
  const captionPrompt = buildVideoMemePrompt(
    toStoredVideoMemeResearch(research, runId),
    3,
    plan.templateId,
  );
  const output = path.join(directory, "caption-prompt.txt");
  await writeFile(output, `${captionPrompt}\n`);
  console.log(`Step 2 of 5: Pattern - wrote ${path.relative(v3Root, output)}.`);
  console.log(`Use the prompt to write three ${template.name} options, then save the strongest in meme-plan.json.`);
  console.log("No provider was called.");
}

async function validate() {
  const runId = requiredArgument("run");
  const { directory, plan, research, state } = await readRun(runId);
  const errors = validateVideoMemePlan(research, plan);
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  const scene = createVideoMemeSceneFromPlan({ research, plan, runId });
  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  await writeJson(path.join(directory, "scene.json"), scene);
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 3 of 5: Caption - ${plan.templateId} plan is valid.`);
  console.log(`Caption: ${scene.creative.headline}`);
}

async function estimate() {
  const runId = requiredArgument("run");
  const { plan, research } = await readRun(runId);
  const errors = validateVideoMemePlan(research, plan);
  if (errors.length) throw new Error(`Validate the meme first:\n${errors.join("\n")}`);
  console.log("Run estimate");
  console.log("- Research: host agent web tools - $0 Wiggly provider cost");
  console.log("- Caption: host agent reasoning - $0 separate provider cost");
  console.log("- Source clip: bundled - $0");
  console.log("- MP4 render: local Remotion - $0 provider cost");
  console.log("Total: $0 Wiggly provider cost");
}

async function render() {
  const runId = requiredArgument("run");
  const { directory, plan, research, state } = await readRun(runId);
  const errors = validateVideoMemePlan(research, plan);
  if (errors.length) throw new Error(`Validate the meme first:\n${errors.join("\n")}`);
  if (state.output && existsSync(path.join(v3Root, "public", state.output))) {
    throw new Error("This run already has a rendered MP4. Start a new run to make another.");
  }
  const scene = createVideoMemeSceneFromPlan({ research, plan, runId });
  const relativeOutput = `format-repositories/video-meme-v1/agent-runs/${runId}/final.mp4`;
  const output = path.join(v3Root, "public", relativeOutput);
  const serveUrl = await bundle({
    entryPoint: path.join(v3Root, "remotion-entry", "index.ts"),
    publicDir: path.join(v3Root, "public"),
    outDir: path.join(v3Root, "tmp", "video-meme-remotion"),
  });
  const inputProps = { scene };
  const compositions = await getCompositions(serveUrl, { inputProps });
  const composition = compositions.find((candidate) => candidate.id === adSceneCompositionId);
  if (!composition) throw new Error(`Missing ${adSceneCompositionId} composition.`);
  await mkdir(path.dirname(output), { recursive: true });
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    crf: 23,
    imageFormat: "jpeg",
    jpegQuality: 88,
    inputProps,
    outputLocation: output,
    overwrite: true,
    logLevel: "warn",
  });
  state.status = "rendered";
  state.renderedAt = new Date().toISOString();
  state.output = relativeOutput;
  await writeJson(path.join(directory, "scene.json"), scene);
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 4 of 5: Render - wrote ${relativeOutput}.`);
  console.log("No provider was called.");
}

async function inspect() {
  const runId = requiredArgument("run");
  const { directory, plan, state } = await readRun(runId);
  if (!state.output) throw new Error("Render the meme before inspection.");
  const output = path.join(v3Root, "public", state.output);
  if (!existsSync(output)) throw new Error(`Rendered MP4 is missing: ${output}`);
  const template = getVideoMemeTemplate(plan.templateId);
  if (!template) throw new Error(`Unknown video meme template: ${plan.templateId}`);
  const source = path.join(v3Root, "public", template.videoSrc.replace(/^\//, ""));
  const [renderedProbe, sourceProbe] = await Promise.all([probe(output), probe(source)]);
  const video = renderedProbe.streams?.find((stream) => stream.codec_type === "video");
  const durationSeconds = Number(renderedProbe.format?.duration || 0);
  const audioStreams = renderedProbe.streams?.filter((stream) => stream.codec_type === "audio").length || 0;
  const sourceAudioStreams = sourceProbe.streams?.filter((stream) => stream.codec_type === "audio").length || 0;
  const inspection = {
    durationSeconds,
    durationWithinTolerance: Math.abs(durationSeconds - template.durationSeconds) <= 0.25,
    width: video?.width || 0,
    height: video?.height || 0,
    videoStreams: renderedProbe.streams?.filter((stream) => stream.codec_type === "video").length || 0,
    audioStreams,
    sourceAudioStreams,
    sourceAudioPreserved: sourceAudioStreams === 0 || audioStreams > 0,
  };
  state.status = "inspected";
  state.inspectedAt = new Date().toISOString();
  state.inspection = inspection;
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 5 of 5: Deliver - inspection complete.");
  console.log(JSON.stringify(inspection, null, 2));
  if (
    !inspection.durationWithinTolerance ||
    inspection.width !== 1080 ||
    inspection.height !== 1350 ||
    inspection.videoStreams !== 1 ||
    !inspection.sourceAudioPreserved
  ) {
    process.exitCode = 1;
  }
}

async function finalize() {
  const runId = requiredArgument("run");
  const { directory, state } = await readRun(runId);
  if (!hasFlag("approve-final")) throw new Error("Use --approve-final after watching the complete MP4.");
  if (state.status !== "inspected" || !state.inspection) throw new Error("Inspect the MP4 before finalizing.");
  if (
    !state.inspection.durationWithinTolerance ||
    state.inspection.width !== 1080 ||
    state.inspection.height !== 1350 ||
    state.inspection.videoStreams !== 1 ||
    !state.inspection.sourceAudioPreserved
  ) {
    throw new Error("The MP4 did not pass inspection.");
  }
  state.status = "finalized";
  state.finalizedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 5 of 5: Deliver - finalized ${state.output}.`);
}

async function resume() {
  const runId = requiredArgument("run");
  const { state } = await readRun(runId);
  const next = state.status === "draft"
    ? `Fill research.json and meme-plan.json, then run prompt and validate.`
    : state.status === "validated"
      ? `Run estimate, then render.`
      : state.status === "rendered"
        ? `Run inspect.`
        : state.status === "inspected"
          ? `Watch the complete MP4, then finalize --approve-final.`
          : `This run is complete: ${state.output}.`;
  console.log(`Run ${runId}: ${state.status}.`);
  console.log(next);
}

const command = process.argv[2] || "check";

try {
  if (command === "check") await check();
  else if (command === "init") await init();
  else if (command === "prompt") await prompt();
  else if (command === "validate") await validate();
  else if (command === "estimate") await estimate();
  else if (command === "render") await render();
  else if (command === "inspect") await inspect();
  else if (command === "finalize") await finalize();
  else if (command === "resume") await resume();
  else throw new Error(`Unknown command: ${command}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
