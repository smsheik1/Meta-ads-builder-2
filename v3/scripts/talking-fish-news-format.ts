import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { transcribeAudioWithDeepgram } from "../features/audio/deepgramTranscription";
import { generateFishTalkingFishNewsVoiceover } from "../features/audio/fishStudio";
import {
  buildTalkingFishNewsConceptPrompt,
  buildTalkingFishNewsScriptPrompt,
  createExactTimedCaptions,
  createTalkingFishNewsSceneFromRun,
  getSelectedTalkingFishNewsConcept,
  talkingFishNewsResearchTemplate,
  validateTalkingFishNewsConcepts,
  validateTalkingFishNewsResearch,
  validateTalkingFishNewsScript,
  type TalkingFishNewsAudioArtifact,
  type TalkingFishNewsConcepts,
  type TalkingFishNewsResearch,
  type TalkingFishNewsScript,
  type TalkingFishNewsSelection,
} from "../features/formats/talking-fish-news/repoRuntime";
import { validateTalkingFishNewsScene } from "../features/formats/talking-fish-news/validate";
import { adSceneCompositionId } from "../remotion-entry/Root";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const publicRoot = path.join(v3Root, "public");
const packageRoot = path.join(publicRoot, "format-repositories", "talking-fish-news-v1");

type Inspection = {
  durationSeconds: number;
  durationWithinRange: boolean;
  width: number;
  height: number;
  videoStreams: number;
  audioStreams: number;
  captionsMatchScript: boolean;
  captionWordLimitPassed: boolean;
  fourEvidenceBeats: boolean;
  sceneValid: boolean;
  audioSha256: string;
  outputSha256: string;
  sceneSha256: string;
};

type RunState = {
  id: string;
  status: "draft" | "concepts-ready" | "validated" | "voiced" | "rendered" | "inspected" | "finalized";
  createdAt: string;
  conceptsValidatedAt?: string;
  validatedAt?: string;
  voiceAttemptedAt?: string;
  voicedAt?: string;
  renderedAt?: string;
  inspectedAt?: string;
  finalizedAt?: string;
  audio?: string;
  output?: string;
  contactSheet?: string;
  inspection?: Inspection;
};

type ProbeResult = {
  streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
  format?: { duration?: string };
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

function publicUrlFor(filePath: string) {
  const relative = path.relative(publicRoot, filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--runs-root must be inside this kit's public directory.");
  }
  return `/${relative.split(path.sep).join("/")}`;
}

const readJson = async <T,>(filePath: string) => JSON.parse(await readFile(filePath, "utf8")) as T;

const writeJson = async (filePath: string, value: unknown) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const sha256 = async (filePath: string) => createHash("sha256")
  .update(await readFile(filePath))
  .digest("hex");

async function readRun(runId: string) {
  const directory = runDirectory(runId);
  const state = await readJson<RunState>(path.join(directory, "state.json"));
  const research = await readJson<TalkingFishNewsResearch>(path.join(directory, "research.json"));
  const concepts = await readJson<TalkingFishNewsConcepts>(path.join(directory, "concepts.json"));
  const selection = await readJson<TalkingFishNewsSelection>(path.join(directory, "selection.json"));
  const script = await readJson<TalkingFishNewsScript>(path.join(directory, "script.json"));
  const audioPath = path.join(directory, "audio.json");
  const audio = existsSync(audioPath) ? await readJson<TalkingFishNewsAudioArtifact>(audioPath) : undefined;
  return { audio, concepts, directory, research, script, selection, state };
}

async function spawnCommand(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`${command} failed: ${stderr.trim()}`));
      else resolve();
    });
  });
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
      if (code !== 0) reject(new Error(`ffprobe failed: ${stderr.trim()}`));
      else resolve(JSON.parse(stdout) as ProbeResult);
    });
  });
}

function validateRun(
  research: TalkingFishNewsResearch,
  concepts: TalkingFishNewsConcepts,
  selection: TalkingFishNewsSelection,
  script: TalkingFishNewsScript,
) {
  const errors = validateTalkingFishNewsConcepts(concepts, selection, research);
  if (!errors.length) {
    errors.push(...validateTalkingFishNewsScript(script, getSelectedTalkingFishNewsConcept(concepts, selection)));
  }
  return errors;
}

