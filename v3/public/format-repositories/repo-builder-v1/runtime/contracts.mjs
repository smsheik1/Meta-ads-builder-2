import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { link, lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const SHA256 = /^[a-f0-9]{64}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED = ["SKILL.md", "README.md", "AGENTS.md", "requirements.json", "blueprint.json", "FORMAT-REPO.json"];
const fail = (message) => { throw new Error(message); };
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const positive = (value) => Number.isFinite(value) && value > 0;
const unresolved = (value) => !text(value) || /^(?:todo|tbd|unresolved|replace me)(?:\b|:)/i.test(value.trim());
const requireText = (value, name) => { if (unresolved(value)) fail(`${name} is required and must be resolved.`); };
const list = (value, name, minimum = 0) => {
  if (!Array.isArray(value) || value.length < minimum) fail(`${name} must contain at least ${minimum} item(s).`);
  return value;
};
const unique = (values, name) => { if (new Set(values).size !== values.length) fail(`${name} must be unique.`); };
const canonical = (value) => JSON.stringify(value, function (_key, item) {
  return object(item) ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item;
});
const jsonHash = (value) => createHash("sha256").update(canonical(value)).digest("hex");

export async function readJson(file) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { throw new Error(`Cannot read JSON ${path.basename(file)}: ${error.message}`); }
}

export async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

export async function writeJson(file, value, { exclusive = false } = {}) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    if (exclusive) await link(temporary, file);
    else await rename(temporary, file);
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error; });
  }
  return value;
}

export function safeRelativePath(file) {
  if (!text(file) || file !== file.trim() || /[\\\x00-\x1f\x7f:]/.test(file) || path.posix.isAbsolute(file)
      || file.split("/").some((part) => !part || part === "." || part === "..")) {
    fail(`Unsafe relative path: ${String(file)}`);
  }
  return file;
}

export async function canonicalDirectory(root) {
  const absolute = path.resolve(root);
  let current = path.parse(absolute).root;
  for (const component of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    const info = await lstat(current);
    if (info.isSymbolicLink()) {
      const systemAlias = process.platform === "darwin" && ["/tmp", "/var", "/etc"].includes(current)
        && await realpath(current) === `/private${current}`;
      if (!systemAlias) fail("Symlink ancestors are not allowed in Repo/run paths.");
      current = await realpath(current);
    } else if (!info.isDirectory()) fail("Repo/run path must be a regular directory.");
  }
  return current;
}

export async function regularFile(root, file) {
  safeRelativePath(file);
  let current = await canonicalDirectory(root);
  const parts = file.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    const info = await lstat(current);
    if (info.isSymbolicLink()) fail(`Symlink is not allowed: ${file}`);
    if (index === parts.length - 1 ? !info.isFile() : !info.isDirectory()) fail(`Not a regular file path: ${file}`);
  }
  return current;
}

function releasePath(file) {
  safeRelativePath(file);
  if (file === ".gitignore") return file;
  const denied = /^(?:private|references?|agent-runs|node_modules|cache|models?|weights|env(?:\..*)?|secrets?(?:\..*)?|credentials?(?:\..*)?|cookies?(?:\..*)?|tokens?(?:\..*)?|.*\.(?:pem|key|safetensors|gguf|pt|pth|ckpt))$/i;
  if (file.split("/").some((part) => part.startsWith(".") || denied.test(part))) fail(`Private or secret path cannot be released: ${file}`);
  return file;
}

async function checkedArtifact(root, artifact, label) {
  if (!object(artifact) || !SHA256.test(artifact.sha256)) fail(`${label} requires a SHA-256 hash.`);
  const file = await regularFile(root, artifact.file);
  if (await hashFile(file) !== artifact.sha256) fail(`${label} hash mismatch.`);
  return file;
}

