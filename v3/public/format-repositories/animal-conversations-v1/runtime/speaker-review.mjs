import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execute, exists, hashValue, readJson, sha256, writeJson } from "./common.mjs";
import { canonicalHash, semanticContent, approvedRevisionId } from "./identity.mjs";
import { reviewPageHtml } from "./review-page.mjs";

const SPEAKERS = new Set(["cat", "bunny", "both", "none"]);
const EVIDENCE = new Set(["direct-audio-review", "local-audio-analysis", "user-provided-label", "reference-video", "silence"]);
const APPROVAL_BASES = new Set(["user-confirmed-complete-script", "checksum-matched-approved-reference", "packaged-smoke-fixture"]);

export function reviewFingerprint(input) {
  return canonicalHash(semanticContent(input));
}

export function scriptApprovalHash(input) {
  return canonicalHash(semanticContent(input));
}

function reviewedInput(input, review, pendingFallback = false) {
  const nextInput = structuredClone(input);
  nextInput.timeline.forEach((beat, index) => {
    const entry = review.beats?.[index];
    beat.speaker = entry?.confirmedSpeaker || (pendingFallback ? beat.speaker : null);
    if (beat.speaker === "both" && entry?.evidenceNote?.trim()) beat.overlapEvidence = entry.evidenceNote.trim();
    else if (beat.speaker !== "both") delete beat.overlapEvidence;
  });
  return nextInput;
}

export function scriptReviewId(input, review, audioSha256) {
  return canonicalHash({
    revisionId: approvedRevisionId(reviewedInput(input, review, true), audioSha256),
    voiceCharacterMap: review.voiceCharacterMap || {},
    diarization: review.diarization || null,
    beats: review.beats.map(({ index, confirmedSpeaker, evidence, evidenceNote, detectedVoices, overlapConfirmed, transcriptionEvidence, timingEvidence, uncertainty }) => ({ index, confirmedSpeaker, evidence, evidenceNote, detectedVoices, overlapConfirmed, transcriptionEvidence, timingEvidence, uncertainty })),
  });
}

