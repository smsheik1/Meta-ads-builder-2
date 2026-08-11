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
  rubricVersion: string;
  technicalGates: Array<{ id: string }>;
  grading: {
    passingScore: number;
    ratingScale: Array<{ rating: number; label: string }>;
    blindCriteria: Array<{
      id: string;
      label: string;
      weight: number;
      criticalFloor?: number;
    }>;
  };
};

type BackgroundManifest = {
  default: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
    path: string;
  }>;
};

type MotionManifest = {
  motions: Array<{ id: string; label: string }>;
};

type CharacterManifest = {
  packs: Array<{
    id: string;
    label: string;
    status: string;
  }>;
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
  rubricVersion: string;
  overall: {
    grade: string;
    score: number;
    status: string;
    technicalPassed: number;
    technicalTotal: number;
  };
};

type RequirementsContract = {
  providers: Array<{
    name: string;
    model: string;
    purpose: string;
    estimatedCost: string;
    pricingSource: string;
  }>;
  environmentVariables: string[];
};

export type BikiniBottomDanceOffTrustData = {
  version: string;
  stats: {
    motions: number;
    backgrounds: number;
    technicalGates: number;
    blindCriteria: number;
    rendererCount: number;
  };
  includedAssets: {
    characters: Array<{
      id: string;
      label: string;
      modelSrc: string;
      posterSrc: string;
    }>;
    performerStage: {
      label: string;
      src: string;
    };
    backgrounds: Array<{
      id: string;
      label: string;
      description: string;
      src: string;
    }>;
    defaultBackgroundId: string;
    motionLabels: string[];
  };
  grading: {
    rubricVersion: string;
    passingScore: number;
    ratingScale: Array<{ rating: number; label: string }>;
    criteria: Array<{
      id: string;
      label: string;
      weight: number;
      critical: boolean;
    }>;
  };
  proof: {
    grade: string;
    score: number;
    status: string;
    technicalPassed: number;
    technicalTotal: number;
    width: number;
    height: number;
    durationSeconds: number;
    renderer: string;
    rubricVersion: string;
  };
  annotations: Array<{
    seconds: number;
    timeLabel: string;
    title: string;
    description: string;
    color: "cyan" | "pink" | "lime" | "yellow";
  }>;
  requirements: RequirementsContract;
  commands: string[];
  fileGroups: Array<{
    title: string;
    files: Array<{
      label: string;
      path: string;
      description: string;
      content: string;
    }>;
  }>;
};

