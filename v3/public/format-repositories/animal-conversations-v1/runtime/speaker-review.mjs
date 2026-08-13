import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execute, hashValue, readJson, sha256, writeJson } from "./common.mjs";

const SPEAKERS = new Set(["cat", "bunny", "both", "none"]);
const EVIDENCE = new Set(["direct-audio-review", "local-audio-analysis", "user-provided-label", "reference-video", "silence"]);
const APPROVAL_BASES = new Set(["user-confirmed-complete-script", "checksum-matched-approved-reference", "packaged-smoke-fixture"]);

export function reviewFingerprint(input) {
  return hashValue({
    audioFile: input.audioFile,
    timeline: input.timeline.map(({ start, end, camera, caption, captionSpeaker, vocalization }) => ({ start, end, camera, caption, captionSpeaker, vocalization })),
  });
}

export function scriptApprovalHash(input) {
  return hashValue(input.timeline.map(({ start, end, speaker, camera, caption, captionSpeaker, vocalization, overlapEvidence }) => ({ start, end, speaker, camera, caption, captionSpeaker, vocalization, overlapEvidence })));
}

const CHARACTER_LABELS = { cat: "Dog", bunny: "Bunny", both: "Dog + Bunny", none: "Silence" };

function timestamp(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds - minutes * 60).toFixed(3).padStart(6, "0");
  return `${String(minutes).padStart(2, "0")}:${remainder}`;
}

function tableCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll(/\s+/g, " ").trim() || "—";
}

