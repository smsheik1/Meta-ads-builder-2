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
type BackgroundAsset = {
  id: string;
  label: string;
  path: string;
  sha256: string;
  usage: string;
  supportingMediaZone?: {
    status: "reserved-not-active";
    runtimeBehavior: string;
  };
};
type AssetsManifest = {
  defaultBackgroundId: string;
  props: Array<{ id: string; usage: string }>;
  backgrounds: BackgroundAsset[];
};
type RequirementsManifest = {
  bundledEngines: Array<{
    name: string;
    version: string;
    artifact: string;
    host: string;
    nativeExecutable?: boolean;
    nativeExecutableIncluded?: boolean;
    nativeExecutableBuiltLocally?: boolean;
    networkRequired: boolean;
    purpose: string;
    supportedPlatform?: string;
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
    defaultBackgroundId: AssetsManifest["defaultBackgroundId"];
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
    "transcribe",
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
      if (command === "transcribe") {
        return "npm run transcribe -- --audio=/absolute/path/audio.wav --output=/absolute/path/transcript.json";
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
      title: "How a talking scene gets made",
      path: "Choose the performance → Check the plan → Render Shaz → Watch the result → Deliver",
      ariaLabel:
        "Five steps from a voice track to a reviewed Shaz talking scene",
      commandsLabel: "Commands the agent runs",
      commandsAriaLabel: "Exact Animate Shaz commands",
      steps: [
        {
          title: "Choose the performance",
          cost: "Free",
          description:
            "The kit reads the words and their timing locally. Start with Talk to Camera, then place an artist-reviewed gesture where the line needs more expression.",
        },
        {
          title: "Check the plan",
          cost: "Free",
          description:
            "Makes sure the audio, background, gesture IDs, timing, and rig files are ready before rendering.",
        },
        {
          title: "Render Shaz",
          cost: "Free",
          description:
            "Shaz’s original rig draws every body frame and mouth shape.",
        },
        {
          title: "Catch visual problems",
          cost: "Free",
          description:
            "Checks for broken joints, clipping, misplaced layers and props, facial glitches, wrong duration, and bad video settings.",
        },
        {
          title: "You approve it",
          cost: "Free",
          description:
            "A person watches the exact MP4 before the agent can deliver it.",
          waiting: "Waits for you",
        },
      ],
      commands,
    },
    proof: { durationTimeLabel: "00:12", aspectRatio: "16:9" },
    proofCopy: {
      eyebrow: "02 · First-draft talking scene",
      title: "A real voice track, performed by Shaz.",
    },
    annotations: [
      {
        seconds: 0,
        timeLabel: "00:00",
        title: "Audio becomes mouth motion",
        description:
          "Cherry turns the audio into 100 timing cues locally, then the existing rig picks from five hand-drawn mouth shapes.",
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
      eyebrow: "03 · What gets checked",
      title: "The agent checks the render. You judge the performance.",
      summary: [
        { value: format.version, label: "kit version" },
        { value: `${poseRegistry.poses.length}`, label: "runnable actions" },
        { value: `${showcasePoses.length}`, label: "artist-reviewed gestures" },
        { value: "$0", label: "service fees" },
      ],
      noteTitle: "A strong first draft, not a finished performance.",
      note: `The 12-second video above was made with an earlier ${currentProof.formatVersion} kit. It generated ${currentProof.cueCount} mouth-timing cues locally, used ${currentProof.usedMouthDrawings?.length} hand-drawn mouth shapes, and passed the audio, video, and rig checks in a fresh download. The current kit can also read English dialogue with word timing before it plans gestures, and includes Talk to Camera plus four built-in backgrounds. Creative review of this exact video is still pending.`,
      criteriaTitle: "Checks before review",
      criteriaSubtitle: `${quality.automaticGates.length} automatic checks, then ${quality.humanReview.questions.length} questions for a person`,
      criteria: quality.automaticGates.map((label, index) => ({
        id: `gate-${index + 1}`,
        label,
        badge: "Required",
      })),
      rule: "Every automatic check must pass. Then a person must watch the exact MP4 before final delivery.",
    },
    commands,
    receipt: {
      rows: [
        { label: "Kit version", value: format.version },
        { label: "Demo made with", value: currentProof.formatVersion },
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
      note: `This ${currentProof.formatVersion} proof rendered from a fresh download and passed validation plus the audio, video, and rig checks. The exact video checksum is recorded above. Human creative review is still pending, so this is a strong first draft—not a finished performance. User feedback: ${currentProof.userVisualApproval}.`,
    },
    files,
    includedAssets: {
      defaultDialogue: {
        id: "talk-to-camera",
        label: "Talk to Camera",
        subtitle: "Default dialogue",
        internalPoseId: "neutral-listening",
        description:
          "Shaz faces the audience in a calm, grounded pose while the supplied audio changes only the mouth drawing.",
        rules: [
          "The audio decides the length",
          "No manual frame math",
          "The same body and renderer stay in place",
        ],
      },
      poses: poseRegistry.poses,
      showcasePoses,
      props: assets.props,
      backgrounds: assets.backgrounds,
      defaultBackgroundId: assets.defaultBackgroundId,
      bundledEngines: requirements.bundledEngines,
      showcasePosterSrc:
        "/format-repositories/shaz-puppet-runtime-v1/goldens/five-authored-showcase/poster.jpg",
    },
  };
}
