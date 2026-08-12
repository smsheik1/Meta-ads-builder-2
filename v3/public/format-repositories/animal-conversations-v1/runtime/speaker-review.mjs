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
  return hashValue(input.timeline.map(({ start, end, speaker, camera, caption, overlapEvidence }) => ({ start, end, speaker, camera, caption, overlapEvidence })));
}

export function createSpeakerReviewDocument({ input, audioSha256, generatedAt = new Date().toISOString() }) {
  if (!Array.isArray(input.timeline) || input.timeline.length === 0) throw new Error("Cannot review speakers without timeline beats.");
  return {
    schemaVersion: 1,
    status: "pending",
    generatedAt,
    instructions: "Confirm every beat from direct audio, documented local audio analysis, a user-provided label, a checksum-matched documented reference video, or silence; set confirmedSpeaker and matching evidence before apply-speakers. For local-audio-analysis, define each stable detected voice ID once in voiceCharacterMap, list that beat's detectedVoices, and add an evidenceNote naming the transcript/diarization basis. Never recast a voice at a caption or dialogue-turn boundary. speaker=both means proven simultaneous speech: set overlapConfirmed=true and document mapped cat and bunny voices in evidenceNote. Never use both for uncertainty or alternating voices; split alternating turns into contiguous beats. Disclose perception limits and never infer a speaker from caption text or camera alone.",
    audio: { file: input.audioFile, sha256: audioSha256 },
    reviewFingerprint: reviewFingerprint(input),
    voiceCharacterMap: {},
    beats: input.timeline.map((beat, index) => ({
      index,
      start: beat.start,
      end: beat.end,
      caption: beat.caption,
      proposedSpeaker: beat.speaker,
      confirmedSpeaker: null,
      evidence: null,
      evidenceNote: null,
      detectedVoices: [],
      overlapConfirmed: null,
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

  const voiceCharacterMap = review.voiceCharacterMap && typeof review.voiceCharacterMap === "object" && !Array.isArray(review.voiceCharacterMap)
    ? review.voiceCharacterMap
    : {};
  Object.entries(voiceCharacterMap).forEach(([voice, character]) => {
    if (!voice.trim() || !["cat", "bunny"].includes(character)) errors.push("voiceCharacterMap must map non-empty detected voice IDs to cat or bunny.");
  });

  const beats = Array.isArray(review.beats) ? review.beats : [];
  beats.forEach((entry, index) => {
    if (entry.index !== index) errors.push(`speaker review beat ${index} has the wrong index.`);
    if (!SPEAKERS.has(entry.confirmedSpeaker)) errors.push(`speaker review beat ${index} needs confirmedSpeaker=cat, bunny, both, or none.`);
    if (!EVIDENCE.has(entry.evidence)) errors.push(`speaker review beat ${index} needs explicit evidence.`);
    if (entry.evidence === "local-audio-analysis" && (typeof entry.evidenceNote !== "string" || !entry.evidenceNote.trim())) errors.push(`speaker review beat ${index} needs an evidenceNote for local audio analysis.`);
    if (entry.evidence === "local-audio-analysis") {
      const detectedVoices = Array.isArray(entry.detectedVoices)
        ? [...new Set(entry.detectedVoices.filter((voice) => typeof voice === "string" && voice.trim()).map((voice) => voice.trim()))]
        : [];
      if (!detectedVoices.length) errors.push(`speaker review beat ${index} needs detectedVoices for local audio analysis.`);
      const mappedCharacters = detectedVoices.map((voice) => voiceCharacterMap[voice]);
      if (mappedCharacters.some((character) => !character)) errors.push(`speaker review beat ${index} uses a detected voice missing from voiceCharacterMap.`);
      if (["cat", "bunny"].includes(entry.confirmedSpeaker) && (detectedVoices.length !== 1 || mappedCharacters[0] !== entry.confirmedSpeaker)) {
        errors.push(`speaker review beat ${index} must keep its detected voice on the same confirmed character.`);
      }
      if (entry.confirmedSpeaker === "both" && (!mappedCharacters.includes("cat") || !mappedCharacters.includes("bunny"))) {
        errors.push(`speaker review beat ${index} needs mapped cat and bunny voices for confirmed overlap.`);
      }
    }
    if (entry.evidence !== "local-audio-analysis" && Array.isArray(entry.detectedVoices) && entry.detectedVoices.length) errors.push(`speaker review beat ${index} may set detectedVoices only for local audio analysis.`);
    if (entry.evidence === "silence" && entry.confirmedSpeaker !== "none") errors.push(`speaker review beat ${index} can use silence evidence only with speaker=none.`);
    if (entry.confirmedSpeaker === "both" && entry.overlapConfirmed !== true) errors.push(`speaker review beat ${index} needs overlapConfirmed=true because speaker=both means simultaneous speech, never uncertainty.`);
    if (entry.confirmedSpeaker === "both" && (typeof entry.evidenceNote !== "string" || !entry.evidenceNote.trim())) errors.push(`speaker review beat ${index} needs an evidenceNote documenting the confirmed overlapping speech.`);
    if (entry.confirmedSpeaker !== "both" && entry.overlapConfirmed === true) errors.push(`speaker review beat ${index} may confirm overlap only when confirmedSpeaker=both.`);
  });
  if (errors.length) throw new Error(`Speaker review failed:\n- ${errors.join("\n- ")}`);

  const nextInput = structuredClone(input);
  nextInput.timeline.forEach((beat, index) => {
    beat.speaker = beats[index].confirmedSpeaker;
    if (beat.speaker === "both") beat.overlapEvidence = beats[index].evidenceNote.trim();
    else delete beat.overlapEvidence;
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
    voiceCharacterMap,
    voiceBoundBeats: beats.filter((beat) => beat.evidence === "local-audio-analysis").length,
    confirmedOverlapBeats: beats.filter((beat) => beat.confirmedSpeaker === "both" && beat.overlapConfirmed === true).length,
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
