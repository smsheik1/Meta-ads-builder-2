// Operator-only recovery. Reads existing records; never deploys or generates media.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve("convex/package.json")), "bin/main.js");
const v3Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(v3Root, "tmp", "lego-recovery");
const query = `
const boards = await ctx.db.query("jingleStoryboards").order("desc").take(100);
const completed = boards.filter(row => row.storyboard.musicVideo?.stitchedVideo && row.storyboard.shots.every(shot => shot.video?.storageId));
return await Promise.all(completed.map(async row => {
  const record = await ctx.db.get(row.sceneId);
  const jobs = await ctx.db.query("renderJobs").withIndex("by_sessionId_and_updatedAt", q => q.eq("sessionId", row.sessionId)).order("desc").take(100);
  const renders = await Promise.all(jobs.filter(job => job.sceneId === row.sceneId && job.status === "ready" && job.outputStorageId).map(async job => ({ id: job._id, rendererVersion: job.rendererVersion, createdAt: job.createdAt, url: await ctx.storage.getUrl(job.outputStorageId) })));
  return { storyboardId: row._id, sceneId: row.sceneId, createdAt: row.createdAt, storyboard: row.storyboard, scene: record?.scene, renders };
}));`;
const result = spawnSync(process.execPath, [cli, "run", "--deployment", "wry-viper-639", "--codegen", "disable", "--typecheck", "disable", "--inline-query", query], {
  cwd: "/private/tmp", encoding: "utf8", timeout: 60_000, maxBuffer: 20_000_000,
});
if (result.status !== 0) throw new Error(result.error?.message || result.stderr);
const records = JSON.parse(result.stdout);
await mkdir(output, { recursive: true });
for (const record of records) {
  await writeFile(path.join(output, `${record.storyboardId}.json`), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
}
console.log(JSON.stringify(records.map(record => ({
  storyboardId: record.storyboardId,
  brand: record.scene?.brand?.name,
  hook: record.storyboard.shots[0]?.lyricLine,
  shots: record.storyboard.shots.length,
  songUrl: record.scene?.audio?.url,
  stitchedUrl: record.storyboard.musicVideo.stitchedVideo.url,
  finishedRenders: record.renders,
})), null, 2));
console.log(`Saved ${records.length} existing completed runs under ${output}. No provider calls.`);
