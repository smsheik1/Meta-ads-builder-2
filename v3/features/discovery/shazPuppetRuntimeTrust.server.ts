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
  status?: string;
  videoSha256: string;
  audioSha256?: string;
  cueSha256?: string;
  cueCount?: number;
  usedMouthDrawings?: string[];
  finalAudioCodec?: string;
  meanVolumeDb?: number;
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
  talkingSceneShowcase: GoldenRelease;
  authoredActionsShowcase: GoldenRelease;
  structuralAnatomyRelease: GoldenRelease;
};

export type ShazPuppetRuntimeTrustData = FormatRepoTrustData & {
  includedAssets: {
    defaultDialogue: {
      id: string;
      label: string;
      subtitle: string;
      internalPoseId: string;
      description: string;
      rules: string[];
    };
    poses: PoseRegistry["poses"];
    showcasePoses: PoseRegistry["poses"];
    props: AssetsManifest["props"];
    backgrounds: AssetsManifest["backgrounds"];
    bundledEngines: RequirementsManifest["bundledEngines"];
    showcasePosterSrc: string;
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
        return "npm run init -- --run=episode-01 --input=/absolute/path/input.json --audio=/absolute/path/dialogue.wav";
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
  const currentProof = goldens.talkingSceneShowcase;
  const showcasePoseIds = new Set([
    "present",
    "think",
    "aha",
    "point",
    "confident",
  ]);
  const showcasePoses = poseRegistry.poses.filter(({ id }) =>
    showcasePoseIds.has(id),
  );

  return {
    idPrefix: "shaz-puppet-runtime",
    version: format.version,
    assembly: {
      title: "The animation line",
      path: "Talk to Camera or sequence + local cues → Validate → Rig render → Inspect → Approve",
      ariaLabel:
        "Five steps from default dialogue or an action sequence to approved Shaz animation",
      commandsLabel: "What the coding agent runs",
      commandsAriaLabel: "Exact Shaz Puppet Runtime commands",
      steps: [
        {
          title: "Dialogue mode + local cues",
          cost: "Free",
          description:
            "Uses Talk to Camera for ordinary speech or registered actions for emphasis, then runs bundled Cherry 0.1.0 through Node WASI.",
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
    proof: { durationTimeLabel: "00:12", aspectRatio: "16:9" },
    proofCopy: {
      eyebrow: "02 · Audio-backed talking proof",
      title: "Real audio. Body language. Five lip-sync mouths. One renderer.",
    },
    annotations: [
      {
        seconds: 0,
        timeLabel: "00:00",
        title: "Audio becomes mouth motion",
        description:
          "Bundled Cherry WASI generates 100 cues locally, then the rig selects among five authored mouth drawings.",
        color: "cyan",
      },
      {
        seconds: 0.63,
        timeLabel: "00:00",
        title: "Present",
        description:
          "Shaz opens with the presenting gesture while the mouth track continues independently.",
        color: "pink",
      },
      {
        seconds: 2.29,
        timeLabel: "00:02",
        title: "Confident",
        description:
          "A hands-on-hips hold carries the next spoken phrase without freezing the lips.",
        color: "lime",
      },
      {
        seconds: 4.29,
        timeLabel: "00:04",
        title: "Point",
        description:
          "The full pointing performance supplies the strongest body-language beat.",
        color: "yellow",
      },
      {
        seconds: 8.08,
        timeLabel: "00:08",
        title: "Shrug",
        description:
          "A two-handed shrug broadens the silhouette while the fixed camera keeps the waist-up rig grounded.",
        color: "cyan",
      },
      {
        seconds: 10.04,
        timeLabel: "00:10",
        title: "Ah-ha",
        description:
          "The raised-finger accent closes the scene before the character returns to neutral.",
        color: "pink",
      },
    ],
    quality: {
      eyebrow: "03 · Format 0.2.1 quality contract",
      title: "Body motion and lip-sync stay inside one renderer.",
      summary: [
        { value: format.version, label: "downloadable Format" },
        { value: `${poseRegistry.poses.length}`, label: "registered actions" },
        { value: `${showcasePoses.length}`, label: "trusted poses below" },
        { value: "$0", label: "provider cost" },
      ],
      noteTitle: "A real first-draft talking proof.",
      note: `The download is Format ${format.version}; the exact playable talking proof remains historical Format ${currentProof.formatVersion}. That blind proof generated ${currentProof.cueCount} Cherry cues locally, used ${currentProof.usedMouthDrawings?.length} authored mouth drawings, and passed automatic audiovisual and rig inspection. Format ${format.version} adds the contract-tested Talk to Camera default without altering the proof or registering a duplicate pose. Final checksum-bound creative certification remains pending.`,
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
        {
          label: "Audio",
          value: `${currentProof.finalAudioCodec?.toUpperCase()} · ${currentProof.meanVolumeDb} dB`,
        },
        {
          label: "Lip-sync",
          value: `${currentProof.cueCount} cues · ${currentProof.usedMouthDrawings?.length} mouths`,
        },
        { label: "Artist frames", value: "Excluded" },
      ],
      note: `This exact Format ${currentProof.formatVersion} talking-scene checksum passed validation, render, audiovisual inspection, and a fresh-package blind replay. Its stored human-review receipt remains pending, so the page calls it a working first draft rather than final creative certification. User feedback: ${currentProof.userVisualApproval}.`,
    },
    files,
    includedAssets: {
      defaultDialogue: {
        id: "talk-to-camera",
        label: "Talk to Camera",
        subtitle: "Default dialogue",
        internalPoseId: "neutral-listening",
        description:
          "Shaz faces the audience with a calm, grounded body while Cherry changes only the Mouth drawing for the supplied audio.",
        rules: [
          "Audio sets the exact duration",
          "No sequence or frame math",
          "No extra pose or second renderer",
        ],
      },
      poses: poseRegistry.poses,
      showcasePoses,
      props: assets.props,
      backgrounds: assets.backgrounds,
      bundledEngines: requirements.bundledEngines,
      showcasePosterSrc:
        "/format-repositories/shaz-puppet-runtime-v1/goldens/five-authored-showcase/poster.jpg",
    },
  };
}
