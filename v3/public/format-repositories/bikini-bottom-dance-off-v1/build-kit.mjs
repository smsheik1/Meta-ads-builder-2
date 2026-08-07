#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const danceRoot = path.dirname(fileURLToPath(import.meta.url));
const motionRoot = path.resolve(danceRoot, "../mixamo-character-motion-v1");
const kitName = "wiggly-bikini-bottom-dance-off-format-kit";
const downloads = path.join(danceRoot, "downloads");
const output = path.join(downloads, `${kitName}.zip`);
const checksumFile = `${output}.sha256`;
const excludedRoots = new Set(["agent-runs", "downloads", "node_modules"]);
const excludedNames = new Set([".DS_Store", ".env", ".env.local", "__pycache__"]);

function execute(program, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${program} exited ${code}`)));
  });
}

function includeFrom(sourceRoot) {
  return (source) => {
    const relative = path.relative(sourceRoot, source);
    if (!relative) return true;
    const parts = relative.split(path.sep);
    return !excludedRoots.has(parts[0]) && !parts.some((part) => excludedNames.has(part) || part.endsWith(".pyc"));
  };
}

async function listFiles(directory, base = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute, base));
    else if (entry.isFile()) files.push({ path: path.relative(base, absolute).split(path.sep).join("/"), bytes: (await stat(absolute)).size });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

await mkdir(downloads, { recursive: true });
const temporary = await mkdtemp(path.join(tmpdir(), "wiggly-dance-off-"));
const staged = path.join(temporary, kitName);
try {
  await mkdir(staged, { recursive: true });
  await cp(danceRoot, path.join(staged, "bikini-bottom-dance-off-v1"), { recursive: true, filter: includeFrom(danceRoot) });
  await cp(motionRoot, path.join(staged, "mixamo-character-motion-v1"), { recursive: true, filter: includeFrom(motionRoot) });
  await writeFile(path.join(staged, "package.json"), `${JSON.stringify({
    name: kitName,
    private: true,
    version: "0.6.0",
    workspaces: ["bikini-bottom-dance-off-v1", "mixamo-character-motion-v1"],
    scripts: {
      check: "npm --workspace wiggly-bikini-bottom-dance-off-format-kit run check",
      smoke: "npm --workspace wiggly-bikini-bottom-dance-off-format-kit run smoke",
      "list-motions": "npm --workspace wiggly-bikini-bottom-dance-off-format-kit run list-motions"
    }
  }, null, 2)}\n`);
  const files = await listFiles(staged);
  await writeFile(path.join(staged, "KIT-MANIFEST.json"), `${JSON.stringify({
    kit: kitName,
    formatVersion: "0.6.0",
    builtAt: new Date().toISOString(),
    officialFormat: "bikini-bottom-dance-off-v1",
    officialMotionDependency: "mixamo-character-motion-v1",
    install: "npm install",
    smoke: "npm run smoke",
    excluded: ["secrets", "node_modules", "agent run caches", "operator songs", "source Mixamo DAE imports", "download artifacts"],
    files,
  }, null, 2)}\n`);
  await rm(output, { force: true });
  await rm(checksumFile, { force: true });
  await execute("zip", ["-q", "-r", output, kitName], temporary);
  const bytes = await readFile(output);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  await writeFile(checksumFile, `${checksum}  ${path.basename(output)}\n`);
  console.log(JSON.stringify({ output, bytes: bytes.length, sha256: checksum, fileCount: files.length + 2 }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
