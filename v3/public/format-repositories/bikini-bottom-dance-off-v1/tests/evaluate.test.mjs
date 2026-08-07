import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { writeEvaluation } from "../runtime/evaluate.mjs";

const root = new URL("../", import.meta.url);

test("evals expose weighted evidence before approval and a final grade after approval", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "wiggly-dance-eval-"));
  try {
    const contract = JSON.parse(await readFile(new URL("quality.json", root), "utf8"));
    const checks = Object.fromEntries(contract.grading.automaticCriteria.map((criterion) => [criterion.id, true]));
    const measured = {
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: 47,
      audioCodec: "aac",
      beepWindowMeanDb: [-20, -20, -20],
      songWindowMeanDb: [-16],
      dialogueWindowMeanDb: [-18],
      silentWindowMeanDb: [-Infinity],
      finaleFreezeEvents: [[], [], [], []],
      closingMotionFrameHashes: ["a", "b"],
      closingChorusVoiceCount: 4,
      loopSeam: { score: 0.999 },
    };
    const pending = await writeEvaluation({
      runDirectory: directory,
      qualityReport: { checks, measured, humanReview: { status: "pending" }, contactSheet: "contact-sheet.png" },
      contract,
    });
    assert.equal(pending.overall.score, null);
    assert.equal(pending.overall.provisionalPercent, 100);
    assert.equal(pending.overall.automaticMaximum, 70);
    assert.equal(pending.overall.humanMaximum, 30);
    assert.ok(pending.criteria.every((criterion) => criterion.threshold || criterion.category === "human"));

    const final = await writeEvaluation({
      runDirectory: directory,
      qualityReport: { checks, measured, humanReview: { status: "pass", approvedAt: "2026-08-07T12:00:00.000Z" }, contactSheet: "contact-sheet.png" },
      contract,
    });
    assert.equal(final.overall.score, 100);
    assert.equal(final.overall.grade, "A+");
    assert.equal(final.overall.status, "pass");
    assert.equal(final.criteria.length, contract.grading.automaticCriteria.length + contract.human.length);
    assert.match(await readFile(path.join(directory, "eval-report.md"), "utf8"), /A\+ · 100\/100/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