async function loadEvidence(runDirectory) {
  const evidenceFile = await regularFile(runDirectory, "evidence.json");
  const evidence = await readJson(evidenceFile);
  if (!object(evidence) || evidence.schemaVersion !== 1 || !object(evidence.source)) fail("Invalid evidence schema.");
  const source = evidence.source;
  if (![source.durationSeconds, source.width, source.height, source.fps].every(positive) || typeof source.hasAudio !== "boolean") fail("Evidence source must include measured duration, dimensions, fps and audio presence.");
  if (!source.file?.startsWith("private/")) fail("Original source media must stay under private/.");
  await checkedArtifact(runDirectory, source, "Source");
  if (evidence.sampling?.method !== "uniform") fail("Unsupported evidence sampling method.");
  list(evidence.sampling.limitations, "Sampling limitations", 1).forEach((item) => requireText(item, "Sampling limitation"));
  const frames = list(evidence.frames, "Evidence frames", 1);
  if (frames.length > 24) fail("Evidence may contain at most 24 sampled frames.");
  unique(frames.map((frame) => frame.file), "Evidence frame paths");
  for (const frame of frames) {
    if (!Number.isFinite(frame.atSeconds) || frame.atSeconds < 0 || frame.atSeconds > source.durationSeconds) fail("Evidence frame time is outside source duration.");
    await checkedArtifact(runDirectory, frame, "Frame");
  }
  if (evidence.audio) {
    if (!source.hasAudio) fail("Silent-source evidence must not claim an audio derivative.");
    await checkedArtifact(runDirectory, evidence.audio, "Audio");
  }
  return { evidence, evidenceSha256: await hashFile(evidenceFile) };
}

function validateAssets(assets) {
  list(assets, "Assets");
  unique(assets.map((asset) => asset.path), "Asset paths");
  for (const asset of assets) {
    safeRelativePath(asset.path);
    requireText(asset.source, "Asset source");
    requireText(asset.notes, "Asset usage notes");
    if (!["original", "licensed", "user-supplied", "reference-only"].includes(asset.usage)) fail("Asset usage must be explicitly declared.");
  }
}

export function validateBlueprint(blueprint, evidence) {
  if (!object(blueprint) || blueprint.schemaVersion !== 1) fail("Invalid blueprint schema.");
  if (!SLUG.test(blueprint.slug)) fail("Blueprint slug must be lowercase words separated by hyphens.");
  for (const field of ["title", "summary"]) requireText(blueprint[field], `Blueprint ${field}`);
  if (!SHA256.test(blueprint.referenceSha256) || blueprint.referenceSha256 !== evidence?.source?.sha256) fail("Blueprint reference hash does not match evidence.");
  const duration = evidence.source.durationSeconds;
  const observations = list(blueprint.observations, "Observations", 1);
  unique(observations.map((item) => item.id), "Observation IDs");
  const observedIds = new Set(observations.map((item) => item.id));
  for (const item of observations) {
    requireText(item.id, "Observation ID");
    requireText(item.description, "Observation description");
    if (!Number.isFinite(item.atSeconds) || item.atSeconds < 0 || item.atSeconds > duration) fail("Observation time is outside source duration.");
    if (!["visual", "audio", "audiovisual"].includes(item.channel) || !["frame", "direct-playback", "user-transcript", "local-transcript"].includes(item.basis)) fail("Observation requires an explicit channel and evidence basis.");
    if (item.basis === "frame" && (item.channel !== "visual" || !evidence.frames.some((frame) => Math.abs(frame.atSeconds - item.atSeconds) < 0.001))) fail("Frame observations must cite an extracted frame time and cannot claim audio.");
    if (["user-transcript", "local-transcript"].includes(item.basis) && item.channel !== "audio") fail("Transcripts are audio-language evidence, not visual evidence.");
    if (!evidence.source.hasAudio && item.channel !== "visual") fail("Silent-source observations cannot claim audio evidence.");
  }
  const rules = list(blueprint.rules, "Format rules", 2);
  unique(rules.map((item) => item.id), "Rule IDs");
  for (const item of rules) {
    requireText(item.id, "Rule ID");
    requireText(item.description, "Rule description");
    requireText(item.reasoning, "Rule reasoning");
    if (!["fixed", "variable", "optional", "unsupported"].includes(item.classification)) fail("Every rule needs a fixed/variable/optional/unsupported classification.");
    list(item.observationIds, "Rule observation references", 1);
    if (item.observationIds.some((id) => !observedIds.has(id))) fail("Rule references an unknown observation.");
  }
  if (!rules.some((rule) => rule.classification === "fixed") || !rules.some((rule) => rule.classification === "variable")) fail("A reusable Format must distinguish fixed mechanics from variable content.");
  const inputs = list(blueprint.inputs, "User inputs", 1);
  unique(inputs.map((item) => item.name), "Input names");
  for (const item of inputs) {
    requireText(item.name, "Input name");
    requireText(item.description, "Input description");
    if (!["string", "number", "boolean", "asset", "array"].includes(item.type)) fail("Unknown user input type.");
  }
  requireText(blueprint.runtime?.approach, "Runtime approach");
  requireText(blueprint.runtime?.entrypoint, "Runtime entrypoint");
  releasePath(blueprint.runtime.entrypoint);
  const review = blueprint.review;
  if (!object(review) || !["sampled-frames", "direct", "unavailable"].includes(review.visual) || !["direct", "transcript-only", "unavailable", "not-applicable"].includes(review.audio)) fail("Review perception basis must be explicit.");
  list(review.limitations, "Review limitations");
  review.limitations.forEach((item) => requireText(item, "Review limitation"));
  if ((review.visual !== "direct" || (evidence.source.hasAudio && review.audio !== "direct")) && review.limitations.length === 0) fail("Indirect or missing perception requires explicit review limitations.");
  if ((evidence.source.hasAudio && review.audio === "not-applicable") || (!evidence.source.hasAudio && review.audio !== "not-applicable")) fail("Audio review must match source audio presence.");
  for (const item of observations.filter((entry) => entry.basis === "direct-playback")) {
    if ((item.channel !== "audio" && review.visual !== "direct") || (item.channel !== "visual" && review.audio !== "direct")) fail("Direct-playback observations require direct perception of the claimed channels.");
  }
  if (observations.some((item) => ["user-transcript", "local-transcript"].includes(item.basis)) && !["transcript-only", "direct"].includes(review.audio)) fail("Transcript observations require a matching audio review basis.");
  validateAssets(blueprint.assets);
  const proofs = list(blueprint.proofs, "Distinct proof briefs", 2);
  unique(proofs.map((item) => item.id), "Proof IDs");
  unique(proofs.map((item) => item.description?.trim().toLowerCase()), "Proof descriptions");
  for (const item of proofs) { requireText(item.id, "Proof ID"); requireText(item.description, "Proof description"); }
  return blueprint;
}

