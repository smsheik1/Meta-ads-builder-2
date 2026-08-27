import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FormatRepoTrustData } from "./formatRepoTrust.types";

type FormatManifest = { version: string };
type PackageManifest = { scripts: Record<string, string> };
type QualityContract = {
  automaticGates: string[];
  humanReview: { questions: string[] };
};
type PoseRegistry = {
  poses: Array<{ id: string; kind: string }>;
};
type AssetsManifest = {
  props: Array<{ id: string; usage: string }>;
  backgrounds: Array<{ id: string; path: string; usage: string }>;
};
type RequirementsManifest = {
  bundledEngines: Array<{
    name: string;
    version: string;
    artifact: string;
    host: string;
    nativeExecutable: boolean;
    networkRequired: boolean;
    purpose: string;
  }>;
};
type GoldenRelease = {
  formatVersion: string;
  videoSha256: string;
  durationSeconds: number;
  frames: number;
  width: number;
  height: number;
  fps: number;
  artistRenderedFramesUsed: false;
  userVisualApproval: string;
};
type GoldenManifest = {
  canonical: GoldenRelease;
  structuralAnatomyRelease: GoldenRelease;
};

export type ShazPuppetRuntimeTrustData = FormatRepoTrustData & {
  includedAssets: {
    poses: PoseRegistry["poses"];
    props: AssetsManifest["props"];
    backgrounds: AssetsManifest["backgrounds"];
    bundledEngines: RequirementsManifest["bundledEngines"];
    contactSheetSrc: string;
  };
};

const repoRoot = path.join(
  process.cwd(),
  "public/format-repositories/shaz-puppet-runtime-v1",
);

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, file), "utf8")) as T;
}

async function readText(file: string) {
  return readFile(path.join(repoRoot, file), "utf8");
}

