import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { execute, readJson, sha256, toolExecutable, writeJson } from "../common.mjs";
import { checkDependencies, REQUIRED_FFMPEG_CAPABILITIES } from "../doctor.mjs";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

async function temporary(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "animal-bootstrap-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("doctor/check starts from an extracted kit without node_modules or runtime imports and reports all setup problems", async (t) => {
  const directory = await temporary(t);
  await mkdir(path.join(directory, "runtime"));
  // Deliberately omit render/inspect and Sharp entirely: eager loading would crash before JSON output.
  for (const file of ["runner.mjs", "runtime/common.mjs", "runtime/doctor.mjs", "package.json"]) {
    await copyFile(path.join(root, file), path.join(directory, file));
  }
  await writeJson(path.join(directory, "assets.json"), {
    backgrounds: [{ path: "missing-one.png", sha256: "missing" }, { path: "missing-two.png", sha256: "missing" }], characters: [],
  });
  for (const command of ["doctor", "check"]) {
    const result = spawnSync(process.execPath, [path.join(directory, "runner.mjs"), command], {
      encoding: "utf8", env: { PATH: "", FFMPEG: "/not-installed/ffmpeg", FFPROBE: "/not-installed/ffprobe", PYTHON: "/not-installed/python" },
    });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stderr, "");
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, "setup-required");
    assert.equal(report.tools.node.path, process.execPath);
    assert.equal(report.tools.node.status, "pass");
    assert.equal(report.tools.python3.required, false);
    assert.equal(report.tools.python3.status, "missing");
    for (const id of ["tool:npm", "tool:ffmpeg", "tool:ffprobe", "dependency:sharp"]) assert.ok(report.issues.some((issue) => issue.id === id), id);
    assert.equal(report.assetProblems.length, 2);
    assert.equal(report.issues.some((issue) => issue.id === "tool:python3"), false);
    assert.equal(report.issues.some((issue) => issue.id.includes("cargo")), false);
  }
  assert.deepEqual((await readdir(directory)).sort(), ["assets.json", "package.json", "runner.mjs", "runtime"]);
});

test("doctor aggregates FFmpeg capability failures and checks every asset checksum", async (t) => {
  const directory = await temporary(t);
  const ffmpeg = path.join(directory, "ffmpeg chosen by operator");
  const capabilities = structuredClone(REQUIRED_FFMPEG_CAPABILITIES);
  capabilities.encoders = capabilities.encoders.filter((name) => name !== "libx264");
  capabilities.filters = capabilities.filters.filter((name) => name !== "tile");
  await writeFile(ffmpeg, `#!${process.execPath}\nconst values=${JSON.stringify(capabilities)};const kind=process.argv.at(-1).slice(1);console.log(kind==='version'?'ffmpeg fixture':(values[kind]||[]).map(x=>' D '+x).join('\\n'));\n`);
  await chmod(ffmpeg, 0o755);
  await writeJson(path.join(directory, "package.json"), { dependencies: { sharp: "0.35.3" } });
  await writeFile(path.join(directory, "valid.png"), "checksum fixture");
  await writeJson(path.join(directory, "assets.json"), { backgrounds: [
    { path: "valid.png", sha256: await sha256(path.join(directory, "valid.png")) },
    { path: "valid.png", sha256: "changed" },
    { path: "missing.png", sha256: "absent" },
  ], characters: [] });
  const report = await checkDependencies({ root: directory, env: { PATH: "", FFMPEG: ffmpeg, FFPROBE: ffmpeg } });
  assert.equal(report.tools.ffmpeg.path, await realpath(ffmpeg));
  assert.deepEqual(report.ffmpegCapabilities.encoders.missing, ["libx264"]);
  assert.deepEqual(report.ffmpegCapabilities.filters.missing, ["tile"]);
  assert.equal(report.ffmpegCapabilities.devices.status, "pass");
  assert.equal(report.assetProblems.length, 2);
  assert.equal(report.packagedAssets, 3);
});

test("all shared subprocesses resolve explicit media/Python overrides and use the running Node", async () => {
  const env = { PATH: "", FFMPEG: process.execPath, FFPROBE: process.execPath, PYTHON: process.execPath, NODE: "/not-this-node" };
  for (const program of ["node", "ffmpeg", "ffprobe", "python", "python3"]) {
    assert.equal(toolExecutable(program, env), process.execPath);
    const result = await execute(program, ["-e", "console.log(process.execPath)"], { capture: true, env });
    assert.equal(result.trim(), process.execPath);
  }
  assert.equal(toolExecutable("unrelated-tool", env), "unrelated-tool");
  assert.equal(toolExecutable("/explicit/ffmpeg", env), "/explicit/ffmpeg");
  assert.equal(await execute("node", ["-e", "process.stdout.write('json');process.stderr.write('diagnostic')"], { capture: true, stdoutOnly: true }), "json");
});

test("atomic JSON replacement exposes complete records and cleans temporary files after failure", async (t) => {
  const directory = await temporary(t);
  const file = path.join(directory, "state.json");
  await writeJson(file, { value: 0 });
  const writes = Array.from({ length: 30 }, (_, value) => writeJson(file, { value, payload: "x".repeat(10000) }));
  const reads = Array.from({ length: 30 }, async () => assert.equal(typeof (await readJson(file)).value, "number"));
  await Promise.all([...writes, ...reads]);
  assert.equal(typeof (await readJson(file)).value, "number");
  const previous = await readFile(file, "utf8");
  const circular = {}; circular.self = circular;
  await assert.rejects(writeJson(file, circular));
  assert.equal(await readFile(file, "utf8"), previous);
  await mkdir(path.join(directory, "target-directory"));
  await assert.rejects(writeJson(path.join(directory, "target-directory"), { value: 1 }));
  assert.deepEqual((await readdir(directory)).sort(), ["state.json", "target-directory"]);
});

test("every converter test remains assigned to a profile, without Python or Cargo in normal testing", async () => {
  const pkg = await readJson(path.join(root, "package.json"));
  const tests = (await readdir(path.join(root, "converter", "tests"))).filter((file) => file.endsWith(".test.mjs"));
  for (const file of tests) assert.ok(`${pkg.scripts.test} ${pkg.scripts["test:converter"]}`.includes(`converter/tests/${file}`), file);
  assert.ok(pkg.scripts.test.includes("runtime/tests/*.test.mjs"));
  assert.equal(pkg.scripts.test.includes("run_cargo_test"), false);
  for (const file of ["scene_runtime_manifest.test.mjs", "scene_transform_summary.test.mjs"]) {
    assert.equal(pkg.scripts.test.includes(file), false);
    assert.ok(pkg.scripts["test:converter"].includes(file));
  }
  assert.ok(pkg.scripts["test:converter"].includes("run_cargo_test.mjs"));
});
