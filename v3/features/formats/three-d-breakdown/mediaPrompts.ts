import type {
  ThreeDBreakdownAdScene,
  ThreeDBreakdownClipPlan,
  ThreeDBreakdownStoryboardFrameIndex,
} from "../../scene/types";
import { getThreeDAnchorPrompt, getThreeDStoryboardPrompt } from "./editablePrompts";

const MAX_SEEDANCE_PROMPT_CHARS = 3900;
export const THREE_D_BREAKDOWN_VIDEO_RESOLUTION = "480p" as const;

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
  "REFERENCE ORDER: image 1 is the STYLE MASTER for feature-animation CGI rendering, modeled materials, and finish only. The approved story contract owns the setting, recurring subject, lighting, and camera. Do not copy an unrelated person, product, or blue-grid setting from the style reference.",
  scene.layout.productAnchor
    ? `Image 2 is the PRODUCT MASTER for ${scene.layout.productAnchor.title} and owns retail geometry; later images only define its real serving/use form.`
    : "No Product Master is available; use an abstract category object and do not invent branded packaging.",
].join(" "));

const productionReferenceLock = (scene: ThreeDBreakdownAdScene, hasContinuityAnchor: boolean) => clean([
  hasContinuityAnchor
    ? "REFERENCE ORDER: image 1 is the approved panel and owns action/composition; image 2 is the preceding anchor and owns demonstrator identity/clothing/world; image 3 is the PRODUCT MASTER; image 4 may show real product use."
    : "REFERENCE ORDER: image 1 is the approved panel and owns character/world/action/composition; image 2 is the PRODUCT MASTER; image 3 may show real product use.",
  scene.layout.productAnchor
    ? `If the storyboard simplified ${scene.layout.productAnchor.title}, correct its product form to match the PRODUCT MASTER without changing the approved action.`
    : "No Product Master is available; preserve the approved abstract category object.",
].join(" "));

const physicalizeEvidencePayoff = (value: string) => clean(value)
  .replace(
    /\b(?:one|two|three|four|five|\d+)\s+abstract\s+(?:(?:proof|progress|comparison|evidence)\s+)?(?:blocks?|tokens?|counters?|cubes?)[^.]*\.?/gi,
    "the selected product visibly changes the customer problem through the documented mechanism. ",
  )
  .replace(
    /\b(?:proof|progress|comparison|evidence)\s+(?:blocks?|tokens?|counters?|cubes?)[^.]*\.?/gi,
    "the selected product visibly changes the customer problem through the documented mechanism. ",
  );

