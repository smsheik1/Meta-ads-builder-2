import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { intake, runTool } from "./intake.mjs";
import { approveBlueprint, checkRepo, initBlueprint, loadValidatedRun, scaffoldRepo, writeJson } from "./contracts.mjs";

// Deliberately tests evidence -> draft, not agent understanding or a finished renderer.
export async function smoke() {
  const workDirectory = await mkdtemp(path.join(tmpdir(), "wiggly-builder-smoke-"));
  const source = path.join(workDirectory, "controlled.mp4");
  await runTool("ffmpeg", ["-v", "error", "-nostdin", "-n", "-f", "lavfi", "-i", "color=c=navy:s=240x320:r=12:d=1",
    "-vf", "drawbox=x=0:y=0:w=iw:h=48:color=white:t=fill", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", source]);
  const runDirectory = path.join(workDirectory, "reference-run");
  const evidence = await intake({ source, runDirectory });
  const blueprint = await initBlueprint({ runDirectory, slug: "controlled-panel", title: "Controlled Panel Smoke" });
  await assert.rejects(loadValidatedRun(runDirectory), /resolved/);
  Object.assign(blueprint, {
    summary: "Controlled silent fixture: a light header over a dark field; this verifies plumbing only.",
    observations: [{ id: "fixture-layout", atSeconds: evidence.frames[0].atSeconds, channel: "visual", basis: "frame", description: "The controlled fixture is specified as a white top band over a navy field." }],
    rules: [
      { id: "header", classification: "fixed", description: "Keep a separate top header band.", observationIds: ["fixture-layout"], reasoning: "Known fixture construction; a proposed reusable layout rule, not video interpretation." },
      { id: "field", classification: "variable", description: "Allow the body color to change through inputs.", observationIds: ["fixture-layout"], reasoning: "Intentional fixture parameter, not inferred from a second reference." },
    ],
    inputs: [{ name: "bodyColor", type: "string", description: "A chosen body color for a hypothetical authored renderer." }],
    runtime: { approach: "Host agent must author a local renderer; smoke stops before implementation.", entrypoint: "runtime/render.mjs" },
    review: { visual: "sampled-frames", audio: "not-applicable", limitations: ["Automated controlled-fixture test only; no direct creative review or completed child runtime."] },
    assets: [],
    proofs: [{ id: "blue", description: "A blue body." }, { id: "green", description: "A green body." }],
  });
  await writeJson(path.join(runDirectory, "blueprint.json"), blueprint);
  await loadValidatedRun(runDirectory);
  await approveBlueprint({ runDirectory, reviewer: "Automated local smoke", note: "Benchmark attestation for a controlled fixture only; not user or creative approval.", scope: "benchmark" });
  const repoDirectory = path.join(workDirectory, "draft-child");
  await scaffoldRepo({ runDirectory, outputDirectory: repoDirectory });
  await assert.rejects(checkRepo(repoDirectory), /still draft/);
  return { status: "passed", coverage: "controlled media -> private evidence -> unresolved gate -> benchmark blueprint -> draft scaffold -> draft release rejected", workDirectory, providerCalls: 0, networkCalls: 0, childCompleted: false, creativeReview: "not-assessed" };
}
