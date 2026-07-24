import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateThreeDBreakdownStoryDirectionsFromResearch,
  generateThreeDBreakdownVariantsFromResearch,
} from "../features/formats/three-d-breakdown/generate";
import { buildThreeDProductionFramePrompt, buildThreeDStoryboardBoardPrompt } from "../features/formats/three-d-breakdown/mediaPrompts";
import { fetchThreeDProductReferenceImageUrls, prepareThreeDBrandReferenceImageInputs } from "../features/formats/three-d-breakdown/productReference";
import {
  assertThreeDBreakdownImageCallAllowed,
  evaluateThreeDBreakdownRepoRequirements,
  getThreeDBreakdownRequiredAnchorFrameIndexes,
  inspectThreeDBreakdownRepoScene,
  type ThreeDBreakdownRepoRequirementManifest,
  type ThreeDBreakdownRepoStage,
} from "../features/formats/three-d-breakdown/repoRuntime";
import type { ThreeDBreakdownStoryDirection } from "../features/formats/three-d-breakdown/storyDirections";
import type { ThreeDBreakdownStorySubject } from "../features/formats/three-d-breakdown/storySubject";
import { cropThreeDStoryboardPanel } from "../features/formats/three-d-breakdown/storyboardImageCrop";
import { validateThreeDBreakdownScene } from "../features/formats/three-d-breakdown/validate";
import { generateReplicateNanoBanana2Image } from "../features/formats/jingle/storyboard";
import type { StoredWebsiteResearchResult } from "../features/research/types";
import { createThreeDBreakdownAdScene } from "../features/scene/createThreeDBreakdownScene";
import type { ThreeDBreakdownAdScene, ThreeDBreakdownStoryboardFrameIndex } from "../features/scene/types";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const packageRoot = path.join(v3Root, "public", "format-repositories", "three-d-breakdown-v1");
const runsRoot = path.join(packageRoot, "agent-runs");

type ImageAttempt = {
  asset: "storyboard" | `anchor-${number}`;
  number: number;
  status: "generating" | "ready" | "failed";
  createdAt: string;
  output?: string;
  error?: string;
};

type RunState = {
  id: string;
  status: "draft" | "directions-ready" | "scene-ready" | "images-started" | "ready-for-video";
  createdAt: string;
  subject: ThreeDBreakdownStorySubject;
  planningApprovedAt?: string;
  planningCalls: number;
  imageAttempts: ImageAttempt[];
};

const readJson = async <T,>(filePath: string) => JSON.parse(await readFile(filePath, "utf8")) as T;
const writeJson = async (filePath: string, value: unknown) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

