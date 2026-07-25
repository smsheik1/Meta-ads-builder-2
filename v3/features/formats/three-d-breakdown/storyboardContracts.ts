import type {
  ThreeDBreakdownAdScene,
  ThreeDBreakdownStoryboardBoard,
  ThreeDBreakdownClipIndex,
  ThreeDBreakdownStoryboardFrameIndex,
} from "../../scene/types";
import {
  THREE_D_BREAKDOWN_CONTENT_END_MS,
  THREE_D_BREAKDOWN_DURATION_MS,
} from "./prompt";

const frameMeta = [
  ["problem", "Problem state"],
  ["escalation", "Escalation"],
  ["mechanism-setup", "Mechanism setup"],
  ["wow-reveal", "Wow reveal"],
  ["payoff", "Evidence payoff"],
  ["final-state", "Final state"],
] as const;

type StoryboardFrame = NonNullable<ThreeDBreakdownStoryboardBoard["frames"]>[number];

export type ThreeDBreakdownFrameWorldRole = "blue-breakdown";

export const THREE_D_STYLE_B_BLUE_BREAKDOWN_WORLD =
  "Style B's bright blue/cyan blueprint-grid stage with crisp 3D objects, cool lighting, and hard subject separation";

export const getThreeDFrameWorldRole = (
  _frameIndex: ThreeDBreakdownStoryboardFrameIndex,
): ThreeDBreakdownFrameWorldRole => "blue-breakdown";

export const describeThreeDFrameWorld = (
  _frameIndex: ThreeDBreakdownStoryboardFrameIndex,
  visualWorld: string,
) => `APPROVED VISUAL WORLD: remain inside ${visualWorld}. Keep the bright blue/cyan blueprint-grid stage, approved subject, objects, and CGI finish consistent.`;

export const THREE_D_STORYBOARD_FRAME_CONTRACTS: NonNullable<ThreeDBreakdownStoryboardBoard["frames"]> = frameMeta.map(([role, label], index) => ({
  frameIndex: (index + 1) as StoryboardFrame["frameIndex"],
  role,
  label,
  image: { status: "idle" },
}));

const createClipPrompt = ({
  clipIndex,
  frameIndexes,
  framePlan,
  durationSeconds,
  totalClips,
  world,
  recurringObjects,
  narrative,
  direction,
}: {
  clipIndex: ThreeDBreakdownClipIndex;
  frameIndexes: ThreeDBreakdownStoryboardFrameIndex[];
  framePlan: string;
  durationSeconds: number;
  totalClips: number;
  world: string;
  recurringObjects: string;
  narrative?: string;
  direction: string;
}) => [
  `Animate storyboard frame${frameIndexes.length > 1 ? "s" : ""} ${frameIndexes.join("-")} as clip ${clipIndex} of ${totalClips}, vertical 9:16, ${durationSeconds} seconds.`,
  getClipTimingPlan(frameIndexes, durationSeconds),
  `World: ${world}. Recurring objects: ${recurringObjects}.`,
  "The narrator is never on screen. Any human is a silent stylized CGI demonstrator only: lips closed and still, no lip-sync, no speech animation, no singing, and no presenter delivery. Animate hands, props, product, camera, and body mechanics instead of the mouth.",
  narrative ? `Physical scene meaning, expressed only as objects and motion: ${narrative}` : "",
  "Show, don't tell: every idea must become a visible physical action, transformation, obstacle, reveal, or payoff.",
  "Maxfusion visual rule: if the line says the body, product, ingredient, problem, or mechanism changes state, the clip must show that state change physically.",
  "Keep the silent demonstrator physically involved in the proof when present: wearing, holding, opening, swallowing, pouring, carrying, training in, or standing directly behind the product path.",
  framePlan,
  direction,
  totalClips === 2
    ? clipIndex === 1
      ? "Clip 1 motion target: begin with physical product use, push through to the body or product route, then make the obstacle visibly block, scatter, pile up, break, or leak before the cut."
      : "Clip 2 motion target: expose the mechanism, visibly change or clear the obstacle, land the selected evidence as physical motion, then hold on the resolved mechanism before Wiggly's separate product end card."
    : "",
  durationSeconds >= 10
    ? "Use six quick micro-beats: setup, obstruction, zoom, mechanism change, payoff, and reset/hold; change object state every 1-1.7 seconds."
    : "Use four quick micro-beats: 0-1s setup, 1-2.3s obstruction/change, 2.3-3.8s reveal, 3.8-5s payoff/reset.",
  "The second and third micro-beats must change the object, camera scale, or mechanism; no static product with drifting particles.",
  "Maintain module variety: product anchor, hidden obstacle, mechanism machine, ingredient/component movement, unified payoff, or clean final product card.",
  "Do not generate typography, title cards, captions, subtitles, labels, logos, letters, numbers, or pseudo-writing. Wiggly adds every word after video generation.",
].filter(Boolean).join(" ");

