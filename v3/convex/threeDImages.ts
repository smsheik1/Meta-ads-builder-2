"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { generateReplicateNanoBanana2Image, generateReplicateSeedanceVideo } from "../features/formats/jingle/storyboard";
import type {
  AdScene,
  ThreeDBreakdownAdScene,
  ThreeDBreakdownClipIndex,
  ThreeDBreakdownClipPlan,
  ThreeDBreakdownStoryboardFrameIndex,
} from "../features/scene/types";

const THREE_D_BREAKDOWN_STYLE_REFERENCE_PATH = "/three-d-breakdown/references/ecommerce-teardown-style-reference-clean-v7.jpg";
const THREE_D_SEEDANCE_MAX_PROMPT_CHARS = 3900;
const getThreeDSeedancePromptSuffix = (scene: ThreeDBreakdownAdScene) => {
  const isPresenterStyle = scene.layout.storyContract.visualStyle === "presenter-teardown-vsl";
  const productAnchor = scene.layout.productAnchor;
  return [
    "Use the provided storyboard frame as the first frame reference.",
    isPresenterStyle
      ? "Preserve the unseen-narrator ecommerce teardown style: recurring casual silent 3D demonstrator/scale figure in a bright blue technical grid product-demo studio, product handling, oversized tactile props, pipes, particles, scale comparisons, and short 3D explanatory inserts."
      : "Preserve the bright blue/cyan technical-grid procedural 3D explainer world, product identity, recurring demo character/body proxy, and composition.",
    isPresenterStyle
      ? "Keep lighting bright, technical-blue, creator-ad readable, and product-focused; avoid toy-character anatomy, faceless biology montages, random gut tunnels, doctor/scientist costumes, medical masks, latex gloves, nitrile gloves, medical goggles, PPE, dark cinematic rooms, black voids, empty blue grid, and logo-only end cards."
      : "Keep lighting bright, readable, and flat like a product-science classroom; avoid dark cinematic rooms, black voids, moody spotlights, smoke-only sci-fi labs, and luxury product-card lighting.",
    isPresenterStyle
      ? "For supplement/digestive stories, do not overcorrect into a standalone beaker demo: transparent torso, body-route, gut-route, or cell-wall footage is correct when it remains anchored to the same silent demonstrator, product path, capsule particles, or scale proxy."
      : "",
    "Capsules stay capsules, bottles stay bottles, packaging stays packaging; do not morph products into cups, buckets, bowls, or unrelated lab vessels.",
    productAnchor
      ? `Selected ecommerce product anchor: ${productAnchor.title}. Preserve this product's category, silhouette, dominant colors, scale, and physical relationship from the reference image; do not replace it with merch, hats, apparel, logo-only objects, generic props, or a different product category.`
      : "",
    "Use direct cuts, pushes, reveals, and mechanical transformations; no blank color wipes, fog-only transitions, empty gradients, or slow lingering setup.",
    isPresenterStyle
      ? "Make the motion feel embodied through the same silent demonstrator returning throughout the clip: full body, torso, hands, body-route view, over-shoulder angle, or product-use demonstration depending on the beat; narrator/captions present the argument, the human only demonstrates."
      : "Make the motion feel embodied: keep a stylized human demo character, body proxy, or scale figure returning throughout the clip as the continuity spine, with frame 1 and final-payoff moments showing the character body or torso beside the product.",
    isPresenterStyle
      ? "During the peak mechanism reveal, keep the product jar/package and silent demonstrator or body-route anchor visible in the same blue-grid world; do not detach into a standalone macro tube or faceless stock-biology insert."
      : "",
    "Change visual state about every second; use body/pathway travel, macro cutaways, mechanism machines, particle motion, or product payoff resets instead of holding a static capsule render.",
    isPresenterStyle
      ? "Every frame must contain visible silent demonstrator/full body/torso/hands, product, product-use setup, mechanism insert, particles, pipes, scale props, or physical obstacle; never cut to a plain dark screen, empty blue grid, empty gradient, or caption-only moment."
      : "Every frame must contain a visible demo character/body proxy, product, mechanism, character hand, particles, or physical obstacle; never cut to a plain dark screen, empty blue grid, empty gradient, or caption-only moment.",
    "If you need a transition, use an object wipe, camera push, particle burst, component reveal, or foreground product pass so the frame remains visually active.",
    "No readable text, captions, labels, numbers, logos, UI copy, subtitles, icons, arrows, checkmarks, or X marks.",
    "Even when brand names, product names, evidence text, CTA, or overlay words appear in context, never render those words in image pixels; use blank packages and blank physical tokens instead.",
    "If a reference image contains captions, shirt text, labels, or logos, treat them as visual-reference artifacts only and do not reproduce them.",
    "Show proof concepts as blank physical tokens, unmarked objects, light, steam, crumbs, ribbon, or motion only.",
  ].join(" ");
};

