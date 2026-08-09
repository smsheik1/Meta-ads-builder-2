import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function round(value) {
  return Number(value.toFixed(2));
}

function requireString(value, label, errors) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${label} is required.`);
}

function validateEvidence(evidence, criterionId, durationSeconds, minimum, errors) {
  if (!Array.isArray(evidence) || evidence.length < minimum) {
    errors.push(`${criterionId} needs at least ${minimum} time-coded evidence item.`);
    return;
  }
  for (const [index, item] of evidence.entries()) {
    const prefix = `${criterionId} evidence ${index + 1}`;
    if (!Number.isFinite(item?.startSeconds) || item.startSeconds < 0 || item.startSeconds > durationSeconds) {
      errors.push(`${prefix} has an invalid startSeconds.`);
    }
    if (!Number.isFinite(item?.endSeconds) || item.endSeconds < item.startSeconds || item.endSeconds > durationSeconds) {
      errors.push(`${prefix} has an invalid endSeconds.`);
    }
    requireString(item?.observation, `${prefix} observation`, errors);
  }
}

export async function writeReviewPacket({
  runDirectory,
  runId,
  videoPath,
  input,
  contract,
  formatVersion,
}) {
  const videoSha256 = hashBytes(await readFile(videoPath));
  const createdAt = new Date().toISOString();
  const packetCore = {
    schemaVersion: 1,
    packetHashAlgorithm: "sha256-json-v1",
    createdAt,
    format: "bikini-bottom-dance-off-v1",
    formatVersion,
    rubricVersion: contract.rubricVersion,
    runId,
    video: {
      path: path.basename(videoPath),
      sha256: videoSha256,
      durationSeconds: contract.automatic.durationSeconds,
    },
    intent: {
      target: "One replayable 9:16 Instagram Reel",
      sequence: "countdown, opening, four taunt-and-dance rounds, group finale, closing chorus, replay bridge",
      songTitle: input.songTitle,
      castOrder: input.characters.map((character) => character.characterId),
      openingLine: input.openingLine,
      taunts: input.characters.slice(1).map(({ characterId, taunt }) => ({ characterId, text: taunt })),
      closingLine: input.closingLine,
    },
    procedure: contract.blindReview.watchPasses,
    rubric: {
      ratingScale: contract.grading.ratingScale.map(({ rating, label, anchor }) => ({ rating, label, anchor })),
      criteria: contract.grading.blindCriteria,
    },
    instructions: contract.blindReview.promptFile,
    submissionTemplate: "blind-review.template.json",
  };
  const packetId = hashBytes(Buffer.from(JSON.stringify(packetCore)));
  const packet = { ...packetCore, packetId };
  const template = {
    schemaVersion: 1,
    packetId,
    videoSha256,
    reviewedAt: "REPLACE_WITH_ISO_TIMESTAMP",
    reviewer: { kind: "agent", id: "REPLACE_WITH_OPAQUE_REVIEWER_ID" },
    playback: {
      completedPasses: 2,
      videoPerceptible: true,
      audioPerceptible: true,
      environment: "REPLACE_WITH_PLAYER_OR_REVIEW_ENVIRONMENT",
      deviations: [],
    },
    firstPass: {
      verdict: "ready | needs-work | not-assessable",
      replayFeelsNatural: false,
      observation: "REPLACE_WITH_FIRST_IMPRESSION",
    },
    criteria: contract.grading.blindCriteria.map((criterion) => ({
      id: criterion.id,
      status: "scored",
      rating: null,
      confidence: "high | medium | low",
      evidence: [{ startSeconds: null, endSeconds: null, observation: "REPLACE_WITH_OBSERVATION" }],
      rationale: "REPLACE_WITH_RATIONALE",
    })),
    criticalFailures: [],
  };
  await writeFile(path.join(runDirectory, contract.blindReview.reviewPacketFile), `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(path.join(runDirectory, "blind-review.template.json"), `${JSON.stringify(template, null, 2)}\n`);
  return packet;
}

