import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FormatRepoTrustData } from "./formatRepoTrust.types";

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

type VoiceManifest = {
  voices: Array<{ characterId: string }>;
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

export type BikiniBottomDanceOffTrustData = FormatRepoTrustData & {
  stats: {
    motions: number;
    motionReadyCharacters: number;
    voiceReadyCharacters: number;
  };
  includedAssets: {
    characters: Array<{
      id: string;
      label: string;
      modelSrc: string;
      posterSrc: string;
      voiceReady: boolean;
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
  requirements: RequirementsContract;
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
    voicePresets,
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
    readJson<VoiceManifest>(path.join(repoRoot, "assets/voice-presets.json")),
    readJson<PackageManifest>(path.join(repoRoot, "package.json")),
    readJson<RequirementsContract>(path.join(repoRoot, "requirements.json")),
    readJson<RenderReport>(
      path.join(repoRoot, "examples/wiggle-proof/evidence/render-report.json"),
    ),
    readJson<EvalReport>(
      path.join(repoRoot, "examples/wiggle-proof/evidence/eval-report.json"),
    ),
  ]);

  const firstSolo = renderReport.timeline.rounds[0]?.danceStart ?? 4;
  const finale = renderReport.timeline.finale.start;
  const closing = renderReport.timeline.closingChorus.start;
  const replay = renderReport.timeline.loopBridge.start;
  const voiceReadyIds = new Set(
    voicePresets.voices.map((voice) => voice.characterId),
  );
  const includedCharacters = characters.packs
    .filter((character) => character.status === "motion-ready")
    .map((character) => {
      return {
        id: character.id,
        label: character.label,
        modelSrc: `${characterPreviewRoot}/${character.id}.glb`,
        posterSrc: `${characterPreviewRoot}/${character.id}.png`,
        voiceReady: voiceReadyIds.has(character.id),
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

  const assemblyCommands = [
    "npm run check",
    "npm run smoke",
    "npm run list-motions",
    "node runner.mjs init --run=<id> --song=<file>",
    "node runner.mjs validate --run=<id>",
    "node runner.mjs render --run=<id> --approve-provider",
    "node runner.mjs inspect --run=<id>",
    "node runner.mjs finalize --run=<id> --review=<review.json>",
  ];

  return {
    idPrefix: "dance-off",
    version: format.version,
    assembly: {
      title: "The assembly line",
      path: "Song analysis → Dance plan → Voice lines → Render → Deliver",
      ariaLabel: "Five steps from song analysis to final delivery",
      commandsLabel: "What the coding agent runs",
      commandsAriaLabel: "Exact Dance Off runtime commands",
      steps: [
        {
          title: "Song analysis",
          cost: "Free",
          description: "Finds the beat, the best excerpt, and exact timing.",
        },
        {
          title: "Dance plan",
          cost: "Free",
          description:
            "Assigns solo, reaction, and finale dances to all four characters.",
        },
        {
          title: "Voice lines",
          cost: "Free tier",
          description:
            "Creates the opening, taunts, and closing line in four voices.",
          waiting: "Waits for your approval",
        },
        {
          title: "Render",
          cost: "Free",
          description: "Builds one 1080 × 1920 Reel with captions and music.",
        },
        {
          title: "Review and deliver",
          cost: "Free",
          description:
            "Checks the video, gets an independent grade, and returns the MP4.",
          waiting: "Waits for your review",
        },
      ],
      commands: assemblyCommands,
    },
    stats: {
      motions: motions.motions.length,
      motionReadyCharacters: includedCharacters.length,
      voiceReadyCharacters: voiceReadyIds.size,
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
    proof: {
      durationTimeLabel: "00:47",
    },
    proofCopy: {
      eyebrow: "02 · Finished example",
      title: "Watch the final video.",
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
    quality: {
      eyebrow: "03 · Final evaluation",
      title: "How your finished video is graded.",
      summary: [
        {
          value: `${quality.technicalGates.length}/${quality.technicalGates.length}`,
          label: "Technical gates must pass",
        },
        {
          value: `${quality.grading.passingScore}/100`,
          label: "Minimum blind score",
        },
        { value: "0", label: "Critical failures allowed" },
      ],
      noteTitle: "Blind means independent.",
      note: "The judge receives the final MP4, intended cast and dialogue, and this rubric. It does not receive the source, render history, previous score, or known defects.",
      criteriaTitle: "The blind judge scores seven things",
      criteriaSubtitle: "Every rating needs time-coded evidence",
      criteria: quality.grading.blindCriteria.map(
        ({ id, label, weight, criticalFloor }) => ({
          id,
          label,
          value: String(weight),
          badge: Number.isFinite(criticalFloor) ? "Critical" : undefined,
        }),
      ),
      ratingScale: quality.grading.ratingScale
        .slice()
        .reverse()
        .map(({ rating, label }) => ({ value: String(rating), label })),
      rule: `A technically valid video still fails below ${quality.grading.passingScore}, or when character integrity, motion, audio, or composition falls below its critical floor. Missing, indirect, or low-confidence playback evidence is inconclusive and requires another judge.`,
    },
    commands,
    receipt: {
      rows: [
        { label: "Renderer", value: format.renderer.replace("../", "") },
        {
          label: "Quality",
          value: `${evalReport.overall.grade} · ${evalReport.overall.score}/100 · ${evalReport.overall.status}`,
        },
        {
          label: "Technical",
          value: `${evalReport.overall.technicalPassed}/${evalReport.overall.technicalTotal} gates`,
        },
        { label: "Blind rubric", value: `Version ${evalReport.rubricVersion}` },
        {
          label: "Output",
          value: `${quality.automatic.width} × ${quality.automatic.height} · ${quality.automatic.durationSeconds}s MP4`,
        },
      ],
      note: `Archived visual/caption-assisted pilot. Current rubric ${quality.rubricVersion} requires direct moving-video and audio perception before a score can ship.`,
    },
    files: await Promise.all(
      [
        { label: "Agent instructions", path: "SKILL.md" },
        { label: "Human setup", path: "README.md" },
        { label: "Required inputs", path: "input-contract.json" },
        { label: "Final deliverables", path: "output-contract.json" },
        { label: "Services and tools", path: "requirements.json" },
        { label: "Timeline rules", path: "composition-contract.json" },
        { label: "Fixed vs customizable", path: "content-boundary.json" },
        { label: "Asset manifest", path: "assets.json" },
        { label: "Quality rubric", path: "quality.json" },
        { label: "Evaluation framework", path: "EVALUATION-FRAMEWORK.md" },
        { label: "Calibration results", path: "CALIBRATION-REPORT.md" },
        { label: "Blind judge prompt", path: "prompts/blind-review.md" },
        { label: "Contract tests", path: "tests/contracts.test.mjs" },
        { label: "Evaluation tests", path: "tests/evaluate.test.mjs" },
        {
          label: "Review integrity tests",
          path: "tests/review-packet.test.mjs",
        },
        { label: "Published proof", path: "PROOF-REPORT.md" },
        { label: "Main runner", path: "runner.mjs" },
        { label: "Video compositor", path: "runtime/compose.mjs" },
        { label: "Output inspection", path: "runtime/inspect.mjs" },
        { label: "Blind review scoring", path: "runtime/review.mjs" },
        { label: "Timeline engine", path: "runtime/timeline.mjs" },
        { label: "Background options", path: "assets/background-options.json" },
        { label: "Voice presets", path: "assets/voice-presets.json" },
        {
          label: "Character import audit",
          path: "mixamo-character-motion-v1/assets/character-import-audit.json",
        },
        {
          label: "Dance library",
          path: "mixamo-character-motion-v1/assets/motions/manifest.json",
        },
      ].map(async (file) => ({
        ...file,
        content: await readFile(resolveRepoFile(file.path), "utf8"),
      })),
    ),
  };
}