async function inspectArtifacts({
  audio,
  output,
  scenePath,
  script,
}: {
  audio: TalkingFishNewsAudioArtifact;
  output: string;
  scenePath: string;
  script: TalkingFishNewsScript;
}) {
  const scene = await readJson<ReturnType<typeof createTalkingFishNewsSceneFromRun>>(scenePath);
  const sceneValidation = validateTalkingFishNewsScene(scene);
  const result = await probe(output);
  const video = result.streams?.find((stream) => stream.codec_type === "video");
  const durationSeconds = Number(result.format?.duration || 0);
  return {
    durationSeconds,
    durationWithinRange: durationSeconds >= 14 && durationSeconds <= 24,
    width: video?.width || 0,
    height: video?.height || 0,
    videoStreams: result.streams?.filter((stream) => stream.codec_type === "video").length || 0,
    audioStreams: result.streams?.filter((stream) => stream.codec_type === "audio").length || 0,
    captionsMatchScript: audio.captions.map((caption) => caption.text).join(" ") === script.beats.join(" "),
    captionWordLimitPassed: audio.captions.every((caption) => caption.text.split(/\s+/).filter(Boolean).length <= 6),
    fourEvidenceBeats: scene.layout.beats.length === 4 && scene.layout.beats.every((beat) => Boolean(beat.proofSrc)),
    sceneValid: sceneValidation.valid,
    audioSha256: await sha256(path.join(publicRoot, audio.path)),
    outputSha256: await sha256(output),
    sceneSha256: await sha256(scenePath),
  } satisfies Inspection;
}

const inspectionPassed = (inspection: Inspection) => (
  inspection.durationWithinRange &&
  inspection.width === 1080 &&
  inspection.height === 1920 &&
  inspection.videoStreams === 1 &&
  inspection.audioStreams === 1 &&
  inspection.captionsMatchScript &&
  inspection.captionWordLimitPassed &&
  inspection.fourEvidenceBeats &&
  inspection.sceneValid
);

async function check() {
  console.log("Step 1 of 6: Research - one current, trustworthy source and a local visual inventory.");
  console.log("Step 2 of 6: Concepts - five evidence-backed news angles; user picks one.");
  console.log("Step 3 of 6: Script - four beats, 38-60 words, deadpan payoff.");
  console.log("Step 4 of 6: Voice - Fish voice plus timed caption alignment; explicit approval required.");
  console.log("Step 5 of 6: Render - local Remotion through AdRenderSurface.");
  console.log("Step 6 of 6: Deliver - inspect the MP4 and contact sheet, then wait for the user's verdict.");
  console.log("No image generation, video generation, Replicate, fallback provider, or automatic retry is used.");
}

async function init() {
  const runId = requiredArgument("run");
  const sourceUrl = argument("source-url") || "";
  if (sourceUrl && !URL.canParse(sourceUrl)) throw new Error("--source-url must be a valid URL.");
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  await writeJson(path.join(directory, "research.json"), talkingFishNewsResearchTemplate(sourceUrl));
  await writeJson(path.join(directory, "concepts.json"), { concepts: [] });
  await writeJson(path.join(directory, "selection.json"), { selectedId: "", reason: "" });
  await writeJson(path.join(directory, "script.json"), { stationName: "Talking Fish News", linkText: "", beats: [] });
  await writeJson(path.join(directory, "state.json"), {
    id: runId,
    status: "draft",
    createdAt: new Date().toISOString(),
  } satisfies RunState);
  console.log(`Step 1 of 6: Research - created ${path.relative(v3Root, directory)}.`);
  console.log("Find one trustworthy source, then fill research.json and download three or more relevant source images locally.");
  console.log("No provider was called.");
}

async function conceptPrompt() {
  const runId = requiredArgument("run");
  const { directory, research } = await readRun(runId);
  const errors = validateTalkingFishNewsResearch(research);
  if (errors.length) throw new Error(errors.join("\n"));
  const output = path.join(directory, "concept-prompt.txt");
  await writeFile(output, `${buildTalkingFishNewsConceptPrompt(research)}\n`);
  console.log(`Step 2 of 6: Concepts - wrote ${path.relative(v3Root, output)}.`);
  console.log("Use the exact prompt with the host agent, save all five concepts, then ask the user to choose one.");
}

