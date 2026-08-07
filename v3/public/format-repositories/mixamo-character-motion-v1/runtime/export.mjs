import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadMotionCatalog } from "./motion-catalog.mjs";

const formatRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const formats = new Set(["gif", "mp4"]);

export class ExportInputError extends Error {}

function execute(program, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd: formatRoot, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve()
      : reject(new Error(`${path.basename(program)} exited ${code}\n${output.slice(-12_000)}`)));
  });
}

async function readJson(relative) {
  return JSON.parse(await readFile(path.join(formatRoot, relative), "utf8"));
}

export async function renderDownload({ characterId, motionId, format } = {}) {
  if (typeof characterId !== "string" || typeof motionId !== "string" || !formats.has(format)) {
    throw new ExportInputError("Choose a valid character, motion, and download format.");
  }
  const [catalog, motionCatalog] = await Promise.all([
    readJson("assets/character-packs.json"),
    loadMotionCatalog(),
  ]);
  const character = catalog.packs.find((candidate) => candidate.id === characterId && candidate.status === "motion-ready");
  const motion = motionCatalog.motions.find((candidate) => candidate.id === motionId);
  if (!character || !motion) throw new ExportInputError("The selected character or motion is unavailable.");

  const runsRoot = path.join(formatRoot, "agent-runs");
  await mkdir(runsRoot, { recursive: true });
  const runDirectory = await mkdtemp(path.join(runsRoot, "_download-"));
  const inputPath = path.join(runDirectory, "input.json");
  const mp4Path = path.join(runDirectory, "render.mp4");
  const gifPath = path.join(runDirectory, "render.gif");
  try {
    await writeFile(inputPath, `${JSON.stringify({
      characterId,
      motionId,
      title: character.label,
      background: "#0b3558",
    }, null, 2)}\n`);
    await execute(process.execPath, [
      "runtime/render.mjs",
      `--input=${path.relative(formatRoot, inputPath)}`,
      `--output=${path.relative(formatRoot, mp4Path)}`,
      `--work-dir=${path.relative(formatRoot, runDirectory)}`,
      `--report=${path.relative(formatRoot, path.join(runDirectory, "motion-report.json"))}`,
    ]);
    if (format === "gif") {
      await execute("ffmpeg", [
        "-y", "-i", mp4Path,
        "-vf", "fps=15,scale=640:-1:flags=lanczos,split[source][paletteSource];[paletteSource]palettegen=max_colors=128[palette];[source][palette]paletteuse=dither=bayer:bayer_scale=3",
        "-loop", "0", gifPath,
      ]);
    }
    const output = format === "gif" ? gifPath : mp4Path;
    return {
      bytes: await readFile(output),
      contentType: format === "gif" ? "image/gif" : "video/mp4",
      filename: `${characterId}-${motionId}.${format}`,
    };
  } finally {
    await rm(runDirectory, { recursive: true, force: true });
  }
}

function parseArgs(values) {
  return Object.fromEntries(values.filter((value) => value.startsWith("--")).map((value) => {
    const [key, ...parts] = value.slice(2).split("=");
    return [key, parts.join("=")];
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.output) throw new ExportInputError("Pass --output=<file>.");
  const result = await renderDownload({ characterId: args.character, motionId: args.motion, format: args.format });
  await writeFile(path.resolve(args.output), result.bytes);
  console.log(JSON.stringify({ output: path.resolve(args.output), filename: result.filename, bytes: result.bytes.length }));
}
