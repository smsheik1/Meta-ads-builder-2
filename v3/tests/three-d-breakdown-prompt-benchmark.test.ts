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
const countWords = (value: string) => value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)?/g)?.length || 0;

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
  const scriptWordCount = countWords(candidate.scriptBeats.join(" "));
  if (scriptWordCount < 45 || scriptWordCount > 65) errors.push("script must be 45-65 words");
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

const makePlanCandidate = ({
  name,
  evidenceIndex,
  productTerms,
  cta,
  scriptBeats,
  frames,
}: {
  name: string;
  evidenceIndex: number;
  productTerms: string[];
  cta: string;
  scriptBeats: string[];
  frames: Array<[visual: string, motion: string]>;
}): BenchmarkCandidate => ({
  name,
  selectedEvidenceIndex: evidenceIndex,
  outputEvidenceIndex: evidenceIndex,
  productTerms,
  cta,
  scriptBeats,
  storyboardFrames: frames.map(([visual, motion]) => ({ visual, motion })),
  imagePrompt: "One coherent six-frame product-demo world with a silent CGI scale figure, accurate product form, physical state changes, and no readable text.",
  clipPlans: [
    { frameIndexes: [1, 2, 3], prompt: "Animate the approved first three states with physical object motion; preserve the silent CGI scale figure and product; no lip-sync." },
    { frameIndexes: [4, 5, 6], prompt: "Animate the approved final three states through the payoff and accurate product close; preserve continuity; no lip-sync." },
  ],
  scores: passingReferenceCandidate.scores,
});

const grunsRoutineCandidate = makePlanCandidate({
  name: "Gruns routine-compression supplement plan",
  evidenceIndex: 3,
  productTerms: ["Gruns gummies", "Gruns pouch"],
  cta: "Try Gruns gummies today.",
  scriptBeats: [
    "You line up daily vitamins and assume swallowing a handful covers your needs.",
    "But a scattered pile of bottles creates friction before the routine even starts.",
    "Gruns compresses that stack into daily gummies tested for nutrient absorption.",
    "The whole routine fits inside one grab-and-go pouch instead.",
    "Try Gruns gummies today.",
  ],
  frames: [
    ["A silent CGI figure lines up five vitamin bottles beside a real Gruns pouch.", "The bottles spread across the counter."],
    ["The bottle pile blocks the figure from reaching the Gruns pouch.", "The pile grows and the gap closes."],
    ["The figure pushes the bottles into one tightening stack beside the pouch.", "The stack compresses toward one gummy-sized block."],
    ["The compressed stack transforms into one gummy while the real pouch stays accurate.", "The final bottle collapses into the gummy."],
    ["The figure drops the real Gruns pouch into a small commute bag.", "The pouch lands and the bag closes."],
    ["The real Gruns gummies pouch stands beside the cleared counter and silent figure.", "The figure sets the pouch down for the CTA hold."],
  ],
});

const cookieGiftCandidate = makePlanCandidate({
  name: "David's Cookies nationwide gifting plan",
  evidenceIndex: 4,
  productTerms: ["cookie tin"],
  cta: "Shop David's Cookies dessert gifts.",
  scriptBeats: [
    "You send a cookie tin and assume delivery means the gift already landed.",
    "But distance turns dessert into an occasion you cannot finish yourself.",
    "David's Cookies ships the tin nationwide, ready to open and share.",
    "The box crosses the map, then opens where the celebration happens.",
    "Shop David's Cookies dessert gifts.",
  ],
  frames: [
    ["A silent CGI figure places a cookie tin beside an empty birthday setting.", "The empty place remains visible."],
    ["The birthday table slides far away across a miniature map.", "The distance expands between sender and table."],
    ["Hands place the cookie tin onto a moving nationwide route.", "The tin starts crossing the map."],
    ["The cookie tin travels through an impossible cutaway map toward the distant table.", "Route segments lock together under the tin."],
    ["Hands open the cookie tin as guests gather around the birthday setting.", "Cookies move from the open tin toward the table."],
    ["The accurate cookie tin remains open at the completed birthday table.", "The tin settles into the final product hold."],
  ],
});

const jarOpenerCandidate = makePlanCandidate({
  name: "One-hand jar opener mechanism plan",
  evidenceIndex: 1,
  productTerms: ["one-hand jar opener"],
  cta: "Get the one-hand jar opener.",
  scriptBeats: [
    "You grip a stubborn jar lid and assume more force is the answer.",
    "But a smooth rim gives your hand almost nothing to hold.",
    "The one-hand jar opener closes gripping teeth around the rim.",
    "Its self-adjusting ring tightens as the lid finally turns.",
    "Get the one-hand jar opener.",
  ],
  frames: [
    ["A silent CGI figure strains against a smooth jar lid on a kitchen counter.", "The hand slips while the lid stays fixed."],
    ["A macro cutaway reveals the empty contact gap around the lid rim.", "The hand slides past the smooth edge."],
    ["The one-hand jar opener lowers over the lid and its teeth approach the rim.", "The ring contracts around the jar."],
    ["An exploded cutaway shows the gripping teeth locking onto the lid.", "The self-adjusting ring tightens evenly."],
    ["The figure turns the opener and the lid releases from the jar.", "The lid rotates and rises."],
    ["The one-hand jar opener rests beside the opened jar and silent figure.", "The figure sets the opened lid down for the CTA hold."],
  ],
});

