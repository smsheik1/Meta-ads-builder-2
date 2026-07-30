import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { generateFishThreeDBreakdownVoiceover } from "../features/audio/fishStudio";
import {
  createCaptionsForVoiceover,
  createGeneratedSceneAudio,
} from "../features/audio/sceneAudio";
import {
  getThreeDBreakdownAgentPlanningContext,
  parseThreeDBreakdownAgentSelectedPlanFromResearch,
  parseThreeDBreakdownAgentStoryDirectionsFromResearch,
  type ThreeDBreakdownAgentSelectedPlanInput,
} from "../features/formats/three-d-breakdown/generate";
import {
  buildThreeDProductionFramePrompt,
  buildThreeDSeedancePrompt,
  buildThreeDStoryboardBoardPrompt,
  THREE_D_BREAKDOWN_VIDEO_RESOLUTION,
} from "../features/formats/three-d-breakdown/mediaPrompts";
import { fetchThreeDProductReferenceImageUrls, prepareThreeDBrandReferenceImageInputs } from "../features/formats/three-d-breakdown/productReference";
import {
  assertThreeDBreakdownImageCallAllowed,
  assertThreeDBreakdownVideoCallAllowed,
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
import {
  BRICK_STORYBOARD_VIDEO_MODEL,
  generateReplicateNanoBanana2Image,
  generateReplicateSeedanceVideo,
  ReplicatePredictionStillRunningError,
} from "../features/formats/jingle/storyboard";
import type { StoredWebsiteResearchResult } from "../features/research/types";
import { createThreeDBreakdownAdScene } from "../features/scene/createThreeDBreakdownScene";
import type {
  ThreeDBreakdownAdScene,
  ThreeDBreakdownClipIndex,
  ThreeDBreakdownClipPlan,
  ThreeDBreakdownStoryboardFrameIndex,
} from "../features/scene/types";
import { adSceneCompositionId } from "../remotion-entry/Root";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const packageRoot = path.join(v3Root, "public", "format-repositories", "three-d-breakdown-v1");
const runsRoot = path.join(packageRoot, "agent-runs");
const narrationTargetMs = 18_100;
const narrationMaximumMs = 18_500;
const narrationMaximumRetimeRatio = 1.25;

type ImageAttempt = {
  asset: "storyboard" | `anchor-${number}`;
  number: number;
  status: "generating" | "ready" | "failed";
  createdAt: string;
  output?: string;
  error?: string;
};

type VideoAttempt = {
  clipIndex: ThreeDBreakdownClipIndex;
  number: number;
  status: "generating" | "ready" | "failed";
  createdAt: string;
  provider: "replicate";
  model: typeof BRICK_STORYBOARD_VIDEO_MODEL;
  predictionId?: string;
  output?: string;
  sourceOutput?: string;
  locallyRetimedAt?: string;
  error?: string;
};

type VoiceAttempt = {
  number: number;
  status: "generating" | "ready" | "failed";
  createdAt: string;
  provider: "fish-studio";
  output?: string;
  durationMs?: number;
  error?: string;
};

type FinalRender = {
  status: "ready" | "finalized";
  createdAt: string;
  output: string;
  durationMs: number;
  contactSheet: string;
  finalizedAt?: string;
};

type ReviewAsset = ImageAttempt["asset"] | `clip-${ThreeDBreakdownClipIndex}`;

type ArtifactReview = {
  asset: ReviewAsset;
  attemptNumber: number;
  decision: "approved" | "rejected";
  reviewedAt: string;
  reason?: string;
};

type RunState = {
  id: string;
  status: "draft" | "directions-ready" | "scene-ready" | "images-started" | "ready-for-video" | "video-started" | "clips-ready" | "voice-ready" | "final-ready" | "finalized";
  createdAt: string;
  subject: ThreeDBreakdownStorySubject;
  planningApprovedAt?: string;
  planningCalls?: number;
  imageAttempts: ImageAttempt[];
  videoAttempts?: VideoAttempt[];
  voiceAttempts?: VoiceAttempt[];
  reviews?: ArtifactReview[];
  finalRender?: FinalRender;
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
const qualityReportPath = (runId: string) => path.join(runDirectory(runId), "quality-report.json");

const withoutFinalArtifacts = async (
  runId: string,
  state: RunState,
  scene: ThreeDBreakdownAdScene,
) => {
  state.finalRender = undefined;
  await rm(qualityReportPath(runId), { force: true });
  return {
    ...scene,
    layout: {
      ...scene.layout,
      finalVideo: undefined,
    },
  };
};

const attemptsForAsset = (state: RunState, asset: ReviewAsset) => (
  asset.startsWith("clip-")
    ? (state.videoAttempts || []).filter((attempt) => `clip-${attempt.clipIndex}` === asset)
    : state.imageAttempts.filter((attempt) => attempt.asset === asset)
);

const currentSceneOutput = (scene: ThreeDBreakdownAdScene, asset: ReviewAsset) => {
  if (asset === "storyboard") {
    const image = scene.layout.storyboardBoard?.image;
    return image?.status === "ready" ? image.url : undefined;
  }
  if (asset.startsWith("anchor-")) {
    const frameIndex = Number(asset.slice("anchor-".length));
    const image = scene.layout.storyboardBoard?.frames?.find((frame) => frame.frameIndex === frameIndex)?.image;
    return image?.status === "ready" ? image.url : undefined;
  }
  const clipIndex = Number(asset.slice("clip-".length));
  const video = scene.layout.clipPlans?.find((clip) => clip.clipIndex === clipIndex)?.video;
  return video?.status === "ready" ? video.url : undefined;
};

const latestReadyAttemptForAsset = (
  state: RunState,
  scene: ThreeDBreakdownAdScene,
  asset: ReviewAsset,
) => {
  const output = currentSceneOutput(scene, asset);
  if (!output) return undefined;
  return [...attemptsForAsset(state, asset)].reverse().find((attempt) => (
    attempt.status === "ready" && attempt.output === output
  ));
};

const reviewForCurrentAttempt = (
  state: RunState,
  scene: ThreeDBreakdownAdScene,
  asset: ReviewAsset,
) => {
  const attempt = latestReadyAttemptForAsset(state, scene, asset);
  if (!attempt) return null;
  return [...(state.reviews || [])].reverse().find((review) => (
    review.asset === asset && review.attemptNumber === attempt.number
  )) || null;
};

const assertArtifactApproved = (
  state: RunState,
  scene: ThreeDBreakdownAdScene,
  asset: ReviewAsset,
) => {
  const attempt = latestReadyAttemptForAsset(state, scene, asset);
  if (!attempt) throw new Error(`${asset} has no generated result to approve.`);
  const review = reviewForCurrentAttempt(state, scene, asset);
  if (review?.decision !== "approved") {
    throw new Error(`Review ${asset} and record approval before continuing.`);
  }
};

function readReviewAsset(): ReviewAsset {
  const asset = requiredArgument("asset");
  if (asset === "storyboard") return asset;
  if (/^anchor-(1|3|4|6)$/.test(asset)) return asset as ReviewAsset;
  if (/^clip-(1|2)$/.test(asset)) return asset as ReviewAsset;
  throw new Error("Review asset must be storyboard, anchor-1, anchor-3, anchor-4, anchor-6, clip-1, or clip-2.");
}

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

async function runCommand(command: string, args: string[]) {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} failed: ${stderr.trim() || `exit ${code}`}`));
    });
  });
}

const parseStage = (): ThreeDBreakdownRepoStage => {
  const stage = argument("stage") || "plan";
  if (!["plan", "images", "voice", "video", "final"].includes(stage)) throw new Error("Stage must be plan, images, voice, video, or final.");
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
    tools: {
      node: await commandAvailable("node"),
      ffmpeg: await commandAvailable("ffmpeg", "-version"),
      ffprobe: await commandAvailable("ffprobe", "-version"),
      remotion: existsSync(path.join(v3Root, "node_modules", "@remotion", "renderer")),
    },
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
  const research = await readJson<StoredWebsiteResearchResult>(sourceResearchPath);
  const subject = readSubject();
  const planningContext = getThreeDBreakdownAgentPlanningContext(research, subject);
  const directory = runDirectory(runId);
  if (existsSync(directory)) throw new Error(`Run ${runId} already exists.`);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    copyFile(sourceResearchPath, path.join(directory, "research.json")),
    writeJson(path.join(directory, "planning-context.json"), planningContext),
    saveState({
      id: runId,
      status: "draft",
      createdAt: new Date().toISOString(),
      subject,
      imageAttempts: [],
      videoAttempts: [],
    }),
  ]);
  console.log(`Created ${path.relative(v3Root, directory)} with numbered planning evidence. No provider was called.`);
}

async function assertPlanningApproved(state: RunState) {
  if (hasFlag("approve-planning") && !state.planningApprovedAt) {
    state.planningApprovedAt = new Date().toISOString();
    await saveState(state);
  }
  if (!state.planningApprovedAt) throw new Error("Planning approval is required. Review the run, then pass --approve-planning.");
}

async function directions() {
  const runId = requiredArgument("run");
  const state = await loadState(runId);
  if (state.status !== "draft") {
    throw new Error("Story directions already exist for this project. Inspect the saved slate instead of replacing it.");
  }
  const input = await readJson<Record<string, unknown>>(path.resolve(requiredArgument("input")));
  const slate = parseThreeDBreakdownAgentStoryDirectionsFromResearch(
    await loadResearch(runId),
    input,
    state.subject,
  );
  state.status = "directions-ready";
  await Promise.all([
    writeJson(path.join(runDirectory(runId), "story-directions.json"), slate),
    saveState(state),
  ]);
  console.log(`Saved five story directions. Show them to the user before selecting one.`);
}

async function select() {
  const runId = requiredArgument("run");
  const state = await loadState(runId);
  await assertPlanningApproved(state);
  if (state.status !== "directions-ready") {
    throw new Error("Select a direction only after the saved five-direction slate is ready.");
  }
  const directionId = requiredArgument("direction");
  const slate = await readJson<{ directions: ThreeDBreakdownStoryDirection[] }>(
    path.join(runDirectory(runId), "story-directions.json"),
  );
  const selectedStoryDirection = slate.directions.find((direction) => direction.directionId === directionId);
  if (!selectedStoryDirection) throw new Error(`Direction ${directionId} is not in the saved slate.`);
  const research = await loadResearch(runId);
  const input = await readJson<ThreeDBreakdownAgentSelectedPlanInput>(
    path.resolve(requiredArgument("plan")),
  );
  const generation = parseThreeDBreakdownAgentSelectedPlanFromResearch(
    research,
    input,
    selectedStoryDirection,
    state.subject,
  );
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
  console.log("Scene contract is valid: 5 beats, 6 storyboard frames, 4 production endpoints, 2 planned clips, 20 seconds.");
}

async function review() {
  const runId = requiredArgument("run");
  const asset = readReviewAsset();
  const decision = requiredArgument("decision");
  if (!["approve", "reject"].includes(decision)) {
    throw new Error("Review decision must be approve or reject.");
  }
  const reason = argument("reason")?.trim();
  if (decision === "reject" && !reason) {
    throw new Error("Rejected artifacts require --reason so the next attempt has a useful diagnosis.");
  }
  const [state, scene] = await Promise.all([loadState(runId), loadScene(runId)]);
  const attempt = latestReadyAttemptForAsset(state, scene, asset);
  if (!attempt) throw new Error(`${asset} has no current ready result to review.`);
  const reviewRecord: ArtifactReview = {
    asset,
    attemptNumber: attempt.number,
    decision: decision === "approve" ? "approved" : "rejected",
    reviewedAt: new Date().toISOString(),
    ...(reason ? { reason } : {}),
  };
  state.reviews = [
    ...(state.reviews || []).filter((item) => (
      item.asset !== asset || item.attemptNumber !== attempt.number
    )),
    reviewRecord,
  ];
  await saveState(state);
  console.log(`${asset} attempt ${attempt.number} was ${reviewRecord.decision}. No provider was called.`);
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
  if (product && !productInputs.length) {
    throw new Error(`Could not download a usable product reference for ${product.title}. Fix the saved product image before paid generation.`);
  }
  const brandInputs = product
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

async function generateStoryboard(runId: string, scene: ThreeDBreakdownAdScene, attemptNumber: number) {
  const result = await generateReplicateNanoBanana2Image({
    replicateApiToken: process.env.REPLICATE_API_TOKEN || "",
    prompt: buildThreeDStoryboardBoardPrompt(scene),
    imageInput: await fetchReferenceDataUrls(scene),
    aspectRatio: "9:16",
  });
  const relativeOutput = `agent-runs/${runId}/images/storyboard-board-attempt-${attemptNumber}.jpg`;
  await mkdir(path.dirname(localMediaPath(relativeOutput)), { recursive: true });
  await writeFile(localMediaPath(relativeOutput), result.bytes);
  return {
    ...scene,
    layout: {
      ...scene.layout,
      finalVideo: undefined,
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
  attemptNumber: number,
) {
  const board = scene.layout.storyboardBoard;
  if (board?.image?.status !== "ready" || !board.image.url) throw new Error("Generate and inspect the storyboard before an anchor.");
  const required = getThreeDBreakdownRequiredAnchorFrameIndexes(scene);
  if (!required.includes(frameIndex)) throw new Error(`Style B anchor frame must be one of: ${required.join(", ")}.`);
  const panelBytes = cropThreeDStoryboardPanel(new Uint8Array(await readFile(localMediaPath(board.image.url))), frameIndex);
  const position = required.indexOf(frameIndex);
  const priorIndex = position > 0 ? required[position - 1] : undefined;
  const priorImage = board.frames?.find((frame) => frame.frameIndex === priorIndex)?.image;
  const identityImage = frameIndex === 1
    ? undefined
    : board.frames?.find((frame) => frame.frameIndex === 1)?.image;
  const continuityInput = priorImage?.status === "ready" && priorImage.url
    ? toDataUrl(new Uint8Array(await readFile(localMediaPath(priorImage.url))), priorImage.mimeType || "image/jpeg")
    : null;
  const identityInput = identityImage?.status === "ready" && identityImage.url
    ? toDataUrl(new Uint8Array(await readFile(localMediaPath(identityImage.url))), identityImage.mimeType || "image/jpeg")
    : null;
  const references = await fetchReferenceDataUrls(scene);
  const imageInput = Array.from(new Set([
    toDataUrl(panelBytes, "image/jpeg"),
    references[0],
    identityInput,
    continuityInput,
    references[1],
  ].filter((value): value is string => Boolean(value))));
  const result = await generateReplicateNanoBanana2Image({
    replicateApiToken: process.env.REPLICATE_API_TOKEN || "",
    prompt: buildThreeDProductionFramePrompt(scene, frameIndex),
    imageInput: imageInput.slice(0, 5),
    aspectRatio: "9:16",
  });
  const relativeOutput = `agent-runs/${runId}/images/anchor-${frameIndex}-attempt-${attemptNumber}.jpg`;
  await mkdir(path.dirname(localMediaPath(relativeOutput)), { recursive: true });
  await writeFile(localMediaPath(relativeOutput), result.bytes);
  const invalidatedFrameIndexes = required.slice(position + 1);
  return {
    ...scene,
    layout: {
      ...scene.layout,
      finalVideo: undefined,
      storyboardBoard: {
        ...board,
        frames: board.frames?.map((frame) => (
          frame.frameIndex === frameIndex
            ? { ...frame, image: { status: "ready" as const, storageId: `local:${relativeOutput}`, url: relativeOutput, mimeType: result.mimeType } }
            : invalidatedFrameIndexes.includes(frame.frameIndex)
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
  let scene = await loadScene(runId);
  const attempts = state.imageAttempts.filter((attempt) => attempt.asset === asset).length;
  if (kind === "anchor") {
    assertArtifactApproved(state, scene, "storyboard");
    const required = getThreeDBreakdownRequiredAnchorFrameIndexes(scene);
    const position = required.indexOf(frame as ThreeDBreakdownStoryboardFrameIndex);
    const priorFrame = position > 0 ? required[position - 1] : undefined;
    if (position < 0) throw new Error(`Style B anchor frame must be one of: ${required.join(", ")}.`);
    if (priorFrame !== undefined) {
      assertArtifactApproved(state, scene, `anchor-${priorFrame}` as ReviewAsset);
    }
  }
  assertThreeDBreakdownImageCallAllowed({
    approved: hasFlag("approve-image"),
    attempts,
    scene,
  });
  scene = await withoutFinalArtifacts(runId, state, scene);
  const attempt: ImageAttempt = {
    asset,
    number: attempts + 1,
    status: "generating",
    createdAt: new Date().toISOString(),
  };
  state.imageAttempts.push(attempt);
  state.status = "images-started";
  await Promise.all([saveState(state), saveScene(runId, scene)]);
  try {
    const nextScene = kind === "storyboard"
      ? await generateStoryboard(runId, scene, attempt.number)
      : await generateAnchor(runId, scene, frame as ThreeDBreakdownStoryboardFrameIndex, attempt.number);
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

function updateClipPlan(
  scene: ThreeDBreakdownAdScene,
  clipIndex: ThreeDBreakdownClipIndex,
  update: (clip: ThreeDBreakdownClipPlan) => ThreeDBreakdownClipPlan,
): ThreeDBreakdownAdScene {
  return {
    ...scene,
    layout: {
      ...scene.layout,
      finalVideo: undefined,
      clipPlans: scene.layout.clipPlans?.map((clip) => clip.clipIndex === clipIndex ? update(clip) : clip),
    },
  };
}

async function generateVideoClip(
  runId: string,
  scene: ThreeDBreakdownAdScene,
  clipIndex: ThreeDBreakdownClipIndex,
  attemptNumber: number,
  options: {
    predictionId?: string;
    onPredictionCreated?: (predictionId: string) => void | Promise<void>;
    pollAttempts?: number;
  } = {},
) {
  const clipPlan = scene.layout.clipPlans?.find((clip) => clip.clipIndex === clipIndex);
  if (!clipPlan) throw new Error(`Video clip ${clipIndex} is missing from the scene.`);
  const startFrameIndex = clipPlan.frameIndexes[0];
  const endFrameIndex = clipPlan.frameIndexes.at(-1);
  const startFrame = scene.layout.storyboardBoard?.frames?.find((frame) => frame.frameIndex === startFrameIndex);
  const endFrame = scene.layout.storyboardBoard?.frames?.find((frame) => frame.frameIndex === endFrameIndex);
  if (startFrame?.image?.status !== "ready" || !startFrame.image.url) {
    throw new Error(`Video clip ${clipIndex} needs full-quality production frame ${startFrameIndex}.`);
  }
  if (endFrame?.image?.status !== "ready" || !endFrame.image.url) {
    throw new Error(`Video clip ${clipIndex} needs full-quality production frame ${endFrameIndex}.`);
  }
  const endFrameImage = { ...endFrame.image, url: endFrame.image.url };
  const [startBytes, endBytes] = await Promise.all([
    readFile(localMediaPath(startFrame.image.url)),
    readFile(localMediaPath(endFrameImage.url)),
  ]);
  const result = await generateReplicateSeedanceVideo({
    replicateApiToken: process.env.REPLICATE_API_TOKEN || "",
    imageUrl: toDataUrl(new Uint8Array(startBytes), startFrame.image.mimeType || "image/jpeg"),
    lastFrameImageUrl: toDataUrl(new Uint8Array(endBytes), endFrameImage.mimeType || "image/jpeg"),
    prompt: buildThreeDSeedancePrompt(scene, clipPlan),
    durationSeconds: clipPlan.durationSeconds,
    resolution: THREE_D_BREAKDOWN_VIDEO_RESOLUTION,
    ...options,
  });
  const relativeOutput = `agent-runs/${runId}/videos/clip-${clipIndex}-attempt-${attemptNumber}.mp4`;
  await mkdir(path.dirname(localMediaPath(relativeOutput)), { recursive: true });
  await writeFile(localMediaPath(relativeOutput), result.bytes);
  return updateClipPlan(scene, clipIndex, (clip) => ({
    ...clip,
    endFrameImage,
    video: {
      status: "ready",
      storageId: `local:${relativeOutput}`,
      url: relativeOutput,
      mimeType: result.mimeType,
    },
  }));
}

async function video() {
  await loadEnvironment();
  const runId = requiredArgument("run");
  const clipIndex = Number(requiredArgument("clip")) as ThreeDBreakdownClipIndex;
  const state = await loadState(runId);
  let scene = await loadScene(runId);
  if (!process.env.REPLICATE_API_TOKEN?.trim()) {
    throw new Error("Add REPLICATE_API_TOKEN to v3/.env.local before video generation.");
  }
  const clipAttempts = (state.videoAttempts || []).filter((attempt) => attempt.clipIndex === clipIndex);
  const activeAttempt = [...clipAttempts].reverse().find((attempt) => attempt.status === "generating");
  if (activeAttempt && !activeAttempt.predictionId) {
    throw new Error(`Video clip ${clipIndex} is marked as generating but has no saved Replicate prediction ID. Inspect the provider before approving another paid call.`);
  }
  const attempt: VideoAttempt = activeAttempt || {
    clipIndex,
    number: clipAttempts.length + 1,
    status: "generating",
    createdAt: new Date().toISOString(),
    provider: "replicate",
    model: BRICK_STORYBOARD_VIDEO_MODEL,
  };
  if (!activeAttempt) {
    for (const frameIndex of getThreeDBreakdownRequiredAnchorFrameIndexes(scene)) {
      assertArtifactApproved(state, scene, `anchor-${frameIndex}` as ReviewAsset);
    }
    if (clipIndex === 2) {
      assertArtifactApproved(state, scene, "clip-1");
    }
    const currentReview = reviewForCurrentAttempt(state, scene, `clip-${clipIndex}`);
    if (scene.layout.clipPlans?.find((clip) => clip.clipIndex === clipIndex)?.video?.status === "ready"
      && currentReview?.decision !== "rejected") {
      throw new Error(`Video clip ${clipIndex} is ready. Approve it, or reject it with a reason before generating a replacement.`);
    }
    const gateScene = currentReview?.decision === "rejected"
      ? updateClipPlan(scene, clipIndex, (clip) => ({ ...clip, video: { status: "idle" } }))
      : scene;
    assertThreeDBreakdownVideoCallAllowed({
      approved: hasFlag("approve-video"),
      attempts: clipAttempts.length,
      clipIndex,
      scene: gateScene,
    });
    state.videoAttempts = [...(state.videoAttempts || []), attempt];
    state.status = "video-started";
  }
  scene = await withoutFinalArtifacts(runId, state, scene);
  const generatingScene: ThreeDBreakdownAdScene = {
    ...scene,
    layout: {
      ...scene.layout,
      clipPlans: scene.layout.clipPlans?.map((clip) => (
        clip.clipIndex === clipIndex
          ? { ...clip, video: { status: "generating" as const } }
          : clipIndex === 1 && clip.clipIndex > clipIndex
            ? { ...clip, endFrameImage: undefined, video: { status: "idle" as const } }
            : clip
      )),
    },
  };
  await Promise.all([saveState(state), saveScene(runId, generatingScene)]);
  try {
    const nextScene = await generateVideoClip(runId, generatingScene, clipIndex, attempt.number, {
      predictionId: activeAttempt?.predictionId,
      pollAttempts: activeAttempt ? 0 : undefined,
      onPredictionCreated: async (predictionId) => {
        attempt.predictionId = predictionId;
        await saveState(state);
      },
    });
    const output = nextScene.layout.clipPlans?.find((clip) => clip.clipIndex === clipIndex)?.video;
    attempt.status = "ready";
    attempt.output = output?.status === "ready" ? output.url : undefined;
    attempt.error = undefined;
    state.status = nextScene.layout.clipPlans?.every((clip) => clip.video?.status === "ready")
      ? "clips-ready"
      : "video-started";
    await saveScene(runId, nextScene);
    console.log(`Generated video clip ${clipIndex}. Inspect it before another paid call.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const savedPredictionId = error instanceof ReplicatePredictionStillRunningError
      ? error.predictionId
      : attempt.predictionId;
    if (savedPredictionId && !/^Replicate Seedance (failed|canceled):/.test(message)) {
      attempt.predictionId = savedPredictionId;
      attempt.status = "generating";
      attempt.error = error instanceof ReplicatePredictionStillRunningError ? undefined : message;
      await saveScene(runId, generatingScene);
      console.log(`Video clip ${clipIndex} was not ready to collect. Prediction ${savedPredictionId} remains saved; run the same video command again to check it without another paid generation.${attempt.error ? ` Last error: ${attempt.error}` : ""}`);
      return;
    }
    attempt.status = "failed";
    attempt.error = message;
    await saveScene(runId, updateClipPlan(generatingScene, clipIndex, (clip) => ({
      ...clip,
      video: { status: "failed", error: message },
    })));
    throw error;
  } finally {
    await saveState(state);
  }
}

