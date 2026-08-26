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
type GoldenRelease = {
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
  const currentProof = goldens.structuralAnatomyRelease;

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
    proof: { durationTimeLabel: "00:07", aspectRatio: "16:9" },
    proofCopy: {
      eyebrow: "02 · Runtime proof",
      title: "Four repaired actions. One recovered rig.",
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
      eyebrow: "03 · Quality gate",
      title: "Every used action is re-inspected.",
      summary: [
        { value: "74/74", label: "kit tests passing" },
        { value: `${poseRegistry.poses.length}`, label: "registered actions" },
        { value: `${currentProof.frames}`, label: "proof frames" },
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
        { label: "Video SHA", value: currentProof.videoSha256.slice(0, 16) },
        { label: "Frames", value: String(currentProof.frames) },
        {
          label: "Output",
          value: `${currentProof.width} × ${currentProof.height} · ${currentProof.fps} fps`,
        },
        { label: "Artist frames", value: "Excluded" },
      ],
      note: `Mechanical proof and Codex visual review passed. User visual approval is ${currentProof.userVisualApproval}.`,
    },
    files,
    includedAssets: {
      poses: poseRegistry.poses,
      props: assets.props,
      contactSheetSrc:
        "/format-repositories/shaz-puppet-runtime-v1/goldens/anatomy-v8-release/contact-sheet.jpg",
    },
  };
}