const repoRoot = path.join(
  process.cwd(),
  "public/format-repositories/bikini-bottom-dance-off-v1",
);
const motionRepoRoot = path.join(repoRoot, "../mixamo-character-motion-v1");
const danceOffPublicRoot = "/format-repositories/bikini-bottom-dance-off-v1";
const motionPublicRoot = "/format-repositories/mixamo-character-motion-v1";
const characterPreviewRoot =
  "/discovery/bikini-bottom-dance-off/character-previews";

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function resolveRepoFile(filePath: string) {
  return filePath.startsWith("mixamo-character-motion-v1/")
    ? path.join(repoRoot, "..", filePath)
    : path.join(repoRoot, filePath);
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
    characters,
    packageManifest,
    requirements,
    renderReport,
    evalReport,
  ] = await Promise.all([
    readJson<FormatManifest>(path.join(repoRoot, "format.json")),
    readJson<QualityContract>(path.join(repoRoot, "quality.json")),
    readJson<BackgroundManifest>(
      path.join(repoRoot, "assets/background-options.json"),
    ),
    readJson<MotionManifest>(
      path.join(motionRepoRoot, "assets/motions/manifest.json"),
    ),
    readJson<CharacterManifest>(
      path.join(motionRepoRoot, "assets/character-packs.json"),
    ),
    readJson<PackageManifest>(path.join(repoRoot, "package.json")),
    readJson<RequirementsContract>(path.join(repoRoot, "requirements.json")),
    readJson<RenderReport>(
      path.join(
        repoRoot,
        "examples/wiggle-proof/evidence/render-report.json",
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
  const characterOrder = ["spongebob", "patrick", "mr-krabs", "squilliam"];
  const includedCharacters = characterOrder.map((id) => {
    const character = characters.packs.find((pack) => pack.id === id);
    if (!character) throw new Error(`Missing packaged character ${id}.`);
    if (character.status !== "motion-ready") {
      throw new Error(`Packaged character ${id} is not motion-ready.`);
    }
    return {
      id: character.id,
      label: character.label,
      modelSrc: `${characterPreviewRoot}/${id}.glb`,
      posterSrc: `${characterPreviewRoot}/${id}.png`,
    };
  });
  const sampleMotionIds = new Set([
    "macarena-dance",
    "ymca-dance",
    "runningman-hip-hop-dancing",
    "silly-dancing",
  ]);

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
        return "npm run finalize -- --run=episode-01 --review=/absolute/path/to/blind-review.json --second-review=/absolute/path/to/second-review.json";
      if (["validate", "inspect"].includes(script))
        return `npm run ${script} -- --run=episode-01`;
      return `npm run ${script}`;
    });

  return {
    version: format.version,
    stats: {
      motions: motions.motions.length,
      backgrounds: backgrounds.options.length,
      technicalGates: quality.technicalGates.length,
      blindCriteria: quality.grading.blindCriteria.length,
      rendererCount: 1,
    },
    includedAssets: {
      characters: includedCharacters,
      performerStage: {
        label: "Fish News character stage",
        src: `${motionPublicRoot}/assets/backgrounds/fish-news-underwater-studio.png`,
      },
      backgrounds: backgrounds.options.map((background) => ({
        id: background.id,
        label: background.label,
        description: background.description,
        src: `${danceOffPublicRoot}/${background.path}`,
      })),
      defaultBackgroundId: backgrounds.default,
      motionLabels: motions.motions
        .filter((motion) => sampleMotionIds.has(motion.id))
        .map((motion) => motion.label),
    },
    grading: {
      rubricVersion: quality.rubricVersion,
      passingScore: quality.grading.passingScore,
      ratingScale: quality.grading.ratingScale.map(({ rating, label }) => ({ rating, label })),
      criteria: quality.grading.blindCriteria.map(({ id, label, weight, criticalFloor }) => ({
        id,
        label,
        weight,
        critical: Number.isFinite(criticalFloor),
      })),
    },
    proof: {
      grade: evalReport.overall.grade,
      score: evalReport.overall.score,
      status: evalReport.overall.status,
      technicalPassed: evalReport.overall.technicalPassed,
      technicalTotal: evalReport.overall.technicalTotal,
      width: quality.automatic.width,
      height: quality.automatic.height,
      durationSeconds: quality.automatic.durationSeconds,
      renderer: format.renderer,
      rubricVersion: evalReport.rubricVersion,
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
    requirements,
    commands,
    fileGroups: await Promise.all([
      {
        title: "Agent playbook",
        files: [
          {
            label: "Agent instructions",
            path: "SKILL.md",
            description: "Exact agent workflow and approval rules.",
          },
          {
            label: "Human setup",
            path: "README.md",
            description: "Human setup, commands, and examples.",
          },
        ],
      },
      {
        title: "Inputs & outputs",
        files: [
          {
            label: "Required inputs",
            path: "input-contract.json",
            description: "Required episode inputs and limits.",
          },
          {
            label: "Final deliverables",
            path: "output-contract.json",
            description: "The final video and evidence bundle.",
          },
          {
            label: "Services and tools",
            path: "requirements.json",
            description: "Local tools, providers, and environment.",
          },
        ],
      },
      {
        title: "Creative system",
        files: [
          {
            label: "Timeline rules",
            path: "composition-contract.json",
            description: "Timeline and rendering invariants.",
          },
          {
            label: "Fixed vs customizable",
            path: "content-boundary.json",
            description: "Packaged mechanics versus episode inputs.",
          },
          {
            label: "Asset manifest",
            path: "assets.json",
            description: "Versioned assets, roles, and source notes.",
          },
        ],
      },
      {
        title: "Quality & evals",
        files: [
          {
            label: "Quality rubric",
            path: "quality.json",
            description: "Technical gates and the blind creative rubric.",
          },
          {
            label: "Evaluation framework",
            path: "EVALUATION-FRAMEWORK.md",
            description: "Review procedure, evidence rules, and calibration plan.",
          },
          {
            label: "Calibration results",
            path: "CALIBRATION-REPORT.md",
            description: "Blind-review pilots, negative controls, and the remaining acceptance gate.",
          },
          {
            label: "Blind judge prompt",
            path: "prompts/blind-review.md",
            description: "The isolated instructions given to the final judge.",
          },
          {
            label: "Contract tests",
            path: "tests/contracts.test.mjs",
            description: "Contract regression coverage.",
          },
          {
            label: "Evaluation tests",
            path: "tests/evaluate.test.mjs",
            description: "Eval and grading coverage.",
          },
          {
            label: "Review integrity tests",
            path: "tests/review-packet.test.mjs",
            description: "Packet integrity and anti-tamper coverage.",
          },
          {
            label: "Published proof",
            path: "PROOF-REPORT.md",
            description: "Why the published example is trustworthy.",
          },
        ],
      },
      {
        title: "Official runtime",
        files: [
          {
            label: "Main runner",
            path: "runner.mjs",
            description: "Validates and orchestrates every stage.",
          },
          {
            label: "Video compositor",
            path: "runtime/compose.mjs",
            description: "Builds the 47-second Reel.",
          },
          {
            label: "Output inspection",
            path: "runtime/inspect.mjs",
            description: "Measures final output quality.",
          },
          {
            label: "Blind review scoring",
            path: "runtime/review.mjs",
            description: "Binds, validates, and scores blind-review evidence.",
          },
          {
            label: "Timeline engine",
            path: "runtime/timeline.mjs",
            description: "Allocates speech, solos, finale, and loop.",
          },
        ],
      },
      {
        title: "Assets",
        files: [
          {
            label: "Background options",
            path: "assets/background-options.json",
            description: "Four selectable outer backgrounds.",
          },
          {
            label: "Voice presets",
            path: "assets/voice-presets.json",
            description: "Non-secret Fish Audio assignments.",
          },
          {
            label: "Dance library",
            path: "mixamo-character-motion-v1/assets/motions/manifest.json",
            description: "Frozen 25-motion starter catalog.",
          },
        ],
      },
    ].map(async (group) => ({
      ...group,
      files: await Promise.all(
        group.files.map(async (file) => ({
          ...file,
          content: await readFile(resolveRepoFile(file.path), "utf8"),
        })),
      ),
    }))),
  };
}
