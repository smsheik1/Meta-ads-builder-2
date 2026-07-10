import type {
  ThreeDBreakdownAdScene,
  ThreeDBreakdownStoryboardBoard,
  ThreeDBreakdownClipIndex,
  ThreeDBreakdownStoryboardFrameIndex,
} from "../../scene/types";

const frameMeta = [
  ["problem", "Problem state"],
  ["escalation", "Escalation"],
  ["mechanism-setup", "Mechanism setup"],
  ["wow-reveal", "Wow reveal"],
  ["payoff", "Evidence payoff"],
  ["final-state", "Final state"],
] as const;

type StoryboardFrame = NonNullable<ThreeDBreakdownStoryboardBoard["frames"]>[number];

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
  const presenterClipDirections = [
    "Open in the bright blue technical grid product-demo studio with the same recurring casual silent 3D demonstrator handling the product. Show ordinary product use and visible physical pressure; no talking or typography.",
    "Push from the human-scale product moment into a clean body route, clear pipe, or guided transit path anchored to the same demonstrator and product. Follow one moving payload through the route.",
    "Make the obstacle physically block, scatter, pile up, break, leak, or create friction in the same blue-grid world. Keep it clean and graphic; no wet fleshy intestine tunnel, standalone beaker demo, mannequin, PPE, doctors, or faceless biology montage.",
    "Create the peak teardown with an impossible-to-film cutaway, pipe, particle path, nested capsule, exploded layer, or process machine changing state. The mechanism must visibly alter the exact obstacle.",
    "Carry the selected evidence into an organized physical payoff through moving protected particles, blank proof tokens, or the payload arriving intact. Do not introduce packaging, logos, title cards, or new people.",
    "Hold on the resolved mechanism in the same blue-grid world. Wiggly supplies the real product end card afterward, so do not invent a bottle, jar, pouch, label, logo, mannequin, or presenter.",
  ];
  const clipDirections = isPresenterStyle
    ? [
      ...presenterClipDirections,
    ]
    : [
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
    const presenterNarratives = [
      `${context} ${mechanism}`,
      `${revelation} ${punchline}`,
    ];
    const presenterFrameGroups: ThreeDBreakdownStoryboardFrameIndex[][] = [[1, 2, 3], [4, 5, 6]];
    const presenterDirections = [
      [
        presenterClipDirections[0],
        presenterClipDirections[1],
        presenterClipDirections[2],
      ].join(" "),
      [
        presenterClipDirections[3],
        presenterClipDirections[4],
        presenterClipDirections[5],
      ].join(" "),
    ];

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
        prompt: createClipPrompt({
          clipIndex,
          durationSeconds: 10,
          totalClips: presenterTimings.length,
          frameIndexes,
          framePlan: getPresenterClipFramePlan(sceneInput.storyboardBoard, frameIndexes),
          world,
          recurringObjects,
          narrative: presenterNarratives[index] || consequence,
          direction: presenterDirections[index] || presenterClipDirections[0],
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