const getThreeDImageStyleRules = (scene: ThreeDBreakdownAdScene) => {
  const isPresenterStyle = scene.layout.storyContract.visualStyle === "presenter-teardown-vsl";
  const productAnchor = scene.layout.productAnchor;
  return [
    isPresenterStyle
      ? "Unseen-narrator ecommerce product teardown: bright blue technical grid product-demo studio, recurring casual silent 3D demonstrator/scale figure with everyday clothing and product-demo posture, product handling, oversized tactile props, capsules, pipes, particles, scale comparisons, bright creator-ad lighting, and short 3D mechanism inserts. The demonstrator may appear full-body, torso, hands, or over-shoulder depending on the beat. No smooth bald mannequins, blank anatomy models, test dummies, medical masks, latex gloves, nitrile gloves, PPE, lab coats, doctors, or scientists."
      : "Bright blue/cyan blueprint-grid stage, flat readable lab lighting, close product-science camera, strong subject/background separation.",
    isPresenterStyle
      ? "Use the same silent demonstrator/product relationship as the continuity anchor; intro and final frames show full-body or torso demonstrator with the product in the blue technical grid studio, while mechanism frames may use hands, a 3D overlay, macro cutaway, x-ray, or product interior insert."
      : "Use the recurring stylized demo character/body proxy as the continuity anchor; intro and final frames show a body or torso, while mechanism frames may use the same hand, pointer, probe, scale figure, or body cutaway.",
    isPresenterStyle
      ? "Keep the same demonstrator face, cap/goggles if used, shirt color, body scale, product silhouette, and blue-grid world across all frames; consistency matters more than inventing a fresh character pose."
      : "Keep the same demo character shape, product silhouette, blue-grid world, and scale across all frames; consistency matters more than inventing a fresh scene.",
    isPresenterStyle
      ? "Maxfusion visual rule: each narration line must become a visible product/body/mechanism action before it becomes an image prompt. Show the state change physically; do not rely on text or topic illustration."
      : "Each narration line must become a visible product/body/mechanism action before it becomes an image prompt.",
    isPresenterStyle
      ? "Founder prompt discipline: every still must contain a clear visual fingerprint, recurring demonstrator/product, concrete action, camera/framing, lighting, color/mood, and consistency. If the image could be replaced by a stock science render, it fails."
      : "Every still must contain a clear visual fingerprint, recurring character/product, concrete action, camera/framing, lighting, color/mood, and consistency.",
    "Every generated frame must have a clear prompt skeleton: locked style, recurring demonstrator/product, one scene action, camera/framing, lighting, color/mood, and consistency.",
    isPresenterStyle
      ? "Avoid toy-character anatomy, smooth bald mannequins, blank anatomy models, test dummies, talking presenters, sunglasses, medical goggles, latex gloves, nitrile gloves, medical masks, lab technicians, doctor-like presenters, sterile PPE workers, cartoon body-wall characters, faceless anatomy montages, random gut tunnels, pure biology-documentary visuals, dark voids, huge empty counters, luxury product-card stills, empty negative space, posters, UI cards, and typography-led graphics. This does not ban reference-style semi-transparent torso overlay, gut route, or cell-wall visuals when the demonstrator/product path remains the anchor."
      : "Avoid faceless biology montages, dark rooms, black voids, smoky sci-fi labs, luxury product-card stills, empty negative space, posters, UI cards, and typography-led graphics.",
    isPresenterStyle
      ? "For supplement/digestive obstacle frames, use clean graphic product-science visuals: blue body-route, tidy pink cell-wall or obstacle surface, visible particles, crisp grid-world lighting. Avoid wet fleshy intestine tunnels, gore, horror anatomy, disconnected organ close-ups, and gross medical macro shots."
      : "",
    "Preserve product shape, color, material, packaging cues, and category. Capsules stay capsule-shaped, bottles stay bottles, packaging stays packaging; all labels remain blank and unreadable.",
    productAnchor
      ? `Selected ecommerce product anchor: ${productAnchor.title}. Use the product reference only for product shape, category, color, packaging silhouette, scale, and material cues. The final payoff must physically show this selected product/category, not a hat, merch item, logo, icon, generic bottle, or abstract mechanism.`
      : "",
    "If a bottle, jar, pouch, box, card, or package faces camera, make the front surface completely blank matte material or rotate the label side away from camera. Never render brand names, logos, label panels, ingredient text, badge text, tiny copy, pseudo-letters, or fake product labels.",
    "No readable text, logos, letters, numbers, captions, UI copy, arrows, checkmarks, X marks, or label-like rectangles. Show proof as blank physical tokens, particles, light, steam, crumbs, ribbon, or motion.",
    "Even if brand names, product names, evidence text, CTA, or overlay words are present in scene context, keep all image pixels text-free with blank packages and blank tokens.",
  ].join(" ");
};

const getThreeDPublicBaseUrl = () => {
  const raw = process.env.WIGGLY_PUBLIC_BASE_URL || process.env.APP_URL || process.env.VERCEL_URL || "";
  if (!raw.trim()) return "";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
};

const getThreeDStyleReferenceUrl = () => {
  const explicitUrl = process.env.THREE_D_BREAKDOWN_STYLE_REFERENCE_URL || "";
  if (explicitUrl.trim()) return explicitUrl.trim();
  const baseUrl = getThreeDPublicBaseUrl();
  return baseUrl ? `${baseUrl}${THREE_D_BREAKDOWN_STYLE_REFERENCE_PATH}` : "";
};

const requireThreeDStyleReferenceUrl = () => {
  const url = getThreeDStyleReferenceUrl();
  if (!url) {
    throw new Error("3D Breakdown style reference is not configured. Set THREE_D_BREAKDOWN_STYLE_REFERENCE_URL or WIGGLY_PUBLIC_BASE_URL before generating storyboard frames.");
  }
  return url;
};

const assertThreeDBreakdownScene = (scene: AdScene): ThreeDBreakdownAdScene => {
  if (scene.format !== "three-d-breakdown") throw new Error("3D Breakdown action received the wrong scene format.");
  return scene;
};

const patchThreeDScene = async (
  ctx: any,
  sceneId: Id<"adScenes">,
  scene: ThreeDBreakdownAdScene,
) => ctx.runMutation(internal.adSceneStorage.patchScene, { sceneId, scene });

