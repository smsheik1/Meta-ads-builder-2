import { readFile } from "node:fs/promises";
import path from "node:path";
import { audioDuration, exists, hashValue, probe, readJson, sha256, writeJson } from "./common.mjs";
import { reviewMediaErrors, scriptApprovalHash, scriptReviewId } from "./speaker-review.mjs";
import { approvedRevisionId, canonicalHash } from "./identity.mjs";

export const CAMERAS = new Set(["two-shot", "cat-close", "bunny-close"]);
export const SPEAKERS = new Set(["cat", "bunny", "both", "none"]);
const BEAT_FIELDS = new Set(["start", "end", "speaker", "camera", "caption", "captionSpeaker", "vocalization", "overlapEvidence", "bounceAt"]);

export function validateTimeline(timeline, durationSeconds) {
  const errors = [];
  if (!Array.isArray(timeline) || timeline.length === 0) return ["timeline must contain at least one beat."];
  let cursor = 0;
  timeline.forEach((beat, index) => {
    const label = `timeline[${index}]`;
    Object.keys(beat).forEach((field) => {
      if (!BEAT_FIELDS.has(field)) errors.push(`${label} has unknown field: ${field}.`);
    });
    if (!Number.isFinite(beat.start) || !Number.isFinite(beat.end) || beat.end <= beat.start) {
      errors.push(`${label} must have numeric start/end values with end > start.`);
      return;
    }
    if (Math.abs(beat.start - cursor) > 0.02) errors.push(`${label} must begin at ${cursor.toFixed(3)} to keep captions and animation continuous.`);
    if (!SPEAKERS.has(beat.speaker)) errors.push(`${label}.speaker must be cat, bunny, both, or none.`);
    if (beat.speaker === "both" && (typeof beat.overlapEvidence !== "string" || !beat.overlapEvidence.trim())) {
      errors.push(`${label}.overlapEvidence is required when speaker=both; uncertainty must be split, resolved to one speaker, or left unfinalized.`);
    }
    if (beat.speaker !== "both" && beat.overlapEvidence !== undefined) {
      errors.push(`${label}.overlapEvidence is permitted only when speaker=both.`);
    }
    if (!CAMERAS.has(beat.camera)) errors.push(`${label}.camera must be two-shot, cat-close, or bunny-close.`);
    if (typeof beat.caption !== "string" || beat.caption.length > 180) errors.push(`${label}.caption must be a string of at most 180 characters.`);
    if (beat.vocalization !== undefined && (typeof beat.vocalization !== "string" || !beat.vocalization.trim() || beat.vocalization.length > 120)) {
      errors.push(`${label}.vocalization must be a non-empty string of at most 120 characters when present.`);
    }
    const hasCaption = typeof beat.caption === "string" && Boolean(beat.caption.trim());
    const hasVocalization = typeof beat.vocalization === "string" && Boolean(beat.vocalization.trim());
    if (beat.speaker === "both" && hasCaption && !["cat", "bunny", "both"].includes(beat.captionSpeaker)) {
      errors.push(`${label}.captionSpeaker must be cat, bunny, or both on a captioned speaker=both beat.`);
    }
    if ((beat.speaker !== "both" || !hasCaption) && beat.captionSpeaker !== undefined) {
      errors.push(`${label}.captionSpeaker is permitted only on a captioned speaker=both beat.`);
    }
    if (beat.speaker === "none" && (hasCaption || hasVocalization)) errors.push(`${label} with speaker=none cannot contain spoken text or a vocalization.`);
    if (beat.speaker !== "none" && hasCaption === hasVocalization) {
      errors.push(`${label} with an active speaker must contain exactly one of caption or vocalization; split words and nonverbal performance into separate contiguous beats.`);
    }
    if (beat.bounceAt !== undefined) {
      if (!Array.isArray(beat.bounceAt) || beat.bounceAt.length > 2) {
        errors.push(`${label}.bounceAt must contain at most two cue offsets.`);
      } else {
        if (beat.speaker === "none" && beat.bounceAt.length) errors.push(`${label}.bounceAt requires an active speaker.`);
        beat.bounceAt.forEach((cue, cueIndex) => {
          if (!Number.isFinite(cue) || cue < 0 || cue >= beat.end - beat.start) {
            errors.push(`${label}.bounceAt[${cueIndex}] must fall inside the beat.`);
          }
          if (cueIndex > 0 && cue <= beat.bounceAt[cueIndex - 1]) {
            errors.push(`${label}.bounceAt cues must be strictly increasing.`);
          }
        });
      }
    }
    cursor = beat.end;
  });
  if (Number.isFinite(durationSeconds) && Math.abs(cursor - durationSeconds) > 0.08) {
    errors.push(`timeline must end at the audio duration (${durationSeconds.toFixed(3)} sec); it ends at ${cursor.toFixed(3)} sec.`);
  }
  return errors;
}