const beautyRefillCandidate = makePlanCandidate({
  name: "Beauty refill holdout plan",
  evidenceIndex: 2,
  productTerms: ["refill pod", "reusable bottle"],
  cta: "Shop the refillable skincare system.",
  scriptBeats: [
    "You finish a skincare bottle and assume the whole package is empty.",
    "But the reusable outer shell is still sitting in your hand.",
    "A refill pod slides out while the original bottle stays.",
    "The new pod locks inside, rebuilding the same daily container.",
    "Shop the refillable skincare system.",
  ],
  frames: [
    ["A silent CGI figure holds an apparently empty reusable bottle.", "The figure turns the bottle and checks the base."],
    ["A transparent cutaway separates the empty inner pod from the reusable shell.", "The pod slides downward while the shell stays intact."],
    ["Hands remove the empty refill pod without changing the outer bottle.", "The pod clears the shell."],
    ["An exploded view guides a new refill pod into the reusable bottle.", "The pod snaps into the exact inner channel."],
    ["The rebuilt bottle returns to the same bathroom counter.", "The figure places it back into the daily routine."],
    ["The refill pod and reusable bottle stand together beside the silent figure.", "Both products settle into the final CTA hold."],
  ],
});

const petFountainCandidate = makePlanCandidate({
  name: "Pet water fountain holdout plan",
  evidenceIndex: 5,
  productTerms: ["pet water fountain"],
  cta: "Get the filtered pet water fountain.",
  scriptBeats: [
    "You refill a pet bowl and assume fresh water stays that way.",
    "But loose hair and crumbs keep circling back into the basin.",
    "The pet water fountain pulls water through its removable filter path.",
    "Debris stops at the filter while clean water returns upward.",
    "Get the filtered pet water fountain.",
  ],
  frames: [
    ["A pet drinks beside a silent CGI figure filling an ordinary water bowl.", "A few loose hairs drift toward the basin."],
    ["A clear basin cutaway reveals hair and crumbs circling through the water.", "The debris loops back toward the drinking surface."],
    ["The pet water fountain pulls the moving water into its filter channel.", "The flow bends downward through the filter path."],
    ["An x-ray cutaway shows debris stopping at the removable filter.", "Filtered water continues through the return channel."],
    ["Clean water rises back into the fountain while the pet approaches.", "The return stream fills the drinking surface."],
    ["The pet water fountain runs beside the pet and silent CGI figure.", "The water stream continues through the final CTA hold."],
  ],
});

const fixtureMatrix = [
  { id: "gruns-routine", role: "development", category: "supplement", candidate: grunsRoutineCandidate },
  { id: "davids-cookie-tin", role: "development", category: "commodity-gifting", candidate: cookieGiftCandidate },
  { id: "one-hand-jar-opener", role: "development", category: "physical-gadget", candidate: jarOpenerCandidate },
  { id: "beauty-refill", role: "holdout", category: "beauty", candidate: beautyRefillCandidate },
  { id: "pet-water-fountain", role: "holdout", category: "pet-product", candidate: petFountainCandidate },
] as const;

assert.equal(scoreCandidate(grunsV2Baseline), 8);
assert.ok(scoreCandidate(passingReferenceCandidate) >= 16);
assert.deepEqual(hardFailures(passingReferenceCandidate), []);
assert.ok(scoreCandidate(passingReferenceCandidate) > scoreCandidate(grunsV2Baseline));
assert.equal(fixtureMatrix.filter((fixture) => fixture.role === "development").length, 3);
assert.equal(fixtureMatrix.filter((fixture) => fixture.role === "holdout").length, 2);
fixtureMatrix.forEach(({ candidate }) => {
  assert.deepEqual(hardFailures(candidate), [], `${candidate.name} failed the hard gates`);
  assert.ok(scoreCandidate(candidate) >= 16, `${candidate.name} missed the creative threshold`);
});

const nonBodyCandidates = [grunsRoutineCandidate, cookieGiftCandidate, jarOpenerCandidate, beautyRefillCandidate, petFountainCandidate];
nonBodyCandidates.forEach((candidate) => {
  const planText = `${candidate.scriptBeats.join(" ")} ${candidate.storyboardFrames.flatMap((frame) => [frame.visual, frame.motion]).join(" ")}`;
  assert.doesNotMatch(planText, /\b(?:stomach|gut|intestine|esophagus|anatomy|cell wall|body route)\b/i, `${candidate.name} leaked body-route imagery`);
});

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
