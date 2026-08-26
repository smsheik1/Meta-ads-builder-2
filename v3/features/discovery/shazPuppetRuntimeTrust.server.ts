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
};
type GoldenManifest = {
  canonical: {
    videoSha256: string;
    durationSeconds: number;
    frames: number;
    width: number;
    height: number;
    fps: number;
    artistRenderedFramesUsed: false;
    userVisualApproval: string;
  };
};

export type ShazPuppetRuntimeTrustData = FormatRepoTrustData & {
  includedAssets: {
    poses: PoseRegistry["poses"];
    props: AssetsManifest["props"];
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
  const [format, packageManifest, quality, poseRegistry, assets, goldens] =
    await Promise.all([
      readJson<FormatManifest>("format.json"),
      readJson<PackageManifest>("package.json"),
      readJson<QualityContract>("quality.json"),
      readJson<PoseRegistry>("poses/index.json"),
      readJson<AssetsManifest>("assets.json"),
      readJson<GoldenManifest>("goldens.json"),
    ]);
  const commandOrder = [
    "check",
    "inspect:registry",
    "smoke",
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
      if (["validate", "render", "inspect", "finalize"].includes(command)) {
        return `npm run ${command} -- --run=episode-01`;
      }
      return `npm run ${command}`;
    });
  const files = await Promise.all(
    [
      ["Agent instructions", "SKILL.md"],
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

  return {
    idPrefix: "shaz-puppet-runtime",
    version: format.version,
    assembly: {
      title: "The animation line",
      path: "Sequence → Validate → Rig render → Inspect → Approve",
      ariaLabel: "Five steps from pose sequence to approved Shaz animation",
      commandsLabel: "What the coding agent runs",
      commandsAriaLabel: "Exact Shaz Puppet Runtime commands",
      steps: [
        {
          title: "Sequence actions",
          cost: "Free",
          description: "Chooses registered actions and explicit hold and gap timing.",
        },
        {
          title: "Validate",
          cost: "Free",
          description: "Locks the input, rig source, recipes, and provenance checksums.",
        },
        {
          title: "Rig render",
          cost: "Free",
          description: "Renders every frame from recovered 2D rig controls through one runtime.",
        },
        {
          title: "Inspect",
          cost: "Free",
          description: "Checks joints, clipping, layers, props, faces, frame count, and codec.",
        },
        {
          title: "Review and deliver",
          cost: "Free",
          description: "Binds a real visual review to the exact final-video checksum.",
          waiting: "Waits for your review",
        },
      ],
      commands,
    },
    proof: { durationTimeLabel: "00:21", aspectRatio: "16:9" },
    proofCopy: {
      eyebrow: "02 · Runtime proof",
      title: "Ten actions. One recovered rig.",
    },
    annotations: [
      {
        seconds: 0,
        timeLabel: "00:00",
        title: "Artist action replay",
        description: "The original presenting action proves the recovered controls stay on-model.",
        color: "cyan",
      },
      {
        seconds: 1.42,
        timeLabel: "00:01",
        title: "New celebration",
        description: "A newly authored action uses anticipation, overshoot, and settle through real rig controls.",
        color: "pink",
      },
      {
        seconds: 5.21,
        timeLabel: "00:05",
        title: "Prop choreography",
        description: "The screen enters while the pointing arm follows the recovered shoulder and hand mechanics.",
        color: "lime",
      },
      {
        seconds: 14.5,
        timeLabel: "00:14",
        title: "Frustrated facepalm",
        description: "Head drag, closed eyes, and hand contact build one readable emotional action.",
        color: "yellow",
      },
      {
        seconds: 19.71,
        timeLabel: "00:19",
        title: "Skeptical hold",
        description: "A minimal arm substitution repairs the source rig's fixed depth topology.",
        color: "pink",
      },
    ],
    quality: {
      eyebrow: "03 · Quality gate",
      title: "Every used action is re-inspected.",
      summary: [
        { value: "74/74", label: "kit tests passing" },
        { value: `${poseRegistry.poses.length}`, label: "registered actions" },
        { value: `${goldens.canonical.frames}`, label: "proof frames" },
        { value: "$0", label: "provider cost" },
      ],
      noteTitle: "Approval cannot be faked.",
      note: "Finalization requires a human-review checksum matching the exact MP4; the blind package test correctly remained blocked when continuous video perception was unavailable.",
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
        { label: "Format", value: format.version },
        { label: "Video SHA", value: goldens.canonical.videoSha256.slice(0, 16) },
        { label: "Frames", value: String(goldens.canonical.frames) },
        { label: "Output", value: `${goldens.canonical.width} × ${goldens.canonical.height} · ${goldens.canonical.fps} fps` },
        { label: "Artist frames", value: "Excluded" },
      ],
      note: `Mechanical proof passed. User visual approval: ${goldens.canonical.userVisualApproval}.`,
    },
    files,
    includedAssets: {
      poses: poseRegistry.poses,
      props: assets.props,
      contactSheetSrc:
        "/format-repositories/shaz-puppet-runtime-v1/goldens/ten-action-contact-sheet.jpg",
    },
  };
}