export function validateBlindReview({ submission, packet, contract }) {
  const errors = [];
  const { packetId: declaredPacketId, ...packetCore } = packet;
  if (packet.packetHashAlgorithm !== "sha256-json-v1") errors.push("review packet uses an unsupported hash algorithm.");
  const computedPacketId = hashBytes(Buffer.from(JSON.stringify(packetCore)));
  if (declaredPacketId !== computedPacketId) errors.push("review packet contents do not match its packetId.");
  if (packet.rubricVersion !== contract.rubricVersion) {
    errors.push(`review packet rubricVersion ${packet.rubricVersion} does not match current ${contract.rubricVersion}.`);
  }
  if (submission?.schemaVersion !== 1) errors.push("blind review schemaVersion must be 1.");
  if (submission?.packetId !== packet.packetId) errors.push("blind review packetId does not match this run.");
  if (submission?.videoSha256 !== packet.video.sha256) errors.push("blind review videoSha256 does not match the inspected MP4.");
  if (!Number.isFinite(Date.parse(submission?.reviewedAt))) errors.push("blind review reviewedAt must be an ISO timestamp.");
  else if (Date.parse(submission.reviewedAt) < Date.parse(packet.createdAt)) errors.push("blind review predates its review packet.");
  if (!["agent", "human"].includes(submission?.reviewer?.kind)) errors.push("reviewer.kind must be agent or human.");
  requireString(submission?.reviewer?.id, "reviewer.id", errors);
  if (submission?.playback || packet.packetHashAlgorithm === "sha256-json-v1") {
    const completedPasses = submission?.playback?.completedPasses;
    if (!Number.isInteger(completedPasses) || completedPasses < 0 || completedPasses > contract.blindReview.requiredPlayback.completedPasses) {
      errors.push(`playback.completedPasses must be an integer from 0 to ${contract.blindReview.requiredPlayback.completedPasses}.`);
    }
    if (typeof submission?.playback?.videoPerceptible !== "boolean") errors.push("playback.videoPerceptible must be boolean.");
    if (typeof submission?.playback?.audioPerceptible !== "boolean") errors.push("playback.audioPerceptible must be boolean.");
    if (submission?.playback?.videoPerceptible && submission?.playback?.audioPerceptible
      && completedPasses !== contract.blindReview.requiredPlayback.completedPasses) {
      errors.push(`playback.completedPasses must be ${contract.blindReview.requiredPlayback.completedPasses} when both channels are perceptible.`);
    }
    requireString(submission?.playback?.environment, "playback.environment", errors);
    if (!Array.isArray(submission?.playback?.deviations)) errors.push("playback.deviations must be an array.");
  }
  if (!["ready", "needs-work", "not-assessable"].includes(submission?.firstPass?.verdict)) {
    errors.push("firstPass.verdict must be ready, needs-work, or not-assessable.");
  }
  if (typeof submission?.firstPass?.replayFeelsNatural !== "boolean") errors.push("firstPass.replayFeelsNatural must be boolean.");
  requireString(submission?.firstPass?.observation, "firstPass.observation", errors);

  const expected = contract.grading.blindCriteria;
  const supplied = Array.isArray(submission?.criteria) ? submission.criteria : [];
  const seen = new Set();
  for (const item of supplied) {
    if (seen.has(item?.id)) errors.push(`Duplicate blind review criterion: ${item?.id}`);
    seen.add(item?.id);
  }
  for (const criterion of expected) if (!seen.has(criterion.id)) errors.push(`Missing blind review criterion: ${criterion.id}`);
  for (const item of supplied) if (!expected.some((criterion) => criterion.id === item?.id)) errors.push(`Unknown blind review criterion: ${item?.id}`);

  const scale = new Map(contract.grading.ratingScale.map((entry) => [entry.rating, entry]));
  const scoredCriteria = [];
  const criticalFailures = [];
  const reviewIssues = [];
  if (submission?.playback && (!submission.playback.videoPerceptible || !submission.playback.audioPerceptible)) {
    reviewIssues.push({ reason: "The review environment did not expose the complete audiovisual experience." });
  }
  for (const criterion of expected) {
    const item = supplied.find((candidate) => candidate.id === criterion.id);
    if (!item) continue;
    if (!["scored", "not-assessable"].includes(item.status)) errors.push(`${criterion.id} status must be scored or not-assessable.`);
    if (!Number.isInteger(item.rating) || !scale.has(item.rating)) errors.push(`${criterion.id} rating must be an integer from 0 to 4.`);
    if (item.status === "not-assessable" && item.rating !== 0) errors.push(`${criterion.id} must use rating 0 when not assessable.`);
    if (!contract.blindReview.allowedConfidence.includes(item.confidence)) errors.push(`${criterion.id} confidence is invalid.`);
    requireString(item.rationale, `${criterion.id} rationale`, errors);
    validateEvidence(
      item.evidence,
      criterion.id,
      packet.video.durationSeconds,
      contract.blindReview.requiredEvidencePerCriterion,
      errors,
    );
    const scaleEntry = scale.get(item.rating);
    const weightedScore = scaleEntry ? round(criterion.weight * scaleEntry.factor) : 0;
    scoredCriteria.push({
      ...criterion,
      status: item.status,
      rating: item.rating,
      ratingLabel: item.status === "not-assessable" ? "Not assessable" : scaleEntry?.label || "Invalid",
      confidence: item.confidence,
      evidence: item.evidence,
      rationale: item.rationale,
      score: weightedScore,
    });
    if (item.status === "not-assessable") {
      reviewIssues.push({ criterionId: criterion.id, reason: "Criterion was not assessable from the supplied media." });
    }
    if (item.confidence === "low") {
      reviewIssues.push({ criterionId: criterion.id, reason: "Reviewer confidence was low." });
    }
    if (item.status === "scored" && Number.isFinite(criterion.criticalFloor) && item.rating < criterion.criticalFloor) {
      criticalFailures.push({ criterionId: criterion.id, reason: `Rating ${item.rating} fell below critical floor ${criterion.criticalFloor}.` });
    }
  }

  if (!Array.isArray(submission?.criticalFailures)) errors.push("criticalFailures must be an array.");
  else {
    for (const [index, failure] of submission.criticalFailures.entries()) {
      if (failure?.criterionId !== "overall" && !expected.some((criterion) => criterion.id === failure?.criterionId)) {
        errors.push(`criticalFailures ${index + 1} has an unknown criterionId.`);
      }
      requireString(failure?.reason, `criticalFailures ${index + 1} reason`, errors);
      validateEvidence(failure?.evidence, `criticalFailures ${index + 1}`, packet.video.durationSeconds, 1, errors);
      criticalFailures.push(failure);
    }
  }

  if (errors.length) throw new Error(`Blind review validation failed:\n- ${errors.join("\n- ")}`);
  const provisionalScore = round(scoredCriteria.reduce((sum, criterion) => sum + criterion.score, 0));
  const score = reviewIssues.length ? null : provisionalScore;
  const status = reviewIssues.length
    ? "inconclusive"
    : provisionalScore >= contract.grading.passingScore && criticalFailures.length === 0
      ? "pass"
      : "fail";
  return {
    schemaVersion: 1,
    packetId: packet.packetId,
    videoSha256: packet.video.sha256,
    reviewedAt: submission.reviewedAt,
    reviewer: submission.reviewer,
    playback: submission.playback ?? null,
    firstPass: submission.firstPass,
    criteria: scoredCriteria,
    criticalFailures,
    reviewIssues,
    score,
    provisionalScore,
    passingScore: contract.grading.passingScore,
    status,
  };
}