const framePlan = (
  scene: ThreeDBreakdownAdScene,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
  const frame = scene.layout.storyboardBoard?.frames?.find((item) => item.frameIndex === frameIndex);
  if (!frame) return `FRAME ${frameIndex}: preserve the approved storyboard panel and its physical action.`;
  return physicalizeEvidencePayoff([
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
  const frame = scene.layout.storyboardBoard?.frames?.find((item) => item.frameIndex === frameIndex);
  const roles: Record<ThreeDBreakdownStoryboardFrameIndex, string> = {
    1: "Show ordinary product use and the customer's false assumption before the problem is visible.",
    2: "Make the selected hidden obstacle physically visible in the same world.",
    3: "Set up the exact product mechanism with a tactile demonstration.",
    4: `Deliver the peak ${contract.wowMomentType} reveal: ${promptField(contract.wowMoment)}. Teach: ${promptField(contract.viewerLearns)}.`,
    5: `Product changes the problem: ${promptField(scene.layout.groundedEvidence.text)}. Proof text is overlay only.`,
    6: `Resolve exactly to the approved final state: ${promptField(frame?.visual || "the finished subject in its established world")}. Include a demonstrator or hands only if that final frame calls for them; never invent a new person.`,
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
  "Use only the recurring feature-animation CGI demonstrator, torso, or hand-proxy named by the approved frames. Preserve its identity, clothing, proportions, and world wherever it appears.",
  "If an approved frame shows only objects or hands, do not add a face or full person. Any visible mouth stays closed: no speech, lip-sync, presenter delivery, live action, photoreal person, mannequin, doctor, scientist, PPE, or stock-science montage.",
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

export const sanitizeThreeDStoryboardImagePlan = (value: string) => clean(value)
  .split(/(?=Frame\s+\d+\s*:)/gi)
  .map((section) => section
    .replace(/^Frame\s+\d+\s*:\s*.*?(?=\bVisual\s*:)/i, "")
    .replace(/\bVisual\s*:\s*/i, "")
    .replace(/\s*Renderer overlay\s*:\s*.*?(?=\s*Editing note\s*:|$)/i, " ")
    .replace(/\s*Editing note\s*:\s*.*$/i, "")
    .replace(/\bCamera\s*:\s*/i, "Camera: ")
    .replace(/\bMotion\s*:\s*/i, "State change: ")
    .trim())
  .filter(Boolean)
  .join(" Next still: ");

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
    `APPROVED SIX-FRAME PLAN: ${scene.layout.storyboardBoard?.creativePrompt
      ? sanitizeThreeDStoryboardImagePlan(getThreeDStoryboardPrompt(scene.layout.storyboardBoard))
      : plans}`,
    "CONTINUITY OVERRIDE: preserve the same approved recurring demonstrator or hand-proxy only in panels that call for it. Object-only panels remain object-only. Never add a new face, person, goggles, hat, or outfit.",
    "VISUAL STORY: each cell shows one concrete physical action and one visible state change. Frame 1 establishes the approved recurring subject and world; frame 6 resolves to the approved final subject. Middle frames may use hands, cutaways, components, particles, scale comparisons, or impossible-camera reveals while preserving continuity.",
    "VARIETY: do not repeat six product-holding poses or six macro science inserts. Move from use, to obstacle, to setup, to reveal, to evidence, to product payoff.",
    pixelTextBan,
  ].join(" "));
};

export const buildThreeDProductionFramePrompt = (
  scene: ThreeDBreakdownAdScene,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
  const frame = scene.layout.storyboardBoard?.frames?.find((item) => item.frameIndex === frameIndex);
  const anchorPrompt = frame ? getThreeDAnchorPrompt(frame) : framePlan(scene, frameIndex);
  return clean([
  `TASK: recreate panel ${frameIndex} from the supplied approved six-panel board as ONE full-frame vertical 9:16 production keyframe. This is not a collage or storyboard sheet.`,
  productionReferenceLock(scene, frameIndex !== 1),
  sharedStyle(scene),
  productLock(scene),
  supplementDirection(scene),
  `APPROVED ANCHOR CREATIVE PROMPT: ${sanitizeThreeDStoryboardImagePlan(anchorPrompt)}`,
  `ROLE: ${frameRole(scene, frameIndex)}`,
  frameIndex === 1
    ? "CONTINUITY: establish the panel's approved subject or hand-proxy, recurring objects, world, and camera relationship. Do not add a face or full person unless the panel requires one."
    : "CONTINUITY: copy image 2's exact world and any recurring demonstrator, clothing, or hand-proxy. If the approved panel hides or omits a face, do not invent one.",
  "COMPOSITION: fill the frame with the approved subject and action. No split screen, multiple panels, huge empty table, dead negative space, quiet showroom card, or alternate concept.",
  pixelTextBan,
].join(" "));
};

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
    "IDENTITY: preserve only the recurring subject or hand-proxy visible in the supplied endpoints. If the endpoints are object-only, never invent a person, face, mannequin, dummy, or photoreal human.",
    "MOTION: stay inside one continuous world and evolve naturally from the supplied opening frame to the supplied ending frame. Use camera movement, object motion, component reveals, or physical transformations; do not cut to another setting, person, presenter, or unrelated composition.",
    "No readable text, captions, labels, logos, UI, pseudo-writing, or watermarks; Wiggly adds every word later. Never visualize a claim as a headline, sign, dashboard, title card, or written comparison.",
  ].join(" "));
  const wellnessSafetyContext = /\b(?:massage gun|gun head|muscle|tissue|knot|x-?ray)\b/i.test(rawPrompt)
    ? "SAFETY CONTEXT: benign consumer wellness product demonstration. Any fiber forms are clean educational models, not injured anatomy. No weapon use, violence, pain, injury, bodily harm, gore, or medical procedure."
    : "";
  const prompt = physicalizeEvidencePayoff(
    makeWellnessMotionPromptProviderSafe(clean([rawPrompt, wellnessSafetyContext].join(" "))),
  );
  if (prompt.length > MAX_SEEDANCE_PROMPT_CHARS) {
    throw new Error(`3D Breakdown Seedance prompt is ${prompt.length} characters; simplify the approved frame plan before generation.`);
  }
  return prompt;
};
