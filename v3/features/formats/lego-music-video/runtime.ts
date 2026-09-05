import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { copyFile, cp, mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LegoMusicVideoAdScene } from "../../scene/types";
import { buildJingleStitchFilter } from "../jingle/stitch";
import { applyMeasuredSong, asLegoScene, assertLegoScene, createLegoDraft, LEGO_ATTEMPT_LIMIT, LEGO_MUSIC_VIDEO_VERSION, legoMediaPrompts, parseLegoStory } from "./contract";

export type LegoInput = {
  version: 1;
  scene: LegoMusicVideoAdScene;
  story: unknown;
  media: { song: string | null; reference: string | null; shots: Array<{ image: string | null; video: string | null }> };
};
export type LegoState = {
  version: string;
  fixture: boolean;
  renderAttempts: number;
  paid: Array<{ stage: string; requestHash: string; status: "submitting" | "running" | "succeeded" | "failed" | "uncertain"; predictionId?: string; outputUrl?: string; estimatedUsd: number; budgetUsd?: number; imageReview?: string; approvedAt?: string }>;
  render?: { inputHash: string; output: string; sha256: string; durationMs: number; attempt: number };
};
export const sha256 = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
export const LEGO_TECHNICAL_CHECKS = ["currentOutputHash", "portrait1080", "h264", "audioPresent", "durationMatchesSong", "audioNotEntirelySilent", "noLongFullFrameFreeze", "decodesCompletely"] as const;
export function technicalChecksPassed(checks: Record<string, unknown>) {
  return Boolean(checks) && LEGO_TECHNICAL_CHECKS.every(key => checks[key] === true);
}
export const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8"));
export async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  await rename(temporary, file);
}
export function runPath(root: string, id: string) {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) throw new Error("Run ID must be 1–80 lowercase letters, digits, or hyphens.");
  return path.join(root, "agent-runs", id);
}
export async function localAsset(directory: string, relative: string) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative) || relative.includes("\\") || relative.split("/").some(part => part === ".." || part === ".") || relative.includes(":")) throw new Error(`Use a local relative media path: ${String(relative)}`);
  const root = await realpath(directory);
  const resolved = await realpath(path.join(root, relative));
  if (!resolved.startsWith(`${root}${path.sep}`) || !(await stat(resolved)).isFile()) throw new Error("Media must be a file inside this input/run directory, not a symlink outside it.");
  return resolved;
}
export function command(binary: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", chunk => { out += chunk; });
    child.stderr.on("data", chunk => { err = (err + chunk).slice(-40_000); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(out || err) : reject(new Error(`${binary} exited ${code}: ${err}`)));
  });
}
export async function probe(file: string) {
  const result = JSON.parse(await command("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", file]));
  const duration = Number(result.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Media has no measurable duration.");
  return { duration, streams: result.streams as Array<{ codec_type: string; codec_name: string; width?: number; height?: number }> };
}
export async function initRun(directory: string, brief: string) {
  await mkdir(directory, { recursive: false });
  await mkdir(path.join(directory, "media"));
  await writeJson(path.join(directory, "input.json"), { version: 1, scene: createLegoDraft(brief), story: { recurringHeroObject: "", shots: [] }, media: { song: null, reference: null, shots: Array.from({ length: 3 }, () => ({ image: null, video: null })) } });
  await writeJson(path.join(directory, "state.json"), { version: LEGO_MUSIC_VIDEO_VERSION, fixture: false, renderAttempts: 0, paid: [] });
}
export async function readInput(directory: string) {
  const input = await readJson<LegoInput>(path.join(directory, "input.json"));
  if (input.version !== 1 || !input.media || !Array.isArray(input.media.shots) || input.media.shots.length !== 3) throw new Error("Input version 1 needs three media shot slots.");
  assertLegoScene(input.scene);
  parseLegoStory(input.scene, input.story);
  return input;
}
export async function fingerprint(directory: string, input: LegoInput) {
  const assets = [input.media.song, input.media.reference, ...input.media.shots.flatMap(shot => [shot.image, shot.video]), input.scene.brand.logoUrl];
  const inventory = [];
  for (const asset of assets.filter((item): item is string => Boolean(item))) {
    inventory.push({ path: asset, sha256: sha256(await readFile(await localAsset(directory, asset))) });
  }
  return { hash: sha256(JSON.stringify({ input, inventory })), inventory };
}

