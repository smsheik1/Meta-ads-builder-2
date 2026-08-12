import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

export async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

export function hashValue(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function execute(program, args, { capture = false, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {
      cwd,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let output = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { output += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${program} exited ${code}\n${output.slice(-8000)}`));
    });
  });
}

export function parseArgs(values) {
  return Object.fromEntries(values.filter((value) => value.startsWith("--")).map((value) => {
    const [key, ...rest] = value.slice(2).split("=");
    return [key, rest.length ? rest.join("=") : true];
  }));
}

export function resolveRunDirectory(root, runId) {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(runId || "")) {
    throw new Error("Pass --run=<lowercase-hyphenated-id>.");
  }
  return path.join(root, "agent-runs", runId);
}

export async function probe(file) {
  const output = await execute("ffprobe", [
    "-v", "error",
    "-show_streams",
    "-show_format",
    "-of", "json",
    file,
  ], { capture: true });
  return JSON.parse(output);
}

export function audioDuration(probeResult) {
  const audio = probeResult.streams.find((stream) => stream.codec_type === "audio");
  return Number(audio?.duration || probeResult.format?.duration || 0);
}