async function retimeClip() {
  const runId = requiredArgument("run");
  const clipIndex = Number(requiredArgument("clip")) as ThreeDBreakdownClipIndex;
  if (clipIndex !== 2) {
    throw new Error("The MVP local timing correction is limited to clip 2.");
  }
  if (!hasFlag("approve-local-retime")) {
    throw new Error("Review clip 2, then pass --approve-local-retime to change its timing without a provider call.");
  }
  const visibleSeconds = Number(argument("action-seconds") || "6");
  if (!Number.isFinite(visibleSeconds) || visibleSeconds < 3 || visibleSeconds > 9) {
    throw new Error("--action-seconds must be between 3 and 9.");
  }
  const [state, loadedScene] = await Promise.all([loadState(runId), loadScene(runId)]);
  const scene = await withoutFinalArtifacts(runId, state, loadedScene);
  const attempt = latestReadyAttemptForAsset(state, scene, "clip-2");
  if (!attempt || !("clipIndex" in attempt) || !attempt.output) {
    throw new Error("Clip 2 has no current ready provider result to retime.");
  }
  const sourceDurationMs = await probeDurationMs(localMediaPath(attempt.output));
  const plannedDurationSeconds = scene.layout.clipPlans?.find((clip) => clip.clipIndex === 2)?.durationSeconds || 10;
  const speedScale = visibleSeconds / (sourceDurationMs / 1_000);
  const holdSeconds = plannedDurationSeconds - visibleSeconds;
  const relativeOutput = `agent-runs/${runId}/videos/clip-2-attempt-${attempt.number}-retimed.mp4`;
  await mkdir(path.dirname(localMediaPath(relativeOutput)), { recursive: true });
  await runCommand("ffmpeg", [
    "-y",
    "-i", localMediaPath(attempt.output),
    "-vf", `setpts=${speedScale.toFixed(6)}*PTS,tpad=stop_mode=clone:stop_duration=${holdSeconds.toFixed(3)}`,
    "-an",
    "-t", String(plannedDurationSeconds),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    localMediaPath(relativeOutput),
  ]);
  const nextScene = updateClipPlan(scene, 2, (clip) => ({
    ...clip,
    video: {
      status: "ready",
      storageId: `local:${relativeOutput}`,
      url: relativeOutput,
      mimeType: "video/mp4",
    },
  }));
  attempt.sourceOutput = attempt.sourceOutput || attempt.output;
  attempt.output = relativeOutput;
  attempt.locallyRetimedAt = new Date().toISOString();
  state.reviews = (state.reviews || []).filter((review) => (
    review.asset !== "clip-2" || review.attemptNumber !== attempt.number
  ));
  await Promise.all([saveState(state), saveScene(runId, nextScene)]);
  console.log(`Retimed clip 2 locally: action fits in ${visibleSeconds}s and the resolved frame holds for ${holdSeconds}s. No provider was called; review clip-2 again.`);
}

