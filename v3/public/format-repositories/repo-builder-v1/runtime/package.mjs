import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { canonicalDirectory, checkRepo, hashFile, regularFile, safeRelativePath } from "./contracts.mjs";

function execute(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, TZ: "UTC" }, stdio: ["ignore", "pipe", "pipe"] });
}

export async function archiveFiles({ root, files, output, metadata }) {
  root = path.resolve(root);
  output = path.resolve(output);
  output = path.join(await canonicalDirectory(path.dirname(output)), path.basename(output));
  if (!output.endsWith(".zip")) throw new Error("Output must be a new .zip file");
  if (await lstat(output).catch((e) => { if (e.code === "ENOENT") return null; throw e; })) throw new Error("Archive already exists; preserve it and choose a new output");
  if (!Array.isArray(files) || !files.length || files.length > 2000) throw new Error("Release needs an explicit bounded file allowlist");
  const paths = files.map(safeRelativePath);
  if (new Set(paths.map((file) => file.toLowerCase())).size !== paths.length || paths.includes("RELEASE-CONTENTS.json")) throw new Error("Duplicate or reserved release path");
  const inventory = [];
  let bytes = 0;
  for (const file of paths.sort()) {
    const source = await regularFile(root, file);
    const info = await lstat(source);
    const sizeBytes = info.size;
    bytes += sizeBytes;
    if (bytes > 200 * 1024 * 1024) throw new Error("Baseline release exceeds 200 MB");
    if (/\.(?:json|md|mjs|js|ts|py|sh|txt|yaml|yml|toml)$/i.test(file)) {
      const text = await readFile(source, "utf8");
      if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-proj-|ghp_|github_pat_)[A-Za-z0-9_-]{20,}/.test(text)) throw new Error(`Credential-like value in ${file}; inspect locally before release`);
    }
    inventory.push({ file, sha256: await hashFile(source), sizeBytes, mode: info.mode & 0o111 ? "0755" : "0644" });
  }
  const temporary = await mkdtemp(path.join(tmpdir(), "wiggly-builder-package-"));
  const stage = path.join(temporary, "stage");
  const extracted = path.join(temporary, "extracted");
  const candidate = path.join(temporary, "candidate.zip");
  try {
    await mkdir(stage);
    for (const item of inventory) {
      const target = path.join(stage, item.file);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(await regularFile(root, item.file), target, constants.COPYFILE_EXCL);
      if (await hashFile(target) !== item.sha256) throw new Error(`Source changed during packaging: ${item.file}`);
    }
    const receipt = { schemaVersion: 1, ...metadata, publication: "local-only", checks: "integrity-and-structure-not-creative-certification", files: inventory };
    await writeFile(path.join(stage, "RELEASE-CONTENTS.json"), `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
    const allPaths = [...paths, "RELEASE-CONTENTS.json"].sort();
    for (const file of allPaths) {
      await chmod(path.join(stage, file), inventory.find((item) => item.file === file)?.mode === "0755" ? 0o755 : 0o644);
      await utimes(path.join(stage, file), new Date("1980-01-01T00:00:00Z"), new Date("1980-01-01T00:00:00Z"));
    }
    execute("zip", ["-X", "-q", candidate, "--", ...allPaths], stage);
    const archived = execute("unzip", ["-Z1", candidate]).trim().split("\n").sort();
    if (JSON.stringify(archived) !== JSON.stringify(allPaths)) throw new Error("Archive differs from release allowlist");
    execute("unzip", ["-q", candidate, "-d", extracted]);
    for (const file of allPaths) {
      const unpacked = await regularFile(extracted, file);
      if (await hashFile(unpacked) !== await hashFile(path.join(stage, file))) throw new Error(`Extracted checksum mismatch: ${file}`);
      if (((await lstat(unpacked)).mode & 0o111) !== ((await lstat(path.join(stage, file))).mode & 0o111)) throw new Error(`Extracted executable mode mismatch: ${file}`);
    }
    await copyFile(candidate, output, constants.COPYFILE_EXCL);
    return { status: "packaged", file: output, sha256: await hashFile(output), sizeBytes: (await lstat(output)).size, fileCount: allPaths.length, review: metadata.review || "not-assessed", publication: "local-only" };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function packageRepo({ repoDirectory, output }) {
  const checked = await checkRepo(repoDirectory);
  return archiveFiles({ root: repoDirectory, files: checked.manifest.releaseFiles, output, metadata: { kind: "wiggly-format", slug: checked.manifest.slug, version: checked.manifest.version, review: checked.manifest.review } });
}
