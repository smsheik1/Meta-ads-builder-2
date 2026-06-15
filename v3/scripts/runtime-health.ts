import { access, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { getCompositions } from "@remotion/renderer";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { PINNED_TTS_MODEL } from "../features/audio/sceneAudio";
import { adSceneCompositionId, adSceneFps } from "../remotion-entry/Root";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const v3Root = path.resolve(dirname, "..");
const repoRoot = path.resolve(v3Root, "..");
const renderEntry = path.join(v3Root, "remotion-entry", "index.ts");
const outputDir = path.join(v3Root, "tmp", "renders");
const healthBundleDir = path.join(v3Root, "tmp", "runtime-health-remotion-bundle");

type HealthStatus = "pass" | "fail";

type HealthCheck = {
  name: string;
  status: HealthStatus;
  message: string;
};

const secretNames = new Set([
  "FIRECRAWL_API_KEY",
  "DEEPGRAM_API_KEY",
  "GEMINI_API_KEY",
]);

async function loadEnvFile(filePath: string, options: { override?: boolean } = {}) {
  try {
    const content = await readFile(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] && !options.override) continue;
      process.env[key] = rawValue.replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "");
    }
  } catch {
    // Missing env files are fine in CI and production workers.
  }
}

export async function loadRuntimeEnv() {
  await loadEnvFile(path.join(repoRoot, ".env"));
  await loadEnvFile(path.join(repoRoot, ".env.local"), { override: true });
  await loadEnvFile(path.join(v3Root, ".env"), { override: true });
  await loadEnvFile(path.join(v3Root, ".env.local"), { override: true });
}

export function getRuntimeConvexUrl() {
  return process.env.V3_CONVEX_URL ||
    process.env.NEXT_PUBLIC_V3_CONVEX_URL ||
    "";
}

const pass = (name: string, message: string): HealthCheck => ({
  name,
  status: "pass",
  message,
});

const fail = (name: string, message: string): HealthCheck => ({
  name,
  status: "fail",
  message,
});

const safeEnvMessage = (name: string) => (
  secretNames.has(name) ? `${name} is present.` : `${name} is configured.`
);

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

function checkRequiredEnv(name: string, alternatives: string[] = []) {
  const names = [name, ...alternatives];
  const found = names.find((item) => Boolean(process.env[item]));
  if (found) return pass(`env:${name}`, safeEnvMessage(found));
  return fail(`env:${name}`, `Set ${names.join(" or ")}.`);
}

function checkNotDisabled(name: string) {
  if (isDisabled(process.env[name])) {
    return fail(`env:${name}`, `${name} disables a required v3 runtime feature.`);
  }
  return pass(`env:${name}`, `${name || "Feature"} is not disabled.`);
}

function checkPinnedTtsModel() {
  const model = process.env.TTS_MODEL || PINNED_TTS_MODEL;
  if (model !== PINNED_TTS_MODEL) {
    return fail("env:TTS_MODEL", `TTS_MODEL must be ${PINNED_TTS_MODEL}.`);
  }
  return pass("env:TTS_MODEL", "Gemini TTS model is pinned.");
}

async function checkConvexConnectivity(convexUrl: string) {
  if (!convexUrl) {
    return [
      fail("convex:url", "Set V3_CONVEX_URL or NEXT_PUBLIC_V3_CONVEX_URL."),
      fail("convex:functions", "Skipped because Convex URL is missing."),
    ];
  }

  const checks: HealthCheck[] = [
    pass("convex:url", "v3 Convex URL is present."),
  ];
  const client = new ConvexHttpClient(convexUrl);

  try {
    await client.query(api.sessions.getByAnonymousId, {
      anonymousId: "runtime-health-readonly",
    });
    checks.push(pass("convex:functions", "Public Convex functions are reachable."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Convex query failed.";
    checks.push(fail("convex:functions", `Convex functions are not reachable: ${message}`));
    return checks;
  }

  try {
    const readiness = await client.query(api.renderJobs.workerReadiness, {});
    checks.push(readiness.workerHealthy
      ? pass(
        "worker:queue",
        `Render worker alive. Workers: ${readiness.workerCount}, queued: ${readiness.queued}, active: ${readiness.active}.`,
      )
      : fail(
        "worker:queue",
        "Render worker heartbeat is stale or missing. Run npm run dev from the repo root.",
      ));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker readiness query failed.";
    checks.push(fail("worker:queue", `Render queue readiness failed: ${message}`));
  }

  return checks;
}

async function checkRemotionRuntime() {
  const checks: HealthCheck[] = [];

  try {
    await access(renderEntry);
    checks.push(pass("remotion:entry", "Remotion entry exists."));
  } catch {
    return [
      fail("remotion:entry", "Remotion entry is missing."),
      fail("remotion:bundle", "Skipped because Remotion entry is missing."),
    ];
  }

  try {
    await mkdir(outputDir, { recursive: true });
    await rm(healthBundleDir, { recursive: true, force: true });
    const serveUrl = await bundle({
      entryPoint: renderEntry,
      outDir: healthBundleDir,
      webpackOverride: (config) => config,
    });
    const compositions = await getCompositions(serveUrl);
    const composition = compositions.find((item) => item.id === adSceneCompositionId);

    if (!composition) {
      checks.push(fail("remotion:composition", `Missing ${adSceneCompositionId}.`));
      return checks;
    }

    checks.push(pass("remotion:bundle", "Remotion bundle can be created."));
    checks.push(composition.width === 1080 && composition.height === 1350
      ? pass("remotion:size", "Composition is 1080x1350.")
      : fail("remotion:size", `Composition is ${composition.width}x${composition.height}, expected 1080x1350.`));
    checks.push(composition.fps === adSceneFps
      ? pass("remotion:fps", `Composition is ${adSceneFps} fps.`)
      : fail("remotion:fps", `Composition is ${composition.fps} fps, expected ${adSceneFps}.`));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Remotion check failed.";
    checks.push(fail("remotion:bundle", message));
  } finally {
    await rm(healthBundleDir, { recursive: true, force: true });
  }

  return checks;
}

export async function runRuntimeHealthChecks() {
  await loadRuntimeEnv();

  const checks: HealthCheck[] = [
    checkRequiredEnv("NEXT_PUBLIC_V3_CONVEX_URL", ["V3_CONVEX_URL"]),
    checkRequiredEnv("FIRECRAWL_API_KEY"),
    checkRequiredEnv("DEEPGRAM_API_KEY"),
    checkNotDisabled("DEEPGRAM_ENABLED"),
    checkRequiredEnv("GEMINI_API_KEY"),
    checkNotDisabled("GEMINI_ENABLED"),
    checkNotDisabled("TTS_ENABLED"),
    checkPinnedTtsModel(),
  ];

  const convexChecks = await checkConvexConnectivity(getRuntimeConvexUrl());
  checks.push(...convexChecks);

  const remotionChecks = await checkRemotionRuntime();
  checks.push(...remotionChecks);

  return checks;
}

function printChecks(checks: HealthCheck[]) {
  for (const check of checks) {
    const marker = check.status === "pass" ? "PASS" : "FAIL";
    console.log(`${marker} ${check.name} - ${check.message}`);
  }
}

if (process.argv[1] === filename) {
  const checks = await runRuntimeHealthChecks();
  printChecks(checks);
  if (checks.some((check) => check.status === "fail")) {
    process.exitCode = 1;
  }
}
