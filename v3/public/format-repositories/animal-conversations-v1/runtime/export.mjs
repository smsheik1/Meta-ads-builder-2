import { copyFile, lstat, mkdir, mkdtemp, readdir, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { exists, readJson, sha256, writeJson } from "./common.mjs";
import { canonicalHash } from "./identity.mjs";
import { verifyFinalization } from "./quality.mjs";

const MANIFEST = "checksums.json";
const BASE_FILES = ["final.mp4", "index.html", "evidence/review-summary.json", "evidence/contact-sheet.png"];
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

function presentationText(value) {
  return String(value ?? "")
    .replace(/https?:\/\/[^\s<>"']+/gi, "[source link omitted]")
    .replace(/(?:[A-Za-z]:[\\/]|\/)[^\s<>"']+/g, "[local path omitted]")
    .replace(/\b(?:Bearer\s+|(?:api[_-]?key|access[_-]?token|password|secret|token|signature)\s*[:=]\s*)[^\s,;]+/gi, "[credential omitted]");
}

function exportPath(root, runDirectory, output) {
  const destination = path.resolve(output || path.join(root, "outputs", path.basename(runDirectory)));
  const run = path.resolve(runDirectory);
  if (destination === run || destination.startsWith(run + path.sep) || run.startsWith(destination + path.sep)) throw new Error("Export destination must be separate from the private run and cannot contain it.");
  return destination;
}

async function reviewMedia(runDirectory, includeReviewMedia) {
  if (!includeReviewMedia) return [];
  const review = await readJson(path.join(runDirectory, "script-review.json"));
  const files = [{ source: "script-review/source.wav", destination: "review-media/source.wav" }];
  for (const [index, beat] of review.beats.entries()) {
    const source = String(beat.clip || "").replaceAll("\\", "/");
    if (!/^script-review\/[a-zA-Z0-9_-]+\.wav$/.test(source)) throw new Error("Review clip must be a local WAV inside script-review/.");
    files.push({ source, destination: `review-media/beat-${String(index).padStart(3, "0")}.wav`, beatIndex: index });
  }
  for (const file of files) {
    const info = await lstat(path.join(runDirectory, file.source));
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("Review media must be regular local files, not links.");
    const canonical = review.media?.find((media) => media.path === file.source);
    if (!canonical || canonical.sha256 !== await sha256(path.join(runDirectory, file.source))) throw new Error("Review media no longer matches the approved review hashes.");
  }
  return files;
}

function reviewSummary({ current, input, formatVersion, media }) {
  const { playback, delivery, deliverySha256 } = current;
  const criteria = playback.criteria.map((result) => ({ id: result.id, status: result.status }));
  const limitations = criteria.filter((result) => result.status === "unscored").map((result) => `${result.id}: not scored because direct auditory perception was unavailable. Detailed reviewer reasons remain in the private canonical record.`);
  return {
    schemaVersion: 1,
    kind: "sanitized-export-presentation-not-canonical-evidence",
    formatVersion,
    episode: {
      title: presentationText(input.title), episodeLabel: presentationText(input.episodeLabel), background: presentationText(input.background),
      timeline: input.timeline.map((beat) => ({
        start: beat.start, end: beat.end, speaker: beat.speaker, camera: beat.camera,
        caption: presentationText(beat.caption), ...(beat.vocalization ? { vocalization: presentationText(beat.vocalization) } : {}),
        ...(beat.captionSpeaker ? { captionSpeaker: beat.captionSpeaker } : {}),
        ...(beat.bounceAt ? { bounceAt: beat.bounceAt } : {}),
      })),
    },
    review: {
      status: "pass", rubricVersion: playback.rubricVersion,
      technicalStatus: current.technical.status,
      perception: { visual: playback.perception.visual.mode, audio: playback.perception.audio.mode },
      passes: playback.passes.map((pass) => ({ id: pass.id, completed: pass.completed })), criteria, limitations,
      attestationLimit: "Recorded review results are attestations, not proof that software perceived the video or audio.",
    },
    canonicalEvidence: [...delivery.evidence, { path: "delivery.json", sha256: deliverySha256 }],
    media: media.map(({ destination, beatIndex }) => ({ path: destination, ...(beatIndex !== undefined ? { beatIndex } : {}) })),
    omissions: [
      "Original source media, raw downloader metadata, URLs, credentials, machine paths, and free-text source assertions are not exported.",
      "Canonical approval, render, quality, and playback records remain unchanged in the private run. Their hashes identify originals; this summary is a separate sanitized presentation, not rewritten canonical evidence.",
      "Reviewer identity, free-text observations, uncertainty notes, overlap explanations, and detailed perception reasons remain in the private evidence records.",
      ...(media.length ? ["Review WAVs were explicitly included; original downloaded video remains excluded."] : ["Source/review audio is omitted; no unavailable audio controls are shown."]),
    ],
  };
}

function reviewPage(summary) {
  const text = (value) => escapeHtml(value);
  const rows = summary.episode.timeline.map((beat, index) => {
    const clip = summary.media.find((entry) => entry.beatIndex === index);
    return `<tr><td>${text(beat.start)}–${text(beat.end)}s</td><td>${text(beat.speaker === "cat" ? "Dog" : beat.speaker)}</td><td>${text(beat.caption || beat.vocalization || "Silence")}</td><td>${text(beat.camera)}</td>${summary.media.length ? `<td>${clip ? `<audio controls preload="none" src="${text(clip.path)}"></audio>` : ""}</td>` : ""}</tr>`;
  }).join("");
  const fullAudio = summary.media.find((entry) => entry.path === "review-media/source.wav");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; media-src 'self' file:; img-src 'self' file:; base-uri 'none'; form-action 'none'"><title>${text(summary.episode.title)}</title>
<style>body{font:16px system-ui,sans-serif;margin:0;background:#f7f7f3;color:#191919}main{max-width:1040px;margin:auto;padding:32px 24px}h1{font-size:clamp(28px,5vw,48px);line-height:1.1;overflow-wrap:anywhere}video{display:block;max-height:75vh;max-width:100%;margin:24px auto;border-radius:12px;background:#111}a{color:#184ca8}section{margin:32px 0;padding:24px;background:white;border-radius:12px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:10px;text-align:left;border-bottom:1px solid #ddd;vertical-align:top}audio{max-width:240px;width:100%}.scroll{overflow:auto}img{max-width:100%;height:auto}code{overflow-wrap:anywhere}li{margin:8px 0}</style><main>
<p>Animal Conversations · ${text(summary.formatVersion)}</p><h1>${text(summary.episode.title)}</h1><video controls playsinline preload="metadata" src="final.mp4"></video><p><a href="final.mp4">Open video file</a></p><p>The MP4 is already included in this folder as <code>final.mp4</code>.</p>
<section><h2>Review status</h2><p>Required technical checks and recorded playback review passed. Background: ${text(summary.episode.background)}.</p><p>Visual perception: ${text(summary.review.perception.visual)}. Audio perception: ${text(summary.review.perception.audio)}.</p><ul>${summary.review.limitations.map((value) => `<li>${text(value)}</li>`).join("")}</ul><p>${text(summary.review.attestationLimit)}</p></section>
<section><h2>Approved episode — presentation copy</h2><p>Episode label: ${text(summary.episode.episodeLabel)}</p>${fullAudio ? `<p>Exact review audio</p><audio controls preload="none" src="${text(fullAudio.path)}"></audio>` : "<p>Review audio was not included in this export.</p>"}<div class="scroll"><table><thead><tr><th>Time</th><th>Character</th><th>Line / sound</th><th>Camera</th>${summary.media.length ? "<th>Review clip</th>" : ""}</tr></thead><tbody>${rows}</tbody></table></div></section>
<section><h2>Inspection contact sheet</h2><img src="evidence/contact-sheet.png" alt="Rendered video inspection contact sheet"></section>
<section><h2>What is included</h2><p><a href="evidence/review-summary.json">Sanitized review summary</a> · <a href="checksums.json">File checksums</a></p><ul>${summary.omissions.map((value) => `<li>${text(value)}</li>`).join("")}</ul></section></main></html>`;
}

async function regularFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error("Export contains an unexpected symbolic link.");
    if (entry.isDirectory()) files.push(...await regularFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error("Export contains a non-file artifact.");
  }
  return files.sort();
}

async function verifyBundle({ directory, current, media }) {
  if (!(await lstat(directory)).isDirectory() || (await lstat(directory)).isSymbolicLink()) throw new Error("Export destination must be a regular directory.");
  const manifest = await readJson(path.join(directory, MANIFEST));
  if (manifest.schemaVersion !== 2 || manifest.kind !== "animal-conversations-export" || manifest.revisionId !== current.identity.revisionId || manifest.deliverySha256 !== current.deliverySha256 || manifest.finalVideoSha256 !== current.outputSha256 || manifest.qualityPolicyHash !== current.qualityPolicyHash) throw new Error("Export does not match the current finalized episode.");
  const expected = [...BASE_FILES, ...media.map((file) => file.destination)].sort();
  if (canonicalHash((manifest.files || []).map((file) => file.path).sort()) !== canonicalHash(expected)) throw new Error("Export manifest is missing required files or lists unexpected files.");
  if (canonicalHash(await regularFiles(directory)) !== canonicalHash([...expected, MANIFEST].sort())) throw new Error("Export contains missing or unexpected artifacts.");
  for (const file of manifest.files) {
    const full = path.join(directory, file.path);
    if (await sha256(full) !== file.sha256 || (await stat(full)).size !== file.bytes) throw new Error(`Export checksum mismatch: ${file.path}`);
  }
  if (await sha256(path.join(directory, "final.mp4")) !== current.outputSha256) throw new Error("Exported video no longer matches finalization.");
  for (const file of media) if (await sha256(path.join(directory, file.destination)) !== await sha256(path.join(current.runDirectory, file.source))) throw new Error("Exported review media differs from the canonical review WAV.");
  return { schemaVersion: 2, status: "pass", output: directory, video: path.join(directory, "final.mp4"), manifest, manifestHash: await sha256(path.join(directory, MANIFEST)) };
}

export async function verifyExport({ root, runDirectory, output }) {
  const current = { ...await verifyFinalization({ root, runDirectory }), runDirectory };
  const destination = exportPath(root, runDirectory, output);
  const manifest = await readJson(path.join(destination, MANIFEST));
  if (typeof manifest.includeReviewMedia !== "boolean") throw new Error("Export manifest must explicitly state whether review media is included.");
  const media = await reviewMedia(runDirectory, manifest.includeReviewMedia);
  return verifyBundle({ directory: destination, current, media });
}

export async function exportRun({ root, runDirectory, output, includeReviewMedia = false }) {
  const current = { ...await verifyFinalization({ root, runDirectory }), runDirectory };
  const destination = exportPath(root, runDirectory, output);
  const media = await reviewMedia(runDirectory, includeReviewMedia);
  if (await exists(destination)) {
    const verified = await verifyBundle({ directory: destination, current, media });
    if (verified.manifest.includeReviewMedia !== includeReviewMedia) throw new Error("Existing export options differ; use a new destination.");
    return verified;
  }
  await mkdir(path.dirname(destination), { recursive: true });
  const staging = await mkdtemp(path.join(path.dirname(destination), ".animal-export-"));
  let reserved = false;
  try {
    await mkdir(path.join(staging, "evidence"));
    await copyFile(path.join(runDirectory, "final.mp4"), path.join(staging, "final.mp4"));
    await copyFile(path.join(runDirectory, "contact-sheet.png"), path.join(staging, "evidence", "contact-sheet.png"));
    for (const file of media) {
      await mkdir(path.dirname(path.join(staging, file.destination)), { recursive: true });
      await copyFile(path.join(runDirectory, file.source), path.join(staging, file.destination));
    }
    const input = await readJson(path.join(runDirectory, "input.json"));
    const { formatVersion } = await readJson(path.join(root, "KIT-MANIFEST.json"));
    const summary = reviewSummary({ current, input, formatVersion, media });
    await writeJson(path.join(staging, "evidence", "review-summary.json"), summary);
    await writeFile(path.join(staging, "index.html"), reviewPage(summary));
    const files = [];
    for (const file of await regularFiles(staging)) files.push({ path: file, sha256: await sha256(path.join(staging, file)), bytes: (await stat(path.join(staging, file))).size });
    await writeJson(path.join(staging, MANIFEST), {
      schemaVersion: 2, kind: "animal-conversations-export", formatVersion,
      revisionId: current.identity.revisionId, deliverySha256: current.deliverySha256,
      finalVideoSha256: current.outputSha256, qualityPolicyHash: current.qualityPolicyHash,
      includeReviewMedia, files,
    });
    await verifyBundle({ directory: staging, current, media });
    // Recheck the private evidence after staging, before publishing the verified directory.
    const stillCurrent = await verifyFinalization({ root, runDirectory });
    if (stillCurrent.deliverySha256 !== current.deliverySha256) throw new Error("Finalized content changed during export; nothing was published.");
    await mkdir(destination); // Exclusive reservation; never replace an existing unrelated directory.
    reserved = true;
    await rename(staging, destination);
    reserved = false;
    return await verifyBundle({ directory: destination, current, media });
  } finally {
    if (reserved) await rmdir(destination).catch(() => {}); // Only removes our still-empty reservation.
    await rm(staging, { recursive: true, force: true });
  }
}
