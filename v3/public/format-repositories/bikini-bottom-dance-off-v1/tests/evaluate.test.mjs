import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { writeEvaluation } from "../runtime/evaluate.mjs";
import { compareBlindReviews, needsSecondReview, validateBlindReview } from "../runtime/review.mjs";

const root = new URL("../", import.meta.url);

function measuredFixture() {
  return {
    width: 1080,
    height: 1920,
    fps: 30,
    durationSeconds: 47,
    audioCodec: "aac",
    beepWindowMeanDb: [-20, -20, -20],
    songWindowMeanDb: [-16],
    dialogueWindowMeanDb: [-18],
    silentWindowMeanDb: [-Infinity],
    soloDurationSeconds: [6.78, 6.78, 6.78, 6.78],
    groupFinaleDurationSeconds: 9,
    finaleRenderedClipCount: 4,
    finaleFreezeEventCounts: [0, 0, 0, 0],
    closingMotionFrameHashes: ["a", "b"],
    closingChorusVoiceCount: 4,
    loopSeam: { score: 0.999 },
  };
}

function packetFixture(contract) {
  const packetCore = {
    schemaVersion: 1,
    packetHashAlgorithm: "sha256-json-v1",
    createdAt: "2026-08-08T12:00:00.000Z",
    format: "bikini-bottom-dance-off-v1",
    formatVersion: "0.9.1",
    runId: "test-run",
    video: { sha256: "a".repeat(64), durationSeconds: 47 },
    rubricVersion: contract.rubricVersion,
  };
  return {
    ...packetCore,
    packetId: createHash("sha256").update(JSON.stringify(packetCore)).digest("hex"),
  };
}

function submissionFixture(contract, overrides = {}) {
  const packet = packetFixture(contract);
  const criteria = contract.grading.blindCriteria.map((criterion) => ({
    id: criterion.id,
    status: "scored",
    rating: 3,
    confidence: "high",
    evidence: [{ startSeconds: 1, endSeconds: 2, observation: `${criterion.label} is observable in the finished video.` }],
    rationale: `${criterion.label} works as intended with only minor polish available.`,
  }));
  return {
    schemaVersion: 2,
    packetId: packet.packetId,
    videoSha256: "a".repeat(64),
    reviewedAt: "2026-08-08T12:05:00.000Z",
    reviewer: { kind: "agent", id: "blind-agent-1" },
    playback: {
      completedPasses: 2,
      perceptionBasis: {
        video: { mode: "direct", detail: "Continuous moving video was directly visible in the test player." },
        audio: { mode: "direct", detail: "The complete soundtrack was directly audible in the test player." },
      },
      environment: "test-player",
      deviations: [],
    },
    firstPass: { verdict: "ready", replayFeelsNatural: true, observation: "The complete Reel reads cleanly and invites replay." },
    criteria,
    criticalFailures: [],
    ...overrides,
  };
}

