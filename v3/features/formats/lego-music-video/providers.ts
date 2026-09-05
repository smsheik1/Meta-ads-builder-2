import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { JINGLE_MODEL_ID } from "../jingle/prompt";
import { BRICK_STORYBOARD_IMAGE_MODEL, BRICK_STORYBOARD_VIDEO_MODEL, BRICK_STORYBOARD_VIDEO_RESOLUTION } from "../jingle/storyboard";
import { applyMeasuredSong, asJingleScene, LEGO_ATTEMPT_LIMIT, legoMediaPrompts } from "./contract";
import { generateElevenLabsJingleMusic } from "../../audio/elevenlabsMusic";
import { fingerprint, localAsset, probe, readInput, readJson, sha256, writeJson, type LegoInput, type LegoState } from "./runtime";

export const LEGO_GENERATION_STAGES = ["song", "reference", "shot-1", "shot-2", "shot-3", "clip-1", "clip-2", "clip-3"] as const;
export type LegoGenerationStage = typeof LEGO_GENERATION_STAGES[number];
export function generationStage(value: string): LegoGenerationStage {
  if (!(LEGO_GENERATION_STAGES as readonly string[]).includes(value)) throw new Error(`Stage must be ${LEGO_GENERATION_STAGES.join(" | ")}.`);
  return value as LegoGenerationStage;
}
export function buildLegoProviderRequest(stage: LegoGenerationStage, input: LegoInput, media: { reference?: string; image?: string; logo?: string } = {}) {
  const prompts = legoMediaPrompts(input.scene, input.story);
  if (stage === "song") return { provider: "ElevenLabs", model: JINGLE_MODEL_ID, endpoint: "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", body: { composition_plan: input.scene.layout.compositionPlan, model_id: JINGLE_MODEL_ID } };
  if (!input.media.song || input.scene.audio.status !== "generated") throw new Error("Generate or import and measure the song before creating visuals.");
  const index = Number(stage.split("-")[1]) - 1;
  if (stage.startsWith("clip-")) {
    if (!media.image) throw new Error("Each animated shot requires its own full-quality production still.");
    const shot = prompts.shots[index]!;
    const duration = Math.max(5, Math.min(15, Math.ceil(shot.durationMs / 1000)));
    if (duration / (shot.durationMs / 1000) > 1.35) throw new Error("This section is too short for the provider's minimum clip length. Supply a correctly timed clip or revise the approved song plan before spending.");
    return { provider: "Replicate", model: BRICK_STORYBOARD_VIDEO_MODEL, endpoint: `https://api.replicate.com/v1/models/${BRICK_STORYBOARD_VIDEO_MODEL}/predictions`, body: { input: { image: media.image, prompt: shot.animationPrompt, duration, aspect_ratio: "9:16", resolution: BRICK_STORYBOARD_VIDEO_RESOLUTION, generate_audio: false } } };
  }
  if (stage !== "reference" && !media.reference) throw new Error("Create and inspect the world reference before production stills.");
  const references = [stage !== "reference" ? media.reference : undefined, media.logo].filter((item): item is string => Boolean(item));
  return { provider: "Replicate", model: BRICK_STORYBOARD_IMAGE_MODEL, endpoint: `https://api.replicate.com/v1/models/${BRICK_STORYBOARD_IMAGE_MODEL}/predictions`, body: { input: { prompt: stage === "reference" ? prompts.referenceFramePrompt : prompts.shots[index]!.shotPrompt, ...(references.length ? { image_input: references } : {}), aspect_ratio: "9:16", output_format: "jpg" } } };
}