async function validateConcepts() {
  const runId = requiredArgument("run");
  const { concepts, research, selection, state } = await readRun(runId);
  const errors = validateTalkingFishNewsConcepts(concepts, selection, research);
  if (errors.length) throw new Error(errors.join("\n"));
  state.status = "concepts-ready";
  state.conceptsValidatedAt = new Date().toISOString();
  await writeJson(path.join(runDirectory(runId), "state.json"), state);
  console.log(`Step 2 of 6: Concepts - selected ${selection.selectedId}.`);
}

async function scriptPrompt() {
  const runId = requiredArgument("run");
  const { concepts, directory, research, selection } = await readRun(runId);
  const errors = validateTalkingFishNewsConcepts(concepts, selection, research);
  if (errors.length) throw new Error(errors.join("\n"));
  const output = path.join(directory, "script-prompt.txt");
  await writeFile(output, `${buildTalkingFishNewsScriptPrompt({
    concept: getSelectedTalkingFishNewsConcept(concepts, selection),
    research,
  })}\n`);
  console.log(`Step 3 of 6: Script - wrote ${path.relative(v3Root, output)}.`);
}

async function validate() {
  const runId = requiredArgument("run");
  const { concepts, research, script, selection, state } = await readRun(runId);
  const errors = validateRun(research, concepts, selection, script);
  if (errors.length) throw new Error(errors.join("\n"));
  state.status = "validated";
  state.validatedAt = new Date().toISOString();
  await writeJson(path.join(runDirectory(runId), "state.json"), state);
  console.log("Step 3 of 6: Script - research, five concepts, selection, script, and four evidence mappings are valid.");
}

async function estimate() {
  const runId = requiredArgument("run");
  const { concepts, research, script, selection } = await readRun(runId);
  const errors = validateRun(research, concepts, selection, script);
  if (errors.length) throw new Error(`Validate the run first:\n${errors.join("\n")}`);
  console.log("Run estimate");
  console.log("- Research and official image sourcing: host agent web tools - $0 Wiggly provider cost");
  console.log("- Five concepts and final script: host agent reasoning - $0 separate provider cost");
  console.log("- Fish S2.1 Pro Free voice: $0 provider cost");
  console.log("- Deepgram caption timing: BYOK usage, normally pennies or less for this short clip");
  console.log("- MP4 render: local Remotion - $0 provider cost");
  console.log("No image generation, video generation, or Replicate call.");
}

