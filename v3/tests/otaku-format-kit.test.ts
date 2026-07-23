import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  prepareMusicBed,
  probeDurationMs,
} from "../scripts/otaku-media";

const run = (command: string, args: string[], cwd = process.cwd()) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${command} failed:\n${result.stderr}`);
  return `${result.stdout}${result.stderr}`;
};

const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "wiggly-format-kit-"));
try {
  const sourceMusic = path.join(temporaryRoot, "source.wav");
  const preparedMusic = path.join(temporaryRoot, "prepared.mp3");
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
    sourceMusic,
  ]);
  await prepareMusicBed({
    outputPath: preparedMusic,
    sourcePath: sourceMusic,
    targetDurationMs: 2_600,
  });
  assert.ok(Math.abs((await probeDurationMs(preparedMusic)) - 2_600) <= 80);
  const silenceReport = run("ffmpeg", [
    "-hide_banner", "-i", preparedMusic,
    "-af", "silencedetect=noise=-50dB:d=0.1",
    "-f", "null", "-",
  ]);
  assert.doesNotMatch(silenceReport, /silence_duration/, "Prepared music must not contain a silent loop seam.");

  const archive = path.resolve(
    "public",
    "format-repositories",
    "otaku-explainer-v1",
    "downloads",
    "wiggly-otaku-explainer-format-kit.zip",
  );
  const entries = run("unzip", ["-Z1", archive]);
  for (const required of [
    "v3/package.json",
    "v3/kit-smoke.mjs",
    "v3/scripts/otaku-format.ts",
    "v3/scripts/otaku-media.ts",
    "v3/scripts/render-otaku-proofs.ts",
    "v3/tests/otaku-format-runtime.test.ts",
    "v3/features/experiments/otaku-format/OtakuProofVideo.tsx",
    "v3/public/format-repositories/otaku-explainer-v1/SKILL.md",
    "v3/public/format-repositories/otaku-explainer-v1/renderer/OtakuFormatRenderer.tsx",
  ]) {
    assert.match(entries, new RegExp(required.replaceAll(".", "\\.")), `${required} must be downloadable.`);
  }
  const entryList = entries.trim().split("\n");
  assert.equal(entryList.some((entry) => entry.includes("/outputs/") || entry.includes("/agent-runs/")), false);
  assert.equal(entryList.some((entry) => /\/assets\/audio\/[^/]+\//.test(entry)), false);

  run("unzip", ["-q", archive, "-d", temporaryRoot]);
  const extractedV3 = path.join(temporaryRoot, "wiggly-otaku-explainer-format-kit", "v3");
  assert.match(run("node", ["kit-smoke.mjs"], extractedV3), /Format Kit files are complete/);
  const packageJson = JSON.parse(readFileSync(path.join(extractedV3, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.match(packageJson.scripts["prototype:otaku"], /otaku-format\.ts/);
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}

console.log("Otaku Format Kit tests passed.");
