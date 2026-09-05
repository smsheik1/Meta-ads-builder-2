import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export function requireEpisodeInputSource(input) {
  if (!input) {
    throw new Error("Pass an absolute existing --input=/path/timing.json for every real episode. The bundled sample is available only through the smoke command.");
  }
  return input;
}

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
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

export function hashValue(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function toolExecutable(program, env = process.env) {
  if (program === "node") return process.execPath;
  const override = { ffmpeg: "FFMPEG", ffprobe: "FFPROBE", python: "PYTHON", python3: "PYTHON" }[program];
  return (override && env[override]) || program;
}

export function execute(program, args, { capture = false, cwd, env = process.env, timeoutMs, stdoutOnly = false } = {}) {
  const executable = toolExecutable(program, env);
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd, env,
      ...(timeoutMs ? { timeout: timeoutMs, killSignal: "SIGKILL" } : {}),
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let output = "";
    let errors = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => {
        errors += chunk;
        if (!stdoutOnly) output += chunk;
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${executable} exited ${code}\n${(stdoutOnly ? errors : output).slice(-8000)}`));
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
