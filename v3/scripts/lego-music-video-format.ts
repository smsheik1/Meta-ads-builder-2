import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLegoDraft, legoStoryPrompt, LEGO_MUSIC_VIDEO_VERSION } from "../features/formats/lego-music-video/contract";
import { command, finalizeRun, importRun, initRun, inspectRun, readJson, renderRun, runPath, validateRun, type LegoState } from "../features/formats/lego-music-video/runtime";
import { collectRunStage, generateRunStage, generationStage, requestForRun } from "../features/formats/lego-music-video/providers";

const v3Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(v3Root, "public/format-repositories/lego-music-video-v1");
const action = process.argv[2];
function argument(name: string) {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value?.slice(name.length + 3);
}
function required(name: string) {
  const value = argument(name);
  if (!value) throw new Error(`--${name}=... is required.`);
  return value;
}
async function locked(id: string, work: (directory: string) => Promise<unknown>) {
  const directory = runPath(root, id);
  const locks = path.join(root, "agent-runs/.locks");
  await mkdir(locks, { recursive: true });
  const file = path.join(locks, `${id}.json`);
  const owner = { pid: process.pid, host: hostname() };
  try { await writeFile(file, JSON.stringify(owner), { flag: "wx" }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const previous = JSON.parse(await readFile(file, "utf8"));
    if (previous.host !== hostname() || !Number.isInteger(previous.pid) || previous.pid <= 0) throw new Error("A lock from another or unknown host needs operator review.");
    let running = true;
    try { process.kill(previous.pid, 0); } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === "ESRCH") running = false;
    }
    if (running) throw new Error(`Run ${id} is already in use by process ${previous.pid}.`);
    await unlink(file);
    await writeFile(file, JSON.stringify(owner), { flag: "wx" });
  }
  try { return await work(directory); }
  finally { await unlink(file); }
}

async function main() {
  if (action === "smoke") {
    process.env.LEGO_DISABLE_PAID_CALLS = "1";
    return locked(`smoke-${Date.now()}`, async directory => {
      await importRun(directory, path.join(root, "goldens/cookies/input.json"), true);
      await renderRun(v3Root, directory);
      const report = await inspectRun(directory);
      console.log(JSON.stringify({ directory, ...report, paidGenerationCalls: 0 }, null, 2));
      if (!report.technicalPassed) process.exitCode = 1;
    });
  }
  if (action === "check") {
    const tools = {} as Record<string, boolean>;
    for (const binary of ["ffmpeg", "ffprobe"]) {
      try { await command(binary, ["-version"]); tools[binary] = true; } catch { tools[binary] = false; }
    }
    for (const module of ["@remotion/bundler", "@remotion/renderer", "tailwindcss", "react"]) {
      try { import.meta.resolve(module); tools[module] = true; } catch { tools[module] = false; }
    }
    const ready = Object.values(tools).every(Boolean) && Number(process.versions.node.split(".")[0]) >= 22;
    console.log(JSON.stringify({ version: LEGO_MUSIC_VIDEO_VERSION, node: process.versions.node, tools, ready, planning: "Your coding agent; no NIM, Wiggly account, or database.", optionalKeys: { ELEVENLABS_API_KEY: Boolean(process.env.ELEVENLABS_API_KEY), REPLICATE_API_TOKEN: Boolean(process.env.REPLICATE_API_TOKEN) }, note: "No secret file was opened and no provider was called." }, null, 2));
    if (!ready) process.exitCode = 1;
    return;
  }
  if (action === "template") {
    console.log(JSON.stringify(createLegoDraft(argument("brief") || ""), null, 2));
    return;
  }
  if (!["init", "import", "validate", "prompt", "status", "request", "generate", "collect", "render", "inspect", "finalize"].includes(action || "")) {
    throw new Error("Use check | init --run=id --brief=text | import --run=id --input=/path/input.json | validate | prompt | status | request --stage=... | generate --stage=... --approve-cost-usd=... --budget-usd=... | collect --stage=... | render | inspect | finalize --review=/path/review.json. Run commands need --run=id.");
  }
  const id = required("run");
  await locked(id, async directory => {
    if (action === "init") { await initRun(directory, required("brief")); return console.log("Created an unresolved draft. Read the Repo SKILL.md and fill input.json using brand evidence. No provider calls."); }
    if (action === "import") { await importRun(directory, required("input"), process.argv.includes("--fixture")); return console.log("Imported local media and measured the song. Run validate, render, then inspect. No provider calls."); }
    if (action === "validate") { const result = await validateRun(directory); return console.log(JSON.stringify({ valid: true, inputHash: result.hash, localAssets: result.inventory.length, plannedShots: result.prompts.shots.length }, null, 2)); }
    if (action === "prompt") {
      // Story authoring must work before a story exists.
      const input = await readJson<{ scene: Parameters<typeof legoStoryPrompt>[0] }>(path.join(directory, "input.json"));
      return console.log(legoStoryPrompt(input.scene));
    }
    if (action === "status") {
      const state = await readJson<LegoState>(path.join(directory, "state.json"));
      let current = false;
      try { const result = await validateRun(directory); current = state.render?.inputHash === result.hash; } catch { /* Report draft status without claiming valid inputs. */ }
      return console.log(JSON.stringify({ ...state, currentRender: current, next: current ? "Inspect the rendered MP4; obtain direct audiovisual review before finalize." : "Complete input.json and source media, validate, then render." }, null, 2));
    }
    if (["request", "generate", "collect"].includes(action!)) {
      const stage = generationStage(required("stage"));
      if (action === "request") {
        const { request, requestHash } = await requestForRun(directory, stage);
        // Do not dump embedded image bytes into chat. The hash binds the exact request.
        return console.log(JSON.stringify({ stage, provider: request.provider, model: request.model, endpoint: request.endpoint, requestHash, units: stage === "song" ? "one song" : stage.startsWith("clip-") ? "one silent animated shot" : "one full-quality image", cost: "Check the current provider quote for these exact settings before approval. No call was made." }, null, 2));
      }
      const secretsFile = path.join(v3Root, "../secrets.env");
      if (action === "collect") return console.log(JSON.stringify(await collectRunStage(directory, stage, { secretsFile }), null, 2));
      return console.log(JSON.stringify(await generateRunStage(directory, stage, { secretsFile, approvedCostUsd: Number(argument("approve-cost-usd")), budgetUsd: Number(argument("budget-usd")), imageReview: argument("image-review") }), null, 2));
    }
    if (action === "render") return console.log(JSON.stringify(await renderRun(v3Root, directory), null, 2));
    if (action === "inspect") {
      const report = await inspectRun(directory);
      console.log(JSON.stringify(report, null, 2));
      if (!report.technicalPassed) process.exitCode = 1;
      return;
    }
    if (action === "finalize") return console.log(JSON.stringify(await finalizeRun(directory, required("review")), null, 2));
  });
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