function assertClipsReady(scene: ThreeDBreakdownAdScene) {
  if (scene.layout.clipPlans?.length !== 2 || scene.layout.clipPlans.some((clip) => (
    clip.video?.status !== "ready" || !clip.video.url || !existsSync(localMediaPath(clip.video.url))
  ))) {
    throw new Error("Both inspected video clips must be ready before voice or final rendering.");
  }
}

async function voice() {
  await loadEnvironment();
  const runId = requiredArgument("run");
  const state = await loadState(runId);
  let scene = await loadScene(runId);
  assertClipsReady(scene);
  assertArtifactApproved(state, scene, "clip-1");
  assertArtifactApproved(state, scene, "clip-2");
  if (scene.audio.status === "generated") throw new Error("This run already has generated narration.");
  if (!hasFlag("approve-voice")) throw new Error("Approve one Fish voice generation with --approve-voice.");
  if (!process.env.FISH_STUDIO_APIKEY?.trim()) {
    throw new Error("Add FISH_STUDIO_APIKEY to v3/.env.local before voice generation.");
  }
  const attempts = state.voiceAttempts || [];
  if (attempts.length >= 3) throw new Error("The voice attempt limit is 3. Fix the script before spending again.");
  scene = await withoutFinalArtifacts(runId, state, scene);
  const attempt: VoiceAttempt = {
    number: attempts.length + 1,
    status: "generating",
    createdAt: new Date().toISOString(),
    provider: "fish-studio",
  };
  state.voiceAttempts = [...attempts, attempt];
  await Promise.all([saveState(state), saveScene(runId, scene)]);
  try {
    const generated = await generateFishThreeDBreakdownVoiceover({
      apiKey: process.env.FISH_STUDIO_APIKEY,
      scene,
    });
    const output = `agent-runs/${runId}/audio/narration.wav`;
    const sourceOutput = `agent-runs/${runId}/audio/narration-source.wav`;
    await mkdir(path.dirname(localMediaPath(output)), { recursive: true });
    let durationMs = generated.durationMs;
    let wasRetimed = false;
    if (generated.durationMs > narrationMaximumMs) {
      const ratio = generated.durationMs / narrationTargetMs;
      await writeFile(localMediaPath(sourceOutput), generated.bytes);
      if (ratio > narrationMaximumRetimeRatio) {
        throw new Error(`Narration is ${generated.durationMs}ms and would need ${ratio.toFixed(2)}x retiming. The source audio was preserved; shorten the script before another voice call.`);
      }
      await runCommand("ffmpeg", [
        "-y",
        "-i", localMediaPath(sourceOutput),
        "-filter:a", `atempo=${ratio.toFixed(6)}`,
        localMediaPath(output),
      ]);
      durationMs = await probeDurationMs(localMediaPath(output));
      wasRetimed = true;
    } else {
      await writeFile(localMediaPath(output), generated.bytes);
    }
    attempt.status = "ready";
    attempt.output = output;
    attempt.durationMs = durationMs;
    state.status = "voice-ready";
    await saveScene(runId, {
      ...scene,
      audio: createGeneratedSceneAudio({
        storageId: `local:${output}`,
        url: output,
        mimeType: generated.mimeType,
        durationMs,
        transcript: generated.transcript,
        captions: createCaptionsForVoiceover(scene, durationMs),
        model: generated.model,
        provider: generated.provider,
      }),
    });
    console.log(`Narration is ready (${durationMs}ms${wasRetimed ? `, locally retimed from ${generated.durationMs}ms` : ""}). No video provider was called.`);
  } catch (error) {
    attempt.status = "failed";
    attempt.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await saveState(state);
  }
}

