import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { chmod, copyFile, lstat, mkdir, mkdtemp, open, readFile, rename, rm, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execute, exists, parseArgs, readJson, sha256, writeJson } from "./runtime/common.mjs";

const deniedDirectories = new Set(["agent-runs", "artifacts", "downloads", "outputs", "private", "input-source", "node_modules", "venv", "env", "cache", "caches", "models", "weights", "target", "build", "dist", "tmp", "coverage", "test-results", "__pycache__"]);
const mediaExtension = /\.(mp4|mov|webm|mkv|mka|mp3|m4a|aac|wav|flac|ogg|aiff?)$/i;
const weightOrCredentialExtension = /\.(bin|safetensors|onnx|pt|pth|ckpt|pem|p12|pfx|key|keystore|pyc)$/i;
const requiredManifests = ["KIT-MANIFEST.json", "package.json", "package-lock.json", "format.json", "release-files.json"];
const ZIP_EPOCH = new Date("1980-01-01T00:00:00.000Z");

async function normalizeStagedFile(file) {
  // Only shell entry points need executable permission; Node/Python entry points use their explicit interpreter.
  await chmod(file, file.endsWith(".sh") ? 0o755 : 0o644);
  await utimes(file, ZIP_EPOCH, ZIP_EPOCH);
}

export function validateReleasePath(file) {
  if (typeof file !== "string" || !/^[A-Za-z0-9._/-]+$/.test(file) || file.startsWith("/")) throw new Error(`Unsafe release path: ${file}`);
  const parts = file.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || deniedDirectories.has(part.toLowerCase()) || (part.startsWith(".") && part !== ".gitignore" && part !== ".cursor"))) throw new Error(`Private or unsafe release path: ${file}`);
  if (weightOrCredentialExtension.test(file) || /(^|[._-])(secrets?|credentials?|cookies?|tokens?|api[-_]?keys?|id_rsa)([._-]|$)/i.test(parts.at(-1))) throw new Error(`Private file cannot be released: ${file}`);
  return file;
}

async function regularFile(root, file) {
  let location = root;
  for (const part of file.split("/")) {
    location = path.join(location, part);
    const info = await lstat(location);
    if (info.isSymbolicLink()) throw new Error(`Symlink cannot be released: ${file}`);
  }
  const info = await lstat(location);
  if (!info.isFile()) throw new Error(`Release selection must name a regular file, not a directory: ${file}`);
  return { location, bytes: info.size };
}

export async function selectReleaseFiles(root) {
  const allowlist = await readJson(path.join(root, "release-files.json"));
  if (allowlist.schemaVersion !== 1 || !Array.isArray(allowlist.files) || !allowlist.files.length || !Array.isArray(allowlist.approvedMedia)) throw new Error("Invalid release-files.json schema");
  const seen = new Set();
  const approvedMedia = new Map();
  for (const media of allowlist.approvedMedia) {
    validateReleasePath(media.file);
    if (!mediaExtension.test(media.file) || !/^[a-f0-9]{64}$/.test(media.sha256) || approvedMedia.has(media.file)) throw new Error("Approved release media needs one exact path and SHA-256");
    approvedMedia.set(media.file, media.sha256);
  }
  const files = [];
  for (const file of allowlist.files) {
    validateReleasePath(file);
    if (seen.has(file.toLowerCase())) throw new Error(`Duplicate release path: ${file}`);
    seen.add(file.toLowerCase());
    if (mediaExtension.test(file) && !approvedMedia.has(file)) throw new Error(`Unapproved audio/video cannot be released: ${file}`);
    const info = await regularFile(root, file);
    const checksum = await sha256(info.location);
    if (approvedMedia.has(file) && checksum !== approvedMedia.get(file)) throw new Error(`Approved media was replaced or modified: ${file}`);
    files.push({ path: file, bytes: info.bytes, sha256: checksum });
  }
  for (const required of requiredManifests) if (!allowlist.files.includes(required)) throw new Error(`Required release file omitted: ${required}`);
  for (const media of approvedMedia.keys()) if (!allowlist.files.includes(media)) throw new Error(`Approved media is not selected: ${media}`);
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

export async function releaseVersion(root) {
  const [kit, pkg, lock, format] = await Promise.all(["KIT-MANIFEST.json", "package.json", "package-lock.json", "format.json"].map((file) => readJson(path.join(root, file))));
  const versions = [kit.formatVersion, pkg.version, lock.version, lock.packages?.[""]?.version, format.version];
  if (!versions.every((version) => version === versions[0]) || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(versions[0])) throw new Error("Release version mismatch across KIT-MANIFEST, format, package, and package-lock");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(kit.kit) || pkg.name !== kit.kit || lock.name !== kit.kit) throw new Error("Release kit/package identity mismatch");
  return { kit: kit.kit, formatVersion: versions[0] };
}