async function voice() {
  const runId = requiredArgument("run");
  if (!hasFlag("approve-voice")) {
    throw new Error("Use --approve-voice only after showing the selected script and estimate to the user.");
  }
  const { concepts, directory, research, script, selection, state } = await readRun(runId);
  const errors = validateRun(research, concepts, selection, script);
  if (errors.length) throw new Error(`Validate the run first:\n${errors.join("\n")}`);
  if (state.voiceAttemptedAt) throw new Error("This run already used its one voice attempt. Start a new run for another approved attempt.");
  if (!process.env.FISH_STUDIO_APIKEY) throw new Error("FISH_STUDIO_APIKEY is required for the approved voice call.");
  if (!process.env.DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY is required for timed caption alignment.");
  state.voiceAttemptedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  const transcript = script.beats.join(" ");
  const generated = await generateFishTalkingFishNewsVoiceover({ text: transcript });
  const transcription = await transcribeAudioWithDeepgram({
    audioBlob: new Blob([generated.bytes], { type: generated.mimeType }),
    mimeType: generated.mimeType,
  });
  if (!transcription.captions.length) throw new Error("Deepgram returned no timed captions.");
  const captions = createExactTimedCaptions({ script, timingCaptions: transcription.captions });
  const audioFile = path.join(directory, "narration.wav");
  await writeFile(audioFile, generated.bytes);
  const audio: TalkingFishNewsAudioArtifact = {
    path: path.relative(publicRoot, audioFile).split(path.sep).join("/"),
    publicUrl: publicUrlFor(audioFile),
    mimeType: generated.mimeType,
    durationMs: generated.durationMs,
    transcript,
    captions,
    speechSegments: transcription.captions.map((caption) => ({ startMs: caption.startMs, endMs: caption.endMs })),
    provider: "fish-studio",
    model: generated.model,
  };
  state.status = "voiced";
  state.voicedAt = new Date().toISOString();
  state.audio = audio.path;
  await writeJson(path.join(directory, "audio.json"), audio);
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 4 of 6: Voice - wrote ${audio.path} with exact script captions.`);
  console.log("One approved Fish call and one caption-alignment call completed. No retry was attempted.");
}

async function render() {
  const runId = requiredArgument("run");
  const { audio, concepts, directory, research, script, selection, state } = await readRun(runId);
  const errors = validateRun(research, concepts, selection, script);
  if (errors.length) throw new Error(`Validate the run first:\n${errors.join("\n")}`);
  if (!audio) throw new Error("Generate or attach narration before rendering.");
  if (state.output && existsSync(path.join(publicRoot, state.output))) {
    throw new Error("This run already has a rendered MP4. Start a new run to make another.");
  }
  const scene = createTalkingFishNewsSceneFromRun({
    audio,
    concept: getSelectedTalkingFishNewsConcept(concepts, selection),
    research,
    runId,
    script,
  });
  const sceneValidation = validateTalkingFishNewsScene(scene);
  if (!sceneValidation.valid) throw new Error(sceneValidation.errors.join("\n"));
  const output = path.join(directory, "final.mp4");
  const serveUrl = await bundle({
    entryPoint: path.join(v3Root, "remotion-entry", "index.ts"),
    publicDir: publicRoot,
    outDir: path.join(v3Root, "tmp", "talking-fish-news-remotion"),
  });
  const inputProps = { scene };
  const compositions = await getCompositions(serveUrl, { inputProps });
  const composition = compositions.find((candidate) => candidate.id === adSceneCompositionId);
  if (!composition) throw new Error(`Missing ${adSceneCompositionId} composition.`);
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    crf: 23,
    imageFormat: "jpeg",
    jpegQuality: 90,
    inputProps,
    outputLocation: output,
    overwrite: true,
    logLevel: "warn",
  });
  state.status = "rendered";
  state.renderedAt = new Date().toISOString();
  state.output = path.relative(publicRoot, output).split(path.sep).join("/");
  await writeJson(path.join(directory, "scene.json"), scene);
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 5 of 6: Render - wrote ${state.output}.`);
  console.log("No provider was called.");
}

async function inspect() {
  const runId = requiredArgument("run");
  const { audio, directory, script, state } = await readRun(runId);
  if (!audio || !state.output) throw new Error("Render the Talking Fish News MP4 before inspection.");
  const output = path.join(publicRoot, state.output);
  if (!existsSync(output)) throw new Error(`Rendered MP4 is missing: ${output}`);
  const inspection = await inspectArtifacts({ audio, output, scenePath: path.join(directory, "scene.json"), script });
  const contactSheet = path.join(directory, "contact-sheet.jpg");
  await spawnCommand("ffmpeg", [
    "-y", "-i", output,
    "-vf", "fps=1/4,scale=270:-1,tile=4x1",
    "-frames:v", "1",
    contactSheet,
  ]);
  state.status = "inspected";
  state.inspectedAt = new Date().toISOString();
  state.contactSheet = path.relative(publicRoot, contactSheet).split(path.sep).join("/");
  state.inspection = inspection;
  await writeJson(path.join(directory, "quality-report.json"), inspection);
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Step 6 of 6: Deliver - automated inspection complete; waiting for the user's human verdict.");
  console.log(JSON.stringify(inspection, null, 2));
  console.log(`Contact sheet: ${state.contactSheet}`);
  if (!inspectionPassed(inspection)) process.exitCode = 1;
}