export async function importRun(directory: string, inputFile: string, fixture = false) {
  const sourceRoot = path.dirname(path.resolve(inputFile));
  const source = await readJson<LegoInput>(inputFile);
  if (source.version !== 1 || !source.media || source.media.shots?.length !== 3 || !["jingle", "lego-music-video"].includes(source.scene?.format)) throw new Error("Expected a portable Lego input with three source shots.");
  const input = structuredClone(source);
  input.scene = asLegoScene(input.scene);
  input.scene.layout.musicVideo = undefined;
  // Historical song/clip timing is re-measured after copying, never trusted.
  input.scene.audio = { status: "none", transcript: "", captions: [] };
  assertLegoScene(input.scene);
  parseLegoStory(input.scene, input.story);
  const copies: Array<{ source: string; destination: string }> = [];
  async function prepare(asset: string | null, name: string) {
    if (!asset) return null;
    const src = await localAsset(sourceRoot, asset);
    const extension = path.extname(src).toLowerCase();
    if (![".mp3", ".wav", ".m4a", ".mp4", ".mov", ".webm", ".png", ".jpg", ".jpeg", ".webp"].includes(extension)) throw new Error("Unsupported local media type.");
    const destination = `media/${name}${extension}`;
    copies.push({ source: src, destination });
    return destination;
  }
  input.media.song = await prepare(source.media.song, "song");
  input.media.reference = await prepare(source.media.reference, "reference");
  input.scene.brand.logoUrl = await prepare(source.scene.brand.logoUrl, "brand-logo");
  input.scene.brand.faviconUrl = null;
  input.scene.brand.ogImageUrl = null;
  input.scene.brand.screenshotUrl = null;
  for (const [index, shot] of input.media.shots.entries()) {
    shot.image = await prepare(shot.image, `shot-${index + 1}`);
    shot.video = await prepare(shot.video, `clip-${index + 1}`);
  }
  await mkdir(directory, { recursive: false });
  await mkdir(path.join(directory, "media"));
  for (const item of copies) await copyFile(item.source, path.join(directory, item.destination));
  if (input.media.song) {
    const songProbe = await probe(await localAsset(directory, input.media.song));
    if (!songProbe.streams.some(stream => stream.codec_type === "audio")) throw new Error("Song has no audio stream.");
    input.scene = applyMeasuredSong(input.scene, Math.round(songProbe.duration * 1000), input.media.song);
  }
  await writeJson(path.join(directory, "input.json"), input);
  await writeJson(path.join(directory, "state.json"), { version: LEGO_MUSIC_VIDEO_VERSION, fixture, renderAttempts: 0, paid: [] });
  await writeJson(path.join(directory, "import.json"), { sourceInputSha256: sha256(await readFile(inputFile)), assets: (await fingerprint(directory, input)).inventory });
}

export async function validateRun(directory: string, ready = false) {
  const input = await readInput(directory);
  const fingerprinted = await fingerprint(directory, input);
  if (ready && (!input.media.song || !input.media.reference || input.media.shots.some(shot => !shot.image || !shot.video))) throw new Error("Import or generate the song, reference, three stills, and three clips first.");
  return { input, ...fingerprinted, prompts: legoMediaPrompts(input.scene, input.story) };
}

