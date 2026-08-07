import { writeFile } from "node:fs/promises";
import path from "node:path";

function valueAt(object, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => value?.[key], object);
}

function gradeFor(score, scale) {
  return scale.find((entry) => score >= entry.minimum)?.grade || "F";
}

function display(value) {
  if (Array.isArray(value)) return value.length > 4 ? `${value.length} measurements` : value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function markdown(report) {
  const overall = report.overall.score === null
    ? `Human review pending · automatic score ${report.overall.provisionalPercent}%`
    : `${report.overall.grade} · ${report.overall.score}/100`;
  const rows = report.criteria.map((criterion) => (
    `| ${criterion.category} | ${criterion.label} | ${criterion.status} | ${criterion.score}/${criterion.weight} | ${criterion.measured} |`
  ));
  return `# Bikini Bottom Dance Off eval\n\n`+
    `**${overall}**\n\n`+
    `Status: ${report.overall.status}\n\n`+
    `Passing score: ${report.overall.passingScore}/100\n\n`+
    `| Type | Criterion | Status | Score | Evidence |\n`+
    `| --- | --- | --- | ---: | --- |\n${rows.join("\n")}\n\n`+
    `Automatic evidence: \`${report.evidence.qualityReport}\`\n\n`+
    `Contact sheet: \`${report.evidence.contactSheet}\`\n`;
}

export async function writeEvaluation({ runDirectory, qualityReport, contract }) {
  const automatic = contract.grading.automaticCriteria.map((criterion) => {
    const passed = qualityReport.checks[criterion.id] === true;
    const measured = valueAt(qualityReport, criterion.measurementPath);
    return {
      ...criterion,
      category: "automatic",
      status: passed ? "pass" : "fail",
      score: passed ? criterion.weight : 0,
      measured: display(measured),
      explanation: passed
        ? `${criterion.label} met its threshold (${criterion.threshold}).`
        : `${criterion.label} missed its threshold (${criterion.threshold}).`,
    };
  });
  const humanPassed = qualityReport.humanReview.status === "pass";
  const human = contract.human.map((criterion) => ({
    ...criterion,
    category: "human",
    status: humanPassed ? "pass" : "pending",
    score: humanPassed ? criterion.weight : 0,
    measured: humanPassed ? `Approved ${qualityReport.humanReview.approvedAt}` : "Awaiting a person watching the final render",
    explanation: humanPassed ? "A human reviewer approved this criterion." : "This criterion cannot be inferred from technical measurements alone.",
  }));
  const automaticScore = automatic.reduce((sum, criterion) => sum + criterion.score, 0);
  const automaticMaximum = automatic.reduce((sum, criterion) => sum + criterion.weight, 0);
  const humanScore = human.reduce((sum, criterion) => sum + criterion.score, 0);
  const score = humanPassed ? automaticScore + humanScore : null;
  const report = {
    schemaVersion: 1,
    format: "bikini-bottom-dance-off-v1",
    evaluatedAt: new Date().toISOString(),
    overall: {
      status: humanPassed ? (score >= contract.grading.passingScore ? "pass" : "fail") : "human-review-pending",
      score,
      grade: score === null ? null : gradeFor(score, contract.grading.gradeScale),
      passingScore: contract.grading.passingScore,
      provisionalPercent: Math.round(automaticScore / automaticMaximum * 100),
      automaticScore,
      automaticMaximum,
      humanScore,
      humanMaximum: contract.human.reduce((sum, criterion) => sum + criterion.weight, 0),
    },
    criteria: [...automatic, ...human],
    evidence: {
      qualityReport: "quality-report.json",
      contactSheet: qualityReport.contactSheet,
    },
  };
  await writeFile(path.join(runDirectory, "eval-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(runDirectory, "eval-report.md"), markdown(report));
  return report;
}