async function finalize() {
  const runId = requiredArgument("run");
  const verdict = argument("human-verdict");
  if (verdict !== "pass") throw new Error("Use --human-verdict=pass only after the user watches the complete MP4, reviews all four evidence beats, and says it passes.");
  const { audio, directory, script, state } = await readRun(runId);
  if (!audio || !state.output || state.status !== "inspected" || !state.inspection) {
    throw new Error("Inspect the MP4 before finalizing.");
  }
  const current = await inspectArtifacts({
    audio,
    output: path.join(publicRoot, state.output),
    scenePath: path.join(directory, "scene.json"),
    script,
  });
  if (!inspectionPassed(current) || JSON.stringify(current) !== JSON.stringify(state.inspection)) {
    throw new Error("The inspected Talking Fish News artifacts changed or no longer pass.");
  }
  state.status = "finalized";
  state.finalizedAt = new Date().toISOString();
  await writeJson(path.join(directory, "final-manifest.json"), {
    output: state.output,
    contactSheet: state.contactSheet,
    inspection: current,
    humanVerdict: "pass",
    finalizedAt: state.finalizedAt,
  });
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 6 of 6: Deliver - finalized ${state.output}.`);
}

async function resume() {
  const runId = requiredArgument("run");
  const { state } = await readRun(runId);
  const next = state.status === "draft"
    ? "Finish research.json, generate five concepts, select one, then run validate-concepts."
    : state.status === "concepts-ready"
      ? "Generate script-prompt, save the four-beat script, then validate."
      : state.status === "validated"
        ? "Run estimate, show the script and cost, then ask for voice approval."
        : state.status === "voiced"
          ? "Run render."
          : state.status === "rendered"
            ? "Run inspect."
            : state.status === "inspected"
              ? "Show the MP4 and contact sheet to the user; finalize only after the user says it passes."
              : `This run is complete: ${state.output}.`;
  console.log(`Run ${runId}: ${state.status}.`);
  console.log(next);
}

async function smoke() {
  const runId = requiredArgument("run");
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  const fixture = await readJson<{
    research: TalkingFishNewsResearch;
    concepts: TalkingFishNewsConcepts;
    selection: TalkingFishNewsSelection;
    script: TalkingFishNewsScript;
    audio: Omit<TalkingFishNewsAudioArtifact, "path" | "publicUrl">;
  }>(path.join(packageRoot, "fixtures", "nasa-curiosity.json"));
  const sourceAudio = path.join(publicRoot, "talking-fish-news-assets", "mars-polygons-narration.wav");
  const audioFile = path.join(directory, "narration.wav");
  await mkdir(directory, { recursive: true });
  await copyFile(sourceAudio, audioFile);
  const captions = createExactTimedCaptions({
    script: fixture.script,
    timingCaptions: fixture.audio.captions,
  });
  const audio: TalkingFishNewsAudioArtifact = {
    ...fixture.audio,
    captions,
    path: path.relative(publicRoot, audioFile).split(path.sep).join("/"),
    publicUrl: publicUrlFor(audioFile),
  };
  const state: RunState = {
    id: runId,
    status: "voiced",
    createdAt: new Date().toISOString(),
    conceptsValidatedAt: new Date().toISOString(),
    validatedAt: new Date().toISOString(),
    voicedAt: new Date().toISOString(),
    audio: audio.path,
  };
  await writeJson(path.join(directory, "research.json"), fixture.research);
  await writeJson(path.join(directory, "concepts.json"), fixture.concepts);
  await writeJson(path.join(directory, "selection.json"), fixture.selection);
  await writeJson(path.join(directory, "script.json"), fixture.script);
  await writeJson(path.join(directory, "audio.json"), audio);
  await writeJson(path.join(directory, "state.json"), state);
  console.log("Free local render smoke loaded from bundled media. No provider was called.");
  await render();
  await inspect();
}

const command = process.argv[2] || "check";

try {
  if (command === "check") await check();
  else if (command === "init") await init();
  else if (command === "concept-prompt") await conceptPrompt();
  else if (command === "validate-concepts") await validateConcepts();
  else if (command === "script-prompt") await scriptPrompt();
  else if (command === "validate") await validate();
  else if (command === "estimate") await estimate();
  else if (command === "voice") await voice();
  else if (command === "render") await render();
  else if (command === "inspect") await inspect();
  else if (command === "finalize") await finalize();
  else if (command === "resume") await resume();
  else if (command === "smoke") await smoke();
  else throw new Error(`Unknown command: ${command}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
