import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const slugArgument = process.argv.find((value) => value.startsWith("--format="));
const slug = slugArgument?.slice("--format=".length) ?? "cinematic-photographer";
const repository = path.join("public", "format-repositories", `${slug}-v1`);
const format = JSON.parse(readFileSync(path.join(repository, "format.json"), "utf8"));
const runtime = JSON.parse(readFileSync(path.join(repository, "runtime.json"), "utf8"));

assert.equal(format.id, slug);
assert.equal(format.version, "1.0.0");
assert.equal(runtime.slug, slug);
assert.equal(runtime.version, format.version);
assert.equal(runtime.maximumAttempts, 3);
assert.ok(runtime.expectedOutputs >= 1);
assert.ok(existsSync(path.join(repository, runtime.promptPath)));
assert.ok(existsSync(path.join(repository, runtime.smokeExamplePath)));

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "scripts/skai-image-format.ts", "smoke", `--format=${slug}`],
  { encoding: "utf8" },
);
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.match(result.stdout, /Free smoke passed/);
assert.match(result.stdout, /No provider was called/);
assert.match(result.stdout, /finalization stayed gated/);

console.log(`${format.title} shared runner tests passed.`);
