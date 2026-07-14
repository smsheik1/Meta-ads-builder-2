import assert from "node:assert/strict";

const rubricDimensions = [
  "concreteHook",
  "causalMechanism",
  "narrationVisualMapping",
  "stateChangeCadence",
  "silentDemonstratorContinuity",
  "worldContinuity",
  "evidenceGrounding",
  "productIdentity",
  "cleanGeneratedMedia",
  "buyerPayoffAndCta",
] as const;

type RubricDimension = (typeof rubricDimensions)[number];
type RubricScore = 0 | 1 | 2;

type BenchmarkCandidate = {
  name: string;
  scores: Record<RubricDimension, RubricScore>;
  selectedEvidenceIndex: number;
  outputEvidenceIndex: number;
  productTerms: string[];
  cta: string;
  scriptBeats: string[];
  storyboardFrames: Array<{
    visual: string;
    motion: string;
  }>;
  imagePrompt: string;
  clipPlans: Array<{
    frameIndexes: number[];
    prompt: string;
  }>;
};

const directActionPattern = /\b(shop|try|get|order|buy|start|visit|subscribe)\b/i;
const generatedTextPattern = /(?:render|generate|display|show|write|spell)\s+(?:the\s+)?(?:readable\s+)?(?:text|caption|label|logo|headline|cta|words?|letters?|numbers?)/i;
const speakingDemonstratorPattern = /\b(?:demonstrator|presenter|character|man|woman|person)\b.{0,50}\b(?:speaks?|talks?|says?|lip[- ]?syncs?|mouths?)\b/i;

const scoreCandidate = (candidate: BenchmarkCandidate) => (
  rubricDimensions.reduce((total, dimension) => total + candidate.scores[dimension], 0)
);

const hardFailures = (candidate: BenchmarkCandidate) => {
  const errors: string[] = [];
  const allVisualText = [
    candidate.imagePrompt,
    ...candidate.storyboardFrames.flatMap((frame) => [frame.visual, frame.motion]),
    ...candidate.clipPlans.map((clip) => clip.prompt),
  ].join(" ");
  const finalFrame = candidate.storyboardFrames.at(-1);
  const finalText = `${finalFrame?.visual || ""} ${finalFrame?.motion || ""}`;

  if (candidate.scriptBeats.length !== 5) errors.push("script must have 5 beats");
  if (candidate.storyboardFrames.length !== 6) errors.push("storyboard must have 6 frames");
  if (candidate.clipPlans.length !== 2) errors.push("plan must have 2 clips");
  if (candidate.clipPlans[0]?.frameIndexes.join(",") !== "1,2,3") errors.push("clip 1 must cover frames 1-3");
  if (candidate.clipPlans[1]?.frameIndexes.join(",") !== "4,5,6") errors.push("clip 2 must cover frames 4-6");
  if (candidate.outputEvidenceIndex !== candidate.selectedEvidenceIndex) errors.push("selected evidence was lost");
  if (!directActionPattern.test(candidate.cta)) errors.push("CTA has no buyer action");
  if (!candidate.productTerms.some((term) => finalText.toLowerCase().includes(term.toLowerCase()))) {
    errors.push("final frame lost the product");
  }
  if (speakingDemonstratorPattern.test(allVisualText)) errors.push("demonstrator speaks or lip-syncs");
  if (generatedTextPattern.test(allVisualText) && !/no readable text/i.test(allVisualText)) {
    errors.push("generated media asks for readable text");
  }
  return errors;
};

const passingReferenceCandidate: BenchmarkCandidate = {
  name: "Franky-derived 20-second supplement adaptation",
  selectedEvidenceIndex: 2,
  outputEvidenceIndex: 2,
  productTerms: ["DS-01"],
  cta: "Try Seed DS-01 Daily Synbiotic.",
  scriptBeats: [
    "You swallow a probiotic capsule and assume the live strains arrive intact.",
    "But stomach acid can turn that short trip into the first obstacle.",
    "Seed puts the probiotic core inside its ViaCap capsule-in-capsule system.",
    "The outer layer opens later, revealing the protected core deeper in digestion.",
    "Try Seed DS-01 Daily Synbiotic.",
  ],
  storyboardFrames: [
    { visual: "The silent demonstrator swallows a green capsule beside the DS-01 jar.", motion: "The capsule leaves his fingers and the camera follows it toward a transparent torso." },
    { visual: "A transparent digestive route closes around the capsule as acid particles collide with it.", motion: "The route narrows and the acid particles strike the outer shell." },
    { visual: "The demonstrator holds a giant capsule while its two nested layers separate in midair.", motion: "His hands pull the outer layer away and expose the inner probiotic core." },
    { visual: "A cutaway shows the outer layer absorbing the obstacle while the inner capsule continues forward.", motion: "The outer layer opens and the intact core passes through the cleared route." },
    { visual: "The silent demonstrator points to the intact core arriving beside the selected DS-01 product.", motion: "The core locks into the destination and blank proof particles settle around the jar." },
    { visual: "The real DS-01 capsule and jar stand beside the silent demonstrator on the same blue grid stage.", motion: "The demonstrator places the capsule beside the product and holds for the renderer CTA." },
  ],
  imagePrompt: "One blue technical product-demo world, same silent stylized CGI demonstrator and real DS-01 reference across six cells, no readable text, no labels, no logos, no captions.",
  clipPlans: [
    { frameIndexes: [1, 2, 3], prompt: "Follow the swallowed capsule from ordinary use into the acid obstacle, then reveal its nested layers; the demonstrator remains silent." },
    { frameIndexes: [4, 5, 6], prompt: "Open the outer layer, carry the intact core to the payoff, and return to the real DS-01 product; no speaking or lip-sync." },
  ],
  scores: {
    concreteHook: 2,
    causalMechanism: 2,
    narrationVisualMapping: 2,
    stateChangeCadence: 2,
    silentDemonstratorContinuity: 2,
    worldContinuity: 2,
    evidenceGrounding: 2,
    productIdentity: 2,
    cleanGeneratedMedia: 2,
    buyerPayoffAndCta: 2,
  },
};