const getThreeDImageInput = (scene: ThreeDBreakdownAdScene) => {
  const styleReferenceUrl = requireThreeDStyleReferenceUrl();
  const productImageUrls = scene.layout.referenceImages?.productImageUrls || [];
  const brandImageUrls = productImageUrls.length
    ? []
    : scene.layout.referenceImages?.brandImageUrls || [];
  return Array.from(new Set([
    styleReferenceUrl,
    ...productImageUrls,
    ...brandImageUrls,
  ].filter(Boolean))).slice(0, 4);
};

const getThreeDAnchorImageInput = (scene: ThreeDBreakdownAdScene, baseImageInput: string[]) => {
  const storyboardImageUrl = scene.layout.storyboardBoard?.image?.status === "ready"
    ? scene.layout.storyboardBoard.image.url
    : "";
  return Array.from(new Set([
    storyboardImageUrl,
    ...baseImageInput,
  ].filter((url): url is string => Boolean(url)))).slice(0, 5);
};

const withUpdatedThreeDStoryboardBoard = (
  scene: ThreeDBreakdownAdScene,
  update: (board: NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>) => NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>,
): ThreeDBreakdownAdScene => {
  const board = scene.layout.storyboardBoard;
  if (!board) return scene;
  return {
    ...scene,
    layout: {
      ...scene.layout,
      storyboardBoard: update(board),
    },
  };
};

const buildThreeDSeedancePrompt = (scene: ThreeDBreakdownAdScene, clipPlan: ThreeDBreakdownClipPlan) => {
  const promptSuffix = getThreeDSeedancePromptSuffix(scene);
  const fullPrompt = [clipPlan.prompt, promptSuffix].join(" ");
  if (fullPrompt.length <= THREE_D_SEEDANCE_MAX_PROMPT_CHARS) return fullPrompt;
  const availableClipChars = Math.max(800, THREE_D_SEEDANCE_MAX_PROMPT_CHARS - promptSuffix.length - 1);
  return [
    clipPlan.prompt.slice(0, availableClipChars).trim(),
    promptSuffix,
  ].join(" ");
};

const withUpdatedThreeDClipPlans = (
  scene: ThreeDBreakdownAdScene,
  update: (clipPlans: NonNullable<ThreeDBreakdownAdScene["layout"]["clipPlans"]>) => NonNullable<ThreeDBreakdownAdScene["layout"]["clipPlans"]>,
): ThreeDBreakdownAdScene => {
  const clipPlans = scene.layout.clipPlans;
  if (!clipPlans || !clipPlans.length) throw new Error("3D Breakdown clip plans are missing.");
  return {
    ...scene,
    layout: {
      ...scene.layout,
      clipPlans: update(clipPlans),
    },
  };
};

const storeThreeDBytes = async (
  ctx: {
    storage: {
      store: (blob: Blob) => Promise<Id<"_storage">>;
      getUrl: (storageId: Id<"_storage">) => Promise<string | null>;
    };
  },
  bytes: Uint8Array,
  mimeType: string,
) => {
  const storageId = await ctx.storage.store(new Blob([bytes], { type: mimeType }));
  const url = await ctx.storage.getUrl(storageId);
  if (!url) throw new Error("3D Breakdown media storage returned no URL.");
  return { storageId: String(storageId), url, mimeType };
};

const getThreeDStoryboardFramePlan = (
  scene: ThreeDBreakdownAdScene,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
  const frame = scene.layout.storyboardBoard?.frames?.find((item) => item.frameIndex === frameIndex);
  if (!frame?.visual && !frame?.camera && !frame?.motion && !frame?.editingNote) return "";
  return [
    `Story Director frame plan for frame ${frameIndex}:`,
    frame.visual ? `visual: ${frame.visual}` : "",
    frame.camera ? `camera: ${frame.camera}` : "",
    frame.motion ? `motion: ${frame.motion}` : "",
    frame.editingNote ? `edit: ${frame.editingNote}` : "",
    "Any overlay text is added later by Wiggly; do not generate readable text.",
  ].filter(Boolean).join(" ");
};