export async function getShazPuppetRuntimeTrustData(): Promise<ShazPuppetRuntimeTrustData> {
  const [
    format,
    packageManifest,
    quality,
    poseRegistry,
    assets,
    requirements,
    goldens,
  ] = await Promise.all([
    readJson<FormatManifest>("format.json"),
    readJson<PackageManifest>("package.json"),
    readJson<QualityContract>("quality.json"),
    readJson<PoseRegistry>("poses/index.json"),
    readJson<AssetsManifest>("assets.json"),
    readJson<RequirementsManifest>("requirements.json"),
    readJson<GoldenManifest>("goldens.json"),
  ]);
  const commandOrder = [
    "check",
    "inspect:registry",
    "smoke",
    "lipsync",
    "init",
    "validate",
    "render",
    "inspect",
    "finalize",
  ];
  const commands = commandOrder
    .filter((command) => packageManifest.scripts[command])
    .map((command) => {
      if (command === "init") {
        return "npm run init -- --run=episode-01 --input=/absolute/path/input.json";
      }
      if (command === "lipsync") {
        return "npm run lipsync -- --audio=/absolute/path/audio.wav --output=/absolute/path/cherry.tsv";
      }
      if (["validate", "render", "inspect", "finalize"].includes(command)) {
        return `npm run ${command} -- --run=episode-01`;
      }
      return `npm run ${command}`;
    });
  const files = await Promise.all(
    [
      ["Format manifest", "format.json"],
      ["Agent instructions", "SKILL.md"],
      ["Runtime requirements", "requirements.json"],
      ["Input contract", "input-contract.json"],
      ["Quality gates", "quality.json"],
      ["Proof report", "PROOF-REPORT.md"],
      ["Provenance", "PROVENANCE.md"],
    ].map(async ([label, file]) => ({
      label,
      path: file,
      content: await readText(file),
    })),
  );
  const currentProof = goldens.structuralAnatomyRelease;

  return {
    idPrefix: "shaz-puppet-runtime",
    version: format.version,
    assembly: {
      title: "The animation line",
      path: "Sequence + local cues → Validate → Rig render → Inspect → Approve",
      ariaLabel:
        "Five steps from action sequence and optional audio to approved Shaz animation",
      commandsLabel: "What the coding agent runs",
      commandsAriaLabel: "Exact Shaz Puppet Runtime commands",
      steps: [
        {
          title: "Sequence + local cues",
          cost: "Free",
          description:
            "Chooses registered actions and timing, then runs bundled Cherry 0.1.0 through Node WASI when audio is supplied.",
        },
        {
          title: "Validate",
          cost: "Free",
          description:
            "Locks the input, rig source, recipes, and provenance checksums.",
        },
        {
          title: "Rig render",
          cost: "Free",
          description:
            "Renders body frames and cue-selected mouth drawings through the same recovered rig renderer.",
        },
        {
          title: "Inspect",
          cost: "Free",
          description:
            "Checks joints, clipping, layers, props, faces, frame count, and codec.",
        },
        {
          title: "Review and deliver",
          cost: "Free",
          description:
            "Binds a real visual review to the exact final-video checksum.",
          waiting: "Waits for your review",
        },
      ],
      commands,
    },
    proof: { durationTimeLabel: "00:07", aspectRatio: "16:9" },
    proofCopy: {
      eyebrow: "02 · Historical 0.1.2 body-rig proof",
      title: "Four repaired actions. Preserved pre-Cherry evidence.",
    },
    annotations: [
      {
        seconds: 0,
        timeLabel: "00:00",
        title: "Connected facepalm",
        description:
          "The overlay palm keeps a clean cuff connection while crossing in front of the face.",
        color: "cyan",
      },
      {
        seconds: 1.83,
        timeLabel: "00:02",
        title: "Readable folded arms",
        description:
          "A checksum-locked arm drawing replaces only the anatomy the source chain cannot fold cleanly.",
        color: "pink",
      },
      {
        seconds: 2.96,
        timeLabel: "00:03",
        title: "Attached celebration",
        description:
          "Both native sleeve and hand chains stay connected and on-model throughout the motion.",
        color: "lime",
      },
      {
        seconds: 4.58,
        timeLabel: "00:05",
        title: "Phone-free finish",
        description:
          "The final gesture keeps the approved hand proportions without an unwanted phone prop.",
        color: "yellow",
      },
    ],
    quality: {
      eyebrow: "03 · Format 0.2.0 quality contract",
      title: "Body motion and lip-sync stay inside one renderer.",
      summary: [
        { value: format.version, label: "downloadable Format" },
        { value: `${poseRegistry.poses.length}`, label: "registered actions" },
        { value: `${currentProof.frames}`, label: "historical proof frames" },
        { value: "$0", label: "provider cost" },
      ],
      noteTitle: "Proof scope stays explicit.",
      note: `The download is Format ${format.version} with bundled Cherry WASI cue generation. The playable anatomy-v8 video is a historical Format ${currentProof.formatVersion} body-rig proof; it does not certify the current lip-sync path.`,
      criteriaTitle: "Automatic gates",
      criteriaSubtitle: `${quality.automaticGates.length} checks plus ${quality.humanReview.questions.length} visual questions`,
      criteria: quality.automaticGates.map((label, index) => ({
        id: `gate-${index + 1}`,
        label,
        badge: "Required",
      })),
      rule: "All automatic gates must pass, then the exact MP4 must receive an honest visual approval.",
    },
    commands,
    receipt: {
      rows: [
        { label: "Download Format", value: format.version },
        { label: "Proof Format", value: currentProof.formatVersion },
        { label: "Video SHA", value: currentProof.videoSha256.slice(0, 16) },
        { label: "Frames", value: String(currentProof.frames) },
        {
          label: "Output",
          value: `${currentProof.width} × ${currentProof.height} · ${currentProof.fps} fps`,
        },
        { label: "Artist frames", value: "Excluded" },
      ],
      note: `Historical mechanical proof and Codex visual review passed for Format ${currentProof.formatVersion}. It does not certify Format ${format.version} or its bundled Cherry WASI lip-sync; user visual approval is ${currentProof.userVisualApproval}.`,
    },
    files,
    includedAssets: {
      poses: poseRegistry.poses,
      props: assets.props,
      backgrounds: assets.backgrounds,
      bundledEngines: requirements.bundledEngines,
      contactSheetSrc:
        "/format-repositories/shaz-puppet-runtime-v1/goldens/anatomy-v8-release/contact-sheet.jpg",
    },
  };
}