const publicRepoUrl = (url: string) => (
  url.startsWith("agent-runs/")
    ? `/format-repositories/three-d-breakdown-v1/${url}`
    : url
);

function sceneForLocalRender(scene: ThreeDBreakdownAdScene): ThreeDBreakdownAdScene {
  return {
    ...scene,
    audio: scene.audio.status === "generated"
      ? { ...scene.audio, url: publicRepoUrl(scene.audio.url || "") }
      : scene.audio,
    layout: {
      ...scene.layout,
      finalVideo: undefined,
      clipPlans: scene.layout.clipPlans?.map((clip) => ({
        ...clip,
        video: clip.video?.status === "ready"
          ? { ...clip.video, url: publicRepoUrl(clip.video.url || "") }
          : clip.video,
      })),
    },
  };
}

async function createFinalContactSheet(runId: string, input: string) {
  const relativeOutput = `agent-runs/${runId}/final-contact-sheet.jpg`;
  await runCommand("ffmpeg", [
    "-y",
    "-i", input,
    "-vf", "fps=1/3,scale=270:-1,tile=4x2:padding=8:margin=8",
    "-frames:v", "1",
    localMediaPath(relativeOutput),
  ]);
  return relativeOutput;
}

async function render() {
  const runId = requiredArgument("run");
  const state = await loadState(runId);
  let scene = await loadScene(runId);
  assertClipsReady(scene);
  assertArtifactApproved(state, scene, "clip-1");
  assertArtifactApproved(state, scene, "clip-2");
  if (scene.audio.status !== "generated" || !scene.audio.url || !existsSync(localMediaPath(scene.audio.url))) {
    throw new Error("Generate and inspect narration before final rendering.");
  }
  scene = await withoutFinalArtifacts(runId, state, scene);
  state.status = "voice-ready";
  await Promise.all([saveState(state), saveScene(runId, scene)]);
  const relativeOutput = `agent-runs/${runId}/final.mp4`;
  const output = localMediaPath(relativeOutput);
  const serveUrl = await bundle({
    entryPoint: path.join(v3Root, "remotion-entry", "index.ts"),
    publicDir: path.join(v3Root, "public"),
    outDir: path.join(v3Root, "tmp", "three-d-breakdown-remotion"),
  });
  const inputProps = { scene: sceneForLocalRender(scene) };
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
  });
  const contactSheet = await createFinalContactSheet(runId, output);
  const durationMs = await probeDurationMs(output);
  state.status = "final-ready";
  state.finalRender = {
    status: "ready",
    createdAt: new Date().toISOString(),
    output: relativeOutput,
    durationMs,
    contactSheet,
  };
  await saveScene(runId, {
    ...scene,
    layout: {
      ...scene.layout,
      finalVideo: {
        status: "ready",
        storageId: `local:${relativeOutput}`,
        url: relativeOutput,
        mimeType: "video/mp4",
        durationMs: scene.layout.durationMs,
      },
    },
  });
  await saveState(state);
  console.log(`Rendered the official ${scene.layout.durationMs / 1000}-second MP4 through AdRenderSurface. No media provider was called.`);
}

