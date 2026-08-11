import path from "node:path";
import { audioDuration, exists, probe, readJson, sha256, writeJson } from "./common.mjs";

export const CAMERAS = new Set(["two-shot", "cat-close", "bunny-close"]);
export const SPEAKERS = new Set(["cat", "bunny", "both", "none"]);

export function validateTimeline(timeline, durationSeconds) {
  const errors = [];
  if (!Array.isArray(timeline) || timeline.length === 0) return ["timeline must contain at least one beat."];
  let cursor = 0;
  timeline.forEach((beat, index) => {
    const label = `timeline[${index}]`;
    if (!Number.isFinite(beat.start) || !Number.isFinite(beat.end) || beat.end <= beat.start) {
      errors.push(`${label} must have numeric start/end values with end > start.`);
      return;
    }
    if (Math.abs(beat.start - cursor) > 0.02) errors.push(`${label} must begin at ${cursor.toFixed(3)} to keep captions and animation continuous.`);
    if (!SPEAKERS.has(beat.speaker)) errors.push(`${label}.speaker must be cat, bunny, both, or none.`);
    if (!CAMERAS.has(beat.camera)) errors.push(`${label}.camera must be two-shot, cat-close, or bunny-close.`);
    if (typeof beat.caption !== "string" || beat.caption.length > 180) errors.push(`${label}.caption must be a string of at most 180 characters.`);
    if (beat.speaker !== "none" && !beat.caption.trim()) errors.push(`${label}.caption is required for spoken beats.`);
    cursor = beat.end;
  });
  if (Number.isFinite(durationSeconds) && Math.abs(cursor - durationSeconds) > 0.08) {
    errors.push(`timeline must end at the audio duration (${durationSeconds.toFixed(3)} sec); it ends at ${cursor.toFixed(3)} sec.`);
  }
  return errors;
}

export async function validateRun({ root, runDirectory }) {
  const inputPath = path.join(runDirectory, "input.json");
  if (!(await exists(inputPath))) throw new Error(`Missing run input: ${inputPath}`);
  const input = await readJson(inputPath);
  const assets = await readJson(path.join(root, "assets.json"));
  const errors = [];
  const allowedFields = new Set(["schemaVersion", "title", "episodeLabel", "audioFile", "background", "timeline"]);
  Object.keys(input).forEach((field) => {
    if (!allowedFields.has(field)) errors.push(`Unknown input field: ${field}`);
  });
  if (input.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 80) errors.push("title must be 1-80 characters.");
  if (typeof input.episodeLabel !== "string" || !input.episodeLabel.trim() || input.episodeLabel.length > 64) errors.push("episodeLabel must be 1-64 characters.");

  const background = assets.backgrounds.find((entry) => entry.id === input.background);
  if (!background) errors.push(`Unknown packaged background: ${input.background}`);
  const audioFile = path.resolve(runDirectory, input.audioFile || "");
  if (path.dirname(audioFile) !== path.resolve(runDirectory)) errors.push("audioFile must name a file directly inside the run folder.");
  if (!input.audioFile || !(await exists(audioFile))) errors.push(`User audio is missing: ${input.audioFile || "(unset)"}`);

  let durationSeconds = 0;
  let audioProbe = null;
  if (await exists(audioFile)) {
    audioProbe = await probe(audioFile);
    durationSeconds = audioDuration(audioProbe);
    if (!audioProbe.streams.some((stream) => stream.codec_type === "audio")) errors.push("The supplied file has no audio stream.");
    if (!(durationSeconds > 0)) errors.push("The supplied audio duration could not be measured.");
  }
  errors.push(...validateTimeline(input.timeline, durationSeconds));

  const verifiedAssets = [];
  for (const entry of [...assets.backgrounds, ...assets.characters.flatMap((character) => character.poses)]) {
    const file = path.join(root, entry.path);
    if (!(await exists(file))) {
      errors.push(`Packaged asset is missing: ${entry.path}`);
      continue;
    }
    const actual = await sha256(file);
    if (actual !== entry.sha256) errors.push(`Packaged asset checksum mismatch: ${entry.path}`);
    verifiedAssets.push({ path: entry.path, sha256: actual });
  }
  if (errors.length) throw new Error(`Validation failed:\n- ${errors.join("\n- ")}`);

  const receipt = {
    schemaVersion: 1,
    status: "pass",
    validatedAt: new Date().toISOString(),
    input: "input.json",
    audio: {
      file: input.audioFile,
      sha256: await sha256(audioFile),
      durationSeconds,
      codec: audioProbe.streams.find((stream) => stream.codec_type === "audio")?.codec_name,
    },
    background: background.id,
    timelineBeats: input.timeline.length,
    camerasUsed: [...new Set(input.timeline.map((beat) => beat.camera))],
    verifiedAssets,
  };
  await writeJson(path.join(runDirectory, ".validation.json"), receipt);
  return { input, audioFile, durationSeconds, assets, background, receipt };
}
