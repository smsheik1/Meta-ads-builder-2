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

type RequirementsContract = {
  localTools: string[];
  optionalAssetRebuildTools: string[];
  providers: unknown[];
  environmentVariables: string[];
};

type AssetsManifest = {
  backgrounds: Array<{ id: string; path: string; role: string }>;
  characters: Array<{
    id: string;
    poses: Array<{ id: string; path: string }>;
  }>;
};

type QualityContract = {
  rubricVersion: string;
  automatic: { width: number; height: number; fps: number };
  technicalGates: Array<{ id: string }>;
  blindReview: { criteria: string[] };
};

type SampleInput = {
  timeline: Array<{
    start: number;
    end: number;
    speaker: string;
    camera: string;
  }>;
};

export type AnimalConversationsTrustData = FormatRepoTrustData & {
  stats: {
    backgrounds: number;
    cameras: number;
    characters: number;
  };
  includedAssets: {
    characters: Array<{
      id: string;
      label: string;
      poseCount: number;
      posterSrc: string;
    }>;
    backgrounds: Array<{
      id: string;
      label: string;
      description: string;
      src: string;
    }>;
    defaultBackgroundId: string;
  };
  requirements: RequirementsContract;
};

const repoRoot = path.join(
  process.cwd(),
  "public/format-repositories/animal-conversations-v1",
);
const publicRoot = "/format-repositories/animal-conversations-v1";

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function timestamp(seconds: number) {
  const rounded = Math.round(seconds);
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

export async function getAnimalConversationsTrustData(): Promise<AnimalConversationsTrustData> {
  const [format, quality, assets, packageManifest, requirements, sampleInput] =
    await Promise.all([
      readJson<FormatManifest>(path.join(repoRoot, "format.json")),
      readJson<QualityContract>(path.join(repoRoot, "quality.json")),
      readJson<AssetsManifest>(path.join(repoRoot, "assets.json")),
      readJson<PackageManifest>(path.join(repoRoot, "package.json")),
      readJson<RequirementsContract>(path.join(repoRoot, "requirements.json")),
      readJson<SampleInput>(path.join(repoRoot, "fixtures/sample/input.json")),
    ]);

  const durationSeconds = sampleInput.timeline.at(-1)?.end ?? 0;
  const commands = [
    "test",
    "check",
    "smoke",
    "validate",
    "render",
    "inspect",
    "finalize",
  ]
    .filter((script) => packageManifest.scripts[script])
    .map((script) =>
      ["validate", "render", "inspect", "finalize"].includes(script)
        ? `npm run ${script} -- --run=episode-01`
        : `npm run ${script}`,
    );

  const files = await Promise.all(
    [
      { label: "Agent instructions", path: "SKILL.md" },
      { label: "Human setup", path: "README.md" },
      { label: "Required inputs", path: "input-contract.json" },
      { label: "Final deliverables", path: "output-contract.json" },
      { label: "Services and tools", path: "requirements.json" },
      { label: "Composition rules", path: "composition-contract.json" },
      { label: "Fixed vs customizable", path: "content-boundary.json" },
      { label: "Asset manifest", path: "assets.json" },
      { label: "Quality rubric", path: "quality.json" },
      {
        label: "Overlap regression",
        path: "fixtures/regression/overlapping-reassurance/input.json",
      },
      { label: "Published proof", path: "PROOF-REPORT.md" },
      { label: "Contract tests", path: "runtime/tests/runtime.test.mjs" },
      { label: "Main runner", path: "runner.mjs" },
      { label: "Video renderer", path: "runtime/render.mjs" },
      { label: "Output inspection", path: "runtime/inspect.mjs" },
      { label: "Speaker review", path: "runtime/speaker-review.mjs" },
    ].map(async (file) => ({
      ...file,
      content: await readFile(path.join(repoRoot, file.path), "utf8"),
    })),
  );

  return {
    idPrefix: "animal-conversations",
    version: format.version,
    assembly: {
      title: "The assembly line",
      path: "Audio setup → Speaker review → Episode plan → Render → Deliver",
      ariaLabel:
        "Five steps from supplied conversation audio to final delivery",
      commandsLabel: "What the coding agent runs",
      commandsAriaLabel: "Exact Animal Conversations runtime commands",
      steps: [
        {
          title: "Audio setup",
          cost: "Free",
          description:
            "Copies your local conversation audio into an ignored run folder.",
        },
        {
          title: "Speaker review",
          cost: "Free",
          description:
            "Generates one timed role sheet with exact ranges, Dog/Bunny assignments, caption owners, vocalizations, and overlaps, then binds its approval to the audio checksum.",
          waiting: "Waits for explicit evidence",
        },
        {
          title: "Episode plan",
          cost: "Free",
          description:
            "Validates timing, captions, three approved cameras, and any intentional emphasis cues.",
        },
        {
          title: "Render",
          cost: "Free",
          description:
            "Builds one 1080 × 1920 conversation with the supplied audio.",
        },
        {
          title: "Review and deliver",
          cost: "Free",
          description:
            "Inspects the MP4, approved timed role sheet, contact sheet, and technical report before finalizing.",
          waiting: "Waits for your review",
        },
      ],
      commands: [
        "npm test",
        "npm run check",
        "npm run smoke -- --run=<id>",
        "node runner.mjs init --run=<id> --audio=/absolute/path/audio.wav --input=/absolute/path/input.json",
        "node runner.mjs approve-script --run=<id>",
        "node runner.mjs validate --run=<id>",
        "node runner.mjs render --run=<id>",
        "node runner.mjs inspect --run=<id>",
        "node runner.mjs finalize --run=<id>",
      ],
    },
    proof: {
      durationTimeLabel: timestamp(durationSeconds),
    },
    proofCopy: {
      eyebrow: "02 · Finished example",
      title: "Watch the final conversation.",
    },
    annotations: [
      {
        seconds: 0,
        timeLabel: "00:00",
        title: "The two-shot starts separated and inward-facing.",
        description:
          "Both complete colored characters share the frame without touching or facing away.",
        color: "cyan",
      },
      {
        seconds: 6.85,
        timeLabel: "00:07",
        title: "The bunny close-up faces into the scene.",
        description:
          "The bunny-only camera uses the reference-matched right-facing orientation.",
        color: "pink",
      },
      {
        seconds: 10.15,
        timeLabel: "00:10",
        title: "Captions advance in short cards.",
        description:
          "Complete lines become readable one-to-three-word phrases below the characters' faces.",
        color: "lime",
      },
      {
        seconds: 27.9,
        timeLabel: "00:28",
        title: "Silence keeps the reaction neutral.",
        description:
          "The cat holds the close-up with a closed mouth; uncued dialogue does not make either body hop.",
        color: "yellow",
      },
    ],
    quality: {
      eyebrow: "03 · Final evaluation",
      title: "How your finished video is checked.",
      summary: [
        {
          value: `${quality.technicalGates.length}/${quality.technicalGates.length}`,
          label: "Technical gates pass in the proof",
        },
        { value: "0", label: "Provider calls at runtime" },
        { value: "3", label: "Approved camera angles" },
      ],
      noteTitle: "Evidence stays explicit.",
      note: "Speaker identity must come from direct audio review, a user label, a checksum-matched reference video, or silence. The Repo never claims automatic diarization.",
      criteriaTitle: `The playback review checks ${quality.blindReview.criteria.length} things`,
      criteriaSubtitle:
        "Character, speaker, caption, camera, motion, and audio evidence",
      criteria: quality.blindReview.criteria.map((label, index) => ({
        id: `criterion-${index + 1}`,
        label,
      })),
      rule: "A render ships only after the dimensions, duration, codecs, audio, camera grammar, speaker receipt, input parity, captions, and speech-activity checks all pass. Any perceptual limit must be disclosed instead of guessed.",
    },
    receipt: {
      rows: [
        { label: "Renderer", value: format.renderer },
        { label: "Quality", value: "Pass · published proof report" },
        {
          label: "Technical",
          value: `${quality.technicalGates.length}/${quality.technicalGates.length} gates`,
        },
        { label: "Speakers", value: "Explicit confirmation per beat" },
        {
          label: "Output",
          value: `${quality.automatic.width} × ${quality.automatic.height} · ${durationSeconds.toFixed(3)}s MP4`,
        },
      ],
      note: "The approved proof MP4 intentionally retains its distributable soundtrack. Runtime audio remains user-supplied, local, and excluded from the downloadable kit.",
    },
    commands,
    files,
    stats: {
      backgrounds: assets.backgrounds.length,
      cameras: 3,
      characters: assets.characters.length,
    },
    includedAssets: {
      characters: assets.characters.map((character) => {
        const idlePose = character.poses.find((pose) => pose.id === "idle");
        if (!idlePose)
          throw new Error(`Missing idle pose for ${character.id}.`);
        return {
          id: character.id,
          label: titleCase(character.id),
          poseCount: character.poses.length,
          posterSrc: `${publicRoot}/${idlePose.path}`,
        };
      }),
      backgrounds: assets.backgrounds.map((background) => ({
        id: background.id,
        label: titleCase(background.id),
        description: background.role,
        src: `${publicRoot}/${background.path}`,
      })),
      defaultBackgroundId: assets.backgrounds[0]?.id ?? "living-room",
    },
    requirements,
  };
}