const getClipTimingPlan = (
  frameIndexes: ThreeDBreakdownStoryboardFrameIndex[],
  durationSeconds: number,
) => {
  if (frameIndexes.length <= 1) {
    return `Use storyboard frame ${frameIndexes[0]} as the visual anchor for the full ${durationSeconds}s clip, with motion inside the scene instead of switching to another concept.`;
  }
  const segmentSeconds = durationSeconds / frameIndexes.length;
  const timing = frameIndexes.map((frameIndex, index) => {
    const start = (index * segmentSeconds).toFixed(1);
    const end = ((index + 1) * segmentSeconds).toFixed(1);
    return `${start}-${end}s = frame ${frameIndex}`;
  }).join("; ");
  return `Time-code the clip into storyboard sub-shots: ${timing}. Use hard cuts, whip zooms, or push-through transitions between frames; do not blend them into one vague drifting scene.`;
};

const summarizeStoryboardFrameForClip = (frame?: StoryboardFrame) => {
  if (!frame) return "";
  const details = [
    `Frame ${frame.frameIndex} ${frame.label}`,
    frame.visual ? `visual: ${frame.visual}` : "",
    frame.camera ? `camera: ${frame.camera}` : "",
    frame.motion ? `motion: ${frame.motion}` : "",
    frame.editingNote ? `edit: ${frame.editingNote}` : "",
  ].filter(Boolean);
  return details.join("; ");
};

const getClipFramePlan = (
  storyboardBoard: ThreeDBreakdownStoryboardBoard | undefined,
  frameIndexes: ThreeDBreakdownStoryboardFrameIndex[],
) => {
  const frames = storyboardBoard?.frames || [];
  const framePlan = frameIndexes
    .map((frameIndex) => summarizeStoryboardFrameForClip(frames.find((frame) => frame.frameIndex === frameIndex)))
    .filter(Boolean)
    .join(" | ");
  return framePlan
    ? `Follow the selected storyboard details exactly: ${framePlan}. Overlay words are added by Wiggly later; do not generate readable text.`
    : "Follow the selected storyboard frames exactly. Overlay words are added by Wiggly later; do not generate readable text.";
};

const getPresenterClipFramePlan = (
  storyboardBoard: ThreeDBreakdownStoryboardBoard | undefined,
  frameIndexes: ThreeDBreakdownStoryboardFrameIndex[],
) => {
  const frames = storyboardBoard?.frames || [];
  const framePlan = frameIndexes
    .map((frameIndex) => {
      const frame = frames.find((item) => item.frameIndex === frameIndex);
      if (!frame) return "";
      return [
        `Frame ${frameIndex}`,
        frame.visual ? `action: ${frame.visual}` : "",
        frame.camera ? `camera: ${frame.camera}` : "",
        frame.motion ? `physical motion: ${frame.motion}` : "",
      ].filter(Boolean).join("; ");
    })
    .filter(Boolean)
    .join(" | ");
  return framePlan
    ? `Use these camera and motion cues only: ${framePlan}. Never turn prompt words into visible text.`
    : "Follow the approved storyboard composition and physical motion. Never generate visible text.";
};

