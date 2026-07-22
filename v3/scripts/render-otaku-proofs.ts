import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { otakuCompositionId } from "../features/experiments/otaku-format/Root";
import type { OtakuProofRun } from "../features/experiments/otaku-format/OtakuProofVideo";
import type { OtakuAssetLibrary } from "../public/format-repositories/otaku-explainer-v1/renderer/OtakuFormatRenderer";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const packageRoot = path.join(v3Root, "public", "format-repositories", "otaku-explainer-v1");
const outputRoot = path.join(packageRoot, "outputs");
const entryPoint = path.join(v3Root, "features", "experiments", "otaku-format", "render-entry.tsx");
const bundleDirectory = path.join(v3Root, "tmp", "otaku-format-remotion");

async function runFfmpeg(args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${stderr.slice(-1200)}`)));
  });
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const requestedRuns = process.argv.filter((argument) => argument.startsWith("--run=")).map((argument) => argument.split("=")[1]);
  const runIds = requestedRuns.length ? requestedRuns : ["naruto-compilers", "naruto-mcp", "yugioh-compilers"];
  const assets = JSON.parse(await readFile(path.join(packageRoot, "assets.json"), "utf8")) as OtakuAssetLibrary;
  const serveUrl = await bundle({
    entryPoint,
    publicDir: path.join(v3Root, "public"),
    outDir: bundleDirectory,
  });

  for (const runId of runIds) {
    const runPath = path.join(outputRoot, `${runId}.run.json`);
    const run = JSON.parse(await readFile(runPath, "utf8")) as OtakuProofRun & Record<string, unknown>;
    const inputProps = { assets, run };
    const compositions = await getCompositions(serveUrl, { inputProps });
    const composition = compositions.find((candidate) => candidate.id === otakuCompositionId);
    if (!composition) throw new Error(`Missing ${otakuCompositionId} composition.`);
    const outputLocation = path.join(outputRoot, `${runId}.mp4`);
    console.log(`Rendering ${runId} (${composition.durationInFrames} frames).`);
    await renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      crf: 24,
      imageFormat: "jpeg",
      jpegQuality: 88,
      inputProps,
      outputLocation,
      onProgress: ({ progress }) => {
        const percent = Math.round(progress * 100);
        if (percent % 10 === 0) process.stdout.write(`\r${runId}: ${percent}%`);
      },
    });
    process.stdout.write("\n");

    const sheetPath = path.join(outputRoot, `${runId}-contact-sheet.jpg`);
    await runFfmpeg([
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", outputLocation,
      "-vf", "fps=1/10,scale=240:427,tile=3x3:padding=8:margin=8:color=white",
      "-frames:v", "1",
      sheetPath,
    ]);
    await writeFile(runPath, `${JSON.stringify({
      ...run,
      renderedAt: new Date().toISOString(),
      output: `format-repositories/otaku-explainer-v1/outputs/${runId}.mp4`,
      contactSheet: `format-repositories/otaku-explainer-v1/outputs/${runId}-contact-sheet.jpg`,
    }, null, 2)}\n`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
