import { writeFile } from "node:fs/promises";
import path from "node:path";

function valueAt(object, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => value?.[key], object);
}

function gradeFor(score, scale) {
  return scale.find((entry) => score >= entry.minimum)?.grade || "F";
}

function display(value) {
  if (Array.isArray(value)) return value.length > 4 ? `${value.length} measurements` : value.map(display).join(", ");
  if (typeof value === "number" && Number.isFinite(value)) return String(Number(value.toFixed(3)));
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function timecodes(evidence = []) {
  return evidence.map((item) => `${item.startSeconds}-${item.endSeconds}s: ${item.observation}`).join("; ");
}

function markdown(report) {
  const decision = report.overall.score === null
    ? report.overall.status === "inconclusive" ? "Blind review inconclusive" : "Blind review pending"
    : `${report.overall.grade} · ${report.overall.score}/100 blind score`;
  const technicalRows = report.technicalCriteria.map((criterion) => (
    `| ${criterion.label} | ${criterion.status} | ${criterion.measured} | ${criterion.threshold} |`
  ));
  const blindRows = report.blindCriteria.map((criterion) => (
    `| ${criterion.label} | ${criterion.status} | ${criterion.rating ?? "—"} | ${criterion.score ?? "—"}/${criterion.weight} | ${criterion.confidence ?? "—"} | ${criterion.evidenceSummary || criterion.explanation} |`
  ));
  const failures = report.criticalFailures.length
    ? report.criticalFailures.map((failure) => `- **${failure.criterionId}:** ${failure.reason}`).join("\n")
    : "None.";
  const reviewIssues = report.reviewIssues.length
    ? report.reviewIssues.map((issue) => `- ${issue.criterionId ? `**${issue.criterionId}:** ` : ""}${issue.reason}`).join("\n")
    : "None.";
  return `# Bikini Bottom Dance Off evaluation\n\n`+
    `**${decision}**\n\n`+
    `Decision: ${report.overall.status}\n\n`+
    `Technical gates: ${report.overall.technicalPassed}/${report.overall.technicalTotal} passed\n\n`+
    `Blind shipping threshold: ${report.overall.passingScore}/100\n\n`+
    `## Technical gates\n\n`+
    `| Gate | Status | Measurement | Required |\n`+
    `| --- | --- | --- | --- |\n${technicalRows.join("\n")}\n\n`+
    `## Blind creative review\n\n`+
    `| Criterion | Status | Rating | Score | Confidence | Evidence |\n`+
    `| --- | --- | ---: | ---: | --- | --- |\n${blindRows.join("\n")}\n\n`+
    `## Critical failures\n\n${failures}\n\n`+
    `## Review limitations\n\n${reviewIssues}\n\n`+
    `Automatic evidence: \`${report.evidence.qualityReport}\`\n\n`+
    `Review packet: \`${report.evidence.reviewPacket}\`\n\n`+
    `Blind submission: ${report.evidence.blindReview ? `\`${report.evidence.blindReview}\`` : "pending"}\n\n`+
    `Contact sheet: \`${report.evidence.contactSheet}\`\n`;
}

export async function writeEvaluation({ runDirectory, qualityReport, contract, blindReview = null }) {
  const technicalCriteria = contract.technicalGates.map((criterion) => {
    const passed = qualityReport.checks[criterion.id] === true;
    const measured = valueAt(qualityReport, criterion.measurementPath);
    return {
      ...criterion,
      status: passed ? "pass" : "fail",
      measured: display(measured),
      explanation: passed
        ? `${criterion.label} met its threshold (${criterion.threshold}).`
        : `${criterion.label} missed its threshold (${criterion.threshold}).`,
    };
  });
  const blindCriteria = contract.grading.blindCriteria.map((criterion) => {
    const reviewed = blindReview?.criteria.find((item) => item.id === criterion.id);
    return reviewed ? {
      ...reviewed,
      evidenceSummary: timecodes(reviewed.evidence),
      explanation: reviewed.rationale,
    } : {
      ...criterion,
      status: "pending",
      rating: null,
      score: null,
      confidence: null,
      evidence: [],
      evidenceSummary: "Awaiting an independent review of the complete MP4.",
      explanation: "This criterion is judged from the finished audiovisual experience.",
    };
  });
  const technicalPassed = technicalCriteria.filter((criterion) => criterion.status === "pass").length;
  const technicalStatus = technicalPassed === technicalCriteria.length ? "pass" : "fail";
  const score = blindReview?.score ?? null;
  const criticalFailures = blindReview?.criticalFailures ?? [];
  const reviewIssues = blindReview?.reviewIssues ?? [];
  const status = technicalStatus === "fail"
    ? "fail"
    : blindReview
      ? blindReview.status
      : "blind-review-pending";
  const report = {
    schemaVersion: 2,
    format: "bikini-bottom-dance-off-v1",
    rubricVersion: contract.rubricVersion,
    evaluatedAt: new Date().toISOString(),
    overall: {
      status,
      score,
      provisionalScore: blindReview?.provisionalScore ?? null,
      grade: score === null ? null : gradeFor(score, contract.grading.gradeScale),
      passingScore: contract.grading.passingScore,
      scoreMeaning: contract.grading.scoreMeaning,
      technicalStatus,
      technicalPassed,
      technicalTotal: technicalCriteria.length,
    },
    technicalCriteria,
    blindCriteria,
    criticalFailures,
    reviewIssues,
    firstPass: blindReview?.firstPass ?? null,
    reviewer: blindReview?.reviewer ?? null,
    evidence: {
      qualityReport: "quality-report.json",
      reviewPacket: contract.blindReview.reviewPacketFile,
      blindReview: blindReview ? contract.blindReview.reviewFile : null,
      contactSheet: qualityReport.contactSheet,
    },
  };
  await writeFile(path.join(runDirectory, "eval-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(runDirectory, "eval-report.md"), markdown(report));
  return report;
}
