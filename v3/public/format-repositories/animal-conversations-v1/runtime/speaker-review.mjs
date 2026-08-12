import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { execute, hashValue, readJson, sha256, writeJson } from "./common.mjs";

const SPEAKERS = new Set(["cat", "bunny", "both", "none"]);
const EVIDENCE = new Set(["direct-audio-review", "local-audio-analysis", "user-provided-label", "reference-video", "silence"]);

export function reviewFingerprint(input) {
  return hashValue({
    audioFile: input.audioFile,
    timeline: input.timeline.map(({ start, end, camera, caption }) => ({ start, end, camera, caption })),
  });
}

export function speakerAssignmentHash(input) {
  return hashValue(input.timeline.map(({ start, end, speaker, camera, caption }) => ({ start, end, speaker, camera, caption })));
}

export function createSpeakerReviewDocument({ input, audioSha256, generatedAt = new Date().toISOString() }) {
  if (!Array.isArray(input.timeline) || input.timeline.length === 0) throw new Error("Cannot review speakers without timeline beats.");
  return {
    schemaVersion: 1,
    status: "pending",
    generatedAt,
    instructions: "Confirm every beat from direct audio, documented local audio analysis, a user-provided label, a checksum-matched documented reference video, or silence; set confirmedSpeaker and matching evidence before apply-speakers. local-audio-analysis also requires a concise evidenceNote naming the transcript/diarization basis and any creative role mapping. Disclose perception limits and never infer from caption text or camera alone.",
    audio: { file: input.audioFile, sha256: audioSha256 },
    reviewFingerprint: reviewFingerprint(input),
    beats: input.timeline.map((beat, index) => ({
      index,
      start: beat.start,
      end: beat.end,
      caption: beat.caption,
      proposedSpeaker: beat.speaker,
      confirmedSpeaker: null,
      evidence: null,
      evidenceNote: null,
      clip: `speaker-review/beat-${String(index).padStart(2, "0")}.wav`,
    })),
  };
}

export function applySpeakerReviewDocument({ input, review, audioSha256, appliedAt = new Date().toISOString() }) {
  const errors = [];
  if (review.schemaVersion !== 1) errors.push("speaker-review.json schemaVersion must be 1.");
  if (review.audio?.sha256 !== audioSha256) errors.push("speaker review is stale because the user audio changed.");
  if (review.reviewFingerprint !== reviewFingerprint(input)) errors.push("speaker review is stale because timeline timing, captions, or cameras changed.");
  if (!Array.isArray(review.beats) || review.beats.length !== input.timeline.length) errors.push("speaker review must contain one entry for every timeline beat.");

  const beats = Array.isArray(review.beats) ? review.beats : [];
  beats.forEach((entry, index) => {
    if (entry.index !== index) errors.push(`speaker review beat ${index} has the wrong index.`);
    if (!SPEAKERS.has(entry.confirmedSpeaker)) errors.push(`speaker review beat ${index} needs confirmedSpeaker=cat, bunny, both, or none.`);
    if (!EVIDENCE.has(entry.evidence)) errors.push(`speaker review beat ${index} needs explicit evidence.`);
    if (entry.evidence === "local-audio-analysis" && (typeof entry.evidenceNote !== "string" || !entry.evidenceNote.trim())) errors.push(`speaker review beat ${index} needs an evidenceNote for local audio analysis.`);
    if (entry.evidence === "silence" && entry.confirmedSpeaker !== "none") errors.push(`speaker review beat ${index} can use silence evidence only with speaker=none.`);
  });
  if (errors.length) throw new Error(`Speaker review failed:\n- ${errors.join("\n- ")}`);

  const nextInput = structuredClone(input);
  nextInput.timeline.forEach((beat, index) => {
    beat.speaker = beats[index].confirmedSpeaker;
  });
  const evidenceCounts = Object.fromEntries([...EVIDENCE].map((value) => [value, beats.filter((beat) => beat.evidence === value).length]).filter(([, count]) => count));
  const receipt = {
    schemaVersion: 1,
    status: "pass",
    method: "explicit-per-beat-speaker-confirmation",
    appliedAt,
    audioSha256,
    timelineHash: speakerAssignmentHash(nextInput),
    reviewedBeats: beats.length,
    evidenceCounts,
  };
  return { input: nextInput, receipt };
}

export async function createSpeakerReview({ runDirectory }) {
  const input = await readJson(path.join(runDirectory, "input.json"));
  const audioFile = path.resolve(runDirectory, input.audioFile || "");
  if (path.dirname(audioFile) !== path.resolve(runDirectory)) throw new Error("audioFile must name a file directly inside the run folder.");
  const audioSha256 = await sha256(audioFile);
  const review = createSpeakerReviewDocument({ input, audioSha256 });
  await rm(path.join(runDirectory, ".speaker-assignment.json"), { force: true });
  const clipsDirectory = path.join(runDirectory, "speaker-review");
  await mkdir(clipsDirectory, { recursive: true });
  for (const beat of review.beats) {
    await execute("ffmpeg", [
      "-y",
      "-i", audioFile,
      "-ss", beat.start.toFixed(6),
      "-t", (beat.end - beat.start).toFixed(6),
      "-vn",
      "-ac", "1",
      "-ar", "16000",
      "-c:a", "pcm_s16le",
      path.join(runDirectory, beat.clip),
    ], { capture: true });
  }
  await writeJson(path.join(runDirectory, "speaker-review.json"), review);
  return review;
}

export async function applySpeakerReview({ runDirectory }) {
  const inputPath = path.join(runDirectory, "input.json");
  const reviewPath = path.join(runDirectory, "speaker-review.json");
  const input = await readJson(inputPath);
  const review = await readJson(reviewPath);
  const audioFile = path.resolve(runDirectory, input.audioFile || "");
  if (path.dirname(audioFile) !== path.resolve(runDirectory)) throw new Error("audioFile must name a file directly inside the run folder.");
  const audioSha256 = await sha256(audioFile);
  const applied = applySpeakerReviewDocument({ input, review, audioSha256 });
  await writeJson(inputPath, applied.input);
  review.status = "applied";
  review.appliedAt = applied.receipt.appliedAt;
  await writeJson(reviewPath, review);
  await writeJson(path.join(runDirectory, ".speaker-assignment.json"), applied.receipt);
  return applied.receipt;
}
