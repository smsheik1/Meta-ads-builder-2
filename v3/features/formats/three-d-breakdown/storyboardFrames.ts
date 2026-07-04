import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import type {
  ThreeDBreakdownAdScene,
  ThreeDBreakdownClipPlan,
  ThreeDBreakdownStoryboardBoard,
} from "../../scene/types";

type DecodedImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

const frameContracts: NonNullable<ThreeDBreakdownStoryboardBoard["frames"]> = [
  {
    frameIndex: 1,
    role: "problem",
    label: "Problem state",
    crop: { x: 0, y: 0, width: 0.5, height: 1 / 3 },
    image: { status: "idle" },
  },
  {
    frameIndex: 2,
    role: "escalation",
    label: "Escalation",
    crop: { x: 0.5, y: 0, width: 0.5, height: 1 / 3 },
    image: { status: "idle" },
  },
  {
    frameIndex: 3,
    role: "mechanism-setup",
    label: "Mechanism setup",
    crop: { x: 0, y: 1 / 3, width: 0.5, height: 1 / 3 },
    image: { status: "idle" },
  },
  {
    frameIndex: 4,
    role: "wow-reveal",
    label: "Wow reveal",
    crop: { x: 0.5, y: 1 / 3, width: 0.5, height: 1 / 3 },
    image: { status: "idle" },
  },
  {
    frameIndex: 5,
    role: "payoff",
    label: "Evidence payoff",
    crop: { x: 0, y: 2 / 3, width: 0.5, height: 1 / 3 },
    image: { status: "idle" },
  },
  {
    frameIndex: 6,
    role: "final-state",
    label: "Final state",
    crop: { x: 0.5, y: 2 / 3, width: 0.5, height: 1 / 3 },
    image: { status: "idle" },
  },
];

export const createThreeDStoryboardFrames = () => (
  frameContracts.map((frame) => ({
    ...frame,
    crop: { ...frame.crop },
    image: { status: "idle" as const },
  }))
);

export const createThreeDClipPlans = (
  sceneInput: Pick<ThreeDBreakdownAdScene["layout"], "scriptBeats" | "storyContract">,
): ThreeDBreakdownAdScene["layout"]["clipPlans"] => {
  const consequence = sceneInput.scriptBeats[0]?.narration || "The problem starts.";
  const context = sceneInput.scriptBeats[1]?.narration || "The problem escalates.";
  const mechanism = sceneInput.scriptBeats[2]?.narration || "The mechanism appears.";
  const revelation = sceneInput.scriptBeats[3]?.narration || "The proof lands.";
  const punchline = sceneInput.scriptBeats[4]?.narration || "The final state resolves.";
  const world = sceneInput.storyContract.visualWorld;
  const recurringObjects = sceneInput.storyContract.recurringObjects.join(", ");

  return [
    {
      clipIndex: 1,
      label: "Clip 1: problem to setup",
      startMs: 0,
      endMs: 10_000,
      durationSeconds: 10,
      frameIndexes: [1, 2, 3],
      prompt: [
        "Animate storyboard frames 1-3 as the first half of a 20-second vertical 3D Breakdown.",
        `World: ${world}. Recurring objects: ${recurringObjects}.`,
        `Narrative: ${consequence} ${context} ${mechanism}`,
        "Move from problem state into mechanism setup. Preserve product identity, framing, blue-grid 3D world, and no generated text.",
      ].join(" "),
      video: { status: "idle" },
    } as ThreeDBreakdownClipPlan & { clipIndex: 1 },
    {
      clipIndex: 2,
      label: "Clip 2: reveal to payoff",
      startMs: 10_000,
      endMs: 20_000,
      durationSeconds: 10,
      frameIndexes: [4, 5, 6],
      prompt: [
        "Animate storyboard frames 4-6 as the second half of a 20-second vertical 3D Breakdown.",
        `World: ${world}. Recurring objects: ${recurringObjects}.`,
        `Narrative: ${mechanism} ${revelation} ${punchline}`,
        "Make the reveal the strongest motion, then settle into the final transformed state. Preserve product identity and no generated text.",
      ].join(" "),
      video: { status: "idle" },
    } as ThreeDBreakdownClipPlan & { clipIndex: 2 },
  ];
};

const isPngBytes = (bytes: Uint8Array) => (
  bytes[0] === 0x89 &&
  bytes[1] === 0x50 &&
  bytes[2] === 0x4e &&
  bytes[3] === 0x47
);

const isJpegBytes = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8;

const decodeImage = (bytes: Uint8Array, mimeType: string): DecodedImage => {
  if (isPngBytes(bytes)) {
    const png = PNG.sync.read(Buffer.from(bytes));
    return { width: png.width, height: png.height, data: png.data };
  }
  if (isJpegBytes(bytes)) {
    const decoded = jpeg.decode(Buffer.from(bytes), { useTArray: true });
    return { width: decoded.width, height: decoded.height, data: decoded.data };
  }

  const normalizedMime = mimeType.toLowerCase();
  if (normalizedMime.includes("png")) {
    const png = PNG.sync.read(Buffer.from(bytes));
    return { width: png.width, height: png.height, data: png.data };
  }
  if (normalizedMime.includes("jpeg") || normalizedMime.includes("jpg")) {
    const decoded = jpeg.decode(Buffer.from(bytes), { useTArray: true });
    return { width: decoded.width, height: decoded.height, data: decoded.data };
  }
  try {
    const decoded = jpeg.decode(Buffer.from(bytes), { useTArray: true });
    return { width: decoded.width, height: decoded.height, data: decoded.data };
  } catch {
    const png = PNG.sync.read(Buffer.from(bytes));
    return { width: png.width, height: png.height, data: png.data };
  }
};

export const cropThreeDStoryboardFrames = (bytes: Uint8Array, mimeType: string) => {
  const source = decodeImage(bytes, mimeType);
  const cellInsetX = Math.max(2, Math.round(source.width * 0.012));
  const cellInsetY = Math.max(2, Math.round(source.height * 0.008));

  return frameContracts.map((frame) => {
    const rawX = Math.round(frame.crop.x * source.width);
    const rawY = Math.round(frame.crop.y * source.height);
    const rawWidth = Math.round(frame.crop.width * source.width);
    const rawHeight = Math.round(frame.crop.height * source.height);
    const x = Math.max(0, rawX + cellInsetX);
    const y = Math.max(0, rawY + cellInsetY);
    const width = Math.min(source.width - x, rawWidth - cellInsetX * 2);
    const height = Math.min(source.height - y, rawHeight - cellInsetY * 2);
    const out = new PNG({ width, height });

    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const sourceIndex = ((y + row) * source.width + (x + col)) * 4;
        const targetIndex = (row * width + col) * 4;
        out.data[targetIndex] = source.data[sourceIndex] ?? 0;
        out.data[targetIndex + 1] = source.data[sourceIndex + 1] ?? 0;
        out.data[targetIndex + 2] = source.data[sourceIndex + 2] ?? 0;
        out.data[targetIndex + 3] = source.data[sourceIndex + 3] ?? 255;
      }
    }

    return {
      frameIndex: frame.frameIndex,
      bytes: PNG.sync.write(out),
      mimeType: "image/png",
    };
  });
};
