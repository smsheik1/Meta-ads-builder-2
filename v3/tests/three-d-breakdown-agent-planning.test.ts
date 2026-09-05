import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { validateThreeDBreakdownScene } from "../features/formats/three-d-breakdown/validate";

const root = path.resolve("public/format-repositories/three-d-breakdown-v1");
const temporary = mkdtempSync(path.join(tmpdir(), "three-d-agent-planning-"));
const offline = "data:text/javascript," + encodeURIComponent('globalThis.fetch = () => { throw new Error("Unexpected provider/network call during local planning"); };');
function command(args: string[], pass = true) {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--import", offline, "scripts/three-d-breakdown-format.ts", ...args], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, TMPDIR: temporary, NODE_NO_WARNINGS: "1", NODE_ENV: "test" },
  });
  if (pass) assert.equal(result.status, 0, result.stdout + result.stderr);
  else assert.notEqual(result.status, 0, "Invalid input must not advance the run.");
  return result.stdout + result.stderr;
}

try {
  command(["check", "--stage=plan"]);
  for (const name of ["wooden-toys", "cookie-gift"]) {
    const fixture = JSON.parse(readFileSync(path.join(root, `fixtures/agent-${name}.json`), "utf8"));
    const run = `smoke-${name}-${path.basename(temporary).toLowerCase()}`;
    const runPath = path.join(root, "agent-runs", run);
    const args = [`--run=${run}`, "--direction=idea-1"];
    for (const key of ["research", "directions", "script", "plan"]) writeFileSync(path.join(temporary, `${key}.json`), JSON.stringify(fixture[key]));
    const input = (key: string) => `--input=${path.join(temporary, `${key}.json`)}`;
    const state = () => JSON.parse(readFileSync(path.join(runPath, "state.json"), "utf8"));
    try {
      command(["init", ...args, "--subject=brand", `--research=${path.join(temporary, "research.json")}`]);
      command(["prompt", ...args, "--stage=directions"]);
      assert.match(readFileSync(path.join(runPath, "directions-prompt.md"), "utf8"), /Story Director/);
      command(["directions", ...args, input("plan")], false);
      assert.equal(state().status, "draft");
      command(["directions", ...args, input("directions")]);
      command(["select", ...args, input("plan")], false);
      command(["prompt", ...args, "--stage=script"]);
      const invalid = structuredClone(fixture.script);
      invalid.evidenceIndex = 9999;
      writeFileSync(path.join(temporary, "invalid.json"), JSON.stringify(invalid));
      command(["script", ...args, input("invalid")], false);
      assert.equal(state().selectedDirectionId, undefined);
      command(["script", ...args, input("script")]);
      command(["prompt", `--run=${run}`, "--direction=idea-2", "--stage=plan"], false);
      command(["prompt", ...args, "--stage=plan"]);
      const brokenPlan = structuredClone(fixture.plan);
      brokenPlan.variants[0].storyboardBoard.frames.pop();
      writeFileSync(path.join(temporary, "invalid.json"), JSON.stringify(brokenPlan));
      command(["select", ...args, input("invalid")], false);
      assert.equal(state().status, "directions-ready");
      command(["select", ...args, input("plan")]);
      command(["validate", ...args]);
      command(["inspect", ...args]);
      const scene = JSON.parse(readFileSync(path.join(runPath, "scene.json"), "utf8"));
      assert.equal(validateThreeDBreakdownScene(scene).valid, true);
      assert.equal(scene.metadata.model, "host-coding-agent");
      assert.equal(state().planningSource, "host-coding-agent");
      assert.equal(state().status, "scene-ready");
      assert.equal(state().imageAttempts.length, 0);
      assert.ok(renderToStaticMarkup(createElement(AdRenderSurface, { scene, motionMode: "idle" })).length > 100);
      command(["select", ...args, input("plan")], false);
      command(["image", ...args, "--kind=storyboard"], false);
      console.log(`${name}: host-agent directions → locked script → validated official scene; no keys or provider calls.`);
    } finally {
      rmSync(runPath, { recursive: true, force: true });
    }
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