const createPresenterClipPrompt = ({
  clipIndex,
  frameIndexes,
  framePlan,
  durationSeconds,
  visualWorld,
  recurringObjects,
}: {
  clipIndex: ThreeDBreakdownClipIndex;
  frameIndexes: ThreeDBreakdownStoryboardFrameIndex[];
  framePlan: string;
  durationSeconds: number;
  visualWorld: string;
  recurringObjects: string;
}) => [
  `Create one coherent ${durationSeconds}-second sequence for clip ${clipIndex} of 2, vertical 9:16, beginning on frame ${frameIndexes[0]} and ending exactly on frame ${frameIndexes.at(-1)}.`,
  framePlan,
  `WORLD LOCK: every sub-shot remains inside ${visualWorld}, using ${THREE_D_STYLE_B_BLUE_BREAKDOWN_WORLD} as the visual grammar. Change camera scale and physical state, not the world or character.`,
  `CONTINUITY OBJECTS: ${recurringObjects}.`,
  "If an approved person or hand-proxy is visible, preserve it as a silent recurring subject with no lip-sync, speech, singing, or presenter delivery. If both endpoints are object-only, never introduce a person.",
  `CONTINUITY: frame ${frameIndexes[1]} is a motion checkpoint inside the approved visual world, not permission to invent a new person, product, setting, or visual style. Preserve the same subject, materials, feature-animation CGI finish, and camera language.`,
  "SHOT GRAMMAR: use three readable sub-shots matching the three approved frames. Use motivated cuts, push-ins, macro changes, or object-led transitions. Each sub-shot must add new information; never dissolve the three beats into one vague drifting camera move.",
  clipIndex === 1
    ? "TIMING: 0-3.2s setup, 3.2-6.4s hidden problem, 6.4-10s mechanism setup. Finish on the approved frame-3 state."
    : `TIMING: 0-2.5s mechanism reveal, 2.5-5.5s physical payoff, 5.5-${(THREE_D_BREAKDOWN_CONTENT_END_MS / 1000) - 10}s resolved frame-6 state. The meaningful action must be complete before global second ${THREE_D_BREAKDOWN_CONTENT_END_MS / 1000}; hold the resolved state afterward because Wiggly's product end card covers global seconds ${THREE_D_BREAKDOWN_CONTENT_END_MS / 1000}-${THREE_D_BREAKDOWN_DURATION_MS / 1000}.`,
  clipIndex === 1
    ? "STORY JOB: begin on the approved setup, make the problem visible through physical motion, and finish on the approved mechanism setup."
    : "STORY JOB: begin on the approved mechanism reveal, complete the transformation before the end-card deadline, and hold on the approved product or CTA setup.",
  "No title card, empty frame, unrelated room, or new presenter.",
  "Do not invent claims, packaging, people, anatomy, props, or mechanisms outside the approved frames.",
  "No generated typography, captions, subtitles, labels, logos, letters, numbers, UI, or pseudo-writing. Wiggly adds every word after video generation.",
].join(" ");

