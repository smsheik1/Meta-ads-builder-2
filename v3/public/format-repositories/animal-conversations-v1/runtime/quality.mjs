import path from "node:path";
import { exists, readJson, sha256, writeJson } from "./common.mjs";
import { assertMatchingIdentity, canonicalHash, collectRenderIdentity, qualityPolicyIdentity } from "./identity.mjs";
import { validateRun } from "./validate.mjs";

const nonempty = (value) => typeof value === "string" && Boolean(value.trim());
const PLAYBACK_FILE = "playback-review.json";
export const FINALIZATION_EVIDENCE = [
  "input.json", ".validation.json", ".script-approval.json", "script-review.json", "script-review.html", "timed-role-sheet.md",
  "render-report.json", "quality-report.json", PLAYBACK_FILE, "contact-sheet.png",
];

export async function loadQualityPolicy(root) {
  const policy = await readJson(path.join(root, "quality.json"));
  if (!policy.requiredTechnicalGates?.length || !policy.blindReview?.criterionRules?.length) throw new Error("Quality policy has no required gates or review criteria.");
  const rules = policy.blindReview.criterionRules;
  if (new Set(policy.requiredTechnicalGates).size !== policy.requiredTechnicalGates.length || policy.requiredTechnicalGates.some((id) => !nonempty(id))) throw new Error("Required technical gates must be explicitly named and unique.");
  if (new Set(rules.map((rule) => rule.id)).size !== rules.length || new Set(rules.map((rule) => rule.index)).size !== policy.blindReview.criteria.length || rules.some((rule) => !nonempty(rule.id) || !Number.isInteger(rule.index) || !nonempty(policy.blindReview.criteria[rule.index]))) {
    throw new Error("Quality policy criteria are ambiguous or incomplete.");
  }
  if (rules.some((rule) => !["visual", "evidence", "technical-audio", "perceptual-audio"].includes(rule.channel) || typeof rule.required !== "boolean" || (rule.channel !== "perceptual-audio" && (rule.required !== true || rule.allowUnscored))) || !rules.some((rule) => rule.channel === "visual") || !rules.some((rule) => rule.channel === "technical-audio")) throw new Error("Required visual and technical review cannot be replaced by optional perception limitations.");
  const passes = policy.blindReview.requiredPlayback?.passIds;
  if (passes?.length !== 2 || new Set(passes).size !== 2 || passes.some((id) => !nonempty(id))) throw new Error("Quality policy must define the two required playback passes.");
  return policy;
}

export async function assertRenderFresh({ root, runDirectory }) {
  const report = await readJson(path.join(runDirectory, "render-report.json"));
  const identity = await collectRenderIdentity({ root, runDirectory });
  assertMatchingIdentity(report.identity, identity);
  const outputSha256 = await sha256(path.join(runDirectory, "final.mp4"));
  if (report.status !== "pass" || report.outputSha256 !== outputSha256) throw new Error("Stale render evidence: the current MP4 does not match its render receipt.");
  return { report, identity, renderIdentityHash: canonicalHash(identity), outputSha256 };
}

export async function verifyTechnicalEvidence({ root, runDirectory }) {
  const render = await assertRenderFresh({ root, runDirectory });
  const policy = await loadQualityPolicy(root);
  const qualityPolicyHash = await qualityPolicyIdentity(root);
  const technical = await readJson(path.join(runDirectory, "quality-report.json"));
  if (technical.renderIdentityHash !== render.renderIdentityHash || technical.qualityPolicyHash !== qualityPolicyHash || technical.measured?.outputSha256 !== render.outputSha256) {
    throw new Error("Stale technical review: current video, render identity, and quality policy need matching inspection evidence.");
  }
  const failed = policy.requiredTechnicalGates.filter((id) => technical.gates?.[id] !== true);
  if (technical.status !== "pass" || failed.length || Object.values(technical.gates || {}).some((passed) => passed !== true)) {
    throw new Error(`Required technical checks have not passed: ${failed.join(", ") || "inspection status"}.`);
  }
  const contactSheetSha256 = await sha256(path.join(runDirectory, "contact-sheet.png")).catch(() => null);
  if (!nonempty(technical.contactSheetSha256) || technical.contactSheetSha256 !== contactSheetSha256) {
    throw new Error("Stale or missing contact sheet: finish inspection of the current render before reviewing or finalizing it.");
  }
  return { ...render, policy, qualityPolicyHash, technical };
}