export async function reviewMediaErrors({ runDirectory, review, beatCount }) {
  const expected = new Set(["script-review/source.wav", ...Array.from({ length: beatCount }, (_, index) => `script-review/beat-${String(index).padStart(2, "0")}.wav`)]);
  if (!Array.isArray(review.media) || review.media.length !== expected.size) return ["The complete review soundtrack and exact clips must be generated before proceeding."];
  const errors = [];
  for (const media of review.media) {
    if (!expected.delete(media.path)) {
      errors.push("Review media contains a duplicate, missing, or unexpected path. Regenerate review-script.");
      continue;
    }
    const file = path.join(runDirectory, media.path);
    if (!(await exists(file)) || await sha256(file) !== media.sha256) errors.push(`Review audio is missing or modified: ${media.path}. Regenerate review-script before proceeding.`);
  }
  if (expected.size) errors.push("One or more exact review clips are missing from the media manifest.");
  return errors;
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
  return `# Timed role sheet\n\nStatus: **${approved ? "APPROVED" : "PENDING — DO NOT RENDER"}**  \nTitle: ${tableCell(input.title)}  \nEpisode label: ${tableCell(input.episodeLabel)}  \nBackground: ${tableCell(input.background)}  \nReview ID: \`${tableCell(review.reviewId)}\`  \nAudio: \`${tableCell(review.audio?.file || input.audioFile)}\`  \nAudio SHA-256: \`${tableCell(review.audio?.sha256 || "pending")}\`\n\nOpen script-review.html to hear exact WAV clips and review every camera, emphasis cue, evidence basis, and uncertainty. Schema 1 retains a 20 ms boundary tolerance; new drafts should share exact boundaries.\n\nThe blue dog uses runtime ID \`cat\`. \`both\` means confirmed simultaneous performance, never uncertainty. On those rows, **Caption owner** identifies whose words appear while both mouths may animate.\n\n| # | Exact time | Active performance | Caption owner | Words / vocalization | Overlap evidence | Review clip |\n|---:|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
}

export function reviewedScriptHash(input, review) {
  return scriptApprovalHash(reviewedInput(input, review));
}

export function createScriptReviewDocument({ input, audioSha256, generatedAt = new Date().toISOString() }) {
  if (!Array.isArray(input.timeline) || input.timeline.length === 0) throw new Error("Cannot review a script without timeline beats.");
  const review = {
    schemaVersion: 2,
    status: "pending",
    generatedAt,
    instructions: "Review script-review.html and timed-role-sheet.md before approve-script. They show every exact time range, Dog/Bunny assignment, spoken line, named nonverbal vocalization, silence, caption owner, and overlap in one place. Confirm every beat from direct audio, documented local audio analysis, a user-provided label, a checksum-matched documented reference video, or silence. Automated transcription and diarization may draft words, timings, and anonymous voice clusters, but they never approve character roles. Only when genuine diarization supplies distinct voices, define each stable detected voice ID once in voiceCharacterMap and list detectedVoices. Record transcription, timing, casting, diarization and uncertainty separately. speaker=both means proven simultaneous speech only and a captioned overlap requires captionSpeaker. After the user sees and approves the entire timed role sheet and playable page, call approve-script with the displayed review-id, approved-by and note; the runtime computes hashes. Audio or any approved creative choice changing invalidates approval.",
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
    diarization: { performed: false, basis: null },
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
      transcriptionEvidence: null,
      timingEvidence: null,
      uncertainty: null,
      clip: `script-review/beat-${String(index).padStart(2, "0")}.wav`,
    })),
  };
  review.reviewId = scriptReviewId(input, review, audioSha256);
  return review;
}

export function approveScriptReviewDocument({ input, review, audioSha256, appliedAt = new Date().toISOString() }) {
  const errors = [];
  if (review.schemaVersion !== 2) errors.push("Legacy script review: use upgrade-run to obtain a new expanded review and explicit approval.");
  if (review.audio?.sha256 !== audioSha256) errors.push("script review is stale because the user audio changed.");
  if (review.reviewFingerprint !== reviewFingerprint(input)) errors.push("script review is stale because timeline timing, words, caption ownership, vocalizations, or cameras changed, or another creative choice changed.");
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
    if (entry.evidence === "local-audio-analysis" && (review.diarization?.performed === true || entry.detectedVoices?.length)) {
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

  const nextInput = reviewedInput(input, review);
  const evidenceCounts = Object.fromEntries([...EVIDENCE].map((value) => [value, beats.filter((beat) => beat.evidence === value).length]).filter(([, count]) => count));
  const timedRoleSheet = timedRoleSheetMarkdown({
    input: nextInput,
    review: { ...review, status: "applied", appliedAt },
  });
  const receipt = {
    schemaVersion: 2,
    status: "pass",
    method: "explicit-complete-script-approval",
    appliedAt,
    audioSha256,
    revisionId: approvedRevisionId(nextInput, audioSha256),
    reviewId: scriptReviewId(input, review, audioSha256),
    scope: review.approval.basis === "packaged-smoke-fixture" ? "fixture" : "episode",
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
    voiceBoundBeats: beats.filter((beat) => beat.evidence === "local-audio-analysis" && beat.detectedVoices?.length).length,
    diarizedBeats: beats.filter((beat) => beat.evidence === "local-audio-analysis" && (review.diarization?.performed === true || beat.detectedVoices?.length)).length,
    confirmedOverlapBeats: beats.filter((beat) => beat.confirmedSpeaker === "both" && beat.overlapConfirmed === true).length,
  };
  return { input: nextInput, receipt, timedRoleSheet };
}

export async function createScriptReview({ runDirectory }) {
  const input = await readJson(path.join(runDirectory, "input.json"));
  const audioFile = path.resolve(runDirectory, input.audioFile || "");
  if (path.dirname(audioFile) !== path.resolve(runDirectory)) throw new Error("audioFile must name a file directly inside the run folder.");
  const audioSha256 = await sha256(audioFile);
  const reviewPath = path.join(runDirectory, "script-review.json");
  const previous = await exists(reviewPath) ? await readJson(reviewPath) : null;
  if (previous && previous.schemaVersion !== 2) throw new Error("Legacy script review: use upgrade-run to preserve the old run and obtain fresh expanded approval.");
  const unchanged = previous?.audio?.sha256 === audioSha256 && previous.reviewFingerprint === reviewFingerprint(input);
  if (previous && !unchanged && (await exists(path.join(runDirectory, ".script-approval.json")) || await exists(path.join(runDirectory, "render-report.json")))) {
    throw new Error("This progressed run changed. Import the candidate with review-script --new-revision so previous outputs and receipts are preserved.");
  }
  const review = unchanged ? previous : createScriptReviewDocument({ input, audioSha256 });
  const nextId = scriptReviewId(input, review, audioSha256);
  if (review.reviewId !== nextId) {
    review.status = "pending";
    review.approval = { approved: false, basis: null, approvedBy: null, approvalNote: null, scriptHash: null };
  }
  review.reviewId = nextId;
  const clipsDirectory = path.join(runDirectory, "script-review");
  await mkdir(clipsDirectory, { recursive: true });
  const media = [{ clip: "script-review/source.wav" }, ...review.beats.map((beat, index) => ({ start: beat.start, end: beat.end, clip: `script-review/beat-${String(index).padStart(2, "0")}.wav` }))];
  for (const beat of media) {
    const file = path.join(runDirectory, beat.clip);
    const expected = review.media?.find((entry) => entry.path === beat.clip);
    if (unchanged && expected && await exists(file) && await sha256(file) === expected.sha256) continue;
    await execute("ffmpeg", [
      "-y",
      "-i", audioFile,
      ...(beat.start === undefined ? [] : ["-ss", beat.start.toFixed(6), "-t", (beat.end - beat.start).toFixed(6)]),
      "-vn",
      "-c:a", "pcm_s24le",
      file,
    ], { capture: true });
  }
  review.media = await Promise.all(media.map(async ({ clip }) => ({ path: clip, sha256: await sha256(path.join(runDirectory, clip)) })));
  await writeJson(path.join(runDirectory, "script-review.json"), review);
  await writeFile(path.join(runDirectory, "timed-role-sheet.md"), timedRoleSheetMarkdown({ input, review }), "utf8");
  await writeFile(path.join(runDirectory, "script-review.html"), reviewPageHtml({ input: reviewedInput(input, review, true), review }), "utf8");
  return review;
}

export async function approveScriptReview({ root, runDirectory, reviewId, approvedBy, note, fixtureProof }) {
  const inputPath = path.join(runDirectory, "input.json");
  const reviewPath = path.join(runDirectory, "script-review.json");
  const input = await readJson(inputPath);
  const review = await readJson(reviewPath);
  const audioFile = path.resolve(runDirectory, input.audioFile || "");
  if (path.dirname(audioFile) !== path.resolve(runDirectory)) throw new Error("audioFile must name a file directly inside the run folder.");
  const audioSha256 = await sha256(audioFile);
  if (review.schemaVersion !== 2) throw new Error("Legacy script review: use upgrade-run and obtain fresh expanded approval.");
  if (fixtureProof === "smoke") {
    const fixture = await readJson(path.join(root, "fixtures/smoke/input.json"));
    const state = await exists(path.join(runDirectory, "state.json")) ? await readJson(path.join(runDirectory, "state.json")) : {};
    if (canonicalHash(semanticContent(input)) !== canonicalHash(semanticContent(fixture)) || state.kind !== "mechanics-smoke" || state.sourceAudioSha256 !== audioSha256) {
      throw new Error("Fixture approval is restricted to the exact packaged smoke input and its generated mechanics audio.");
    }
    reviewId = review.reviewId;
    approvedBy = "packaged smoke fixture";
    note = "Fixed synthetic mechanics proof only; this is not user approval or perceptual review of an episode.";
  }
  if (typeof reviewId !== "string" || !reviewId || typeof approvedBy !== "string" || !approvedBy.trim() || typeof note !== "string" || !note.trim()) {
    throw new Error("Explicit user approval required: provide --review-id=<displayed-id> --approved-by=<name> --note=<chat-confirmation> after showing script-review.html.");
  }
  if (reviewId !== review.reviewId || reviewId !== scriptReviewId(input, review, audioSha256)) {
    throw new Error("The displayed review ID is stale. Regenerate review-script, show the updated playable review, and obtain explicit approval again.");
  }
  if (!(await exists(path.join(runDirectory, "script-review.html")))) throw new Error("The playable review is missing. Generate and show it before approval.");
  const mediaErrors = await reviewMediaErrors({ runDirectory, review, beatCount: input.timeline.length });
  if (mediaErrors.length) throw new Error(mediaErrors.join("\n"));
  review.approval = {
    approved: true,
    basis: fixtureProof === "smoke" ? "packaged-smoke-fixture" : "user-confirmed-complete-script",
    approvedBy: approvedBy.trim(), approvalNote: note.trim(), scriptHash: reviewedScriptHash(input, review),
  };
  const applied = approveScriptReviewDocument({ input, review, audioSha256 });
  const { validateEpisodeInput } = await import("./validate.mjs");
  const { probe, audioDuration } = await import("./common.mjs");
  const assets = await readJson(path.join(root, "assets.json"));
  const errors = validateEpisodeInput({ input: applied.input, assets, durationSeconds: audioDuration(await probe(audioFile)) });
  if (errors.length) throw new Error(`Approved input is invalid:\n- ${errors.join("\n- ")}`);
  await writeJson(inputPath, applied.input);
  review.status = "applied";
  review.appliedAt = applied.receipt.appliedAt;
  review.reviewFingerprint = reviewFingerprint(applied.input);
  review.reviewId = applied.receipt.reviewId;
  await writeJson(reviewPath, review);
  await writeFile(path.join(runDirectory, "timed-role-sheet.md"), applied.timedRoleSheet, "utf8");
  await writeFile(path.join(runDirectory, "script-review.html"), reviewPageHtml({ input: applied.input, review }), "utf8");
  await writeJson(path.join(runDirectory, ".script-approval.json"), applied.receipt);
  return applied.receipt;
}
