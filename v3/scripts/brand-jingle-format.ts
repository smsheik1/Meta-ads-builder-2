import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BRAND_JINGLE_DEFAULT_DURATION_SECONDS,
  BRAND_JINGLE_MAX_DURATION_SECONDS,
  BRAND_JINGLE_MIN_DURATION_SECONDS,
  createBrandJingleCoverSvg,
  createBrandJingleDurationTemplate,
  estimateBrandJingleMusicCost,
  generateBrandJingleMusic,
  resolveBrandJingleDuration,
  validateBrandJinglePlan,
  validateBrandJingleResearch,
  type BrandJinglePlan,
  type BrandJingleResearch,
} from "../features/formats/jingle/repoRuntime";
import {
  DEFAULT_JINGLE_STYLE_ID,
  JINGLE_STYLES,
  type JingleStyleId,
} from "../features/formats/jingle/prompt";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const packageRoot = path.join(v3Root, "public", "format-repositories", "brand-jingle-v1");
const runsRoot = path.join(packageRoot, "agent-runs");

type RunState = {
  id: string;
  status: "draft" | "validated" | "generated" | "inspected" | "finalized";
  createdAt: string;
  generatedAt?: string;
  inspectedAt?: string;
  finalizedAt?: string;
  estimatedCostUsd?: number;
  output?: string;
  cover?: string;
  inspection?: {
    audioExists: boolean;
    coverExists: boolean;
    audioBytes: number;
    durationSeconds: number | null;
    durationWithinTolerance: boolean | null;
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

function runDirectory(runId: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(runId)) {
    throw new Error("Run id must use lowercase letters, numbers, and hyphens.");
  }
  return path.join(runsRoot, runId);
}

const readJson = async <T,>(filePath: string) => JSON.parse(await readFile(filePath, "utf8")) as T;

const writeJson = async (filePath: string, value: unknown) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

async function loadEnvironment() {
  const envPath = path.join(v3Root, ".env.local");
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

async function readRun(runId: string) {
  const directory = runDirectory(runId);
  const state = await readJson<RunState>(path.join(directory, "state.json"));
  const research = await readJson<BrandJingleResearch>(path.join(directory, "research.json"));
  const plan = await readJson<BrandJinglePlan>(path.join(directory, "jingle-plan.json"));
  return { directory, plan, research, state };
}

async function probeDurationSeconds(filePath: string) {
  return await new Promise<number | null>((resolve) => {
    const child = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ], { stdio: ["ignore", "pipe", "ignore"] });
    let output = "";
    child.stdout?.on("data", (chunk) => { output += String(chunk); });
    child.on("error", () => resolve(null));
    child.on("close", (code) => {
      const duration = Number(output.trim());
      resolve(code === 0 && Number.isFinite(duration) ? duration : null);
    });
  });
}

function requestedGenre(value: string | undefined): JingleStyleId {
  if (!value || value === "auto" || value === "pick-for-me") return DEFAULT_JINGLE_STYLE_ID;
  if (JINGLE_STYLES.some((style) => style.id === value)) return value as JingleStyleId;
  throw new Error(`Unknown genre. Use auto or one of: ${JINGLE_STYLES.map((style) => style.id).join(", ")}.`);
}

function researchTemplate({
  brief,
  url,
}: {
  brief?: string;
  url?: string;
}): BrandJingleResearch {
  const sourceType = url ? "website" : "brief";
  return {
    sourceType,
    brandName: "",
    websiteUrl: url || null,
    offer: "",
    audience: "",
    buyerMoments: [],
    proof: brief ? [{ text: brief, sourceUrl: null }] : [],
    siteLanguage: [],
    visual: {
      logoUrl: null,
      colors: [],
      notes: [],
    },
  };
}

function planTemplate(durationSeconds: number, genreId: JingleStyleId): BrandJinglePlan {
  return {
    version: 1,
    angle: "",
    brandPhonetic: "",
    durationSeconds,
    genreId,
    hook: "",
    verseLines: [],
    bridgeLines: [],
    selectedEvidenceIndexes: [],
  };
}

