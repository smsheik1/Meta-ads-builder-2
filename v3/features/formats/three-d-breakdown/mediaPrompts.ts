import type {
  ThreeDBreakdownAdScene,
  ThreeDBreakdownClipPlan,
  ThreeDBreakdownStoryboardFrameIndex,
} from "../../scene/types";

const MAX_SEEDANCE_PROMPT_CHARS = 3900;

const clean = (value: string | null | undefined) => String(value || "").replace(/\s+/g, " ").trim();
const promptField = (value: string | null | undefined) => clean(value).replace(/[.!?]+$/, "");

const sceneEvidenceText = (scene: ThreeDBreakdownAdScene) => clean([
  scene.layout.productAnchor?.title,
  scene.layout.productAnchor?.imageAlt,
  scene.layout.groundedEvidence.text,
  scene.layout.storyContract.customerProblem,
  scene.layout.storyContract.mechanismSummary,
  scene.layout.storyContract.viewerLearns,
  ...scene.layout.scriptBeats.map((beat) => beat.narration),
].join(" "));

export const isThreeDSupplementStory = (scene: ThreeDBreakdownAdScene) => {
  const text = sceneEvidenceText(scene);
  const explicitSupplement = /\b(?:supplement|probiotic|prebiotic|synbiotic|microbiome|gut health|digestive health|vitamin|mineral|softgel)\b/i;
  const dosageForm = /\b(?:capsule|gummy|tablet|powder|strain)\b/i;
  const healthContext = /\b(?:daily|health|nutrient|digest|gut|microbe|serving|formula)\b/i;
  return explicitSupplement.test(text) || (dosageForm.test(text) && healthContext.test(text));
};

const productLock = (scene: ThreeDBreakdownAdScene) => {
  const product = scene.layout.productAnchor;
  if (!product) {
    return "PRODUCT: no product image is available. Use only an abstract category-level object; never invent branded packaging or a specific product design.";
  }
  return clean([
    `PRODUCT: use the supplied reference for ${product.title}.`,
    product.imageAlt ? `Reference cue: ${product.imageAlt}.` : "",
    "Copy its exact outer packaging category and geometry before staging the story: flexible pouch stays pouch, carton stays carton, jar stays jar, bottle stays bottle.",
    "Preserve silhouette, proportions, material, dominant color blocking, packaging form, and scale. Script nouns such as pack, package, product, or snack pack never redefine its shape.",
    "Do not replace it with merch, apparel, a logo-only object, a cube, a generic bottle, or another product category.",
    "Any generated package surface must be blank and free of readable labels; Wiggly composites the exact branded packshot later.",
  ].join(" "));
};

const storyboardReferenceLock = (scene: ThreeDBreakdownAdScene) => clean([
  "REFERENCE ORDER: image 1 is the STYLE MASTER. Copy its same stylized male CGI demonstrator identity, facial proportions, modeled hair, matte skin, body proportions, blue-grid world, and feature-animation rendering. Do not invent a woman, a different person, or a photoreal human.",
  scene.layout.productAnchor
    ? `Image 2 is the PRODUCT MASTER for ${scene.layout.productAnchor.title} and owns retail geometry; later images only define its real serving/use form.`
    : "No Product Master is available; use an abstract category object and do not invent branded packaging.",
  "RIGHT: the Style Master character handles the Product Master while the physical story changes around them. WRONG: a new realistic person handles a cube, carton, jar, or bottle invented from the word pack.",
].join(" "));

const productionReferenceLock = (scene: ThreeDBreakdownAdScene, hasContinuityAnchor: boolean) => clean([
  hasContinuityAnchor
    ? "REFERENCE ORDER: image 1 is the approved panel and owns action/composition; image 2 is the preceding anchor and owns demonstrator identity/clothing/world; image 3 is the PRODUCT MASTER; image 4 may show real product use."
    : "REFERENCE ORDER: image 1 is the approved panel and owns character/world/action/composition; image 2 is the PRODUCT MASTER; image 3 may show real product use.",
  scene.layout.productAnchor
    ? `If the storyboard simplified ${scene.layout.productAnchor.title}, correct its product form to match the PRODUCT MASTER without changing the approved action.`
    : "No Product Master is available; preserve the approved abstract category object.",
].join(" "));

const framePlan = (
  scene: ThreeDBreakdownAdScene,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
  const frame = scene.layout.storyboardBoard?.frames?.find((item) => item.frameIndex === frameIndex);
  if (!frame) return `FRAME ${frameIndex}: preserve the approved storyboard panel and its physical action.`;
  return clean([
    `FRAME ${frameIndex} (${frame.label}).`,
    frame.visual ? `ACTION: ${promptField(frame.visual)}.` : "",
    frame.camera ? `CAMERA: ${promptField(frame.camera)}.` : "",
    frame.motion ? `STATE CHANGE: ${promptField(frame.motion)}.` : "",
  ].join(" "));
};