export async function loadValidatedRun(runDirectory) {
  const root = await canonicalDirectory(runDirectory);
  const { evidence, evidenceSha256 } = await loadEvidence(root);
  const blueprintFile = await regularFile(root, "blueprint.json");
  const blueprint = validateBlueprint(await readJson(blueprintFile), evidence);
  let transcriptSha256;
  const transcriptObservations = blueprint.observations.filter((item) => item.basis === "local-transcript");
  if (transcriptObservations.length > 0) {
    if (!evidence.source.hasAudio || !evidence.audio) fail("Local transcript observations require hashed audio evidence.");
    const transcriptFile = await regularFile(root, "transcript.json");
    if ((await lstat(transcriptFile)).size > 10_000_000) fail("Local transcript exceeds the supported 10 MB bound.");
    const transcript = await readJson(transcriptFile);
    if (!object(transcript) || transcript.schemaVersion !== 1 || transcript.engine !== "whisper.cpp" || transcript.language !== "en"
        || !SHA256.test(transcript.modelSha256) || transcript.uncertain !== true) fail("Local transcript requires the supported schema and explicit uncertainty; it is not direct perception.");
    if (transcript.sourceAudioSha256 !== evidence.audio.sha256 || transcript.sourceVideoSha256 !== evidence.source.sha256) fail("Local transcript source audio/video hashes do not match current evidence.");
    const segments = list(transcript.segments, "Local transcript segments", 1);
    if (segments.length > 10_000) fail("Local transcript contains too many segments.");
    for (const [index, segment] of segments.entries()) {
      if (!object(segment) || !text(segment.text) || !Number.isFinite(segment.startSeconds) || !Number.isFinite(segment.endSeconds)
          || segment.startSeconds < 0 || segment.endSeconds <= segment.startSeconds || segment.endSeconds > evidence.source.durationSeconds
          || (index > 0 && segment.startSeconds < segments[index - 1].startSeconds)) fail("Local transcript segments require text and chronological timestamps within source duration.");
    }
    if (!text(transcript.text) || transcript.text !== segments.map((segment) => segment.text.trim()).join(" ")) fail("Local transcript text must match its timed segments.");
    list(transcript.limitations, "Local transcript limitations", 1).forEach((item) => requireText(item, "Local transcript limitation"));
    for (const observation of transcriptObservations) {
      if (!segments.some((segment) => observation.atSeconds >= segment.startSeconds && observation.atSeconds <= segment.endSeconds)) fail("Local transcript observations must cite a time covered by a transcript segment.");
    }
    transcriptSha256 = await hashFile(transcriptFile);
  }
  return { runDirectory: root, evidence, blueprint, evidenceSha256, blueprintSha256: await hashFile(blueprintFile), ...(transcriptSha256 ? { transcriptSha256 } : {}) };
}

