import { readFile } from "node:fs/promises";
import path from "node:path";

type PackageManifest = {
  scripts: Record<string, string>;
};

type FormatManifest = {
  version: string;
  renderer: string;
};

type QualityContract = {
  automatic: {
    durationSeconds: number;
    height: number;
    width: number;
  };
  grading: {
    automaticCriteria: Array<{ id: string }>;
  };
  human: Array<{ id: string }>;
};

type BackgroundManifest = {
  options: Array<{ id: string }>;
};

type MotionManifest = {
  motions: Array<{ id: string }>;
};

type RenderReport = {
  timeline: {
    rounds: Array<{ danceStart: number }>;
    finale: { start: number };
    closingChorus: { start: number };
    loopBridge: { start: number };
  };
};

type EvalReport = {
  overall: {
    grade: string;
    score: number;
    status: string;
    automaticScore: number;
    automaticMaximum: number;
    humanScore: number;
    humanMaximum: number;
  };
};

export type BikiniBottomDanceOffTrustData = {
  version: string;
  stats: {
    motions: number;
    backgrounds: number;
    automaticCriteria: number;
    humanCriteria: number;
    rendererCount: number;
  };
  proof: {
    grade: string;
    score: number;
    status: string;
    automaticScore: number;
    automaticMaximum: number;
    humanScore: number;
    humanMaximum: number;
    width: number;
    height: number;
    durationSeconds: number;
    renderer: string;
  };
  annotations: Array<{
    seconds: number;
    timeLabel: string;
    title: string;
    description: string;
    color: "cyan" | "pink" | "lime" | "yellow";
  }>;
  commands: string[];
  fileGroups: Array<{
    title: string;
    summary: string;
    color: "cyan" | "pink" | "lime" | "yellow" | "coral" | "violet";
    files: Array<{ path: string; description: string }>;
  }>;
};