export async function renderRun(v3Root: string, directory: string) {
  const { input, hash, inventory, prompts } = await validateRun(directory, true);
  const state = await readJson<LegoState>(path.join(directory, "state.json"));
  if (state.renderAttempts >= LEGO_ATTEMPT_LIMIT) throw new Error("Three render attempts used. Stop and explain the observed blocker.");
  const audio = await probe(await localAsset(directory, input.media.song!));
  if (Math.abs(audio.duration * 1000 - input.scene.layout.musicLengthMs) > 1) throw new Error("Song changed. Import it again so timings are re-measured.");
  const sourceFiles = await Promise.all(input.media.shots.map(shot => localAsset(directory, shot.video!)));
  const sourceProbes = await Promise.all(sourceFiles.map(probe));
  if (sourceProbes.some(p => !p.streams.some(s => s.codec_type === "video" && (s.width || 0) >= 256 && (s.height || 0) >= 256))) throw new Error("A source clip is missing usable video.");
  const filter = buildJingleStitchFilter(prompts.shots, sourceProbes.map(p => p.duration));
  // Check the browser before consuming a render attempt. Sandbox or first-run
  // setup failures are not failed creative renders.
  const browserExecutable = process.env.LEGO_BROWSER_EXECUTABLE || undefined;
  const { openBrowser, getCompositions, renderMedia } = await import("@remotion/renderer");
  const browser = await openBrowser("chrome", { browserExecutable });
  await browser.close({ silent: true });
  const attempt = state.renderAttempts + 1;
  const attemptDir = path.join(directory, `render-${attempt}`);
  await mkdir(attemptDir);
  state.renderAttempts = attempt;
  state.render = undefined;
  await writeJson(path.join(directory, "state.json"), state);
  const publicDir = path.join(attemptDir, "public");
  await mkdir(path.join(publicDir, "lego"), { recursive: true });
  const stitched = path.join(publicDir, "lego", "stitched.mp4");
  await command("ffmpeg", ["-v", "error", "-n", ...sourceFiles.flatMap(file => ["-i", file]), "-filter_complex", filter, "-map", "[outv]", "-an", "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", stitched]);
  const stitchedProbe = await probe(stitched);
  if (Math.abs(stitchedProbe.duration - audio.duration) > 0.1) throw new Error("Prepared video does not cover the measured song.");
  const songName = `song${path.extname(input.media.song!)}`;
  await copyFile(await localAsset(directory, input.media.song!), path.join(publicDir, "lego", songName));
  await cp(path.join(v3Root, "public/fonts"), path.join(publicDir, "fonts"), { recursive: true });
  const scene: LegoMusicVideoAdScene = {
    ...input.scene,
    audio: input.scene.audio.status === "generated" ? { ...input.scene.audio, url: `/lego/${songName}` } : input.scene.audio,
    layout: { ...input.scene.layout, musicVideo: { sourceStoryboardId: `local:${hash}`, clips: prompts.shots.map((shot, index) => ({ shotIndex: index, startMs: shot.startMs, endMs: shot.endMs, storageId: `local:${input.media.shots[index]!.video}`, url: input.media.shots[index]!.video })), stitchedVideo: { storageId: `local:${hash}`, url: "/lego/stitched.mp4", durationMs: input.scene.layout.musicLengthMs, mimeType: "video/mp4", builtAt: 0 }, builtAt: 0 } },
  };
  if (input.scene.brand.logoUrl) {
    const logoName = `logo${path.extname(input.scene.brand.logoUrl)}`;
    await copyFile(await localAsset(directory, input.scene.brand.logoUrl), path.join(publicDir, "lego", logoName));
    scene.brand = { ...scene.brand, logoUrl: `/lego/${logoName}` };
  }
  const { bundle } = await import("@remotion/bundler");
  const { adSceneCompositionId, getAdSceneDurationInFrames } = await import("../../../remotion-entry/Root");
  const serveUrl = await bundle({ entryPoint: path.join(v3Root, "remotion-entry/index.ts"), publicDir, outDir: path.join(attemptDir, "bundle") });
  const inputProps = { scene };
  const composition = (await getCompositions(serveUrl, { inputProps, browserExecutable })).find(c => c.id === adSceneCompositionId);
  if (!composition) throw new Error("The official AdScene composition is missing.");
  const output = path.join(attemptDir, "final.mp4");
  await renderMedia({ serveUrl, composition: { ...composition, fps: 30, durationInFrames: getAdSceneDurationInFrames(scene, 30) }, inputProps, outputLocation: output, codec: "h264", crf: 20, concurrency: 2, browserExecutable });
  const finalProbe = await probe(output);
  const render = { inputHash: hash, output: path.relative(directory, output), sha256: sha256(await readFile(output)), durationMs: Math.round(finalProbe.duration * 1000), attempt };
  state.render = render;
  await writeJson(path.join(directory, "state.json"), state);
  await writeJson(path.join(attemptDir, "scene.json"), scene);
  await writeJson(path.join(attemptDir, "evidence.json"), { version: LEGO_MUSIC_VIDEO_VERSION, inputHash: hash, inventory, sourceDurationsSeconds: sourceProbes.map(p => p.duration), retiming: sourceProbes.map((p, i) => p.duration / (prompts.shots[i]!.durationMs / 1000)), renderer: "remotion-entry/RemotionAdScene.tsx", component: "JingleFormatRenderer", paidGenerationCalls: 0 });
  return render;
}