export async function initBlueprint({ runDirectory, slug, title }) {
  if (!SLUG.test(slug)) fail("Use a lowercase hyphenated slug.");
  requireText(title, "Title");
  const root = await canonicalDirectory(runDirectory);
  const { evidence } = await loadEvidence(root);
  const blueprint = {
    schemaVersion: 1, slug, title, referenceSha256: evidence.source.sha256, summary: "UNRESOLVED: the host agent must analyze the actual reference.",
    observations: [], rules: [], inputs: [], runtime: { approach: "UNRESOLVED", entrypoint: "UNRESOLVED" },
    review: { visual: "unavailable", audio: evidence.source.hasAudio ? "unavailable" : "not-applicable", limitations: ["No reference interpretation or direct audiovisual review has been performed."] },
    assets: [], proofs: [],
  };
  await writeJson(path.join(root, "blueprint.json"), blueprint, { exclusive: true });
  return blueprint;
}

export async function approveBlueprint({ runDirectory, reviewer, note, scope = "user" }) {
  requireText(reviewer, "Reviewer");
  requireText(note, "Approval decision note");
  if (!["user", "benchmark"].includes(scope)) fail("Approval scope must be user or benchmark.");
  const run = await loadValidatedRun(runDirectory);
  const receipt = {
    schemaVersion: 1, kind: "blueprint-approval", decision: "approved", scope, reviewer, note,
    blueprintSha256: run.blueprintSha256, evidenceSha256: run.evidenceSha256,
    ...(run.transcriptSha256 ? { transcriptSha256: run.transcriptSha256 } : {}),
    userApproval: scope === "user", creativeApproval: false, approvedAt: new Date().toISOString(),
  };
  const approvalFile = path.join(run.runDirectory, "approval.json");
  const existing = await lstat(approvalFile).catch((error) => { if (error.code === "ENOENT") return null; throw error; });
  if (existing) {
    const previousFile = await regularFile(run.runDirectory, "approval.json");
    const previous = await readJson(previousFile);
    const previousHash = await hashFile(previousFile);
    const history = path.join(run.runDirectory, "approval-history");
    await mkdir(history).catch((error) => { if (error.code !== "EEXIST") throw error; });
    await canonicalDirectory(history);
    const identity = SHA256.test(previous.blueprintSha256) && SHA256.test(previous.evidenceSha256)
      ? `${previous.blueprintSha256}-${previous.evidenceSha256}-${previousHash}` : previousHash;
    await link(previousFile, path.join(history, `${identity}.json`)).catch(async (error) => {
      if (error.code !== "EEXIST") throw error;
      const archived = await regularFile(run.runDirectory, `approval-history/${identity}.json`);
      if (await hashFile(archived) !== previousHash) fail("Approval history collision: preserve and inspect the existing receipt before retrying.");
    });
    await writeJson(approvalFile, receipt);
  } else await writeJson(approvalFile, receipt, { exclusive: true });
  return receipt;
}