export function needsSecondReview(review, contract) {
  if (review.status !== "pass") return false;
  const escalation = contract.blindReview.escalation;
  const nearThreshold = review.score <= contract.grading.passingScore + escalation.secondReviewWithinPointsAboveThreshold;
  const touchesCriticalFloor = escalation.secondReviewAtCriticalFloor && review.criteria.some((criterion) => (
    Number.isFinite(criterion.criticalFloor) && criterion.rating === criterion.criticalFloor
  ));
  return nearThreshold || touchesCriticalFloor;
}

export function compareBlindReviews(primary, secondary, contract) {
  if (primary.packetId !== secondary.packetId || primary.videoSha256 !== secondary.videoSha256) {
    throw new Error("Blind reviews do not refer to the same packet and video.");
  }
  if (primary.reviewer.id === secondary.reviewer.id) {
    throw new Error("Escalated blind reviews require different reviewer IDs.");
  }
  const disagreements = primary.criteria.map((criterion) => {
    const other = secondary.criteria.find((candidate) => candidate.id === criterion.id);
    return {
      criterionId: criterion.id,
      primaryRating: criterion.rating,
      secondaryRating: other.rating,
      absoluteDifference: Math.abs(criterion.rating - other.rating),
    };
  });
  const decisionAgreement = primary.status === secondary.status;
  const unresolved = disagreements.filter((item) => (
    item.absoluteDifference > contract.blindReview.escalation.maximumRatingDisagreementWithoutAdjudication
  ));
  const status = decisionAgreement && unresolved.length === 0 ? "agreement" : "adjudication-required";
  return {
    schemaVersion: 1,
    status,
    decisionAgreement,
    primary: { reviewer: primary.reviewer, status: primary.status, score: primary.score },
    secondary: { reviewer: secondary.reviewer, status: secondary.status, score: secondary.score },
    exactAgreementCount: disagreements.filter((item) => item.absoluteDifference === 0).length,
    withinOneCount: disagreements.filter((item) => item.absoluteDifference <= 1).length,
    criterionCount: disagreements.length,
    meanAbsoluteRatingDifference: round(disagreements.reduce((sum, item) => sum + item.absoluteDifference, 0) / disagreements.length),
    disagreements,
    unresolved,
  };
}