const repoRoot = path.join(
  process.cwd(),
  "public/format-repositories/bikini-bottom-dance-off-v1",
);

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function timestamp(seconds: number) {
  const rounded = Math.round(seconds);
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

export async function getBikiniBottomDanceOffTrustData(): Promise<BikiniBottomDanceOffTrustData> {
  const [
    format,
    quality,
    backgrounds,
    motions,
    packageManifest,
    renderReport,
    evalReport,
  ] = await Promise.all([
    readJson<FormatManifest>(path.join(repoRoot, "format.json")),
    readJson<QualityContract>(path.join(repoRoot, "quality.json")),
    readJson<BackgroundManifest>(
      path.join(repoRoot, "assets/background-options.json"),
    ),
    readJson<MotionManifest>(
      path.join(
        repoRoot,
        "../mixamo-character-motion-v1/assets/motions/manifest.json",
      ),
    ),
    readJson<PackageManifest>(path.join(repoRoot, "package.json")),
    readJson<RenderReport>(
      path.join(
        repoRoot,
        "agent-runs/wiggle-alt-choreography-v2/render-report.json",
      ),
    ),
    readJson<EvalReport>(
      path.join(repoRoot, "examples/wiggle-proof/evidence/eval-report.json"),
    ),
  ]);

  const firstSolo = renderReport.timeline.rounds[0]?.danceStart ?? 4;
  const finale = renderReport.timeline.finale.start;
  const closing = renderReport.timeline.closingChorus.start;
  const replay = renderReport.timeline.loopBridge.start;

  const commandOrder = [
    "check",
    "smoke",
    "init",
    "validate",
    "render",
    "inspect",
    "finalize",
  ];
  const commands = commandOrder
    .filter((script) => packageManifest.scripts[script])
    .map((script) => {
      if (script === "init")
        return "npm run init -- --run=episode-01 --song=/absolute/path/to/song.mp3";
      if (script === "render")
        return "npm run render -- --run=episode-01 --approve-provider";
      if (script === "finalize")
        return "npm run finalize -- --run=episode-01 --human-review=pass";
      if (["validate", "inspect"].includes(script))
        return `npm run ${script} -- --run=episode-01`;
      return `npm run ${script}`;
    });

  return {
    version: format.version,
    stats: {
      motions: motions.motions.length,
      backgrounds: backgrounds.options.length,
      automaticCriteria: quality.grading.automaticCriteria.length,
      humanCriteria: quality.human.length,
      rendererCount: 1,
    },
    proof: {
      grade: evalReport.overall.grade,
      score: evalReport.overall.score,
      status: evalReport.overall.status,
      automaticScore: evalReport.overall.automaticScore,
      automaticMaximum: evalReport.overall.automaticMaximum,
      humanScore: evalReport.overall.humanScore,
      humanMaximum: evalReport.overall.humanMaximum,
      width: quality.automatic.width,
      height: quality.automatic.height,
      durationSeconds: quality.automatic.durationSeconds,
      renderer: format.renderer,
    },
    annotations: [
      {
        seconds: firstSolo,
        timeLabel: timestamp(firstSolo),
        title: "Each character gets a full solo.",
        description:
          "The first five-second solo starts here; the other three receive the same time.",
        color: "cyan",
      },
      {
        seconds: finale,
        timeLabel: timestamp(finale),
        title: "All four characters keep moving.",
        description:
          "The nine-second finale keeps everyone dancing, while freeze detection blocks stalls longer than 0.75 seconds.",
        color: "pink",
      },
      {
        seconds: closing,
        timeLabel: timestamp(closing),
        title: "All four deliver the closing line.",
        description:
          "The voices enter together while reaction motions keep the closing frame alive.",
        color: "lime",
      },
      {
        seconds: replay,
        timeLabel: timestamp(replay),
        title: "The ending deliberately creates the replay.",
        description:
          "The final one-second bridge returns to the matching countdown frame instead of ending on a dead card.",
        color: "yellow",
      },
    ],
    commands,
    fileGroups: [
      {
        title: "Agent playbook",
        summary: "How the agent runs the Format",
        color: "cyan",
        files: [
          {
            path: "SKILL.md",
            description: "Exact agent workflow and approval rules.",
          },
          {
            path: "README.md",
            description: "Human setup, commands, and examples.",
          },
        ],
      },
      {
        title: "Inputs & outputs",
        summary: "Machine-readable boundaries",
        color: "pink",
        files: [
          {
            path: "input-contract.json",
            description: "Required episode inputs and limits.",
          },
          {
            path: "output-contract.json",
            description: "The final video and evidence bundle.",
          },
          {
            path: "requirements.json",
            description: "Local tools, providers, and environment.",
          },
        ],
      },
      {
        title: "Creative system",
        summary: "What stays fixed and what changes",
        color: "lime",
        files: [
          {
            path: "composition-contract.json",
            description: "Timeline and rendering invariants.",
          },
          {
            path: "content-boundary.json",
            description: "Packaged mechanics versus episode inputs.",
          },
          {
            path: "assets.json",
            description: "Versioned assets, roles, and source notes.",
          },
        ],
      },
      {
        title: "Quality & evals",
        summary: "Scoring, tests, and proof",
        color: "yellow",
        files: [
          {
            path: "quality.json",
            description: "Automatic and human scoring criteria.",
          },
          {
            path: "tests/contracts.test.mjs",
            description: "Contract regression coverage.",
          },
          {
            path: "tests/evaluate.test.mjs",
            description: "Eval and grading coverage.",
          },
          {
            path: "PROOF-REPORT.md",
            description: "Why the published example is trustworthy.",
          },
        ],
      },
      {
        title: "Official runtime",
        summary: "One production path",
        color: "coral",
        files: [
          {
            path: "runner.mjs",
            description: "Validates and orchestrates every stage.",
          },
          {
            path: "runtime/compose.mjs",
            description: "Builds the 47-second Reel.",
          },
          {
            path: "runtime/inspect.mjs",
            description: "Measures final output quality.",
          },
          {
            path: "runtime/timeline.mjs",
            description: "Allocates speech, solos, finale, and loop.",
          },
        ],
      },
      {
        title: "Assets",
        summary: "Backgrounds, voices, and motions",
        color: "violet",
        files: [
          {
            path: "assets/background-options.json",
            description: "Four selectable outer backgrounds.",
          },
          {
            path: "assets/voice-presets.json",
            description: "Non-secret Fish Audio assignments.",
          },
          {
            path: "mixamo-character-motion-v1/assets/motions/manifest.json",
            description: "Frozen 25-motion starter catalog.",
          },
        ],
      },
    ],
  };
}