export async function scaffoldRepo({ runDirectory, outputDirectory }) {
  const run = await loadValidatedRun(runDirectory);
  const approval = await readJson(await regularFile(run.runDirectory, "approval.json"));
  if (approval.schemaVersion !== 1 || approval.kind !== "blueprint-approval" || approval.decision !== "approved"
      || !["user", "benchmark"].includes(approval.scope) || !text(approval.reviewer) || !text(approval.note)
      || approval.userApproval !== (approval.scope === "user") || approval.creativeApproval !== false
      || approval.blueprintSha256 !== run.blueprintSha256 || approval.evidenceSha256 !== run.evidenceSha256
      || (approval.transcriptSha256 ?? null) !== (run.transcriptSha256 ?? null)) fail("Missing, invalid, or stale blueprint approval; review the exact current evidence, blueprint, and any transcript used.");
  const destination = path.resolve(outputDirectory);
  const root = path.join(await canonicalDirectory(path.dirname(destination)), path.basename(destination));
  await mkdir(root); // Exclusive: even an existing empty directory is never overwritten.
  const blueprint = run.blueprint;
  const manifest = {
    schemaVersion: 1, kind: "wiggly-format", slug: blueprint.slug, version: "0.1.0", status: "draft",
    runtime: blueprint.runtime.entrypoint, releaseFiles: [...REQUIRED], assets: [], proofs: [],
    review: { status: "pending", reviewer: null, notes: "Draft scaffold only; no runtime, proof output, or creative acceptance exists yet." },
  };
  const skill = `---\nname: ${blueprint.slug}\ndescription: Operate this Format through its official runtime once implementation and proof checks are complete.\n---\n\n# ${blueprint.title}\n\nThis is a DRAFT scaffold, not a working Format. Read blueprint.json for the approved plan.\n\nThe host coding agent must implement one official runtime at ${blueprint.runtime.entrypoint}. Do not fake a renderer, copy reference media, or label this scaffold complete. Keep replaceable content in inputs, not proof-specific runtime code.\n\nBefore release: declare local tools and providers in requirements.json; validate before paid calls and obtain explicit paid approval; add a free local smoke command; use the same runtime for two meaningfully different JSON inputs; inspect each finished output with the Repo Builder inspect command; record honest direct visual/audio review or retain pending review.\n\nComplete FORMAT-REPO.json with the official runtime, explicit releaseFiles, asset source/usage notes, and proof input/output/inspection paths. Never release reference-only assets, private source files, credentials, or dependency caches. Then use check-repo and package-repo. Technical checks do not certify creative quality or semantic equivalence.\n\nOnce complete, consumers must use the packaged official runtime, never rebuild it. Stop after three failed attempts and report observed blockers. Return the actual media and review evidence.\n`;
  await writeFile(path.join(root, "SKILL.md"), skill, { flag: "wx" });
  await writeFile(path.join(root, "README.md"), `# ${blueprint.title}\n\nStatus: draft; not runnable yet. Read SKILL.md.\n\n${blueprint.summary}\n\nThis scaffold contains the blueprint, not the private reference media. Approval scope: ${approval.scope}; blueprint approval is not finished-media creative approval.\n`, { flag: "wx" });
  await writeFile(path.join(root, "AGENTS.md"), "Read SKILL.md completely and follow it as the single operating manual.\n", { flag: "wx" });
  await writeJson(path.join(root, "requirements.json"), { schemaVersion: 1, localTools: [], providers: [], paidApprovalRequired: true }, { exclusive: true });
  await writeJson(path.join(root, "blueprint.json"), blueprint, { exclusive: true });
  await writeJson(path.join(root, "FORMAT-REPO.json"), manifest, { exclusive: true });
  return { status: "draft", repoDirectory: root, manifest };
}