const frameRole = (
  scene: ThreeDBreakdownAdScene,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
  const contract = scene.layout.storyContract;
  const roles: Record<ThreeDBreakdownStoryboardFrameIndex, string> = {
    1: "Show ordinary product use and the customer's false assumption before the problem is visible.",
    2: "Make the selected hidden obstacle physically visible in the same world.",
    3: "Set up the exact product mechanism with a tactile demonstration.",
    4: `Deliver the peak ${contract.wowMomentType} reveal: ${promptField(contract.wowMoment)}. Teach: ${promptField(contract.viewerLearns)}.`,
    5: `Turn the selected evidence into a visible payoff: ${promptField(scene.layout.groundedEvidence.text)}.`,
    6: "Resolve to the selected product with the same demonstrator's torso or hands completing a clear buyer-action setup; never end on a lonely product, empty stage, abstract mechanism, or logo card.",
  };
  return roles[frameIndex];
};

const usesBodyRouteStory = (scene: ThreeDBreakdownAdScene) => {
  const frameText = (scene.layout.storyboardBoard?.frames || [])
    .flatMap((frame) => [frame.visual, frame.motion])
    .join(" ");
  return /\b(?:swallow(?:ed|ing)?|ingest(?:ed|ion)?|digest(?:ion|ive)?|stomach|gut|intestinal|esophagus|body route|capsule path|inside the body|absorption barrier)\b/i.test(frameText);
};

const supplementDirection = (scene: ThreeDBreakdownAdScene) => {
  if (!isThreeDSupplementStory(scene)) {
    return "CATEGORY LOCK: this is not automatically a supplement story. Do not invent capsules, gummies, digestion, gut tunnels, anatomy, cell walls, medical particles, or a blank supplement bottle unless the selected product evidence and approved frame plan explicitly require them.";
  }
  if (!usesBodyRouteStory(scene)) {
    return "SUPPLEMENT ROUTINE STORY: follow the approved routine, product, and mechanism actions. Do not add anatomy, digestion, gut tunnels, body routes, medical particles, or detached organs because this frame plan does not call for them.";
  }
  return "SUPPLEMENT BODY-ROUTE STORY: use a clean transparent body route, capsule path, tidy obstacle surface, and contained particles only where the approved frame plan requires them. Keep the product and demonstrator connected. No gore, wet intestine tunnel, detached organ montage, or unrelated anatomy.";
};

const sharedStyle = (scene: ThreeDBreakdownAdScene) => clean([
  `STYLE: ${scene.layout.storyContract.visualWorld}.`,
  `LIGHTING: ${scene.layout.storyContract.lighting}.`,
  `CAMERA LANGUAGE: ${scene.layout.storyContract.cameraStyle}.`,
  `RECURRING OBJECTS: ${scene.layout.storyContract.recurringObjects.join(", ")}.`,
  "Use one recurring silent feature-animation CGI demonstrator as a scale figure, never as narrator; preserve face, hair, matte CG skin, plain clothing, proportions, and world.",
  "Keep lips and jaw closed: no speech, lip-sync, presenter delivery, live action, photoreal person, mannequin, doctor, scientist, PPE, or stock-science montage.",
].join(" "));

const pixelTextBan = "PIXEL TEXT BAN: generate no readable words, letters, numbers, captions, subtitles, logos, labels, UI, arrows, checkmarks, X marks, pseudo-writing, or watermarks. Wiggly adds captions, proof, product branding, and CTA in the renderer.";

const makeWellnessMotionPromptProviderSafe = (value: string) => value
  .replace(/\bmassage gun head\b/gi, "handheld percussion attachment")
  .replace(/\bgun head\b/gi, "percussion attachment")
  .replace(/\bmassage gun\b/gi, "handheld percussion massager")
  .replace(/\bdense pink muscle wall\b/gi, "dense stylized elastic fiber wall")
  .replace(/\bmuscle tissue interior\b/gi, "stylized elastic fiber interior")
  .replace(/\bmuscle tissue\b/gi, "stylized elastic fibers")
  .replace(/\binside the muscle\b/gi, "inside the elastic fiber model")
  .replace(/\bshrinks? and dissolves?\b/gi, "loosens and opens")
  .replace(/\bpenetrating\b/gi, "moving through")
  .replace(/\bpenetrates?\b/gi, "moves through")
  .replace(/\bx-?ray\b/gi, "transparent cutaway")
  .replace(/\btissue\b/gi, "fiber layers")
  .replace(/\bknot\b/gi, "tight fiber bundle")
  .replace(/\bmuscle\b/gi, "elastic fiber model");

const makeMotionPromptPixelSafe = (value: string) => value
  .replace(/\bprogress blocks\b/gi, "plain metallic blocks")
  .replace(
    /\bshowing faster prep time versus one block for cold massage\b/gi,
    "beside one contrasting metallic block, conveying the comparison through stacking and scale only",
  )
  .replace(/\bproof blocks\b/gi, "metallic comparison blocks");