export function timedRoleSheetMarkdown({ input, review }) {
  const approved = review.status === "applied" && review.approval?.approved === true;
  const rows = input.timeline.map((beat, index) => {
    const reviewedBeat = review.beats?.[index] || {};
    const speaker = reviewedBeat.confirmedSpeaker || reviewedBeat.proposedSpeaker || beat.speaker;
    const captionOwner = beat.caption?.trim()
      ? speaker === "both"
        ? CHARACTER_LABELS[beat.captionSpeaker] || "MISSING — BLOCKED"
        : CHARACTER_LABELS[speaker]
      : "—";
    const performance = beat.caption?.trim()
      ? `“${beat.caption.trim()}”`
      : beat.vocalization?.trim()
        ? `[${beat.vocalization.trim()}]`
        : "[silence]";
    const overlap = speaker === "both"
      ? reviewedBeat.overlapConfirmed === true
        ? `CONFIRMED — ${reviewedBeat.evidenceNote}`
        : `PENDING — ${beat.overlapEvidence || "simultaneous speech must be verified"}`
      : "—";
    return `| ${index + 1} | ${timestamp(beat.start)}–${timestamp(beat.end)} | ${tableCell(CHARACTER_LABELS[speaker])} | ${tableCell(captionOwner)} | ${tableCell(performance)} | ${tableCell(overlap)} | \`${tableCell(reviewedBeat.clip || `script-review/beat-${String(index).padStart(2, "0")}.wav`)}\` |`;
  });
  return `# Timed role sheet\n\nStatus: **${approved ? "APPROVED" : "PENDING — DO NOT RENDER"}**  \nAudio: \`${tableCell(review.audio?.file || input.audioFile)}\`  \nAudio SHA-256: \`${tableCell(review.audio?.sha256 || "pending")}\`\n\nThe blue dog uses runtime ID \`cat\`. \`both\` means confirmed simultaneous performance, never uncertainty. On those rows, **Caption owner** identifies whose words appear while both mouths may animate.\n\n| # | Exact time | Active performance | Caption owner | Words / vocalization | Overlap evidence | Review clip |\n|---:|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
}

export function reviewedScriptHash(input, review) {
  const nextInput = structuredClone(input);
  nextInput.timeline.forEach((beat, index) => {
    const reviewedBeat = review.beats?.[index];
    beat.speaker = reviewedBeat?.confirmedSpeaker;
    if (beat.speaker === "both" && typeof reviewedBeat?.evidenceNote === "string") beat.overlapEvidence = reviewedBeat.evidenceNote.trim();
    else delete beat.overlapEvidence;
  });
  return scriptApprovalHash(nextInput);
}

export function createScriptReviewDocument({ input, audioSha256, generatedAt = new Date().toISOString() }) {
  if (!Array.isArray(input.timeline) || input.timeline.length === 0) throw new Error("Cannot review a script without timeline beats.");
  return {
    schemaVersion: 1,
    status: "pending",
    generatedAt,
    instructions: "Review timed-role-sheet.md before approve-script. It must show every exact time range, Dog/Bunny assignment, spoken line, named nonverbal vocalization, silence, caption owner, and overlap in one place. Confirm every beat from direct audio, documented local audio analysis, a user-provided label, a checksum-matched documented reference video, or silence. Automated transcription and diarization may draft words, timings, and anonymous voice clusters, but they never approve character roles. For local-audio-analysis, define each stable detected voice ID once in voiceCharacterMap, list that beat's detectedVoices, and add an evidenceNote naming the basis. speaker=both means proven simultaneous speech only and a captioned overlap requires captionSpeaker. After the user sees and approves the entire timed role sheet, complete approval with its basis, approver, and note. Any later audio, timing, words, caption owner, vocalization, camera, or role change invalidates approval.",
    audio: { file: input.audioFile, sha256: audioSha256 },
    reviewFingerprint: reviewFingerprint(input),
    approval: {
      approved: false,
      basis: null,
      approvedBy: null,
      approvalNote: null,
      scriptHash: null,
    },
    voiceCharacterMap: {},
    beats: input.timeline.map((beat, index) => ({
      index,
      start: beat.start,
      end: beat.end,
      caption: beat.caption,
      captionSpeaker: beat.captionSpeaker || null,
      vocalization: beat.vocalization || null,
      proposedSpeaker: beat.speaker,
      confirmedSpeaker: null,
      evidence: null,
      evidenceNote: null,
      detectedVoices: [],
      overlapConfirmed: null,
      clip: `script-review/beat-${String(index).padStart(2, "0")}.wav`,
    })),
  };
}

export function approveScriptReviewDocument({ input, review, audioSha256, appliedAt = new Date().toISOString() }) {
  const errors = [];
  if (review.schemaVersion !== 1) errors.push("script-review.json schemaVersion must be 1.");
  if (review.audio?.sha256 !== audioSha256) errors.push("script review is stale because the user audio changed.");
  if (review.reviewFingerprint !== reviewFingerprint(input)) errors.push("script review is stale because timeline timing, words, caption ownership, vocalizations, or cameras changed.");
  if (!Array.isArray(review.beats) || review.beats.length !== input.timeline.length) errors.push("script review must contain one entry for every timeline beat.");
  if (review.approval?.approved !== true) errors.push("the complete written role script must be explicitly approved before rendering.");
  if (!APPROVAL_BASES.has(review.approval?.basis)) errors.push("script approval needs basis=user-confirmed-complete-script, checksum-matched-approved-reference, or packaged-smoke-fixture.");
  if (typeof review.approval?.approvedBy !== "string" || !review.approval.approvedBy.trim()) errors.push("script approval needs approvedBy.");
  if (typeof review.approval?.approvalNote !== "string" || !review.approval.approvalNote.trim()) errors.push("script approval needs an approvalNote documenting the complete-script confirmation.");
  if (typeof review.approval?.scriptHash !== "string" || !review.approval.scriptHash.trim()) errors.push("script approval needs the exact reviewed scriptHash shown to the approver.");

  const voiceCharacterMap = review.voiceCharacterMap && typeof review.voiceCharacterMap === "object" && !Array.isArray(review.voiceCharacterMap)
    ? review.voiceCharacterMap
    : {};
  Object.entries(voiceCharacterMap).forEach(([voice, character]) => {
    if (!voice.trim() || !["cat", "bunny"].includes(character)) errors.push("voiceCharacterMap must map non-empty detected voice IDs to cat or bunny.");
  });

  const beats = Array.isArray(review.beats) ? review.beats : [];
  beats.forEach((entry, index) => {
    const inputBeat = input.timeline[index];
    if (entry.index !== index) errors.push(`script review beat ${index} has the wrong index.`);
    if (inputBeat && (entry.start !== inputBeat.start || entry.end !== inputBeat.end || entry.caption !== inputBeat.caption || (entry.captionSpeaker || null) !== (inputBeat.captionSpeaker || null) || (entry.vocalization || null) !== (inputBeat.vocalization || null))) {
      errors.push(`script review beat ${index} no longer matches the current timing, words, caption owner, or vocalization.`);
    }
    if (!SPEAKERS.has(entry.confirmedSpeaker)) errors.push(`script review beat ${index} needs confirmedSpeaker=cat, bunny, both, or none.`);
    if (!EVIDENCE.has(entry.evidence)) errors.push(`script review beat ${index} needs explicit evidence.`);
    if (entry.evidence === "local-audio-analysis" && (typeof entry.evidenceNote !== "string" || !entry.evidenceNote.trim())) errors.push(`script review beat ${index} needs an evidenceNote for local audio analysis.`);
    if (entry.evidence === "local-audio-analysis") {
      const detectedVoices = Array.isArray(entry.detectedVoices)
        ? [...new Set(entry.detectedVoices.filter((voice) => typeof voice === "string" && voice.trim()).map((voice) => voice.trim()))]
        : [];
      if (!detectedVoices.length) errors.push(`script review beat ${index} needs detectedVoices for local audio analysis.`);
      const mappedCharacters = detectedVoices.map((voice) => voiceCharacterMap[voice]);
      if (mappedCharacters.some((character) => !character)) errors.push(`script review beat ${index} uses a detected voice missing from voiceCharacterMap.`);
      if (["cat", "bunny"].includes(entry.confirmedSpeaker) && (detectedVoices.length !== 1 || mappedCharacters[0] !== entry.confirmedSpeaker)) {
        errors.push(`script review beat ${index} must keep its detected voice on the same confirmed character.`);
      }
      if (entry.confirmedSpeaker === "both" && (!mappedCharacters.includes("cat") || !mappedCharacters.includes("bunny"))) {
        errors.push(`script review beat ${index} needs mapped cat and bunny voices for confirmed overlap.`);
      }
    }
    if (entry.evidence !== "local-audio-analysis" && Array.isArray(entry.detectedVoices) && entry.detectedVoices.length) errors.push(`script review beat ${index} may set detectedVoices only for local audio analysis.`);
    if (entry.evidence === "silence" && entry.confirmedSpeaker !== "none") errors.push(`script review beat ${index} can use silence evidence only with speaker=none.`);
    if (entry.confirmedSpeaker === "both" && entry.overlapConfirmed !== true) errors.push(`script review beat ${index} needs overlapConfirmed=true because speaker=both means simultaneous speech, never uncertainty.`);
    if (entry.confirmedSpeaker === "both" && (typeof entry.evidenceNote !== "string" || !entry.evidenceNote.trim())) errors.push(`script review beat ${index} needs an evidenceNote documenting the confirmed overlapping speech.`);
    if (entry.confirmedSpeaker !== "both" && entry.overlapConfirmed === true) errors.push(`script review beat ${index} may confirm overlap only when confirmedSpeaker=both.`);
  });
  if (typeof review.approval?.scriptHash === "string" && review.approval.scriptHash !== reviewedScriptHash(input, review)) {
    errors.push("script approval is stale because the approved timings, words, caption ownership, vocalizations, cameras, or roles changed.");
  }
  if (errors.length) throw new Error(`Script approval failed:\n- ${errors.join("\n- ")}`);

  const nextInput = structuredClone(input);
  nextInput.timeline.forEach((beat, index) => {
    beat.speaker = beats[index].confirmedSpeaker;
    if (beat.speaker === "both") beat.overlapEvidence = beats[index].evidenceNote.trim();
    else delete beat.overlapEvidence;
  });
  const evidenceCounts = Object.fromEntries([...EVIDENCE].map((value) => [value, beats.filter((beat) => beat.evidence === value).length]).filter(([, count]) => count));
  const timedRoleSheet = timedRoleSheetMarkdown({
    input: nextInput,
    review: { ...review, status: "applied", appliedAt },
  });
  const receipt = {
    schemaVersion: 1,
    status: "pass",
    method: "explicit-complete-script-approval",
    appliedAt,
    audioSha256,
    scriptHash: scriptApprovalHash(nextInput),
    timedRoleSheetHash: hashValue(timedRoleSheet),
    approval: {
      basis: review.approval.basis,
      approvedBy: review.approval.approvedBy.trim(),
      approvalNote: review.approval.approvalNote.trim(),
      scriptHash: review.approval.scriptHash,
    },
    reviewedBeats: beats.length,
    spokenBeats: nextInput.timeline.filter((beat) => beat.caption.trim()).length,
    nonverbalBeats: nextInput.timeline.filter((beat) => typeof beat.vocalization === "string" && beat.vocalization.trim()).length,
    silentBeats: nextInput.timeline.filter((beat) => beat.speaker === "none").length,
    evidenceCounts,
    voiceCharacterMap,
    voiceBoundBeats: beats.filter((beat) => beat.evidence === "local-audio-analysis").length,
    confirmedOverlapBeats: beats.filter((beat) => beat.confirmedSpeaker === "both" && beat.overlapConfirmed === true).length,
  };
  return { input: nextInput, receipt, timedRoleSheet };
}

export async function createScriptReview({ runDirectory }) {
  const input = await readJson(path.join(runDirectory, "input.json"));
  const audioFile = path.resolve(runDirectory, input.audioFile || "");
  if (path.dirname(audioFile) !== path.resolve(runDirectory)) throw new Error("audioFile must name a file directly inside the run folder.");
  const audioSha256 = await sha256(audioFile);
  const review = createScriptReviewDocument({ input, audioSha256 });
  await rm(path.join(runDirectory, ".script-approval.json"), { force: true });
  const clipsDirectory = path.join(runDirectory, "script-review");
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
  await writeJson(path.join(runDirectory, "script-review.json"), review);
  await writeFile(path.join(runDirectory, "timed-role-sheet.md"), timedRoleSheetMarkdown({ input, review }), "utf8");
  return review;
}

export async function approveScriptReview({ runDirectory }) {
  const inputPath = path.join(runDirectory, "input.json");
  const reviewPath = path.join(runDirectory, "script-review.json");
  const input = await readJson(inputPath);
  const review = await readJson(reviewPath);
  const audioFile = path.resolve(runDirectory, input.audioFile || "");
  if (path.dirname(audioFile) !== path.resolve(runDirectory)) throw new Error("audioFile must name a file directly inside the run folder.");
  const audioSha256 = await sha256(audioFile);
  const applied = approveScriptReviewDocument({ input, review, audioSha256 });
  await writeJson(inputPath, applied.input);
  review.status = "applied";
  review.appliedAt = applied.receipt.appliedAt;
  await writeJson(reviewPath, review);
  await writeFile(path.join(runDirectory, "timed-role-sheet.md"), applied.timedRoleSheet, "utf8");
  await writeJson(path.join(runDirectory, ".script-approval.json"), applied.receipt);
  return applied.receipt;
}