function argument(name: string) {
  const equals = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (equals) return equals.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`);
const requiredArgument = (name: string) => {
  const value = argument(name);
  if (!value) throw new Error(`--${name} is required.`);
  return value;
};

function runDirectory(runId: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(runId)) {
    throw new Error("Run id must use lowercase letters, numbers, and hyphens.");
  }
  return path.join(runsRoot, runId);
}

const loadState = async (runId: string) => readJson<RunState>(path.join(runDirectory(runId), "state.json"));
const saveState = async (state: RunState) => writeJson(path.join(runDirectory(state.id), "state.json"), state);
const loadResearch = async (runId: string) => readJson<StoredWebsiteResearchResult>(path.join(runDirectory(runId), "research.json"));
const loadScene = async (runId: string) => readJson<ThreeDBreakdownAdScene>(path.join(runDirectory(runId), "scene.json"));
const saveScene = async (runId: string, scene: ThreeDBreakdownAdScene) => writeJson(path.join(runDirectory(runId), "scene.json"), scene);

async function loadEnvironment() {
  const envPath = path.join(v3Root, ".env.local");
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

async function commandAvailable(command: string, versionFlag = "--version") {
  return await new Promise<boolean>((resolve) => {
    const child = spawn(command, [versionFlag], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

const parseStage = (): ThreeDBreakdownRepoStage => {
  const stage = argument("stage") || "plan";
  if (!["plan", "images", "voice", "video"].includes(stage)) throw new Error("Stage must be plan, images, voice, or video.");
  return stage as ThreeDBreakdownRepoStage;
};

async function check() {
  await loadEnvironment();
  const stage = parseStage();
  const manifest = await readJson<ThreeDBreakdownRepoRequirementManifest>(path.join(packageRoot, "requirements.json"));
  const result = evaluateThreeDBreakdownRepoRequirements({
    environment: process.env,
    manifest,
    stage,
    tools: { node: await commandAvailable("node") },
  });
  console.log(result.ok ? `3D Breakdown ${stage} stage is ready.` : `3D Breakdown ${stage} stage is not ready.`);
  if (result.missingEnvironment.length) console.log(`Add to v3/.env.local: ${result.missingEnvironment.join(", ")}`);
  if (result.missingTools.length) console.log(`Install locally: ${result.missingTools.join(", ")}`);
  if (result.disabledReason) console.log(result.disabledReason);
  console.log("Secret values were not read back or printed.");
  if (!result.ok) process.exitCode = 1;
}

function readSubject(): ThreeDBreakdownStorySubject {
  const kind = requiredArgument("subject");
  if (!["product", "brand", "customer-problem", "custom"].includes(kind)) {
    throw new Error("Subject must be product, brand, customer-problem, or custom.");
  }
  if (kind === "product") return { kind, productHandle: requiredArgument("product-handle") };
  if (kind === "custom") return { kind, brief: requiredArgument("brief") };
  return { kind: kind as "brand" | "customer-problem" };
}

async function init() {
  const runId = requiredArgument("run");
  const sourceResearchPath = path.resolve(requiredArgument("research"));
  if (!existsSync(sourceResearchPath)) throw new Error(`Research file does not exist: ${sourceResearchPath}`);
  await readJson<StoredWebsiteResearchResult>(sourceResearchPath);
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  await mkdir(directory, { recursive: true });
  await copyFile(sourceResearchPath, path.join(directory, "research.json"));
  await saveState({
    id: runId,
    status: "draft",
    createdAt: new Date().toISOString(),
    subject: readSubject(),
    planningCalls: 0,
    imageAttempts: [],
  });
  console.log(`Created ${path.relative(v3Root, directory)}. No provider was called.`);
}

async function assertPlanningApproved(state: RunState) {
  if (hasFlag("approve-planning") && !state.planningApprovedAt) {
    state.planningApprovedAt = new Date().toISOString();
    await saveState(state);
  }
  if (!state.planningApprovedAt) throw new Error("Planning approval is required. Review the run, then pass --approve-planning.");
  if (state.planningCalls >= 2) throw new Error("This run already used its two planned NIM calls. Inspect the saved output instead of spending again.");
}

async function directions() {
  await loadEnvironment();
  const runId = requiredArgument("run");
  const state = await loadState(runId);
  await assertPlanningApproved(state);
  const slate = await generateThreeDBreakdownStoryDirectionsFromResearch(await loadResearch(runId), {
    storySubject: state.subject,
  });
  state.planningCalls += 1;
  state.status = "directions-ready";
  await Promise.all([
    writeJson(path.join(runDirectory(runId), "story-directions.json"), slate),
    saveState(state),
  ]);
  console.log(`Saved five story directions. Show them to the user before selecting one.`);
}

async function select() {
  await loadEnvironment();
  const runId = requiredArgument("run");
  const state = await loadState(runId);
  await assertPlanningApproved(state);
  const directionId = requiredArgument("direction");
  const slate = await readJson<{ directions: ThreeDBreakdownStoryDirection[] }>(
    path.join(runDirectory(runId), "story-directions.json"),
  );
  const selectedStoryDirection = slate.directions.find((direction) => direction.directionId === directionId);
  if (!selectedStoryDirection) throw new Error(`Direction ${directionId} is not in the saved slate.`);
  const research = await loadResearch(runId);
  const generation = await generateThreeDBreakdownVariantsFromResearch(research, {
    count: 1,
    selectedStoryDirection,
    storySubject: state.subject,
  });
  const variant = generation.variants[0];
  if (!variant) throw new Error("The selected direction returned no scene plan.");
  const scene = createThreeDBreakdownAdScene({
    candidateIndex: 0,
    evidenceItems: generation.evidenceItems,
    generationBatchId: `repo-${runId}`,
    model: generation.model,
    provider: generation.provider,
    research,
    siteContract: generation.siteContract,
    storySubject: state.subject,
    variant,
  });
  state.planningCalls += 1;
  state.status = "scene-ready";
  await Promise.all([saveScene(runId, scene), saveState(state)]);
  console.log("Saved the selected script, six-frame storyboard plan, and two-clip scene contract. No image or video was generated.");
}

async function validate() {
  const runId = requiredArgument("run");
  const result = validateThreeDBreakdownScene(await loadScene(runId));
  if (!result.valid) {
    console.error(result.errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("Scene contract is valid: 5 beats, 6 storyboard frames, 2 anchors, 2 planned clips, 20 seconds.");
}

const toDataUrl = (bytes: Uint8Array, mimeType: string) => `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;

async function fetchReferenceDataUrls(scene: ThreeDBreakdownAdScene) {
  const stylePath = path.join(packageRoot, "assets", "ecommerce-teardown-style-reference-clean-v7.jpg");
  const style = toDataUrl(new Uint8Array(await readFile(stylePath)), "image/jpeg");
  const product = scene.layout.productAnchor;
  let productUrls = product?.imageUrl ? [product.imageUrl] : [];
  if (product?.url && product.imageUrl) {
    const extra = await fetchThreeDProductReferenceImageUrls(product.url, product.imageUrl).catch(() => null);
    productUrls = [...productUrls, extra?.packshotImageUrl, extra?.useImageUrl].filter((url): url is string => Boolean(url));
  }
  const productInputs = await prepareThreeDBrandReferenceImageInputs(productUrls);
  const brandInputs = productInputs.length
    ? []
    : await prepareThreeDBrandReferenceImageInputs(scene.layout.referenceImages?.brandImageUrls || []);
  return [style, ...productInputs, ...brandInputs].slice(0, 4);
}

function localMediaPath(url: string) {
  if (!url.startsWith("agent-runs/")) throw new Error("The Repo runner can only read local agent-run media.");
  const resolved = path.resolve(packageRoot, url);
  if (!resolved.startsWith(`${path.resolve(packageRoot)}${path.sep}`)) throw new Error("Local media path escaped the Format package.");
  return resolved;
}

async function generateStoryboard(runId: string, scene: ThreeDBreakdownAdScene) {
  const result = await generateReplicateNanoBanana2Image({
    replicateApiToken: process.env.REPLICATE_API_TOKEN || "",
    prompt: buildThreeDStoryboardBoardPrompt(scene),
    imageInput: await fetchReferenceDataUrls(scene),
    aspectRatio: "9:16",
  });
  const relativeOutput = `agent-runs/${runId}/images/storyboard-board.jpg`;
  await mkdir(path.dirname(localMediaPath(relativeOutput)), { recursive: true });
  await writeFile(localMediaPath(relativeOutput), result.bytes);
  return {
    ...scene,
    layout: {
      ...scene.layout,
      storyboardBoard: {
        ...scene.layout.storyboardBoard!,
        image: { status: "ready" as const, storageId: `local:${relativeOutput}`, url: relativeOutput, mimeType: result.mimeType },
        frames: scene.layout.storyboardBoard!.frames?.map((frame) => ({ ...frame, image: { status: "idle" as const } })),
      },
      clipPlans: scene.layout.clipPlans?.map((clip) => ({ ...clip, endFrameImage: undefined, video: { status: "idle" as const } })),
    },
  };
}

async function generateAnchor(
  runId: string,
  scene: ThreeDBreakdownAdScene,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) {
  const board = scene.layout.storyboardBoard;
  if (board?.image?.status !== "ready" || !board.image.url) throw new Error("Generate and inspect the storyboard before an anchor.");
  const required = getThreeDBreakdownRequiredAnchorFrameIndexes(scene);
  if (!required.includes(frameIndex)) throw new Error(`Style B anchor frame must be one of: ${required.join(", ")}.`);
  const panelBytes = cropThreeDStoryboardPanel(new Uint8Array(await readFile(localMediaPath(board.image.url))), frameIndex);
  const priorIndex = required[0];
  const priorImage = board.frames?.find((frame) => frame.frameIndex === priorIndex)?.image;
  const continuityInput = frameIndex !== priorIndex && priorImage?.status === "ready" && priorImage.url
    ? toDataUrl(new Uint8Array(await readFile(localMediaPath(priorImage.url))), priorImage.mimeType || "image/jpeg")
    : null;
  const references = await fetchReferenceDataUrls(scene);
  const result = await generateReplicateNanoBanana2Image({
    replicateApiToken: process.env.REPLICATE_API_TOKEN || "",
    prompt: buildThreeDProductionFramePrompt(scene, frameIndex),
    imageInput: [
      toDataUrl(panelBytes, "image/jpeg"),
      ...(continuityInput ? [continuityInput] : []),
      ...references.slice(1),
    ].slice(0, 5),
    aspectRatio: "9:16",
  });
  const relativeOutput = `agent-runs/${runId}/images/anchor-${frameIndex}.jpg`;
  await mkdir(path.dirname(localMediaPath(relativeOutput)), { recursive: true });
  await writeFile(localMediaPath(relativeOutput), result.bytes);
  const invalidateLaterAnchors = frameIndex === priorIndex;
  return {
    ...scene,
    layout: {
      ...scene.layout,
      storyboardBoard: {
        ...board,
        frames: board.frames?.map((frame) => (
          frame.frameIndex === frameIndex
            ? { ...frame, image: { status: "ready" as const, storageId: `local:${relativeOutput}`, url: relativeOutput, mimeType: result.mimeType } }
            : invalidateLaterAnchors && required.includes(frame.frameIndex)
              ? { ...frame, image: { status: "idle" as const } }
              : frame
        )),
      },
      clipPlans: scene.layout.clipPlans?.map((clip) => ({ ...clip, endFrameImage: undefined, video: { status: "idle" as const } })),
    },
  };
}

async function image() {
  await loadEnvironment();
  const runId = requiredArgument("run");
  const kind = requiredArgument("kind");
  if (!["storyboard", "anchor"].includes(kind)) throw new Error("Image kind must be storyboard or anchor.");
  const frame = kind === "anchor" ? Number(requiredArgument("frame")) : undefined;
  if (frame !== undefined && !Number.isInteger(frame)) throw new Error("Anchor frame must be an integer.");
  const asset: ImageAttempt["asset"] = kind === "storyboard" ? "storyboard" : `anchor-${frame!}`;
  const state = await loadState(runId);
  const scene = await loadScene(runId);
  const attempts = state.imageAttempts.filter((attempt) => attempt.asset === asset).length;
  assertThreeDBreakdownImageCallAllowed({
    approved: hasFlag("approve-image"),
    attempts,
    scene,
  });
  const attempt: ImageAttempt = {
    asset,
    number: attempts + 1,
    status: "generating",
    createdAt: new Date().toISOString(),
  };
  state.imageAttempts.push(attempt);
  state.status = "images-started";
  await saveState(state);
  try {
    const nextScene = kind === "storyboard"
      ? await generateStoryboard(runId, scene)
      : await generateAnchor(runId, scene, frame as ThreeDBreakdownStoryboardFrameIndex);
    attempt.status = "ready";
    const outputImage = kind === "storyboard"
      ? nextScene.layout.storyboardBoard?.image
      : nextScene.layout.storyboardBoard?.frames?.find((item) => item.frameIndex === frame)?.image;
    attempt.output = outputImage?.status === "ready" ? outputImage.url : undefined;
    await saveScene(runId, nextScene);
    console.log(`Generated one ${asset} image. Inspect it before another call.`);
  } catch (error) {
    attempt.status = "failed";
    attempt.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await saveState(state);
  }
}

async function inspect() {
  const runId = requiredArgument("run");
  const scene = await loadScene(runId);
  const report = inspectThreeDBreakdownRepoScene(scene, (url) => (
    /^https?:\/\//.test(url) || existsSync(localMediaPath(url))
  ));
  await writeJson(path.join(runDirectory(runId), "quality-report.json"), report);
  const state = await loadState(runId);
  if (report.status === "ready-for-video") state.status = "ready-for-video";
  await saveState(state);
  console.log(`Inspection status: ${report.status}.`);
  if (report.problems.length) console.log(report.problems.map((problem) => `- ${problem}`).join("\n"));
  if (report.status === "ready-for-video") console.log("Stop here. Video generation is still disabled.");
}

async function main() {
  const command = process.argv[2];
  if (command === "check") return await check();
  if (command === "init") return await init();
  if (command === "directions") return await directions();
  if (command === "select") return await select();
  if (command === "validate") return await validate();
  if (command === "image") return await image();
  if (command === "inspect") return await inspect();
  if (command === "video") throw new Error("Paid video generation is disabled in this build-first phase.");
  throw new Error("Use: check | init | directions | select | validate | image | inspect | video");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