export async function stageRelease({ root, stageDirectory }) {
  const version = await releaseVersion(root);
  const files = await selectReleaseFiles(root);
  await mkdir(stageDirectory);
  for (const file of files) {
    const source = (await regularFile(root, file.path)).location;
    const destination = path.join(stageDirectory, file.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination, constants.COPYFILE_EXCL);
    if (await sha256(destination) !== file.sha256 || await sha256(source) !== file.sha256) throw new Error(`File changed during release staging: ${file.path}`);
    await normalizeStagedFile(destination);
  }
  const inventory = { schemaVersion: 1, ...version, files };
  await writeJson(path.join(stageDirectory, "RELEASE-CONTENTS.json"), inventory);
  await normalizeStagedFile(path.join(stageDirectory, "RELEASE-CONTENTS.json"));
  return { ...version, files, inventorySha256: await sha256(path.join(stageDirectory, "RELEASE-CONTENTS.json")) };
}

async function verifyArchive(archive, contentsDirectory, expected, temporary) {
  const entries = (await execute("unzip", ["-Z1", archive], { capture: true, stdoutOnly: true })).trim().split("\n").sort();
  const expectedPaths = [...expected.files.map((file) => file.path), "RELEASE-CONTENTS.json"].sort();
  if (JSON.stringify(entries) !== JSON.stringify(expectedPaths)) throw new Error("Archive entries differ from the exact release allowlist");
  const extracted = path.join(temporary, "verified-extraction");
  await execute("unzip", ["-q", archive, "-d", extracted], { capture: true });
  for (const file of expectedPaths) {
    const destination = (await regularFile(extracted, file)).location;
    if (await sha256(destination) !== await sha256(path.join(contentsDirectory, file))) throw new Error(`Archive content checksum failed: ${file}`);
  }
}

async function refreshStable(outputDirectory, versionArchive, metadata) {
  const stable = path.join(outputDirectory, metadata.stableArchive.file);
  const temporary = `${stable}.${randomUUID()}.next`;
  try {
    await copyFile(versionArchive, temporary, constants.COPYFILE_EXCL);
    if (await sha256(temporary) !== metadata.archive.sha256) throw new Error("Stable archive copy checksum failed");
    await rename(temporary, stable);
  } finally { await rm(temporary, { force: true }); }
  await writeFile(`${stable}.sha256`, `${metadata.archive.sha256}  ${metadata.stableArchive.file}\n`);
  await writeJson(path.join(outputDirectory, "latest-release.json"), metadata);
}