const getThreeDFrameNarrative = (
  scene: ThreeDBreakdownAdScene,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
  const beats = scene.layout.scriptBeats;
  const shots = scene.layout.shots;
  const contract = scene.layout.storyContract;
  const consequence = beats[0]?.narration || "The problem starts.";
  const context = beats[1]?.narration || "The problem escalates.";
  const mechanism = beats[2]?.narration || "The mechanism appears.";
  const revelation = beats[3]?.narration || "The proof lands.";
  const punchline = beats[4]?.narration || "The final state resolves.";
  const shot1 = shots[0];
  const shot2 = shots[1];
  const shot3 = shots[2];
  const framePlan = getThreeDStoryboardFramePlan(scene, frameIndex);
  const withFramePlan = (direction: string) => [framePlan, direction].filter(Boolean).join(" ");
	  if (contract.visualStyle === "presenter-teardown-vsl") {
    const presenterFrameDirections: Record<ThreeDBreakdownStoryboardFrameIndex, string> = {
      1: `False assumption / common use. Narration: ${consequence}. Show the recurring casual silent 3D demonstrator/scale figure full-body or torso in a bright blue technical grid product-demo studio physically wearing, holding, opening, swallowing, pouring, carrying, or using the product before the hidden problem is revealed. Include a tactile demo prop or product-use surface, but no huge empty counter foreground. Use ${shot1.explainerDevice}; physical action: the ordinary use is demonstrated and the risk is implied. No smooth bald mannequins, blank anatomy models, test dummies, blue gloves, latex gloves, nitrile gloves, medical masks, PPE, lab coats, doctors, or scientists.`,
      2: `Hidden problem. Narration: ${context}. In the same blue technical grid studio, show a semi-transparent torso overlay, body-route, gut-route, cell-wall, product path, pipe, capsule route, particle flow, oversized prop comparison, clear jar, glass, or scale object anchored to the same recurring demonstrator/product path where the hidden obstacle becomes physically visible. Continue ${shot1.sceneDescription}. No standalone anatomy mannequin, smooth bald body model, medical masks, PPE, lab coats, doctors, or scientists.`,
      3: `Mechanism setup. Narration: ${mechanism}. Show the recurring demonstrator full-body, torso, or hands silently demonstrating the exact product detail that leads into the 3D mechanism reveal with a tactile prop, pipe, jar, capsule, tray, or product-use surface. Use ${shot2.explainerDevice}; physical action: ${shot2.physicalAction}.`,
	      4: `Peak 3D teardown insert. Narration: ${mechanism} ${revelation}. Use ${contract.wowMomentType}: ${contract.wowMoment}. Viewer learns: ${contract.viewerLearns}. This should feel like an impossible product cutaway, x-ray, pipe demo, floating component split, or particle mechanism inside the same blue technical grid studio, with product jar/package and the demonstrator or body-route anchor still present as scale anchors.`,
      5: `Evidence payoff. Narration: ${revelation}. Return from the 3D insert to the silent-demonstrator/product demo with selected evidence represented as blank physical tokens, product behavior, component movement, or product-use result.`,
      6: `Final human/product payoff. Narration: ${punchline}. Show the recurring casual silent demonstrator full-body, torso, or hands clearly with a blank supplement bottle/jar/package silhouette plus capsule in a clean final blue-grid ecommerce frame, with blank proof/component tokens for renderer captions later. No smooth bald mannequins, blank anatomy models, test dummies, blue gloves, latex gloves, nitrile gloves, medical masks, PPE, lab coats, doctors, or scientists.`,
	    };
	    return withFramePlan(presenterFrameDirections[frameIndex]);
	  }
  const frameDirections: Record<ThreeDBreakdownStoryboardFrameIndex, string> = {
    1: `False assumption / common use. Narration: ${consequence}. Show a full-body or torso recurring human demo character on the blue technical grid stage using or scaling the intact product before anything fails. The character is the body/customer/scale proxy and should be prominent, roughly one-third to one-half of frame height, with the product visible beside or in the character's hand; do not use a giant anonymous hand macro. Keep it clean and human-scale; no explosion, damage, debris, or acid yet. Use ${shot1.explainerDevice}; physical action: the ordinary use is shown and the risk is implied.`,
    2: `Hidden obstacle. Narration: ${context}. Move into the internal journey: transparent torso, gut tunnel, intestinal wall, acid bath, blockage, pile-up, compression, or tension. This is where an ordinary unprotected version visibly struggles while the main product identity stays clear. Continue ${shot1.sceneDescription}.`,
    3: `Mechanism setup. Narration: ${mechanism}. Reintroduce the intact product with the recurring demo character, body proxy, or same character hand/probe pointing to the mechanism before the reveal. Use ${shot2.explainerDevice}; physical action: ${shot2.physicalAction}.`,
    4: `Peak wow reveal. Narration: ${mechanism} ${revelation}. This is the strongest impossible-to-film frame using ${contract.wowMomentType}: ${contract.wowMoment}. Viewer learns: ${contract.viewerLearns}.`,
    5: `Evidence payoff. Narration: ${revelation}. Connect the selected evidence to the payoff inside the pathway or mechanism environment, with the engineered product central and any ordinary failed version only as a small unmarked remnant.`,
    6: `Final transformed state. Narration: ${punchline}. Return to the blue technical grid stage with the full-body or torso human demo character clearly visible beside a clean final product-science payoff composition, recurring objects, and blank proof/component tokens for renderer captions later. Do not make the character tiny or hide the character behind a giant hand.`,
  };
  return withFramePlan(frameDirections[frameIndex]);
};

const getThreeDGuideInstructionForStyle = (
  visualStyle: ThreeDBreakdownAdScene["layout"]["storyContract"]["visualStyle"],
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
	  if (visualStyle === "presenter-teardown-vsl") {
	    if (frameIndex === 1 || frameIndex === 3 || frameIndex === 6) {
      return "Show the same recurring casual silent 3D demonstrator/scale figure clearly enough to anchor the product demo; full body or torso is preferred for frame 1 and frame 6, with hands or over-shoulder framing acceptable for product detail. Keep it in the blue technical grid studio with everyday creator-ad clothing and tactile props; no smooth bald mannequins, blank anatomy models, test dummies, sunglasses, blue gloves, latex gloves, nitrile gloves, medical masks, PPE, lab coats, doctors, scientists, toy-like character, lifestyle influencer, or lab technician. Do not clone a known person from a reference, and keep all clothing/product labels unreadable.";
	    }
	    if (frameIndex === 4) {
	      return "Use this as the 3D explanatory insert: macro cutaway, x-ray, overlay, floating component split, pipe/pathway demo, invisible-problem reveal, or mechanism teardown. It must still feel connected to the same blue grid product demo, not like a separate biology documentary.";
	    }
    return "Keep the product-use demo visible through hands, demonstrator edge, over-shoulder framing, product surface, lab props, pipes, particles, or scale comparison so this does not become a detached object render.";
	  }
  if (frameIndex === 1 || frameIndex === 3 || frameIndex === 6) {
    return "Show the recurring stylized human demo character clearly enough to anchor the scene, toy-like with goggles or lab-demo energy. Frame 1 and frame 6 require a prominent full-body or torso character, not just fingers, a pointer, or a giant anonymous hand. Keep the product readable, keep the character functioning as body/customer/scale proxy, and keep clothing completely blank with no readable text.";
  }
  if (frameIndex === 2 || frameIndex === 5) {
    return "Show either the same human demo character at the edge of frame or a matching character hand/pointer/scale proxy so the sequence still feels embodied by the same subject, not like a faceless object demo or biology montage. If this is a supplement/body journey frame, the character/proxy may be a small scale figure or pointer inside the gut/process world.";
  }
  return "Use the same character hand, pointer, probe, tiny scale figure, or body proxy near the mechanism so the reveal still connects to the recurring demo character, but do not block the cutaway.";
};