export async function inspectRun(directory: string) {
  const { input, hash } = await validateRun(directory, true);
  const state = await readJson<LegoState>(path.join(directory, "state.json"));
  if (!state.render || state.render.inputHash !== hash) throw new Error("No render for the current inputs; render before inspecting.");
  const output = await localAsset(directory, state.render.output);
  const outputHash = sha256(await readFile(output));
  const media = await probe(output);
  const video = media.streams.find(s => s.codec_type === "video");
  await command("ffmpeg", ["-v", "error", "-i", output, "-f", "null", "-"]);
  const volume = await command("ffmpeg", ["-hide_banner", "-i", output, "-vn", "-af", "volumedetect", "-f", "null", "-"]);
  const motion = await command("ffmpeg", ["-hide_banner", "-i", output, "-an", "-vf", "freezedetect=n=-50dB:d=2.5", "-f", "null", "-"]);
  const checks = {
    currentOutputHash: outputHash === state.render.sha256,
    portrait1080: video?.width === 1080 && video?.height === 1920,
    h264: video?.codec_name === "h264",
    audioPresent: media.streams.some(s => s.codec_type === "audio"),
    durationMatchesSong: Math.abs(media.duration * 1000 - input.scene.layout.musicLengthMs) <= 100,
    audioNotEntirelySilent: /mean_volume:\s*(-?[\d.]+) dB/.test(volume),
    noLongFullFrameFreeze: !motion.includes("freeze_start"),
    decodesCompletely: true,
  };
  const sheet = path.join(path.dirname(output), "contact-sheet.jpg");
  await command("ffmpeg", ["-v", "error", "-y", "-i", output, "-vf", `fps=6/${media.duration},scale=270:-1,tile=3x2`, "-frames:v", "1", sheet]);
  const report = { version: LEGO_MUSIC_VIDEO_VERSION, inputHash: hash, renderSha256: outputHash, checks, technicalPassed: Object.values(checks).every(Boolean), creativeReview: "unreviewed", perception: { video: "sampled frames only until directly reviewed", audio: "technical evidence only until directly heard" }, source: state.fixture ? "synthetic smoke; not a creative proof" : "local run", contactSheet: path.relative(directory, sheet) };
  await writeJson(path.join(directory, "quality.json"), report);
  return report;
}

export async function finalizeRun(directory: string, reviewFile: string) {
  const { hash } = await validateRun(directory, true);
  const state = await readJson<LegoState>(path.join(directory, "state.json"));
  if (state.fixture) throw new Error("Synthetic smoke cannot be finalized as a real creative proof.");
  const quality = await readJson<{ version: string; inputHash: string; renderSha256: string; technicalPassed: boolean; checks: Record<string, boolean> }>(path.join(directory, "quality.json"));
  if (state.version !== LEGO_MUSIC_VIDEO_VERSION || quality.version !== LEGO_MUSIC_VIDEO_VERSION || !state.render || quality.inputHash !== hash || state.render.inputHash !== hash || !quality.technicalPassed || !technicalChecksPassed(quality.checks)) throw new Error("Current technical inspection must pass before finalization.");
  const actual = sha256(await readFile(await localAsset(directory, state.render.output)));
  if (actual !== state.render.sha256 || actual !== quality.renderSha256) throw new Error("The inspected output has changed.");
  const review = await readJson<{ renderSha256: string; videoPerception: string; audioPerception: string; verdict: string; notes: string }>(reviewFile);
  if (review.renderSha256 !== actual || review.videoPerception !== "direct" || review.audioPerception !== "direct" || review.verdict !== "pass" || typeof review.notes !== "string" || review.notes.trim().length < 20) throw new Error("Require an honest direct audiovisual review of this exact render. Captions, waveforms, and screenshots cannot stand in for hearing or moving-video review.");
  const final = { version: LEGO_MUSIC_VIDEO_VERSION, inputHash: hash, output: state.render.output, sha256: actual, review, technicalChecks: quality.checks };
  await writeJson(path.join(directory, "final.json"), final);
  return final;
}
