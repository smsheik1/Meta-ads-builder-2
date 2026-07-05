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
  crop: {
    x: (index % 3) / 3,
    y: Math.floor(index / 3) / 2,
    width: 1 / 3,
    height: 0.5,
  },
  image: { status: "idle" },
}));

export const createThreeDStoryboardFrames = () => (
  THREE_D_STORYBOARD_FRAME_CONTRACTS.map((frame) => ({
    ...frame,
    crop: { ...frame.crop },
    image: { status: "idle" as const },
  }))
);

const noGeneratedTextPrompt = [
  "Render all proof, address, handwriting, label, rating, number, receipt, or note concepts as blank physical cues only.",
  "Use blank product forms, blank cards, unmarked blocks, plain geometric tokens, crumbs, ribbon, light, steam, and motion instead of words or marks.",
  "No readable text, no letters, no numbers, no labels, no logos, no captions, no UI copy, no icons, no arrows, no checkmarks, no X marks.",
].join(" ");

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
  "fast ecommerce product-teardown short on a bright blue/cyan technical grid stage. Keep the recurring product or package anchored.",
  "Reference feel: bright clinical product-science explainer, flat readable lighting, saturated cyan grid floor and wall, crisp toy-like 3D objects, constant visual teaching moments.",
  "Do not use dark cinematic rooms, black voids, moody spotlights, smoke-only sci-fi labs, luxury product-card lighting, or slow atmospheric reveals.",
  "Use four quick micro-beats: 0-1s setup, 1-2.3s obstruction/change, 2.3-3.8s reveal, 3.8-5s payoff/reset.",
  "Change visual state about every second with camera pushes, object motion, particles, cutaways, component reveals, or mechanical cause/effect.",
  "The second and third micro-beats must change the object, camera scale, or mechanism; no static product with drifting particles.",
  "Every frame must contain a visible demo character/body proxy, product, character hand, mechanism, particles, or physical obstacle; never cut to plain dark screens, empty blue grids, empty gradients, or caption-only moments.",
  "Keep a recurring stylized human demo character, body proxy, or scale figure consistent so it reads as an embodied product-science demo, not a faceless object loop or biology montage.",
  "Intro and final-payoff motion must clearly feature the toy-like demo character body or torso beside the product; mechanism clips can switch to the same character hand, probe, pointer, tiny scale figure, or body proxy after the character has been established.",
  "For supplement/digestive products, vary the world across the clip: blue grid stage, transparent torso, gut tunnel, intestinal wall, acid bath, mechanism machine, and final product payoff can all share the cyan instructional palette.",
  "Do not hold a plain capsule on an empty grid for more than one micro-beat; every second should teach a new piece of the mechanism.",
  "If a style reference contains captions, shirt text, labels, or logos, ignore those text details and preserve only the blue stage, chunky 3D texture, guide energy, scale, and macro mechanism language.",
  "Maintain module variety: product anchor, hidden obstacle, mechanism machine, ingredient/component movement, unified payoff, or clean final product card.",
  "Use direct cuts, pushes, reveals, and mechanical transformations; no blank color wipes, fog-only transitions, empty gradients, or slow lingering setup.",
  "Preserve object identity. A capsule stays capsule-shaped, a bottle stays bottle-shaped, packaging stays packaging.",
  "Capsules may release contents through a seam, transparent wall, dissolved outer layer, or controlled capsule opening; never transform the capsule into an open cup, bucket, bowl, or generic container.",
  noGeneratedTextPrompt,
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
        direction: "Open with the stylized human demo character body or torso acting as the scale/customer/body proxy beside the product, then push into the hidden internal problem physically appearing. Preserve product identity, blue-grid 3D world, and no generated text.",
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
        direction: "Escalate the hidden problem inside the body/pathway or process world into a physical obstruction, breakdown, pile-up, leak, split, or blocked path. End on the mechanism setup, ready for the reveal. Preserve product identity and no generated text.",
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
        direction: "This is the peak wow reveal. Start from storyboard frame 4, then move into the unified evidence/payoff state from frame 5 without using a split-screen comparison. Reveal why the engineered version survives. Keep the product sealed and capsule-shaped; if contents appear, suspend them as particles inside a transparent capsule shell or controlled cutaway, never as an open cup, tube, bucket, bowl, or generic container. Preserve product identity and no generated text.",
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
        direction: "Land the evidence payoff, then return to a human-scale final transformed state with the demo character body or torso beside the clean product payoff composition. Resolve the physical problem clearly, hold the final branded world long enough for Wiggly overlays, and do not turn into a logo-only end card.",
      }),
      video: { status: "idle" },
    },
  ];
};