export async function buildKit({ root, outputDirectory = path.join(root, "downloads") }) {
  root = path.resolve(root);
  outputDirectory = path.resolve(outputDirectory);
  await mkdir(outputDirectory, { recursive: true });
  if ((await lstat(outputDirectory)).isSymbolicLink()) throw new Error("Release output directory must not be a symlink");
  const lockPath = path.join(outputDirectory, ".build-kit.lock");
  const lock = await open(lockPath, "wx").catch(() => { throw new Error("Release build is active or interrupted. Inspect the build lock before retrying."); });
  let temporary;
  try {
    temporary = await mkdtemp(path.join(outputDirectory, ".kit-build-"));
    const contents = path.join(temporary, "contents");
    const staged = await stageRelease({ root, stageDirectory: contents });
    const archiveName = `${staged.kit}-${staged.formatVersion}.zip`;
    const versionArchive = path.join(outputDirectory, archiveName);
    const metadataName = `${staged.kit}-${staged.formatVersion}.release.json`;
    const metadataFile = path.join(outputDirectory, metadataName);
    const checksumFile = `${versionArchive}.sha256`;
    for (const name of [archiveName, `${archiveName}.sha256`, metadataName, `${staged.kit}.zip`, `${staged.kit}.zip.sha256`, "latest-release.json"]) {
      const target = path.join(outputDirectory, name);
      // lstat also notices dangling symlinks; exists/access would incorrectly treat them as absent.
      const info = await lstat(target).catch((error) => { if (error.code === "ENOENT") return null; throw error; });
      if (info && (!info.isFile() || info.isSymbolicLink())) throw new Error(`Release destination is not a regular file (symlinks forbidden): ${name}`);
    }
    if (await exists(versionArchive) || await exists(metadataFile) || await exists(checksumFile)) {
      if (!await exists(versionArchive) || !await exists(metadataFile) || !await exists(checksumFile)) throw new Error("Incomplete previous version publication: inspect its preserved artifacts before retrying");
      const previous = await readJson(metadataFile);
      if (previous.kit !== staged.kit || previous.formatVersion !== staged.formatVersion || previous.archive?.file !== archiveName || previous.stableArchive?.file !== `${staged.kit}.zip` || previous.contentsManifest?.sha256 !== staged.inventorySha256 || await sha256(versionArchive) !== previous.archive.sha256 || (await readFile(checksumFile, "utf8")).trim() !== `${previous.archive.sha256}  ${archiveName}`) throw new Error("Existing release differs or was modified. Do not overwrite a released version; choose a new version.");
      await verifyArchive(versionArchive, contents, staged, temporary);
      await refreshStable(outputDirectory, versionArchive, previous);
      return { ...previous, idempotent: true };
    }
    const candidate = path.join(temporary, archiveName);
    await execute("zip", ["-X", "-q", candidate, "--", ...staged.files.map((file) => file.path), "RELEASE-CONTENTS.json"], { cwd: contents, capture: true, env: { ...process.env, TZ: "UTC" } });
    await verifyArchive(candidate, contents, staged, temporary);
    const archiveSha = await sha256(candidate);
    const metadata = {
      schemaVersion: 1,
      kit: staged.kit,
      formatVersion: staged.formatVersion,
      archive: { file: archiveName, bytes: (await lstat(candidate)).size, sha256: archiveSha },
      stableArchive: { file: `${staged.kit}.zip`, sha256: archiveSha },
      contentsManifest: { file: "RELEASE-CONTENTS.json", sha256: staged.inventorySha256 },
      fileCount: staged.files.length + 1,
      archiveIntegrityVerified: true,
      acceptanceStatus: "not-certified-by-packaging",
      publication: "local-only",
    };
    // Immutable version artifacts are exclusive creates. Metadata is written last; partial publication never claims success.
    await copyFile(candidate, versionArchive, constants.COPYFILE_EXCL);
    await writeFile(checksumFile, `${archiveSha}  ${archiveName}\n`, { flag: "wx" });
    await writeFile(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, { flag: "wx" });
    await refreshStable(outputDirectory, versionArchive, metadata);
    return metadata;
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  const root = path.dirname(fileURLToPath(import.meta.url));
  console.log(JSON.stringify(await buildKit({ root, ...(options.output ? { outputDirectory: path.resolve(options.output) } : {}) }), null, 2));
}