async function probeDurationMs(filePath: string) {
  const seconds = Number(await runCommand("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]));
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Could not read video duration: ${filePath}`);
  return Math.round(seconds * 1_000);
}

async function createVideoContactSheet(runId: string, clipPaths: string[]) {
  const relativeOutput = `agent-runs/${runId}/video-contact-sheet.jpg`;
  const output = localMediaPath(relativeOutput);
  await runCommand("ffmpeg", [
    "-y",
    "-i", clipPaths[0]!,
    "-i", clipPaths[1]!,
    "-filter_complex",
    "[0:v][1:v]concat=n=2:v=1:a=0,fps=1/3,scale=270:-1,tile=4x2:padding=8:margin=8",
    "-frames:v", "1",
    output,
  ]);
  return relativeOutput;
}

async function inspect() {
  const runId = requiredArgument("run");
  const scene = await loadScene(runId);
  const baseReport = inspectThreeDBreakdownRepoScene(scene, (url) => (
    /^https?:\/\//.test(url) || existsSync(localMediaPath(url))
  ));
  const state = await loadState(runId);
  const reviewAssets: ReviewAsset[] = [
    "storyboard",
    ...getThreeDBreakdownRequiredAnchorFrameIndexes(scene).map((frameIndex) => `anchor-${frameIndex}` as ReviewAsset),
    "clip-1",
    "clip-2",
  ];
  const artifactReviews = Object.fromEntries(reviewAssets.map((asset) => [
    asset,
    reviewForCurrentAttempt(state, scene, asset)?.decision || "unreviewed",
  ]));
  const allCurrentArtifactsApproved = reviewAssets.every((asset) => artifactReviews[asset] === "approved");
  let report: Record<string, unknown> = {
    ...baseReport,
    artifactReviews,
  };
  if (scene.layout.finalVideo?.status === "ready" && scene.layout.finalVideo.url) {
    const finalPath = localMediaPath(scene.layout.finalVideo.url);
    const probe = JSON.parse(await runCommand("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration:stream=codec_type,width,height",
      "-of", "json",
      finalPath,
    ])) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
    };
    const durationMs = Math.round(Number(probe.format?.duration || 0) * 1_000);
    const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");
    const audioStreamCount = probe.streams?.filter((stream) => stream.codec_type === "audio").length || 0;
    const renderRecordMatchesScene = Boolean(
      state.finalRender
      && state.finalRender.output === scene.layout.finalVideo.url
      && existsSync(finalPath),
    );
    const finalChecks = {
      finalDuration: Math.abs(durationMs - scene.layout.durationMs) <= 250,
      finalDimensions: videoStream?.width === 1080 && videoStream.height === 1920,
      exactlyOneAudioStream: audioStreamCount === 1,
      narrationFits: scene.audio.status === "generated" && scene.audio.durationMs <= scene.layout.durationMs,
      allCurrentArtifactsApproved,
      renderRecordMatchesScene,
    };
    const finalProblems = Object.entries(finalChecks)
      .filter(([, passed]) => !passed)
      .map(([name]) => `Check failed: ${name}.`);
    report = {
      ...report,
      status: finalProblems.length ? "final-invalid" : "final-ready",
      checks: { ...baseReport.checks, ...finalChecks },
      problems: [...baseReport.problems, ...finalProblems],
      finalDurationMs: durationMs,
      finalVideo: scene.layout.finalVideo.url,
      contactSheet: state.finalRender?.contactSheet,
      finalRenderCreatedAt: state.finalRender?.createdAt,
      finalRenderOutput: state.finalRender?.output,
    };
    state.status = finalProblems.length ? "voice-ready" : "final-ready";
  } else if (baseReport.status === "clips-ready") {
    const videoPaths = scene.layout.clipPlans!.map((clip) => localMediaPath(clip.video!.url!));
    const clipDurationsMs = await Promise.all(videoPaths.map(probeDurationMs));
    const durationsMatchPlan = clipDurationsMs.every((durationMs, index) => (
      Math.abs(durationMs - scene.layout.clipPlans![index]!.durationSeconds * 1_000) <= 1_000
    ));
    const contactSheet = await createVideoContactSheet(runId, videoPaths);
    report = {
      ...report,
      status: durationsMatchPlan && allCurrentArtifactsApproved ? "clips-ready" : "video-in-progress",
      checks: {
        ...baseReport.checks,
        clipDurationsMatchPlan: durationsMatchPlan,
        allCurrentArtifactsApproved,
      },
      problems: [
        ...baseReport.problems,
        ...(durationsMatchPlan ? [] : ["Check failed: clipDurationsMatchPlan."]),
        ...(allCurrentArtifactsApproved ? [] : ["Check failed: allCurrentArtifactsApproved."]),
      ],
      clipDurationsMs,
      contactSheet,
    };
    state.status = durationsMatchPlan && allCurrentArtifactsApproved ? "clips-ready" : "video-started";
  } else if (baseReport.status === "ready-for-video") {
    state.status = "ready-for-video";
  }
  await writeJson(qualityReportPath(runId), report);
  await saveState(state);
  console.log(`Inspection status: ${report.status}.`);
  const problems = report.problems as string[];
  if (problems.length) console.log(problems.map((problem) => `- ${problem}`).join("\n"));
  if (report.status === "ready-for-video") console.log("All four production endpoints are ready. Inspect all four before explicitly approving paid video.");
  if (report.status === "clips-ready") console.log("Both clips passed technical inspection. Generate narration next.");
  if (report.status === "final-ready") console.log("The final MP4 passed duration, dimensions, audio, and narration-fit checks. Review it, then finalize.");
}

async function finalize() {
  const runId = requiredArgument("run");
  if (!hasFlag("approve-final")) throw new Error("Watch the final video, then pass --approve-final.");
  const state = await loadState(runId);
  const report = await readJson<{
    status?: string;
    problems?: string[];
    finalRenderCreatedAt?: string;
    finalRenderOutput?: string;
  }>(qualityReportPath(runId));
  if (report.status !== "final-ready" || report.problems?.length) {
    throw new Error("Finalization requires a clean final-ready quality report.");
  }
  if (!state.finalRender) throw new Error("The final render record is missing.");
  if (
    report.finalRenderCreatedAt !== state.finalRender.createdAt
    || report.finalRenderOutput !== state.finalRender.output
  ) {
    throw new Error("The final quality report is stale. Inspect the current render again before finalizing.");
  }
  state.status = "finalized";
  state.finalRender = {
    ...state.finalRender,
    status: "finalized",
    finalizedAt: new Date().toISOString(),
  };
  await saveState(state);
  console.log(`Finalized ${state.finalRender.output}. Return this MP4 to the user.`);
}

async function main() {
  const command = process.argv[2];
  if (command === "check") return await check();
  if (command === "init") return await init();
  if (command === "directions") return await directions();
  if (command === "select") return await select();
  if (command === "validate") return await validate();
  if (command === "review") return await review();
  if (command === "image") return await image();
  if (command === "inspect") return await inspect();
  if (command === "video") return await video();
  if (command === "retime-clip") return await retimeClip();
  if (command === "voice") return await voice();
  if (command === "render") return await render();
  if (command === "finalize") return await finalize();
  throw new Error("Use: check | init | directions | select | validate | review | image | inspect | video | retime-clip | voice | render | finalize");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