test("evals separate technical gates from the pending blind creative score", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "wiggly-dance-eval-"));
  try {
    const contract = JSON.parse(await readFile(new URL("quality.json", root), "utf8"));
    const checks = Object.fromEntries(contract.technicalGates.map((criterion) => [criterion.id, true]));
    const qualityReport = { checks, measured: measuredFixture(), blindReview: { status: "pending" }, contactSheet: "contact-sheet.png" };
    const pending = await writeEvaluation({ runDirectory: directory, qualityReport, contract });
    assert.equal(pending.overall.score, null);
    assert.equal(pending.overall.status, "blind-review-pending");
    assert.equal(pending.overall.technicalPassed, 16);
    assert.equal(pending.overall.technicalTotal, 16);
    assert.equal(pending.blindCriteria.length, 7);
    assert.ok(pending.blindCriteria.every((criterion) => criterion.status === "pending"));

    const blindReview = validateBlindReview({
      submission: submissionFixture(contract),
      packet: packetFixture(contract),
      contract,
    });
    assert.equal(blindReview.score, 85);
    assert.equal(blindReview.status, "pass");
    const final = await writeEvaluation({ runDirectory: directory, qualityReport, contract, blindReview });
    assert.equal(final.overall.score, 85);
    assert.equal(final.overall.grade, "B");
    assert.equal(final.overall.status, "pass");
    assert.equal(final.technicalCriteria.length, 16);
    assert.equal(final.blindCriteria.length, 7);
    const friendlyEval = await readFile(path.join(directory, "eval-report.md"), "utf8");
    assert.match(friendlyEval, /B · 85\/100 blind score/);
    assert.match(friendlyEval, /Technical gates: 16\/16 passed/);
    assert.match(friendlyEval, /Character integrity \| scored \| 3 \| 17\/20 \| high/);
    assert.doesNotMatch(friendlyEval, /70\/70|30\/30/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("critical floors block a high aggregate blind score", async () => {
  const contract = JSON.parse(await readFile(new URL("quality.json", root), "utf8"));
  const submission = submissionFixture(contract);
  submission.criteria = submission.criteria.map((criterion) => ({ ...criterion, rating: 4 }));
  submission.criteria.find((criterion) => criterion.id === "character-integrity").rating = 1;
  const result = validateBlindReview({ submission, packet: packetFixture(contract), contract });
  assert.equal(result.score, 86);
  assert.equal(result.status, "fail");
  assert.deepEqual(result.criticalFailures, [{
    criterionId: "character-integrity",
    reason: "Rating 1 fell below critical floor 2.",
  }]);
});

test("blind review validation rejects mismatches and returns an inconclusive low-confidence judgment", async () => {
  const contract = JSON.parse(await readFile(new URL("quality.json", root), "utf8"));
  const submission = submissionFixture(contract, { videoSha256: "b".repeat(64) });
  submission.criteria.pop();
  submission.criteria[0].confidence = "low";
  await assert.rejects(
    async () => validateBlindReview({ submission, packet: packetFixture(contract), contract }),
    /videoSha256 does not match[\s\S]*Missing blind review criterion/,
  );

  const lowConfidence = submissionFixture(contract);
  lowConfidence.criteria[0].confidence = "low";
  const result = validateBlindReview({ submission: lowConfidence, packet: packetFixture(contract), contract });
  assert.equal(result.status, "inconclusive");
  assert.equal(result.score, null);
  assert.equal(result.provisionalScore, 85);
  assert.match(result.reviewIssues[0].reason, /confidence was low/);
});

test("missing audio perception makes the review inconclusive rather than failing the Reel", async () => {
  const contract = JSON.parse(await readFile(new URL("quality.json", root), "utf8"));
  const submission = submissionFixture(contract);
  submission.playback.completedPasses = 0;
  submission.playback.perceptionBasis.video = { mode: "unavailable", detail: "No moving video reached the reviewer." };
  submission.playback.perceptionBasis.audio = { mode: "unavailable", detail: "No audible sound reached the reviewer." };
  submission.playback.deviations = ["Continuous video and audio were not exposed by the review environment."];
  const audio = submission.criteria.find((criterion) => criterion.id === "audio-voice-performance");
  audio.status = "not-assessable";
  audio.rating = 0;
  audio.confidence = "low";
  const result = validateBlindReview({ submission, packet: packetFixture(contract), contract });
  assert.equal(result.status, "inconclusive");
  assert.equal(result.score, null);
  assert.ok(result.reviewIssues.some((issue) => /did not directly perceive/.test(issue.reason)));
  assert.equal(result.criticalFailures.some((failure) => failure.criterionId === "audio-voice-performance"), false);
});

test("player controls and captions do not count as direct audio perception", async () => {
  const contract = JSON.parse(await readFile(new URL("quality.json", root), "utf8"));
  const submission = submissionFixture(contract);
  submission.playback.perceptionBasis.audio = {
    mode: "indirect",
    detail: "The player showed an unmuted volume control and burned-in captions, but the reviewer did not receive audio input.",
  };
  const result = validateBlindReview({ submission, packet: packetFixture(contract), contract });
  assert.equal(result.status, "inconclusive");
  assert.equal(result.score, null);
  assert.equal(result.provisionalScore, 85);
  assert.ok(result.reviewIssues.some((issue) => /did not directly perceive/.test(issue.reason)));
});

test("near-threshold passing reviews require independent agreement without score averaging", async () => {
  const contract = JSON.parse(await readFile(new URL("quality.json", root), "utf8"));
  const packet = packetFixture(contract);
  const primary = validateBlindReview({ submission: submissionFixture(contract), packet, contract });
  assert.equal(primary.score, 85);
  assert.equal(needsSecondReview(primary, contract), true);

  const secondarySubmission = submissionFixture(contract);
  secondarySubmission.reviewer.id = "blind-agent-2";
  secondarySubmission.criteria[0].rating = 4;
  const secondary = validateBlindReview({ submission: secondarySubmission, packet, contract });
  const comparison = compareBlindReviews(primary, secondary, contract);
  assert.equal(comparison.status, "agreement");
  assert.equal(comparison.exactAgreementCount, 6);
  assert.equal(comparison.withinOneCount, 7);
  assert.equal("averagedScore" in comparison, false);

  secondary.criteria[0].rating = 1;
  secondary.status = "fail";
  const disputed = compareBlindReviews(primary, secondary, contract);
  assert.equal(disputed.status, "adjudication-required");
  assert.equal(disputed.decisionAgreement, false);
  assert.equal(disputed.unresolved[0].criterionId, "character-integrity");
});
