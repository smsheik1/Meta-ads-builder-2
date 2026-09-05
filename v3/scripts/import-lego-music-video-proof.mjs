// Recover a selected existing production run into a portable local input.
// No generation endpoints or credentials are used.
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const v3Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proofNames = {
  cheesecake: "kd702nzn0saqq308kcm27as5n189stpq",
  cookies: "kd70sqvw2368fyszaa0s8bqp5189f1yv",
};
const name = process.argv[2];
if (!Object.hasOwn(proofNames, name)) throw new Error("Choose cheesecake or cookies.");
const record = JSON.parse(await readFile(path.join(v3Root, "tmp/lego-recovery", `${proofNames[name]}.json`), "utf8"));
const output = path.join(v3Root, "tmp/lego-recovery", name);
await mkdir(path.join(output, "media"), { recursive: true });
const provenance = [];
async function recover(url, file) {
  if (!url?.startsWith("https://wry-viper-639.convex.cloud/api/storage/")) throw new Error("Expected a recorded Wiggly storage URL.");
  const target = path.join(output, "media", file);
  try { await stat(target); } catch {
    const uuid = new URL(url).pathname.split("/").at(-1);
    const downloaded = path.join("/Users/shaz/Downloads", `${uuid}${path.extname(file)}`);
    try { await copyFile(downloaded, target); } catch {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`Existing asset ${file}: HTTP ${response.status}`);
      await writeFile(target, new Uint8Array(await response.arrayBuffer()), { flag: "wx" });
    }
  }
  const bytes = await readFile(target);
  if (!bytes.length) throw new Error(`Empty ${file}`);
  provenance.push({ path: `media/${file}`, sourceUrl: url, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
  return `media/${file}`;
}
const storyboard = record.storyboard;
const scene = record.scene;
scene.audio.url = await recover(scene.audio.url, "song.mp3");
if (scene.brand.logoUrl?.startsWith("https://wry-viper-639.convex.cloud/api/storage/")) scene.brand.logoUrl = await recover(scene.brand.logoUrl, "brand-logo.png");
else scene.brand.logoUrl = null;
scene.brand.faviconUrl = null;
scene.brand.ogImageUrl = null;
scene.brand.screenshotUrl = null;
storyboard.referenceFrame.image.url = await recover(storyboard.referenceFrame.image.url, "reference.jpg");
for (const shot of storyboard.shots) {
  shot.image.url = await recover(shot.image.url, `shot-${shot.shotIndex + 1}.jpg`);
  shot.video.url = await recover(shot.video.url, `clip-${shot.shotIndex + 1}.mp4`);
}
await recover(storyboard.musicVideo.stitchedVideo.url, "historical-stitched.mp4");
// No database/session identifiers are needed in the consumer's scene.
scene.metadata = { candidateIndex: 0, generationBatchId: `recovered-${name}`, researchRunId: "recovered-public-proof", brandSnapshotId: "recovered-public-proof", model: "historical-production", provider: "deterministic", generatedAt: record.createdAt };
scene.layout.musicVideo = undefined;
const input = { version: 1, scene, story: storyboard.storyPlan, media: { song: "media/song.mp3", reference: "media/reference.jpg", shots: storyboard.shots.map(shot => ({ image: shot.image.url, video: shot.video.url })) } };
await writeFile(path.join(output, "input.json"), JSON.stringify(input, null, 2) + "\n");
await writeFile(path.join(output, "provenance.json"), JSON.stringify({ recoveredAt: new Date().toISOString(), historicalStoryboardId: record.storyboardId, historicalImageModel: storyboard.imageModel, historicalVideoModel: "not recorded on these stored clip records", historicalFinalExportFound: false, source: "existing Wiggly production records and matching local downloads", assets: provenance }, null, 2) + "\n");
console.log(`${name}: recovered ${provenance.length} assets to ${output}; no generation.`);