const buildThreeDProductionFramePrompt = (
  scene: ThreeDBreakdownAdScene,
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
  const contract = scene.layout.storyContract;
  const recurringObjects = contract.recurringObjects.join(", ");
  const productAnchor = scene.layout.productAnchor;
  return [
    "Create ONE vertical 9:16 production keyframe for a high-retention procedural 3D explainer ad.",
    "This is a single Seedance reference image, not a storyboard board.",
    `Use the provided 6-panel storyboard board as the visual source of truth. Recreate panel ${frameIndex} as a clean vertical production keyframe.`,
    "Preserve the storyboard panel's demonstrator identity, gender, age, face shape, shirt color, product silhouette, blue grid world, camera relationship, and scene logic.",
    productAnchor
      ? `Selected product anchor: ${productAnchor.title}. Preserve its product category, silhouette, color family, and packaging/product form from the reference image. Do not turn it into merch, a hat, apparel, a logo object, a generic supplement bottle, or unrelated packaging.`
      : "If no product reference exists, use only abstract product-category shapes and do not invent specific packaging.",
    "Crop or expand the panel only enough to make one vertical 9:16 production frame; do not invent a different person, outfit, prop setup, product category, or anatomy scene.",
    "Do not create a grid, contact sheet, comic strip, split screen, collage, panel border, gutter, horizontal divider, caption bar, or multi-frame layout.",
    "Use the corresponding panel's central subject/action filling most of the vertical frame.",
    `Shared visual world: ${contract.visualWorld}. Lighting: ${contract.lighting}. Camera: ${contract.cameraStyle}. Recurring objects: ${recurringObjects}.`,
    getThreeDFrameNarrative(scene, frameIndex),
	    getThreeDGuideInstructionForStyle(contract.visualStyle, frameIndex),
	    getThreeDImageStyleRules(scene),
    contract.visualStyle === "presenter-teardown-vsl"
      ? "Recurring casual silent 3D demonstrator/scale figure is the continuity spine; product meaning comes from handling, use, props, pipes, particle paths, quick teardown inserts, and visible cause/effect. Never use blue medical gloves."
	      : "The demo character is the body/customer/scale proxy, not a presenter; product meaning comes from cause/effect, mechanism reveals, and 3D transformations.",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "The demonstrator must be part of the physical proof: wearing, holding, opening, swallowing, pouring, carrying, training in, or standing directly behind the product route/path. Do not park the person beside a generic science graphic."
      : "",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "For supplement/digestive products, match the reference grammar: demonstrator with capsule/cup, semi-transparent torso overlay or body-route, macro obstacle, cell-wall or pathway close-up, machine/pipe mechanism, demonstrator/product payoff, final bottle/product close. Avoid detached gut tunnels, blank anatomy models, or faceless anatomy montages, but do not ban body-route visuals that remain anchored to the product and demonstrator."
      : "For supplement/digestive products, include internal-body journey imagery when relevant: transparent torso, gut tunnel, intestinal wall, acid bath, cell wall, particles traveling, or protected capsule passing through a pathway.",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "Do not keep every frame on the same empty blue tabletop. The blue technical palette should unify silent-demonstrator demo frames, pipe/pathway props, mechanism inserts, particle movement, and final product stage shots."
	      : "Do not keep every frame on the same empty blue tabletop. The blue/cyan instructional palette should unify body cutaways, process tunnels, mechanism machines, and final stage shots.",
    "If a style reference contains captions, shirt text, labels, or logos, ignore those reference artifacts and preserve only the 3D texture, blue stage, scale, silent-demonstrator energy, and macro mechanism language.",
    "If product reference images include labels or logos, use them only to infer product category, color, silhouette, material, and packaging shape. Do not copy any text, logo, label layout, badge, icon, dosage copy, or pseudo-writing from the reference image.",
    "Brand identity, captions, CTA, and proof text are added by Wiggly renderer overlays later; the generated frame must contain no readable or fake text anywhere.",
    "Do not make quiet product-card stills. Do not leave empty negative space for captions. The physical mechanism must carry the frame.",
    "For capsules or supplement products, preserve exact capsule identity: capsule stays capsule-shaped, nested capsules stay nested, contents appear as contained beads/particles or controlled cutaway release, never as a generic jar, cylinder, cup, bucket, bowl, tube, or poster object.",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "For the final payoff frame, include a blank supplement bottle/jar/package silhouette with the capsule beside the recurring demonstrator full-body, torso, or hands so the ad resolves to an ecommerce product, not only an abstract capsule."
      : "",
    "Use warm amber/gold ingredient particles or clean glowing payload beads for active contents. Avoid black ash, dirty dust, or explosion debris unless it is a tiny obstacle remnant in frame 2.",
  ].join(" ");
};