export function validateEpisodeInput({ input, assets, durationSeconds }) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return ["Episode input must be an object."];
  const allowedFields = new Set(["schemaVersion", "title", "episodeLabel", "audioFile", "background", "timeline"]);
  Object.keys(input).forEach((field) => {
    if (!allowedFields.has(field)) errors.push(`Unknown input field: ${field}`);
  });
  if (input.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 80) errors.push("title must be 1-80 characters.");
  if (typeof input.episodeLabel !== "string" || !input.episodeLabel.trim() || input.episodeLabel.length > 64) errors.push("episodeLabel must be 1-64 characters.");

  const background = assets.backgrounds.find((entry) => entry.id === input.background);
  if (!background) errors.push(`Unknown packaged background: ${input.background}`);
  if (typeof input.audioFile !== "string" || !input.audioFile || path.basename(input.audioFile) !== input.audioFile || input.audioFile.includes("\\")) errors.push("audioFile must name a file directly inside the run folder.");
  errors.push(...validateTimeline(input.timeline, durationSeconds));
  return errors;
}

export async function validateRun({ root, runDirectory, writeReceipt = true, requireApproval = true }) {
  const inputPath = path.join(runDirectory, "input.json");
  if (!(await exists(inputPath))) throw new Error(`Missing run input: ${inputPath}`);
  const input = await readJson(inputPath);
  const assets = await readJson(path.join(root, "assets.json"));
  const errors = [];
  const background = assets.backgrounds.find((entry) => entry.id === input.background);
  const audioFile = path.resolve(runDirectory, input.audioFile || "");
  if (path.dirname(audioFile) !== path.resolve(runDirectory)) errors.push("audioFile must name a file directly inside the run folder.");
  if (!input.audioFile || !(await exists(audioFile))) errors.push(`User audio is missing: ${input.audioFile || "(unset)"}`);

  let durationSeconds = 0;
  let audioProbe = null;
  let audioSha256 = null;
  if (await exists(audioFile)) {
    audioProbe = await probe(audioFile);
    durationSeconds = audioDuration(audioProbe);
    audioSha256 = await sha256(audioFile);
    if (!audioProbe.streams.some((stream) => stream.codec_type === "audio")) errors.push("The supplied file has no audio stream.");
    if (!(durationSeconds > 0)) errors.push("The supplied audio duration could not be measured.");
  }
  errors.push(...validateEpisodeInput({ input, assets, durationSeconds }));

  const scriptApprovalPath = path.join(runDirectory, ".script-approval.json");
  const timedRoleSheetPath = path.join(runDirectory, "timed-role-sheet.md");
  let scriptApproval = null;
  if (requireApproval && !(await exists(scriptApprovalPath))) {
    errors.push("The complete role script is unapproved. Complete script-review.json and run approve-script before validation.");
  } else if (requireApproval) {
    scriptApproval = await readJson(scriptApprovalPath);
    if (scriptApproval.schemaVersion !== 2) errors.push("Legacy approval receipt: use upgrade-run to preserve the old run and obtain fresh expanded approval.");
    if (scriptApproval.status !== "pass") errors.push("Script approval receipt must pass.");
    if (scriptApproval.audioSha256 !== audioSha256) errors.push("Script approval is stale because the user audio changed.");
    if (scriptApproval.scriptHash !== scriptApprovalHash(input)) errors.push("Script approval is stale because the timing, words, caption ownership, vocalizations, cameras, or roles changed.");
    if (scriptApproval.revisionId !== approvedRevisionId(input, audioSha256)) errors.push("Script approval is stale because approved content or audio changed.");
    const reviewPath = path.join(runDirectory, "script-review.json");
    if (!(await exists(reviewPath))) errors.push("The expanded script review is missing.");
    else {
      const review = await readJson(reviewPath);
      if (review.schemaVersion !== 2 || review.status !== "applied" || review.reviewId !== scriptApproval.reviewId || scriptReviewId(input, review, audioSha256) !== scriptApproval.reviewId) errors.push("Script approval is stale because the displayed review or its evidence changed.");
      errors.push(...await reviewMediaErrors({ runDirectory, review, beatCount: input.timeline.length }));
    }
    if (!(await exists(timedRoleSheetPath))) errors.push("The approved timed-role-sheet.md is missing.");
    else if (scriptApproval.timedRoleSheetHash !== hashValue(await readFile(timedRoleSheetPath, "utf8"))) errors.push("The timed role sheet is stale because it changed after approval.");
    if (scriptApproval.reviewedBeats !== input.timeline.length) errors.push("Script approval must cover every timeline beat.");
    if (scriptApproval.nonverbalBeats !== input.timeline.filter((beat) => typeof beat.vocalization === "string" && beat.vocalization.trim()).length) {
      errors.push("Script approval must account for every nonverbal vocalization beat.");
    }
    if (scriptApproval.confirmedOverlapBeats !== input.timeline.filter((beat) => beat.speaker === "both").length) {
      errors.push("Every speaker=both beat must have explicit confirmed overlapping-speech evidence.");
    }
  }

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

  let receipt = {
    schemaVersion: 2,
    status: "pass",
    validatedAt: new Date().toISOString(),
    input: "input.json",
    audio: {
      file: input.audioFile,
      sha256: audioSha256,
      durationSeconds,
      codec: audioProbe.streams.find((stream) => stream.codec_type === "audio")?.codec_name,
    },
    background: background.id,
    timelineBeats: input.timeline.length,
    camerasUsed: [...new Set(input.timeline.map((beat) => beat.camera))],
    scriptApproval: scriptApproval && {
      scope: scriptApproval.scope,
      revisionId: scriptApproval.revisionId,
      reviewId: scriptApproval.reviewId,
      method: scriptApproval.method,
      approval: scriptApproval.approval,
      reviewedBeats: scriptApproval.reviewedBeats,
      spokenBeats: scriptApproval.spokenBeats,
      nonverbalBeats: scriptApproval.nonverbalBeats,
      silentBeats: scriptApproval.silentBeats,
      evidenceCounts: scriptApproval.evidenceCounts,
      voiceCharacterMap: scriptApproval.voiceCharacterMap,
      voiceBoundBeats: scriptApproval.voiceBoundBeats,
      diarizedBeats: scriptApproval.diarizedBeats,
      confirmedOverlapBeats: scriptApproval.confirmedOverlapBeats,
    },
    verifiedAssets,
  };
  if (writeReceipt) {
    const file = path.join(runDirectory, ".validation.json");
    const previous = await exists(file) ? await readJson(file) : null;
    if (previous) {
      const { validatedAt: previousTime, ...previousContent } = previous;
      const { validatedAt: currentTime, ...currentContent } = receipt;
      if (canonicalHash(previousContent) === canonicalHash(currentContent)) receipt = previous;
    }
    await writeJson(file, receipt);
  }
  return { input, audioFile, durationSeconds, assets, background, receipt };
}