export const buildThreeDStoryboardBoardPrompt = (scene: ThreeDBreakdownAdScene) => {
  const plans = ([1, 2, 3, 4, 5, 6] as ThreeDBreakdownStoryboardFrameIndex[])
    .map((index) => `${framePlan(scene, index)} ROLE: ${frameRole(scene, index)}`)
    .join(" ");
  return clean([
    "TASK: create ONE vertical 9:16 image containing exactly six raw production stills in reading order, arranged as a 2-column by 3-row contact sheet for visual review.",
    "LAYOUT: thin white gutters only; every still fills its cell edge-to-edge. No title band, margin, annotation, card, frame number, caption bar, or presentation whitespace.",
    storyboardReferenceLock(scene),
    sharedStyle(scene),
    productLock(scene),
    supplementDirection(scene),
    `APPROVED SIX-FRAME PLAN: ${plans}`,
    "CONTINUITY OVERRIDE: the same male CGI demonstrator from image 1 appears in panels 1, 2, 5, and 6; torso, connected hands, or over-shoulder framing count. Panel 6 shows him placing, holding, carrying, using, or reaching for the large central product, never a product alone on an empty grid.",
    "VISUAL STORY: each cell shows one concrete physical action and one visible state change. Frame 1 establishes the demonstrator and product category; frame 6 resolves to the accurate selected product. Middle frames may use hands, cutaways, pipes, components, particles, scale comparisons, or impossible-camera reveals while preserving continuity.",
    "VARIETY: do not repeat six product-holding poses or six macro science inserts. Move from use, to obstacle, to setup, to reveal, to evidence, to product payoff.",
    pixelTextBan,
  ].join(" "));
};

export const buildThreeDProductionFramePrompt = (
  scene: ThreeDBreakdownAdScene,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => clean([
  `TASK: recreate panel ${frameIndex} from the supplied approved six-panel board as ONE full-frame vertical 9:16 production keyframe. This is not a collage or storyboard sheet.`,
  productionReferenceLock(scene, frameIndex !== 1),
  sharedStyle(scene),
  productLock(scene),
  supplementDirection(scene),
  framePlan(scene, frameIndex),
  `ROLE: ${frameRole(scene, frameIndex)}`,
  frameIndex === 1
    ? "CONTINUITY: establish the panel's feature-animation CGI demonstrator, product, recurring objects, world, and camera relationship. Keep modeled hair, visible eyes, matte CG skin, plain clothing, and a closed mouth."
    : "CONTINUITY: copy image 2's exact CGI demonstrator and clothing. If the panel hides that face, show only the same clothed torso and connected hands; never invent a new face, mannequin, anatomy model, test dummy, or photoreal human.",
  "COMPOSITION: fill the frame with the approved subject and action. No split screen, multiple panels, huge empty table, dead negative space, quiet showroom card, or alternate concept.",
  pixelTextBan,
].join(" "));

export const buildThreeDSeedancePrompt = (
  scene: ThreeDBreakdownAdScene,
  clipPlan: ThreeDBreakdownClipPlan,
) => {
  const product = scene.layout.productAnchor;
  const categoryRule = isThreeDSupplementStory(scene)
    ? "CATEGORY: use clean body-route or capsule-path footage only where the approved frames require it; no gore or detached anatomy montage."
    : "CATEGORY: do not invent supplement, capsule, digestive, anatomy, or medical imagery absent from the approved frames.";
  const rawPrompt = clean([
    clipPlan.prompt,
    product
      ? `PRODUCT LOCK: preserve the supplied ${product.title} category, silhouette, colors, material, and packaging form; never replace it or invent readable packaging.`
      : "PRODUCT LOCK: preserve the approved category-level object and do not invent branded packaging.",
    categoryRule,
    "INPUT LOCK: the supplied first image is the exact opening composition and the supplied last image is the exact ending target. Begin on the first image, perform the approved physical changes, and arrive naturally at the last image without inventing another scene, person, or product.",
    "IDENTITY: keep the same CGI person. If endpoints hide the face, show only matching clothes, torso, and hands; never invent a face, mannequin, dummy, or photoreal human.",
    "MOTION: use direct cuts, push-throughs, object wipes, camera pushes, component reveals, or particle transitions. Change a product, prop, obstacle, component, or camera scale every 1-2 seconds; no static product with drifting particles and no empty transition frames.",
    "No readable text, captions, labels, logos, UI, pseudo-writing, or watermarks; Wiggly adds every word later. Never visualize a claim as a headline, sign, dashboard, title card, or written comparison.",
  ].join(" "));
  const wellnessSafetyContext = /\b(?:massage gun|gun head|muscle|tissue|knot|x-?ray)\b/i.test(rawPrompt)
    ? "SAFETY CONTEXT: benign consumer wellness product demonstration. Any fiber forms are clean educational models, not injured anatomy. No weapon use, violence, pain, injury, bodily harm, gore, or medical procedure."
    : "";
  const prompt = makeMotionPromptPixelSafe(
    makeWellnessMotionPromptProviderSafe(clean([rawPrompt, wellnessSafetyContext].join(" "))),
  );
  if (prompt.length > MAX_SEEDANCE_PROMPT_CHARS) {
    throw new Error(`3D Breakdown Seedance prompt is ${prompt.length} characters; simplify the approved frame plan before generation.`);
  }
  return prompt;
};