const buildThreeDStoryboardBoardPrompt = (scene: ThreeDBreakdownAdScene) => {
  const contract = scene.layout.storyContract;
  const productAnchor = scene.layout.productAnchor;
  const framePlan = (scene.layout.storyboardBoard?.frames || []).map((frame) => (
    [
      frame.visual ? `visual ${frame.visual}` : "",
      frame.camera ? `camera ${frame.camera}` : "",
      frame.motion ? `motion ${frame.motion}` : "",
    ].filter(Boolean).join("; ")
  )).join(" / next silent still: ");
  return [
    "Create ONE vertical 9:16 image containing six raw, unlabeled film stills for visual QA before video generation.",
    "Arrange the six stills in a clean 2-column by 3-row contact sheet with thin white gutters only.",
    "Each still must fill its cell edge-to-edge; no blank white rows, title bands, empty margins, or presentation whitespace.",
    "Absolute text ban: the image must contain zero words and zero letters. Do not draw headings, titles, labels, frame numbers, UI, arrows, icons, shirt text, product text, fake writing, glyphs, or alphanumeric marks.",
    "This is not final footage and not a single hero image.",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "Reference style: recurring casual silent 3D demonstrator/scale figure, bright blue technical grid product-demo studio, product handling, transparent torso/body-route or cell-wall footage for supplement stories, obstacle wall or pile-up, capsules, pipes, particles, scale comparisons, mechanism machine/cutaway, and one impossible 3D mechanism insert."
      : "Reference style: recurring stylized demo character/body proxy in a bright blue/cyan technical grid product-science world.",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "Character consistency lock: same demonstrator face, cap/goggles if used, shirt color, body scale, product silhouette, and product relationship across all six stills."
      : "Character consistency lock: same demo character shape, product silhouette, blue-grid world, and product relationship across all six stills.",
    "Each still needs the prompt skeleton: locked style, recurring demonstrator/product, scene action, camera/framing, lighting, color/mood, and consistency.",
    productAnchor
      ? `Selected product anchor: ${productAnchor.title}. Use the provided product reference to preserve product category, silhouette, dominant colors, scale, and packaging/product form across the storyboard. Do not replace it with merch, a hat, apparel, logo-only object, icon, generic prop, or unrelated bottle.`
      : "No specific product image was selected; use blank category-level product forms only and do not invent branded packaging.",
    "Each still must feel like a planned production frame from the same ad, not a decorative prompt sample: same world, one concrete action, one visible state change, clear camera, clear lighting.",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "Maxfusion visual rule: every script line becomes a visible physical action first. Show product handling, body route, obstacle, particle movement, mechanism change, or payoff; never create a topic poster or static product illustration under narration."
      : "Every script line becomes a visible physical action first.",
    `Shared visual world: ${contract.visualWorld}. Lighting: ${contract.lighting}. Camera: ${contract.cameraStyle}. Recurring objects: ${contract.recurringObjects.join(", ")}.`,
    scene.layout.storyboardBoard?.imagePrompt || "",
    `Internal reading-order still plan, never visible as text: ${framePlan}.`,
    "The written plan and descriptions are internal instructions only; do not draw any of these words, headings, or annotations.",
    "No huge blank tables, empty counters, empty foreground blocks, sterile white workbenches, or dead product-card whitespace; every still must feel cropped like active video footage.",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "Match the reference energy: dense tactile prop worlds, particle floods, obstacle texture, industrial machine-room cutaways, hard visual resets, and active physical teaching frames instead of calm product renders."
      : "",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "Use the same recurring casual silent 3D demonstrator/scale figure across the contact sheet; full body or torso is preferred in the first and final still, hands/product detail can appear in middle stills. No blue medical gloves, latex gloves, nitrile gloves, PPE, lab coats, doctors, scientists, mannequins, or training anatomy models. Final still must include a blank supplement bottle/jar/package silhouette plus capsule."
      : "",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "Across the six stills, include distinct teaching modules instead of repeating one blue tabletop: human/product use, hidden body-route or product path, obstacle wall/pile-up, mechanism machine or pipe, moving particles/components, and final product payoff."
      : "",
    "Frame 6 must physically resolve to the selected product/category as a blank-label product hero ready for Wiggly CTA overlays; never end on only a mechanism, hat, logo, icon, or abstract science object.",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "For supplement/digestive stories, make the obstacle still crowded and kinetic with particles piling up or scattering, and make the mechanism still a true machine-room wow with pipes, fans, valves, protected capsule core, and active flow."
      : "",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "Supplement/digestive hidden-obstacle stills should be clean graphic product-science footage: blue route, tidy pink cell-wall/obstacle surface, visible particles, and crisp lighting. Do not render wet fleshy intestine tunnels, gore, horror anatomy, detached organ close-ups, or gross medical macro shots."
      : "",
    "No readable text, captions, subtitles, logos, labels, numbers, UI copy, arrows, checkmarks, X marks, fake writing, or product-label typography anywhere.",
    "If reference images contain text or logos, ignore those reference artifacts and preserve only product shape, color, material, scale, and composition cues.",
    "Captions, CTA, product logo, and proof text are renderer overlays later.",
  ].join(" ");
};

const getRequiredAnchorFrameIndexes = (
  scene: ThreeDBreakdownAdScene,
): ThreeDBreakdownStoryboardFrameIndex[] => {
  const indexes = (scene.layout.clipPlans || [])
    .map((clipPlan) => clipPlan.frameIndexes[0])
    .filter((frameIndex): frameIndex is ThreeDBreakdownStoryboardFrameIndex => Boolean(frameIndex));
  return Array.from(new Set(indexes));
};

