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

export const createThreeDStoryboardFrames = () => (
  THREE_D_STORYBOARD_FRAME_CONTRACTS.map((frame) => ({
    ...frame,
    image: { status: "idle" as const },
  }))
);

const createClipPrompt = ({
  clipIndex,
  frameIndexes,
  world,
  recurringObjects,
  narrative,
  direction,
}: {
  clipIndex: ThreeDBreakdownClipIndex;
  frameIndexes: ThreeDBreakdownStoryboardFrameIndex[];
  world: string;
  recurringObjects: string;
  narrative: string;
  direction: string;
}) => [
  `Animate storyboard frame${frameIndexes.length > 1 ? "s" : ""} ${frameIndexes.join("-")} as clip ${clipIndex} of 4, vertical 9:16, 5 seconds.`,
  `World: ${world}. Recurring objects: ${recurringObjects}. Narrative: ${narrative}`,
  direction,
  "Use four quick micro-beats: 0-1s setup, 1-2.3s obstruction/change, 2.3-3.8s reveal, 3.8-5s payoff/reset.",
  "The second and third micro-beats must change the object, camera scale, or mechanism; no static product with drifting particles.",
  "Maintain module variety: product anchor, hidden obstacle, mechanism machine, ingredient/component movement, unified payoff, or clean final product card.",
].join(" ");

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
  const isPresenterStyle = sceneInput.storyContract.visualStyle === "presenter-teardown-vsl";
  const clipDirections = isPresenterStyle
    ? [
      "Open with a human demo subject, torso, hands, or over-shoulder demonstrator handling the product in a real ecommerce setting, then reveal the hidden problem through the product use moment. The person is visual demonstration only; the unseen narrator carries the explanation. Preserve product identity and no generated text.",
      "Cut from practical product handling into the hidden customer/product problem becoming physical. Use a real surface or product-use setup first, then a quick 3D explanatory insert only if it clarifies the problem. Preserve product identity and no generated text.",
      "This is the peak narrator-led ecommerce teardown reveal. Start from storyboard frame 4 as a 3D cutaway, overlay, x-ray, floating component split, or impossible mechanism insert, then return toward frame 5's proof/payoff product moment. Do not use toy-character anatomy or a faceless blue-grid biology montage. Preserve product identity and no generated text.",
      "Land the evidence payoff, then return to the human/product final with demo subject, torso, hands, or product-in-use payoff visible. Hold the final practical product frame long enough for Wiggly overlays, and do not turn into a logo-only end card.",
    ]
    : [
      "Open with the stylized human demo character body or torso acting as the scale/customer/body proxy beside the product, then push into the hidden internal problem physically appearing. Preserve product identity, blue-grid 3D world, and no generated text.",
      "Escalate the hidden problem inside the body/pathway or process world into a physical obstruction, breakdown, pile-up, leak, split, or blocked path. End on the mechanism setup, ready for the reveal. Preserve product identity and no generated text.",
      "This is the peak wow reveal. Start from storyboard frame 4, then move into the unified evidence/payoff state from frame 5 without using a split-screen comparison. Reveal why the engineered version survives. Keep the product sealed and capsule-shaped; if contents appear, suspend them as particles inside a transparent capsule shell or controlled cutaway, never as an open cup, tube, bucket, bowl, or generic container. Preserve product identity and no generated text.",
      "Land the evidence payoff, then return to a human-scale final transformed state with the demo character body or torso beside the clean product payoff composition. Resolve the physical problem clearly, hold the final branded world long enough for Wiggly overlays, and do not turn into a logo-only end card.",
    ];

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
        frameIndexes: [1, 2],
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
        frameIndexes: [2, 3],
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
        frameIndexes: [4, 5],
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
        frameIndexes: [5, 6],
        world,
        recurringObjects,
        narrative: `${revelation} ${punchline}`,
        direction: clipDirections[3],
      }),
      video: { status: "idle" },
    },
  ];
};