async function check() {
  await loadEnvironment();
  const musicReady = Boolean(process.env.ELEVENLABS_API_KEY);
  console.log("Step 1 of 5: Research - agent web tools, no provider key required.");
  console.log("Step 2 of 5: Angle - agent reasoning, no provider key required.");
  console.log("Step 3 of 5: Song - local validation and cover art, no provider key required.");
  console.log(`Step 4 of 5: Generate - ${musicReady ? "ElevenLabs key found." : "ELEVENLABS_API_KEY is missing."}`);
  console.log("Step 5 of 5: Deliver - local inspection and approval.");
  console.log("Secret values were not read back or printed.");
  if (argument("stage") === "music" && !musicReady) process.exitCode = 1;
}

async function init() {
  const runId = requiredArgument("run");
  const url = argument("url");
  const brief = argument("brief");
  if (Boolean(url) === Boolean(brief)) throw new Error("Use exactly one of --url or --brief.");
  const durationSeconds = resolveBrandJingleDuration(argument("duration") || BRAND_JINGLE_DEFAULT_DURATION_SECONDS);
  if (durationSeconds < BRAND_JINGLE_MIN_DURATION_SECONDS || durationSeconds > BRAND_JINGLE_MAX_DURATION_SECONDS) {
    throw new Error(`Duration must be ${BRAND_JINGLE_MIN_DURATION_SECONDS}-${BRAND_JINGLE_MAX_DURATION_SECONDS} seconds.`);
  }
  const genreId = requestedGenre(argument("genre"));
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  const state: RunState = {
    id: runId,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  await writeJson(path.join(directory, "research.json"), researchTemplate({ brief, url }));
  await writeJson(path.join(directory, "jingle-plan.json"), planTemplate(durationSeconds, genreId));
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 1 of 5: Research - created ${path.relative(v3Root, directory)}.`);
  console.log("Research the source, fill research.json, then use prompts/angle.md and prompts/jingle.md.");
  console.log("No provider was called.");
}

async function validate() {
  const runId = requiredArgument("run");
  const { directory, plan, research, state } = await readRun(runId);
  const errors = validateBrandJinglePlan(research, plan);
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  state.status = "validated";
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 3 of 5: Song - valid ${plan.durationSeconds}-second ${plan.genreId} plan.`);
  console.log(`Sections: ${createBrandJingleDurationTemplate(plan.durationSeconds).map((item) => `${item.section} ${item.durationMs / 1_000}s`).join(" / ")}.`);
}

async function estimate() {
  const runId = requiredArgument("run");
  const { plan, research } = await readRun(runId);
  const errors = validateBrandJinglePlan(research, plan);
  if (errors.length) throw new Error(`Validate the jingle first:\n${errors.join("\n")}`);
  const cost = estimateBrandJingleMusicCost(plan.durationSeconds);
  console.log("Run estimate");
  console.log("- Research: agent web tools - $0 provider cost");
  console.log("- Angle + lyrics: agent reasoning - $0 provider cost");
  console.log("- Cover art: local SVG - $0");
  console.log(`- Music: ElevenLabs Music v2, ${plan.durationSeconds}s - about $${cost.toFixed(3)}`);
  console.log(`Total: about $${cost.toFixed(3)}`);
  console.log("One music attempt only. A retry needs a new estimate and a new yes.");
}