export const generateThreeDImages: ReturnType<typeof action> = action({
  args: {
    sceneId: v.id("adScenes"),
    scene: v.any(),
    mode: v.optional(v.union(v.literal("storyboard"), v.literal("anchors"), v.literal("all"))),
  },
  handler: async (ctx, { sceneId, scene, mode }) => {
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiToken) throw new Error("Replicate image generation is not configured for 3D Breakdown.");
    let nextScene = assertThreeDBreakdownScene(scene as AdScene);
    const imageInput = getThreeDImageInput(nextScene);

    const storyboardBoard = nextScene.layout.storyboardBoard;
    if (!storyboardBoard?.imagePrompt) throw new Error("3D Breakdown storyboard board image prompt is missing.");
    if (!Array.isArray(storyboardBoard.frames) || storyboardBoard.frames.length !== 6) {
      throw new Error("3D Breakdown storyboard board must define 6 frames before image generation.");
    }
    const baseFrames = storyboardBoard.frames;
    console.log("[wiggly:3d-breakdown] production-frames:start", {
      imageInputCount: imageInput.length,
      hasFrames: baseFrames.length,
    });
    const isPresenterStyle = nextScene.layout.storyContract.visualStyle === "presenter-teardown-vsl";
    const requiredAnchorFrameIndexes = isPresenterStyle
      ? getRequiredAnchorFrameIndexes(nextScene)
      : baseFrames.map((frame) => frame.frameIndex);
    const imageMode = mode || (isPresenterStyle ? "storyboard" : "all");
    const generateBoard = isPresenterStyle && (imageMode === "storyboard" || imageMode === "all");
    const generateAnchors = !isPresenterStyle || imageMode === "anchors" || imageMode === "all";
    if (isPresenterStyle && imageMode === "anchors" && storyboardBoard.image?.status !== "ready") {
      throw new Error("Generate the 3D Breakdown storyboard board before production anchors.");
    }
    const anchorFramesToGenerate = baseFrames.filter((frame) => (
      requiredAnchorFrameIndexes.includes(frame.frameIndex) && frame.image?.status !== "ready"
    ));
    nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
      ...board,
      image: generateBoard ? { status: "generating" as const } : board.image,
      frames: baseFrames.map((frame) => ({
        ...frame,
        image: generateAnchors && anchorFramesToGenerate.some((anchorFrame) => anchorFrame.frameIndex === frame.frameIndex)
          ? { status: "generating" as const }
          : frame.image?.status === "ready" ? frame.image : { status: "idle" as const },
      })),
    }));
    if (nextScene.layout.clipPlans?.length) {
      nextScene = withUpdatedThreeDClipPlans(nextScene, (plans) => plans.map((plan) => ({
        ...plan,
        video: { status: "idle" as const },
      })) as NonNullable<ThreeDBreakdownAdScene["layout"]["clipPlans"]>);
    }
    await patchThreeDScene(ctx, sceneId, nextScene);
    let activeFrameIndex: ThreeDBreakdownStoryboardFrameIndex | null = null;
    let storedBoardImage: NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>["image"] | undefined;
    const storedFrames: NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>["frames"] = [];
    try {
      if (generateBoard) {
        const boardPrompt = buildThreeDStoryboardBoardPrompt(nextScene);
        console.log("[wiggly:3d-breakdown] storyboard-board:start", {
          promptLength: boardPrompt.length,
        });
        const boardImage = await generateReplicateNanoBanana2Image({
          replicateApiToken,
          prompt: boardPrompt,
          imageInput,
          aspectRatio: "9:16",
        });
        storedBoardImage = { status: "ready", ...(await storeThreeDBytes(ctx, boardImage.bytes, boardImage.mimeType)) };
        nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
          ...board,
          image: storedBoardImage,
          frames: board.frames?.map((frame) => (
            requiredAnchorFrameIndexes.includes(frame.frameIndex)
              ? frame
              : { ...frame, image: { status: "idle" as const } }
          )),
        }));
        await patchThreeDScene(ctx, sceneId, nextScene);
        console.log("[wiggly:3d-breakdown] storyboard-board:ready", {
          mimeType: boardImage.mimeType,
          anchorFrameIndexes: requiredAnchorFrameIndexes,
        });
      }

      if (!generateAnchors) {
        nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
          ...board,
          image: storedBoardImage || board.image || { status: "ready" },
          frames: baseFrames.map((frame) => ({
            ...frame,
            image: frame.image?.status === "ready" ? frame.image : { status: "idle" as const },
          })),
        }));
        console.log("[wiggly:3d-breakdown] storyboard-gate:ready", {
          mode: imageMode,
          generatedAnchors: false,
        });
        await patchThreeDScene(ctx, sceneId, nextScene);
        return { scene: nextScene };
      }

      for (const frame of anchorFramesToGenerate) {
        activeFrameIndex = frame.frameIndex;
        const prompt = buildThreeDProductionFramePrompt(nextScene, frame.frameIndex);
        const anchorImageInput = getThreeDAnchorImageInput(nextScene, imageInput);
        console.log("[wiggly:3d-breakdown] production-frame:start", {
          frameIndex: frame.frameIndex,
          imageInputCount: anchorImageInput.length,
          usesStoryboardReference: anchorImageInput.some((url) => url === nextScene.layout.storyboardBoard?.image?.url),
          promptLength: prompt.length,
        });
        const image = await generateReplicateNanoBanana2Image({
          replicateApiToken,
          prompt,
          imageInput: anchorImageInput,
          aspectRatio: "9:16",
        });
        const frameStored = await storeThreeDBytes(ctx, image.bytes, image.mimeType);
        console.log("[wiggly:3d-breakdown] production-frame:ready", {
          frameIndex: frame.frameIndex,
          mimeType: image.mimeType,
        });
        storedFrames.push({
          ...frame,
          image: { status: "ready" as const, ...frameStored },
        });
        activeFrameIndex = null;
      }
      nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
        ...board,
        image: storedBoardImage || board.image || { status: "ready" },
        frames: baseFrames.map((frame) => {
          const storedFrame = storedFrames.find((stored) => stored.frameIndex === frame.frameIndex);
          if (storedFrame) return storedFrame;
          if (frame.image?.status === "ready") return frame;
          return {
            ...frame,
            image: { status: "idle" as const },
          };
        }),
      }));
      console.log("[wiggly:3d-breakdown] production-frames:ready", {
        frameCount: storedFrames.length,
      });
    } catch (error) {
      console.warn("[wiggly:3d-breakdown] production-frames:failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
        ...board,
        image: storedBoardImage || (
          board.image?.status === "ready"
            ? board.image
            : {
              status: "failed",
              error: error instanceof Error ? error.message : "3D production frame generation failed.",
            }
        ),
        frames: baseFrames.map((frame) => {
          const storedFrame = storedFrames.find((stored) => stored.frameIndex === frame.frameIndex);
          if (storedFrame) return storedFrame;
          if (frame.image?.status === "ready") return frame;
          if (activeFrameIndex === frame.frameIndex) {
            return {
              ...frame,
              image: {
                status: "failed" as const,
                error: error instanceof Error ? error.message : "3D production frame generation failed.",
              },
            };
          }
          return {
            ...frame,
            image: { status: "idle" as const },
          };
        }),
      }));
    }
    await patchThreeDScene(ctx, sceneId, nextScene);

    return { scene: nextScene };
  },
});

