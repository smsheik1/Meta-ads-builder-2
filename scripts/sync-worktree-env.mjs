#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function statOrNull(filePath) {
  try {
    return lstatSync(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export function hasConfiguredConvexUrl(envPath) {
  try {
    return readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .some((line) => {
        const match = line.match(/^NEXT_PUBLIC_V3_CONVEX_URL=(.*)$/);
        return Boolean(match?.[1]?.trim());
      });
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export function parseWorktreePaths(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length));
}

export function discoverConfiguredSource(repoRoot) {
  const result = spawnSync("git", ["worktree", "list", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) return null;

  const currentRoot = realpathSync(repoRoot);
  for (const worktreePath of parseWorktreePaths(result.stdout)) {
    let candidateRoot;
    try {
      candidateRoot = realpathSync(worktreePath);
    } catch {
      continue;
    }
    if (candidateRoot === currentRoot) continue;

    const candidate = join(candidateRoot, "v3", ".env.local");
    if (hasConfiguredConvexUrl(candidate)) return candidate;
  }

  return null;
}

function reportMissing(message, optional, log) {
  if (!optional) throw new Error(message);
  log(`[worktree-env] ${message}`);
  return { status: "missing" };
}

export function ensureWorktreeEnv({
  repoRoot = defaultRepoRoot,
  sourcePath,
  optional = false,
  log = console.log,
} = {}) {
  const resolvedRoot = resolve(repoRoot);
  const target = join(resolvedRoot, "v3", ".env.local");
  const existing = statOrNull(target);

  if (existing) {
    if (hasConfiguredConvexUrl(target)) {
      log("[worktree-env] v3/.env.local is already configured.");
      return { status: "existing", target };
    }
    return reportMissing(
      "v3/.env.local exists but NEXT_PUBLIC_V3_CONVEX_URL is empty; leaving it untouched.",
      optional,
      log,
    );
  }

  const configuredSource = sourcePath
    ? resolve(sourcePath)
    : process.env.WIGGLY_ENV_SOURCE
      ? resolve(process.env.WIGGLY_ENV_SOURCE)
      : discoverConfiguredSource(resolvedRoot);

  if (!configuredSource || !hasConfiguredConvexUrl(configuredSource)) {
    return reportMissing(
      "No configured Wiggly v3/.env.local was found. Run `npm run convex:dev -w @wiggly/v3` or pass `--source=/path/to/v3/.env.local`.",
      optional,
      log,
    );
  }

  try {
    symlinkSync(realpathSync(configuredSource), target, "file");
  } catch (error) {
    if (error?.code === "EEXIST" && hasConfiguredConvexUrl(target)) {
      return { status: "existing", target };
    }
    throw error;
  }

  log(
    "[worktree-env] Linked the existing Wiggly environment into this worktree.",
  );
  return { status: "linked", source: realpathSync(configuredSource), target };
}

function readOption(name) {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isMain) {
  try {
    ensureWorktreeEnv({
      repoRoot: readOption("repo-root") ?? defaultRepoRoot,
      sourcePath: readOption("source"),
      optional: process.argv.includes("--optional"),
    });
  } catch (error) {
    console.error(`[worktree-env] ${error.message}`);
    process.exitCode = 1;
  }
}