export const createThreeDClipPlans = (
  sceneInput: Pick<ThreeDBreakdownAdScene["layout"], "scriptBeats" | "storyContract" | "storyboardBoard">,
): ThreeDBreakdownAdScene["layout"]["clipPlans"] => {
  const consequence = sceneInput.scriptBeats[0]?.narration || "The problem starts.";
  const context = sceneInput.scriptBeats[1]?.narration || "The problem escalates.";
  const mechanism = sceneInput.scriptBeats[2]?.narration || "The mechanism appears.";
  const revelation = sceneInput.scriptBeats[3]?.narration || "The proof lands.";
  const punchline = sceneInput.scriptBeats[4]?.narration || "The final state resolves.";
  const world = sceneInput.storyContract.visualWorld;
  const recurringObjects = sceneInput.storyContract.recurringObjects.join(", ");
  const isPresenterStyle = sceneInput.storyContract.visualStyle === "presenter-teardown-vsl";
  const clipDirections = [
    "Open with the stylized human demo character body or torso acting as the scale/customer/body proxy beside the product, then push into the hidden internal problem physically appearing. Preserve product identity, blue-grid 3D world, and no generated text.",
    "Escalate the hidden problem inside the body/pathway or process world into a physical obstruction, breakdown, pile-up, leak, split, or blocked path. End on the mechanism setup, ready for the reveal. Preserve product identity and no generated text.",
    "This is the peak wow reveal. Start from storyboard frame 4, then move into the unified evidence/payoff state from frame 5 without using a split-screen comparison. Reveal why the engineered version survives. Keep the product sealed and capsule-shaped; if contents appear, suspend them as particles inside a transparent capsule shell or controlled cutaway, never as an open cup, tube, bucket, bowl, or generic container. Preserve product identity and no generated text.",
    "Land the evidence payoff, then return to a human-scale final transformed state with the demo character body or torso beside the clean product payoff composition. Resolve the physical problem clearly, hold the final branded world long enough for Wiggly overlays, and do not turn into a logo-only end card.",
  ];

  if (isPresenterStyle) {
    const presenterTimings = [
      [0, 10_000],
      [10_000, 20_000],
    ] as const;
    const presenterLabels = [
      "Clip 1: frames 1-3",
      "Clip 2: frames 4-6",
    ] as const;
    const presenterFrameGroups: ThreeDBreakdownStoryboardFrameIndex[][] = [[1, 2, 3], [4, 5, 6]];

    return presenterTimings.map(([startMs, endMs], index) => {
      const clipIndex = (index + 1) as ThreeDBreakdownClipIndex;
      const frameIndexes = presenterFrameGroups[index] || [1, 2, 3];
      return {
        clipIndex,
        label: presenterLabels[index],
        startMs,
        endMs,
        durationSeconds: 10,
        frameIndexes,
        prompt: createPresenterClipPrompt({
          clipIndex,
          durationSeconds: 10,
          frameIndexes,
          framePlan: getPresenterClipFramePlan(sceneInput.storyboardBoard, frameIndexes),
          visualWorld: world,
          recurringObjects,
        }),
        video: { status: "idle" as const },
      };
    });
  }

  return [
    {
      clipIndex: 1,
      label: "Clip 1: false assumption",
      startMs: 0,
      endMs: 5_000,
      durationSeconds: 5,
      frameIndexes: [1, 2],
      prompt: createClipPrompt({
        clipIndex: 1,
        durationSeconds: 5,
        totalClips: 4,
        frameIndexes: [1, 2],
        framePlan: getClipFramePlan(sceneInput.storyboardBoard, [1, 2]),
        world,
        recurringObjects,
        narrative: `${consequence} ${context}`,
        direction: clipDirections[0],
      }),
      video: { status: "idle" },
    },
    {
      clipIndex: 2,
      label: "Clip 2: hidden problem",
      startMs: 5_000,
      endMs: 10_000,
      durationSeconds: 5,
      frameIndexes: [2, 3],
      prompt: createClipPrompt({
        clipIndex: 2,
        durationSeconds: 5,
        totalClips: 4,
        frameIndexes: [2, 3],
        framePlan: getClipFramePlan(sceneInput.storyboardBoard, [2, 3]),
        world,
        recurringObjects,
        narrative: `${context} ${mechanism}`,
        direction: clipDirections[1],
      }),
      video: { status: "idle" },
    },
    {
      clipIndex: 3,
      label: "Clip 3: mechanism reveal",
      startMs: 10_000,
      endMs: 15_000,
      durationSeconds: 5,
      frameIndexes: [4, 5],
      prompt: createClipPrompt({
        clipIndex: 3,
        durationSeconds: 5,
        totalClips: 4,
        frameIndexes: [4, 5],
        framePlan: getClipFramePlan(sceneInput.storyboardBoard, [4, 5]),
        world,
        recurringObjects,
        narrative: `${mechanism} ${revelation}`,
        direction: clipDirections[2],
      }),
      video: { status: "idle" },
    },
    {
      clipIndex: 4,
      label: "Clip 4: proof payoff",
      startMs: 15_000,
      endMs: 20_000,
      durationSeconds: 5,
      frameIndexes: [5, 6],
      prompt: createClipPrompt({
        clipIndex: 4,
        durationSeconds: 5,
        totalClips: 4,
        frameIndexes: [5, 6],
        framePlan: getClipFramePlan(sceneInput.storyboardBoard, [5, 6]),
        world,
        recurringObjects,
        narrative: `${revelation} ${punchline}`,
        direction: clipDirections[3],
      }),
      video: { status: "idle" },
    },
  ];
};