export const generateThreeDClip: ReturnType<typeof action> = action({
  args: {
    sceneId: v.id("adScenes"),
    scene: v.any(),
    clipIndex: v.number(),
  },
  handler: async (ctx, { sceneId, scene, clipIndex }) => {
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiToken) throw new Error("Replicate video generation is not configured for 3D Breakdown.");
    if (!Number.isInteger(clipIndex) || clipIndex < 1 || clipIndex > 6) throw new Error("3D Breakdown clip index must be 1-6.");
    const typedClipIndex = clipIndex as ThreeDBreakdownClipIndex;

    let nextScene = assertThreeDBreakdownScene(scene as AdScene);
    const storyboardFrames = nextScene.layout.storyboardBoard?.frames || [];
    const clipPlans = nextScene.layout.clipPlans;
    const clipPlan = clipPlans?.find((clip) => clip.clipIndex === typedClipIndex);
    if (!clipPlans || !clipPlan) throw new Error("3D Breakdown clip plan is missing.");
    if (typedClipIndex > 1) {
      const previousClipIndex = (typedClipIndex - 1) as ThreeDBreakdownClipIndex;
      const previousClipReady = clipPlans.some((clip) => clip.clipIndex === previousClipIndex && clip.video?.status === "ready");
      if (!previousClipReady) throw new Error(`Generate 3D Breakdown clip ${previousClipIndex} before clip ${typedClipIndex}.`);
    }
    const startFrame = storyboardFrames.find((frame) => frame.frameIndex === clipPlan.frameIndexes[0]);
    if (!startFrame?.image?.url) throw new Error(`3D Breakdown clip ${typedClipIndex} needs storyboard frame ${clipPlan.frameIndexes[0]} first.`);

    nextScene = withUpdatedThreeDClipPlans(nextScene, (plans) => plans.map((plan) => (
      plan.clipIndex === typedClipIndex
        ? { ...plan, video: { status: "generating" as const } }
        : plan
    )) as NonNullable<ThreeDBreakdownAdScene["layout"]["clipPlans"]>);
    await patchThreeDScene(ctx, sceneId, nextScene);

    try {
      const seedancePrompt = buildThreeDSeedancePrompt(nextScene, clipPlan);
      console.log("[wiggly:3d-breakdown] seedance:clip:start", {
        clipIndex: typedClipIndex,
        durationSeconds: clipPlan.durationSeconds,
        frameIndexes: clipPlan.frameIndexes,
        promptLength: clipPlan.prompt.length,
        seedancePromptLength: seedancePrompt.length,
      });
      const result = await generateReplicateSeedanceVideo({
        replicateApiToken,
        imageUrl: startFrame.image.url,
        prompt: seedancePrompt,
        durationSeconds: clipPlan.durationSeconds,
      });
      const stored = await storeThreeDBytes(ctx, result.bytes, result.mimeType);
      nextScene = withUpdatedThreeDClipPlans(nextScene, (plans) => plans.map((plan) => (
        plan.clipIndex === typedClipIndex
          ? { ...plan, video: { status: "ready" as const, ...stored } }
          : plan
      )) as NonNullable<ThreeDBreakdownAdScene["layout"]["clipPlans"]>);
      console.log("[wiggly:3d-breakdown] seedance:clip:ready", {
        clipIndex: typedClipIndex,
        mimeType: result.mimeType,
        hasUrl: Boolean(stored.url),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "3D Breakdown Seedance clip generation failed.";
      console.warn("[wiggly:3d-breakdown] seedance:clip:failed", { clipIndex: typedClipIndex, message });
      nextScene = withUpdatedThreeDClipPlans(nextScene, (plans) => plans.map((plan) => (
        plan.clipIndex === typedClipIndex
          ? { ...plan, video: { status: "failed" as const, error: message } }
          : plan
      )) as NonNullable<ThreeDBreakdownAdScene["layout"]["clipPlans"]>);
    }

    await patchThreeDScene(ctx, sceneId, nextScene);
    return {
      scene: nextScene,
      clip: nextScene.layout.clipPlans?.find((plan) => plan.clipIndex === typedClipIndex) as ThreeDBreakdownClipPlan | undefined,
    };
  },
});