export function assessPlaybackReview({ policy, review, outputSha256, qualityPolicyHash, renderIdentityHash }) {
  if (review.schemaVersion !== 2 || review.mp4Sha256 !== outputSha256 || review.qualityPolicyHash !== qualityPolicyHash || review.rubricVersion !== policy.rubricVersion) throw new Error("Playback review is stale or has an unsupported schema; use the current MP4 and rubric hashes.");
  if (!nonempty(renderIdentityHash) || review.renderIdentityHash !== renderIdentityHash) throw new Error("Playback review is stale because its render identity is missing or changed; review the current render before submitting matching evidence.");
  if (!nonempty(review.reviewer)) throw new Error("Playback review must name its reviewer.");
  for (const channel of ["visual", "audio"]) {
    const perception = review.perception?.[channel];
    if (!["direct", "indirect", "unavailable"].includes(perception?.mode) || !nonempty(perception.basis)) throw new Error(`Playback review must disclose the ${channel} perception mode and basis.`);
  }
  const passIds = policy.blindReview.requiredPlayback.passIds;
  if (!Array.isArray(review.passes) || review.passes.length !== passIds.length || new Set(review.passes.map((pass) => pass.id)).size !== passIds.length || review.passes.some((pass) => !passIds.includes(pass.id) || !nonempty(pass.note))) throw new Error("Playback review requires each named pass exactly once, with an observation note.");
  const rules = policy.blindReview.criterionRules;
  if (!Array.isArray(review.criteria) || review.criteria.length !== rules.length || new Set(review.criteria.map((criterion) => criterion.id)).size !== rules.length || review.criteria.some((criterion) => !rules.some((rule) => rule.id === criterion.id))) throw new Error("Playback review must assess every known criterion exactly once; unknown or empty criteria are not accepted.");
  if (!Array.isArray(review.disclosures) || review.disclosures.some((value) => !nonempty(value))) throw new Error("Playback review disclosures must be an explicit array of nonempty statements.");
  const failures = [];
  if (review.perception.visual.mode !== "direct") failures.push("required direct visual perception unavailable");
  for (const pass of review.passes) if (pass.completed !== true) failures.push(`incomplete pass: ${pass.id}`);
  for (const rule of rules) {
    const result = review.criteria.find((criterion) => criterion.id === rule.id);
    if (!["pass", "fail", "unscored"].includes(result.status) || !nonempty(result.note)) throw new Error(`Criterion ${rule.id} requires a valid result and observation or limitation note.`);
    if (result.status === "fail") failures.push(rule.id);
    if (result.status === "unscored" && !(rule.channel === "perceptual-audio" && !rule.required && rule.allowUnscored && review.perception.audio.mode !== "direct" && review.disclosures.length)) failures.push(`unscored required criterion: ${rule.id}`);
    if (rule.channel === "perceptual-audio" && result.status !== "unscored" && review.perception.audio.mode !== "direct") failures.push(`unsupported auditory judgment: ${rule.id}`);
  }
  return { status: failures.length ? "fail" : "pass", failures };
}

export async function recordPlaybackReview({ root, runDirectory, review }) {
  const current = await verifyTechnicalEvidence({ root, runDirectory });
  const assessment = assessPlaybackReview({ ...current, review });
  const receipt = {
    schemaVersion: 2, ...assessment, recordedAt: new Date().toISOString(),
    mp4Sha256: current.outputSha256, renderIdentityHash: current.renderIdentityHash,
    qualityPolicyHash: current.qualityPolicyHash, rubricVersion: current.policy.rubricVersion,
    reviewer: review.reviewer, perception: review.perception, passes: review.passes,
    criteria: review.criteria, disclosures: review.disclosures,
    limitation: "This record validates required attestations and artifact identity; it cannot prove perception or authenticate the reviewer.",
  };
  await writeJson(path.join(runDirectory, PLAYBACK_FILE), receipt);
  return receipt;
}

export async function verifyPlaybackEvidence({ root, runDirectory }) {
  const current = await verifyTechnicalEvidence({ root, runDirectory });
  const playback = await readJson(path.join(runDirectory, PLAYBACK_FILE));
  const assessment = assessPlaybackReview({ ...current, review: playback });
  if (playback.status !== "pass" || assessment.status !== "pass" || playback.renderIdentityHash !== current.renderIdentityHash) throw new Error(`Required playback review has not passed: ${assessment.failures.join(", ") || "stale render identity"}.`);
  return { ...current, playback };
}

async function finalizationState({ root, runDirectory }) {
  await validateRun({ root, runDirectory, writeReceipt: false });
  const approval = await readJson(path.join(runDirectory, ".script-approval.json"));
  if (approval.scope !== "episode") throw new Error("Mechanics-only fixture approval cannot finalize an episode.");
  const current = await verifyPlaybackEvidence({ root, runDirectory });
  const evidence = [];
  for (const file of FINALIZATION_EVIDENCE) evidence.push({ path: file, sha256: await sha256(path.join(runDirectory, file)) });
  const review = await readJson(path.join(runDirectory, "script-review.json"));
  // validateRun already verified each exact review WAV; preserve their identities in finalization too.
  for (const media of review.media) evidence.push({ path: media.path, sha256: media.sha256 });
  return { ...current, evidence };
}

export async function finalizeRun({ root, runDirectory }) {
  const current = await finalizationState({ root, runDirectory });
  const payload = {
    schemaVersion: 2, status: "ready", revisionId: current.identity.revisionId,
    finalVideo: "final.mp4", sha256: current.outputSha256,
    renderIdentityHash: current.renderIdentityHash, qualityPolicyHash: current.qualityPolicyHash,
    evidence: current.evidence, disclosures: current.playback.disclosures,
    deliveryRule: "Finalized, not exported or claimed received; export must verify before completion.",
  };
  const file = path.join(runDirectory, "delivery.json");
  if (await exists(file)) {
    const previous = await readJson(file);
    const { finalizedAt, ...content } = previous;
    if (canonicalHash(content) === canonicalHash(payload)) return previous;
  }
  const delivery = { ...payload, finalizedAt: new Date().toISOString() };
  await writeJson(file, delivery);
  return delivery;
}

export async function verifyFinalization({ root, runDirectory }) {
  const current = await finalizationState({ root, runDirectory });
  const delivery = await readJson(path.join(runDirectory, "delivery.json"));
  if (delivery.schemaVersion !== 2 || delivery.status !== "ready" || delivery.sha256 !== current.outputSha256 || delivery.revisionId !== current.identity.revisionId || delivery.renderIdentityHash !== current.renderIdentityHash || delivery.qualityPolicyHash !== current.qualityPolicyHash || canonicalHash(delivery.evidence) !== canonicalHash(current.evidence) || canonicalHash(delivery.disclosures) !== canonicalHash(current.playback.disclosures)) {
    throw new Error("Finalization is missing or stale; finalize the current approved and reviewed artifacts before export.");
  }
  return { ...current, delivery, deliverySha256: await sha256(path.join(runDirectory, "delivery.json")) };
}