const grunsV2Baseline: BenchmarkCandidate = {
  name: "Gruns v2 baseline",
  selectedEvidenceIndex: 3,
  outputEvidenceIndex: 3,
  productTerms: ["Gruns", "gummies"],
  cta: "Start your daily habit.",
  scriptBeats: [
    "A clinical trial can prove a supplement works.",
    "That does not mean the one in your hand will.",
    "Stomach acid turns the route into the hidden problem.",
    "Gruns makes the hidden product path visible.",
    "Start your daily habit.",
  ],
  storyboardFrames: [
    { visual: "A stylized demonstrator holds a Gruns pouch in a blue studio.", motion: "The camera pushes toward the pouch." },
    { visual: "A green digestive tunnel fills the screen.", motion: "The camera travels forward through the tunnel." },
    { visual: "The same green digestive tunnel fills the screen.", motion: "The camera travels forward through the tunnel." },
    { visual: "A darker digestive tunnel fills the screen.", motion: "The camera travels forward through the tunnel." },
    { visual: "An anatomical stomach floats in darkness.", motion: "The camera orbits the stomach." },
    { visual: "The Gruns gummies product appears on a clean final card.", motion: "The product holds still." },
  ],
  imagePrompt: "Supplement science montage with blue studio, green tunnel, dark anatomy, and clean packshot; no readable text.",
  clipPlans: [
    { frameIndexes: [1, 2, 3], prompt: "Move from presenter to digestive tunnel." },
    { frameIndexes: [4, 5, 6], prompt: "Move from dark tunnel to stomach and final product." },
  ],
  scores: {
    concreteHook: 0,
    causalMechanism: 1,
    narrationVisualMapping: 1,
    stateChangeCadence: 0,
    silentDemonstratorContinuity: 1,
    worldContinuity: 0,
    evidenceGrounding: 1,
    productIdentity: 1,
    cleanGeneratedMedia: 2,
    buyerPayoffAndCta: 1,
  },
};

const fixtureMatrix = [
  { id: "seed-ds01", role: "development", category: "supplement" },
  { id: "davids-cookie-tin", role: "development", category: "commodity-gifting" },
  { id: "one-hand-jar-opener", role: "development", category: "physical-gadget" },
  { id: "beauty-refill", role: "holdout", category: "beauty" },
  { id: "pet-water-fountain", role: "holdout", category: "pet-product" },
] as const;

assert.equal(scoreCandidate(grunsV2Baseline), 8);
assert.ok(scoreCandidate(passingReferenceCandidate) >= 16);
assert.deepEqual(hardFailures(passingReferenceCandidate), []);
assert.ok(scoreCandidate(passingReferenceCandidate) > scoreCandidate(grunsV2Baseline));
assert.equal(fixtureMatrix.filter((fixture) => fixture.role === "development").length, 3);
assert.equal(fixtureMatrix.filter((fixture) => fixture.role === "holdout").length, 2);

const lostEvidenceCandidate = { ...passingReferenceCandidate, outputEvidenceIndex: 4 };
assert.ok(hardFailures(lostEvidenceCandidate).includes("selected evidence was lost"));

const speakingCandidate = {
  ...passingReferenceCandidate,
  clipPlans: [
    { frameIndexes: [1, 2, 3], prompt: "The demonstrator speaks to camera and lip-syncs the narration." },
    passingReferenceCandidate.clipPlans[1]!,
  ],
};
assert.ok(hardFailures(speakingCandidate).includes("demonstrator speaks or lip-syncs"));

const wrongProductCandidate = {
  ...passingReferenceCandidate,
  storyboardFrames: passingReferenceCandidate.storyboardFrames.map((frame, index) => (
    index === 5 ? { ...frame, visual: "A generic white jar stands alone." } : frame
  )),
};
assert.ok(hardFailures(wrongProductCandidate).includes("final frame lost the product"));

console.log("3D Breakdown ecommerce prompt benchmark passed.");