export async function checkRepo(repoDirectory) {
  const root = await canonicalDirectory(repoDirectory);
  const manifest = await readJson(await regularFile(root, "FORMAT-REPO.json"));
  if (manifest.schemaVersion !== 1 || manifest.kind !== "wiggly-format" || !SLUG.test(manifest.slug) || !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(manifest.version)) fail("Invalid child Format manifest identity.");
  if (manifest.status !== "ready-for-review") fail("Child Repo is still draft; implement its official runtime and two proofs before checking release readiness.");
  releasePath(manifest.runtime);
  const releaseFiles = list(manifest.releaseFiles, "Explicit release allowlist", REQUIRED.length + 1);
  unique(releaseFiles, "Release paths");
  const allowlist = new Set(releaseFiles);
  for (const file of [...REQUIRED, manifest.runtime]) if (!allowlist.has(file)) fail(`Required release file missing from allowlist: ${file}`);
  const files = [];
  for (const file of releaseFiles) {
    releasePath(file);
    const local = await regularFile(root, file);
    const sizeBytes = (await lstat(local)).size;
    if (sizeBytes === 0) fail(`Release file is empty: ${file}`);
    files.push({ file, sha256: await hashFile(local), sizeBytes });
  }
  const requirements = await readJson(path.join(root, "requirements.json"));
  list(requirements.localTools, "Local tools");
  list(requirements.providers, "Providers");
  if (requirements.paidApprovalRequired !== true) fail("Requirements must retain explicit paid-provider approval.");
  const blueprint = await readJson(path.join(root, "blueprint.json"));
  if (blueprint.slug !== manifest.slug || blueprint.runtime?.entrypoint !== manifest.runtime || unresolved(blueprint.summary)) fail("Child blueprint and official manifest runtime/identity must agree.");
  if (files.some((file) => file.sha256 === blueprint.referenceSha256)) fail("Original reference media cannot be relabeled as a release asset or proof output.");
  validateAssets(blueprint.assets);
  for (const asset of blueprint.assets) if (asset.usage === "reference-only" && allowlist.has(asset.path)) fail("Blueprint reference-only assets cannot enter a release.");
  validateAssets(manifest.assets);
  const declaredAssets = new Set(manifest.assets.map((asset) => asset.path));
  for (const asset of manifest.assets) {
    if (asset.usage === "reference-only") fail("Reference-only assets cannot enter a release.");
    if (!allowlist.has(asset.path)) fail(`Declared asset is missing from release allowlist: ${asset.path}`);
  }
  for (const file of releaseFiles) if (file.startsWith("assets/") && !declaredAssets.has(file)) fail(`Release asset has no source/usage declaration: ${file}`);
  const review = manifest.review;
  if (!object(review) || !["pending", "approved"].includes(review.status) || !text(review.notes)) fail("Child creative review must explicitly remain pending or record an actual reviewer and decision.");
  if (review.status === "approved") requireText(review.reviewer, "Creative reviewer");
  const proofs = list(manifest.proofs, "Completed proofs", 2);
  unique(proofs.map((proof) => proof.id), "Completed proof IDs");
  const checkedProofs = [];
  for (const proof of proofs) {
    requireText(proof.id, "Completed proof ID");
    if (!blueprint.proofs?.some((brief) => brief.id === proof.id && !unresolved(brief.description))) fail(`Proof has no resolved blueprint brief: ${proof.id}`);
    for (const field of ["input", "output", "inspection"]) if (!allowlist.has(proof[field])) fail(`Proof ${field} must be in the release allowlist: ${proof.id}`);
    const input = await readJson(path.join(root, proof.input));
    if (!object(input) || Object.keys(input).length === 0) fail("Proof inputs must be nonempty JSON objects.");
    const report = await readJson(path.join(root, proof.inspection));
    const output = files.find((file) => file.file === proof.output);
    if (report.schemaVersion !== 1 || report.kind !== "technical-media-inspection" || !object(report.media) || !Array.isArray(report.streams)
        || report.review?.status !== "not-assessed" || !Array.isArray(report.review.limitations)) fail("Proof requires an honest technical media inspection, not an invented creative pass.");
    const media = report.media;
    if (!text(media.file) || media.sha256 !== output.sha256 || media.sizeBytes !== output.sizeBytes) fail(`Proof inspection does not match actual output bytes: ${proof.id}`);
    if (![media.durationSeconds, media.width, media.height, media.fps].every(positive) || typeof media.hasAudio !== "boolean") fail("Proof inspection must include measured media properties.");
    checkedProofs.push({ id: proof.id, inputSha256: await hashFile(path.join(root, proof.input)), inputContentSha256: jsonHash(input), outputSha256: output.sha256 });
  }
  unique(checkedProofs.map((proof) => proof.inputContentSha256), "Proof JSON content hashes (whitespace changes are not different inputs)");
  unique(checkedProofs.map((proof) => proof.outputSha256), "Proof output hashes");
  return { status: "ready-for-review", repoDirectory: root, manifest, files, proofs: checkedProofs, creativeReview: review, limitations: ["Child code was not executed. Hash-bound technical reports do not prove creative quality or source-format equivalence."] };
}