async function imageData(directory: string, file: string | null) {
  if (!file) return undefined;
  const bytes = await readFile(await localAsset(directory, file));
  if (bytes.length > 10_000_000) throw new Error("Reference image exceeds 10 MB; prepare a smaller production image before submitting.");
  const extension = path.extname(file).toLowerCase();
  const mime = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : [".jpg", ".jpeg"].includes(extension) ? "image/jpeg" : null;
  if (!mime) throw new Error("Provider image inputs must be PNG, JPEG, or WebP.");
  return `data:${mime};base64,${bytes.toString("base64")}`;
}
export async function requestForRun(directory: string, stage: LegoGenerationStage) {
  const input = await readInput(directory);
  await fingerprint(directory, input);
  const index = Number(stage.split("-")[1]) - 1;
  const media = stage === "song" ? {} : {
    logo: await imageData(directory, input.scene.brand.logoUrl),
    reference: stage.startsWith("shot-") ? await imageData(directory, input.media.reference) : undefined,
    image: stage.startsWith("clip-") ? await imageData(directory, input.media.shots[index]!.image) : undefined,
  };
  const request = buildLegoProviderRequest(stage, input, media);
  return { input, request, requestHash: sha256(JSON.stringify(request)) };
}
function assigned(input: LegoInput, stage: LegoGenerationStage) {
  if (stage === "song") return input.media.song;
  if (stage === "reference") return input.media.reference;
  const shot = input.media.shots[Number(stage.split("-")[1]) - 1]!;
  return stage.startsWith("clip-") ? shot.video : shot.image;
}
export async function namedSecret(name: "ELEVENLABS_API_KEY" | "REPLICATE_API_TOKEN", secretsFile: string) {
  if (process.env[name]) return process.env[name]!;
  let contents: string;
  try { contents = await readFile(secretsFile, "utf8"); } catch { throw new Error(`${name} is missing. Supply it through the environment or ignored repo-root secrets.env; never paste it in chat.`); }
  const value = contents.split(/\r?\n/).find(line => new RegExp(`^(?:export\\s+)?${name}=`).test(line.trim()))?.trim().replace(new RegExp(`^(?:export\\s+)?${name}=`), "").replace(/^["']|["']$/g, "");
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}
type GenerationOptions = { approvedCostUsd?: number; budgetUsd?: number; imageReview?: string; secretsFile: string; fetcher?: typeof fetch };
export async function generateRunStage(directory: string, stage: LegoGenerationStage, options: GenerationOptions) {
  if (process.env.LEGO_DISABLE_PAID_CALLS === "1") throw new Error("Paid generation is disabled for this session.");
  if (!Number.isFinite(options.approvedCostUsd) || options.approvedCostUsd! <= 0 || !Number.isFinite(options.budgetUsd) || options.budgetUsd! <= 0) throw new Error("Explicit approval is required: provide the quoted per-call cost and total budget in USD. Never invent approval.");
  const { input, request, requestHash } = await requestForRun(directory, stage);
  if (assigned(input, stage)) throw new Error("This stage already has media. Preserve it; do not generate a replacement without an observed problem and renewed approval.");
  if (stage !== "song" && stage !== "reference" && (!options.imageReview || options.imageReview.trim().length < 20)) throw new Error("Inspect the exact reference/production still and supply a meaningful --image-review note before spending.");
  const state = await readJson<LegoState>(path.join(directory, "state.json"));
  if (state.fixture) throw new Error("Smoke fixtures cannot call paid providers.");
  const previous = state.paid.filter(job => job.stage === stage);
  if (previous.some(job => ["submitting", "running", "uncertain"].includes(job.status))) throw new Error("An existing request needs collection or operator recovery; no replacement request was sent.");
  if (previous.length >= LEGO_ATTEMPT_LIMIT) throw new Error("Three attempts for this stage have been used. Stop.");
  const committedEstimate = state.paid.reduce((sum, job) => sum + job.estimatedUsd, 0);
  if (committedEstimate + options.approvedCostUsd! > options.budgetUsd! + 1e-9) throw new Error("This request would exceed the approved estimated budget. Actual provider billing is not controlled by this local estimate.");
  const key = await namedSecret(stage === "song" ? "ELEVENLABS_API_KEY" : "REPLICATE_API_TOKEN", options.secretsFile);
  const job: LegoState["paid"][number] = { stage, requestHash, status: "submitting", estimatedUsd: options.approvedCostUsd!, budgetUsd: options.budgetUsd, imageReview: options.imageReview, approvedAt: new Date().toISOString() };
  state.paid.push(job);
  state.render = undefined;
  await writeJson(path.join(directory, "state.json"), state);
  const fetcher = options.fetcher || fetch;
  if (stage === "song") {
    try {
      const result = await generateElevenLabsJingleMusic({ apiKey: key, scene: asJingleScene(input.scene), fetcher: (url, init) => fetcher(url, { ...init, signal: AbortSignal.timeout(120_000) }) });
      await acceptOutput(directory, input, state, job, Buffer.from(result.bytes), result.mimeType);
      return { status: job.status, stage };
    } catch (error) {
      job.status = "uncertain";
      await writeJson(path.join(directory, "state.json"), state);
      throw new Error(`Music submission outcome needs operator review; no retry will be sent automatically. ${String(error).replaceAll(key, "[redacted]")}`);
    }
  }
  try {
    const response = await fetcher(request.endpoint, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(request.body), signal: AbortSignal.timeout(60_000) });
    const payload = await response.json();
    if (!response.ok) { job.status = "failed"; await writeJson(path.join(directory, "state.json"), state); throw new Error(`Replicate rejected request: HTTP ${response.status}.`); }
    if (typeof payload.id !== "string" || !/^[a-z0-9_-]+$/i.test(payload.id)) throw new Error("Provider response lacks a valid prediction ID.");
    job.predictionId = payload.id;
    job.status = "running";
    // Persist before any wait, polling, output download, or further paid call.
    await writeJson(path.join(directory, "state.json"), state);
    return await collectRunStage(directory, stage, { secretsFile: options.secretsFile, fetcher });
  } catch (error) {
    if (job.status === "submitting") { job.status = "uncertain"; await writeJson(path.join(directory, "state.json"), state); }
    throw error;
  }
}

async function acceptOutput(directory: string, input: LegoInput, state: LegoState, job: LegoState["paid"][number], bytes: Buffer, mimeType: string) {
  if (!bytes.length) throw new Error("Provider output is empty; existing job is preserved.");
  const stage = generationStage(job.stage);
  const extension = stage === "song" ? ".mp3" : stage.startsWith("clip-") ? ".mp4" : mimeType.includes("png") ? ".png" : mimeType.includes("webp") ? ".webp" : ".jpg";
  const file = `media/${stage}-${state.paid.indexOf(job) + 1}${extension}`;
  try { await writeFile(path.join(directory, file), bytes, { flag: "wx" }); }
  catch (error) {
    // A collection can stop after saving bytes but before its receipt. Resume
    // that same output only; never overwrite different media or resubmit.
    if ((error as NodeJS.ErrnoException).code !== "EEXIST" || sha256(await readFile(path.join(directory, file))) !== sha256(bytes)) throw error;
  }
  if (stage === "song") {
    const audio = await probe(path.join(directory, file));
    if (!audio.streams.some(s => s.codec_type === "audio")) throw new Error("Generated song has no audio stream.");
    input.media.song = file;
    input.scene = applyMeasuredSong(input.scene, Math.round(audio.duration * 1000), file);
  } else if (stage === "reference") input.media.reference = file;
  else {
    const shot = input.media.shots[Number(stage.split("-")[1]) - 1]!;
    if (stage.startsWith("clip-")) { await probe(path.join(directory, file)); shot.video = file; }
    else shot.image = file;
  }
  job.status = "succeeded";
  await writeJson(path.join(directory, "input.json"), input);
  await writeJson(path.join(directory, "state.json"), state);
}

export async function collectRunStage(directory: string, stage: LegoGenerationStage, options: Pick<GenerationOptions, "secretsFile" | "fetcher">) {
  const { input, requestHash } = await requestForRun(directory, stage);
  const state = await readJson<LegoState>(path.join(directory, "state.json"));
  const job = state.paid.findLast(item => item.stage === stage);
  if (!job?.predictionId) throw new Error("No saved Replicate prediction ID for this stage. Do not create a replacement for an uncertain submission.");
  if (job.requestHash !== requestHash) throw new Error("Inputs changed since this paid request. Recover its output separately; do not silently apply stale media.");
  if (job.status === "succeeded") return { stage, status: "succeeded", note: "Existing output reused; no request sent." };
  const key = await namedSecret("REPLICATE_API_TOKEN", options.secretsFile);
  const fetcher = options.fetcher || fetch;
  const response = await fetcher(`https://api.replicate.com/v1/predictions/${job.predictionId}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Collection failed with HTTP ${response.status}; prediction ID preserved.`);
  const payload = await response.json();
  if (["failed", "canceled"].includes(payload.status)) { job.status = "failed"; await writeJson(path.join(directory, "state.json"), state); throw new Error(`Existing prediction ${payload.status}; no retry sent.`); }
  if (payload.status !== "succeeded") return { stage, status: "running", predictionId: job.predictionId, next: "Collect this same prediction later; do not generate a replacement." };
  const url = Array.isArray(payload.output) ? payload.output[0] : payload.output;
  if (typeof url !== "string" || !url.startsWith("https://")) throw new Error("Provider output has no HTTPS media URL.");
  job.outputUrl = url;
  await writeJson(path.join(directory, "state.json"), state);
  const media = await fetcher(url, { signal: AbortSignal.timeout(60_000) });
  if (!media.ok) throw new Error("Output download failed; collect the same saved prediction again.");
  await acceptOutput(directory, input, state, job, Buffer.from(await media.arrayBuffer()), media.headers.get("content-type") || "application/octet-stream");
  return { stage, status: "succeeded", predictionId: job.predictionId };
}