async function cover() {
  const runId = requiredArgument("run");
  const { directory, plan, research, state } = await readRun(runId);
  const errors = validateBrandJinglePlan(research, plan);
  if (errors.length) throw new Error(`Validate the jingle first:\n${errors.join("\n")}`);
  const logoPath = argument("logo");
  let logoDataUri: string | null = null;
  if (logoPath) {
    const absoluteLogoPath = path.resolve(logoPath);
    if (!existsSync(absoluteLogoPath)) throw new Error(`Logo file not found: ${absoluteLogoPath}`);
    const extension = path.extname(absoluteLogoPath).toLowerCase();
    const mimeType = extension === ".svg" ? "image/svg+xml" : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
    const logoBytes = await readFile(absoluteLogoPath);
    logoDataUri = `data:${mimeType};base64,${logoBytes.toString("base64")}`;
  }
  const output = path.join(directory, "cover.svg");
  await writeFile(output, createBrandJingleCoverSvg({ logoDataUri, plan, research }));
  state.cover = "cover.svg";
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Step 3 of 5: Song - cover saved to ${path.relative(v3Root, output)}.`);
  console.log("No provider was called.");
}

async function generate() {
  if (!hasFlag("approve-music")) {
    throw new Error("Music generation needs explicit approval. Review estimate, then add --approve-music.");
  }
  await loadEnvironment();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is missing. Add it to v3/.env.local; do not paste it into chat.");
  const runId = requiredArgument("run");
  const { directory, plan, research, state } = await readRun(runId);
  const errors = validateBrandJinglePlan(research, plan);
  if (errors.length) throw new Error(`Validation failed before music spend:\n${errors.join("\n")}`);
  if (state.output) throw new Error("This run already has music. Start a new run for a replacement attempt.");
  console.log(`Step 4 of 5: Generate - creating one ${plan.durationSeconds}-second track.`);
  const result = await generateBrandJingleMusic({ apiKey, plan, research });
  const output = path.join(directory, "jingle.mp3");
  await writeFile(output, result.bytes);
  state.status = "generated";
  state.generatedAt = new Date().toISOString();
  state.estimatedCostUsd = result.estimatedCostUsd;
  state.output = "jingle.mp3";
  await writeJson(path.join(directory, "state.json"), state);
  console.log(`Music saved to ${path.relative(v3Root, output)}.`);
  console.log("No automatic retry was attempted.");
}

async function inspect() {
  const runId = requiredArgument("run");
  const { directory, plan, state } = await readRun(runId);
  const audioPath = path.join(directory, state.output || "jingle.mp3");
  const coverPath = path.join(directory, state.cover || "cover.svg");
  const audioExists = existsSync(audioPath);
  const coverExists = existsSync(coverPath);
  const durationSeconds = audioExists ? await probeDurationSeconds(audioPath) : null;
  const durationWithinTolerance = durationSeconds === null
    ? null
    : Math.abs(durationSeconds - plan.durationSeconds) <= 1.5;
  const audioBytes = audioExists ? (await readFile(audioPath)).byteLength : 0;
  state.inspection = {
    audioExists,
    coverExists,
    audioBytes,
    durationSeconds,
    durationWithinTolerance,
  };
  state.status = "inspected";
  state.inspectedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  await writeJson(path.join(directory, "inspection.json"), state.inspection);
  console.log("Step 5 of 5: Deliver - technical inspection");
  console.log(`- Audio: ${audioExists ? `${Math.round(audioBytes / 1_024)} KB` : "missing"}`);
  console.log(`- Cover: ${coverExists ? "ready" : "missing"}`);
  console.log(`- Duration: ${durationSeconds === null ? "ffprobe unavailable" : `${durationSeconds.toFixed(2)}s`}`);
  if (!audioExists || !coverExists || durationWithinTolerance === false) process.exitCode = 1;
}

async function finalize() {
  if (!hasFlag("approve-final")) throw new Error("Final delivery needs explicit creative approval. Add --approve-final after listening.");
  const runId = requiredArgument("run");
  const { directory, plan, research, state } = await readRun(runId);
  if (state.status !== "inspected" || !state.inspection?.audioExists || !state.inspection.coverExists) {
    throw new Error("Run inspect before finalizing.");
  }
  if (state.inspection.durationWithinTolerance === false) throw new Error("Track duration failed inspection.");
  state.status = "finalized";
  state.finalizedAt = new Date().toISOString();
  await writeJson(path.join(directory, "state.json"), state);
  await writeJson(path.join(directory, "final.json"), {
    brandName: research.brandName,
    angle: plan.angle,
    durationSeconds: plan.durationSeconds,
    genreId: plan.genreId,
    estimatedCostUsd: state.estimatedCostUsd,
    audio: state.output,
    cover: state.cover,
    finalizedAt: state.finalizedAt,
  });
  console.log(`Step 5 of 5: Deliver - finalized ${path.relative(v3Root, directory)}.`);
}

const command = process.argv[2];
const commands: Record<string, () => Promise<void>> = {
  check,
  init,
  validate,
  estimate,
  cover,
  generate,
  inspect,
  finalize,
};

if (!command || !commands[command]) {
  console.error("Use: check | init | validate | estimate | cover | generate | inspect | finalize");
  process.exitCode = 1;
} else {
  commands[command]().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
