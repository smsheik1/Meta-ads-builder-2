import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  REPO_ARCHIVE_MAX_BYTES,
  buildRepoScan,
  normalizeRepoSubmissionDetails,
  parsePublicGitHubRepositoryUrl,
  validateRepoArchive,
  validateRepoScanReport,
  validateRepoSubmissionDetails,
} from "../features/discovery/repoSubmission";

const completeRepoPaths = [
  "dance-off/SKILL.md",
  "dance-off/format.json",
  "dance-off/package.json",
  "dance-off/runner.mjs",
  "dance-off/requirements.json",
  "dance-off/input-contract.json",
  "dance-off/output-contract.json",
  "dance-off/quality.json",
  "dance-off/tests/contracts.test.mjs",
  "dance-off/examples/proof/final.mp4",
  "dance-off/fixtures/smoke/input.json",
  "dance-off/assets/background.png",
  "dance-off/assets/provenance.json",
];
const completeScan = buildRepoScan(completeRepoPaths);
assert.equal(completeScan.readyForRuntimeTest, true);
assert.equal(completeScan.requiredFound, completeScan.requiredTotal);
assert.equal(completeScan.fileCount, completeRepoPaths.length);
assert.equal(completeScan.checks.find((check) => check.id === "assets")?.found, true);
assert.equal(validateRepoScanReport(completeScan), null);

const incompleteScan = buildRepoScan(["README.md", "package.json"]);
assert.equal(incompleteScan.readyForRuntimeTest, false);
assert.ok(incompleteScan.requiredFound < incompleteScan.requiredTotal);
assert.equal(validateRepoScanReport(incompleteScan), null);
assert.equal(
  validateRepoScanReport({ ...incompleteScan, requiredFound: incompleteScan.requiredFound + 1 }),
  "The project scan totals do not match. Scan the source again.",
);

assert.deepEqual(parsePublicGitHubRepositoryUrl(" https://github.com/wiggly/dance-off.git "), {
  owner: "wiggly",
  repo: "dance-off",
  canonicalUrl: "https://github.com/wiggly/dance-off",
});
assert.equal(parsePublicGitHubRepositoryUrl("https://gitlab.com/wiggly/dance-off"), null);
assert.equal(parsePublicGitHubRepositoryUrl("https://github.com/wiggly/dance-off/tree/main"), null);
assert.equal(parsePublicGitHubRepositoryUrl("http://github.com/wiggly/dance-off"), null);

assert.equal(validateRepoArchive({ name: "dance-off.zip", size: 1_000 }), null);
assert.equal(validateRepoArchive({ name: "dance-off.tar.gz", size: 1_000 }), "Choose a ZIP file.");
assert.equal(
  validateRepoArchive({ name: "dance-off.zip", size: REPO_ARCHIVE_MAX_BYTES + 1 }),
  "Keep the ZIP under 200 MB, or use a public GitHub repository.",
);

const repoDetails = normalizeRepoSubmissionDetails({
  creatorName: " Maya Chen ",
  contactEmail: " MAYA@EXAMPLE.COM ",
  formatName: " Dance Off ",
  promise: " Turns one song into a four-character dance-off video. ",
  sourceCredit: " Original work. ",
});
assert.deepEqual(repoDetails, {
  creatorName: "Maya Chen",
  contactEmail: "maya@example.com",
  formatName: "Dance Off",
  promise: "Turns one song into a four-character dance-off video.",
  sourceCredit: "Original work.",
});
assert.equal(validateRepoSubmissionDetails(repoDetails), null);
assert.equal(validateRepoSubmissionDetails({ ...repoDetails, formatName: "" }), "Give the Format a name.");

const schema = readFileSync("convex/schema.ts", "utf8");
const functions = readFileSync("convex/discoverySubmissions.ts", "utf8");
const repoValidation = readFileSync("features/discovery/repoSubmission.ts", "utf8");
const page = readFileSync("app/submit/page.tsx", "utf8");
const flow = readFileSync("app/submit/RepoSubmissionFlow.tsx", "utf8");

assert.match(schema, /discoverySubmissions: defineTable/);
assert.match(schema, /status: v\.literal\("pending"\)/);
assert.match(schema, /by_status_and_createdAt/);
assert.match(schema, /by_contactEmail_and_sourceKey/);
assert.match(schema, /archiveStorageId: v\.optional\(v\.id\("_storage"\)\)/);
assert.match(schema, /scanReport: v\.optional\(v\.object/);
assert.match(functions, /export const scanPublicGitHub/);
assert.match(functions, /export const createRepoArchiveUploadUrl/);
assert.match(functions, /export const submitRepo/);
assert.match(functions, /ctx\.storage\.generateUploadUrl\(\)/);
assert.match(functions, /withIndex\("by_contactEmail_and_sourceKey"/);
assert.match(functions, /status: "pending"/);
assert.match(functions, /status: "updated"/);
assert.match(functions, /export const listPending[^]*internalQuery/);
assert.equal(/export const (list|review)[^]*= query\(/.test(functions), false);
assert.equal(repoValidation.includes('from "@/'), false);
assert.match(flow, /Turn a project into a reusable Format/);
assert.match(flow, /Public GitHub repo/);
assert.match(flow, /ZIP on my computer/);
assert.match(flow, /Scan repository/);
assert.match(flow, /Scan ZIP/);
assert.match(flow, /Nothing is published automatically/);
assert.match(flow, /Runtime test/);
assert.match(flow, /Proof review/);
assert.match(flow, /Publish/);
assert.equal(/[—–]/.test(`${page}\n${flow}`), false);
assert.equal(/Three real output links|Format link or package URL/.test(flow), false);
assert.equal(/Replicate|Seedance|Fish Audio|AdRenderSurface/.test(`${functions}\n${flow}`), false);

console.log("discovery submission tests passed");
