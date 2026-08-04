import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const runId = "northstar-smoke";
const runDirectory = path.join(
  v3Root,
  "public",
  "format-repositories",
  "linkedin-showcase-wrapper-v1",
  "agent-runs",
  runId,
);
const input = path.join(
  v3Root,
  "public",
  "format-repositories",
  "linkedin-showcase-wrapper-v1",
  "fixtures",
  "northstar",
  "input.json",
);

function command(args: string[]) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/linkedin-showcase-wrapper-format.ts", ...args],
    { cwd: v3Root, encoding: "utf8", stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`Smoke command failed: ${args.join(" ")}`);
}

rmSync(runDirectory, { force: true, recursive: true });
try {
  command(["init", `--run=${runId}`, `--input=${input}`]);
  command(["validate", `--run=${runId}`]);
  command(["render", `--run=${runId}`]);
  command(["inspect", `--run=${runId}`]);
  command(["finalize", `--run=${runId}`, "--approve-final", "--review-note=Smoke fixture visually reviewed"]);
  console.log("LinkedIn Showcase Wrapper runtime smoke passed");
} finally {
  rmSync(runDirectory, { force: true, recursive: true });
}
