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

const THREE_D_BREAKDOWN_STYLE_REFERENCE_PATH = "/three-d-breakdown/references/ecommerce-teardown-style-reference-v1.jpg";
const THREE_D_SEEDANCE_MAX_PROMPT_CHARS = 3900;
const getThreeDSeedancePromptSuffix = (scene: ThreeDBreakdownAdScene) => {
  const isPresenterStyle = scene.layout.storyContract.visualStyle === "presenter-teardown-vsl";
  return [
    "Use the provided storyboard frame as the first frame reference.",
    isPresenterStyle
      ? "Preserve the unseen-narrator ecommerce teardown style: one recurring silent 3D demonstrator/scale figure in a bright blue clinical grid lab, product handling, props, pipes, particles, scale comparisons, and short 3D explanatory inserts."
      : "Preserve the bright blue/cyan clinical-grid procedural 3D explainer world, product identity, recurring demo character/body proxy, and composition.",
    isPresenterStyle
      ? "Keep lighting bright, clinical-blue, creator-ad readable, and product-focused; avoid toy-character anatomy, faceless biology montages, random gut tunnels, dark cinematic rooms, black voids, empty blue grid, and logo-only end cards."
      : "Keep lighting bright, readable, and flat like a product-science classroom; avoid dark cinematic rooms, black voids, moody spotlights, smoke-only sci-fi labs, and luxury product-card lighting.",
    "Capsules stay capsules, bottles stay bottles, packaging stays packaging; do not morph products into cups, buckets, bowls, or unrelated lab vessels.",
    "Use direct cuts, pushes, reveals, and mechanical transformations; no blank color wipes, fog-only transitions, empty gradients, or slow lingering setup.",
    isPresenterStyle
      ? "Make the motion feel embodied through the same silent demonstrator, hands, torso, over-shoulder angle, or product-use demonstration returning throughout the clip."
      : "Make the motion feel embodied: keep a stylized human demo character, body proxy, or scale figure returning throughout the clip as the continuity spine, with frame 1 and final-payoff moments showing the character body or torso beside the product.",
    "Change visual state about every second; use body/pathway travel, macro cutaways, mechanism machines, particle motion, or product payoff resets instead of holding a static capsule render.",
    isPresenterStyle
      ? "Every frame must contain visible silent demonstrator/hands/torso, product, product-use setup, mechanism insert, particles, pipes, scale props, or physical obstacle; never cut to a plain dark screen, empty blue grid, empty gradient, or caption-only moment."
      : "Every frame must contain a visible demo character/body proxy, product, mechanism, character hand, particles, or physical obstacle; never cut to a plain dark screen, empty blue grid, empty gradient, or caption-only moment.",
    "If you need a transition, use an object wipe, camera push, particle burst, component reveal, or foreground product pass so the frame remains visually active.",
    "No readable text, captions, labels, numbers, logos, UI copy, subtitles, icons, arrows, checkmarks, or X marks.",
    "If a reference image contains captions, shirt text, labels, or logos, treat them as style artifacts only and do not reproduce them.",
    "Show proof concepts as blank physical tokens, unmarked objects, light, steam, crumbs, ribbon, or motion only.",
  ].join(" ");
};

const getThreeDImageStyleRules = (scene: ThreeDBreakdownAdScene) => {
  const isPresenterStyle = scene.layout.storyContract.visualStyle === "presenter-teardown-vsl";
  return [
    isPresenterStyle
      ? "Unseen-narrator ecommerce product teardown: bright blue clinical grid lab, one recurring silent 3D demonstrator/scale figure, product handling, props, capsules, pipes, particles, scale comparisons, bright creator-ad lighting, and short 3D mechanism inserts."
      : "Bright blue/cyan blueprint-grid stage, flat readable lab lighting, close product-science camera, strong subject/background separation.",
    isPresenterStyle
      ? "Use the same silent demonstrator/product relationship as the continuity anchor; intro and final frames show demonstrator/torso/hands with the product in the blue grid lab, while mechanism frames may use a 3D overlay, macro cutaway, x-ray, or product interior insert."
      : "Use the recurring stylized demo character/body proxy as the continuity anchor; intro and final frames show a body or torso, while mechanism frames may use the same hand, pointer, probe, scale figure, or body cutaway.",
    isPresenterStyle
      ? "Avoid toy-character anatomy, cartoon body-wall characters, faceless anatomy montages, random gut tunnels, pure biology-documentary visuals, dark voids, luxury product-card stills, empty negative space, posters, UI cards, and typography-led graphics."
      : "Avoid faceless biology montages, dark rooms, black voids, smoky sci-fi labs, luxury product-card stills, empty negative space, posters, UI cards, and typography-led graphics.",
    "Preserve product shape, color, material, packaging cues, and category. Capsules stay capsule-shaped, bottles stay bottles, packaging stays packaging; all labels remain blank and unreadable.",
    "If a bottle, jar, pouch, box, card, or package faces camera, make the front surface completely blank matte material or rotate the label side away from camera. Never render brand names, logos, label panels, ingredient text, badge text, tiny copy, pseudo-letters, or fake product labels.",
    "No readable text, logos, letters, numbers, captions, UI copy, arrows, checkmarks, X marks, or label-like rectangles. Show proof as blank physical tokens, particles, light, steam, crumbs, ribbon, or motion.",
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
      1: `False assumption / common use. Narration: ${consequence}. Show a silent recurring 3D demonstrator/scale figure in a bright blue clinical grid lab handling the product before the hidden problem is revealed. Use ${shot1.explainerDevice}; physical action: the ordinary use is demonstrated and the risk is implied.`,
      2: `Hidden problem. Narration: ${context}. In the same blue grid lab, the silent demonstrator points to a product path, pipe, capsule route, particle flow, or prop comparison where the hidden obstacle becomes physically visible. Continue ${shot1.sceneDescription}.`,
      3: `Mechanism setup. Narration: ${mechanism}. Show demonstrator hands or torso silently demonstrating the exact product detail that leads into the 3D mechanism reveal. Use ${shot2.explainerDevice}; physical action: ${shot2.physicalAction}.`,
	      4: `Peak 3D teardown insert. Narration: ${mechanism} ${revelation}. Use ${contract.wowMomentType}: ${contract.wowMoment}. Viewer learns: ${contract.viewerLearns}. This should feel like an impossible product cutaway, x-ray, pipe demo, floating component split, or particle mechanism inside the same blue lab.`,
      5: `Evidence payoff. Narration: ${revelation}. Return from the 3D insert to the silent-demonstrator/product demo with selected evidence represented as blank physical tokens, product behavior, component movement, or product-use result.`,
      6: `Final human/product payoff. Narration: ${punchline}. Show the silent demonstrator, torso, hands, or over-shoulder product demo clearly with the product in a clean final blue-grid ecommerce frame, with blank proof/component tokens for renderer captions later.`,
	    };
	    return withFramePlan(presenterFrameDirections[frameIndex]);
	  }
  const frameDirections: Record<ThreeDBreakdownStoryboardFrameIndex, string> = {
    1: `False assumption / common use. Narration: ${consequence}. Show a full-body or torso recurring human demo character on the blue clinical grid stage using or scaling the intact product before anything fails. The character is the body/customer/scale proxy and should be prominent, roughly one-third to one-half of frame height, with the product visible beside or in the character's hand; do not use a giant anonymous hand macro. Keep it clean and human-scale; no explosion, damage, debris, or acid yet. Use ${shot1.explainerDevice}; physical action: the ordinary use is shown and the risk is implied.`,
    2: `Hidden obstacle. Narration: ${context}. Move into the internal journey: transparent torso, gut tunnel, intestinal wall, acid bath, blockage, pile-up, compression, or tension. This is where an ordinary unprotected version visibly struggles while the main product identity stays clear. Continue ${shot1.sceneDescription}.`,
    3: `Mechanism setup. Narration: ${mechanism}. Reintroduce the intact product with the recurring demo character, body proxy, or same character hand/probe pointing to the mechanism before the reveal. Use ${shot2.explainerDevice}; physical action: ${shot2.physicalAction}.`,
    4: `Peak wow reveal. Narration: ${mechanism} ${revelation}. This is the strongest impossible-to-film frame using ${contract.wowMomentType}: ${contract.wowMoment}. Viewer learns: ${contract.viewerLearns}.`,
    5: `Evidence payoff. Narration: ${revelation}. Connect the selected evidence to the payoff inside the pathway or mechanism environment, with the engineered product central and any ordinary failed version only as a small unmarked remnant.`,
    6: `Final transformed state. Narration: ${punchline}. Return to the blue clinical grid stage with the full-body or torso human demo character clearly visible beside a clean final product-science payoff composition, recurring objects, and blank proof/component tokens for renderer captions later. Do not make the character tiny or hide the character behind a giant hand.`,
  };
  return withFramePlan(frameDirections[frameIndex]);
};

const getThreeDGuideInstructionForStyle = (
  visualStyle: ThreeDBreakdownAdScene["layout"]["storyContract"]["visualStyle"],
  frameIndex: ThreeDBreakdownStoryboardFrameIndex,
) => {
	  if (visualStyle === "presenter-teardown-vsl") {
	    if (frameIndex === 1 || frameIndex === 3 || frameIndex === 6) {
      return "Show the same silent generic 3D demonstrator, torso, hands, or over-shoulder product demo clearly enough to anchor the product demo. Keep it in the blue clinical grid lab, not toy-like and not lifestyle. Do not clone a known person from a reference, and keep all clothing/product labels unreadable.";
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
  return [
    "Create ONE vertical 9:16 production keyframe for a high-retention procedural 3D explainer ad.",
    "This is a single Seedance reference image, not a storyboard board.",
    "Do not create a grid, contact sheet, comic strip, split screen, collage, panel border, gutter, horizontal divider, caption bar, or multi-frame layout.",
    "Use one central subject/action filling most of the vertical frame.",
    `Shared visual world: ${contract.visualWorld}. Lighting: ${contract.lighting}. Camera: ${contract.cameraStyle}. Recurring objects: ${recurringObjects}.`,
    getThreeDFrameNarrative(scene, frameIndex),
	    getThreeDGuideInstructionForStyle(contract.visualStyle, frameIndex),
	    getThreeDImageStyleRules(scene),
	    contract.visualStyle === "presenter-teardown-vsl"
      ? "The silent generic demonstrator/scale figure is the continuity spine; product meaning comes from handling, use, props, pipes, particle paths, quick teardown inserts, and visible cause/effect."
	      : "The demo character is the body/customer/scale proxy, not a presenter; product meaning comes from cause/effect, mechanism reveals, and 3D transformations.",
	    contract.visualStyle === "presenter-teardown-vsl"
      ? "For supplement/digestive products, show the capsule/product journey as a silent-demonstrator blue-grid lab demo: clear pipes, transparent route, acid bath prop, particle flow, capsule pathway, and cutaway mechanism. Avoid detached gut tunnels or faceless anatomy montages."
	      : "For supplement/digestive products, include internal-body journey imagery when relevant: transparent torso, gut tunnel, intestinal wall, acid bath, cell wall, particles traveling, or protected capsule passing through a pathway.",
	    contract.visualStyle === "presenter-teardown-vsl"
      ? "Do not keep every frame on the same empty blue tabletop. The blue clinical palette should unify silent-demonstrator demo frames, pipe/pathway props, mechanism inserts, particle movement, and final product stage shots."
	      : "Do not keep every frame on the same empty blue tabletop. The blue/cyan instructional palette should unify body cutaways, process tunnels, mechanism machines, and final stage shots.",
    "If a style reference contains captions, shirt text, labels, or logos, ignore those text details and preserve only the 3D texture, blue stage, scale, guide energy, and macro mechanism language.",
    "If product reference images include labels or logos, use them only to infer product category, color, silhouette, material, and packaging shape. Do not copy any text, logo, label layout, badge, icon, dosage copy, or pseudo-writing from the reference image.",
    "Brand identity, captions, CTA, and proof text are added by Wiggly renderer overlays later; the generated frame must contain no readable or fake text anywhere.",
    "Do not make quiet product-card stills. Do not leave empty negative space for captions. The physical mechanism must carry the frame.",
    "For capsules or supplement products, preserve exact capsule identity: capsule stays capsule-shaped, nested capsules stay nested, contents appear as contained beads/particles or controlled cutaway release, never as a generic jar, cylinder, cup, bucket, bowl, tube, or poster object.",
    "Use warm amber/gold ingredient particles or clean glowing payload beads for active contents. Avoid black ash, dirty dust, or explosion debris unless it is a tiny obstacle remnant in frame 2.",
  ].join(" ");
};

const buildThreeDStoryboardBoardPrompt = (scene: ThreeDBreakdownAdScene) => {
  const contract = scene.layout.storyContract;
  const framePlan = (scene.layout.storyboardBoard?.frames || []).map((frame) => (
    `Panel ${frame.frameIndex} ${frame.label}: ${[
      frame.visual ? `visual ${frame.visual}` : "",
      frame.camera ? `camera ${frame.camera}` : "",
      frame.motion ? `motion ${frame.motion}` : "",
    ].filter(Boolean).join("; ")}`
  )).join(" | ");
  return [
    "Create ONE vertical 9:16 six-panel storyboard board for visual QA before video generation.",
    "Use six stacked cinematic storyboard panels in one image, clearly separated by thin white gutters.",
    "This is a storyboard/contact board, not final footage and not a single hero image.",
    contract.visualStyle === "presenter-teardown-vsl"
      ? "Reference style: recurring silent generic 3D demonstrator/scale figure, bright blue clinical grid lab world, product handling, props, capsules, pipes, particles, scale comparisons, and one impossible 3D mechanism insert."
      : "Reference style: recurring stylized demo character/body proxy in a bright blue/cyan clinical grid product-science world.",
    `Shared visual world: ${contract.visualWorld}. Lighting: ${contract.lighting}. Camera: ${contract.cameraStyle}. Recurring objects: ${contract.recurringObjects.join(", ")}.`,
    scene.layout.storyboardBoard?.imagePrompt || "",
    framePlan,
    "No readable text, captions, subtitles, logos, labels, numbers, UI copy, arrows, checkmarks, X marks, fake writing, or product-label typography anywhere.",
    "If reference images contain text or logos, ignore text details and preserve only product shape, color, material, scale, and composition cues.",
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
  },
  handler: async (ctx, { sceneId, scene }) => {
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
    nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
      ...board,
      image: { status: isPresenterStyle ? "generating" : "idle" },
      frames: baseFrames.map((frame) => ({
        ...frame,
        image: requiredAnchorFrameIndexes.includes(frame.frameIndex)
          ? { status: "generating" as const }
          : { status: "idle" as const },
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
      if (isPresenterStyle) {
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

      for (const frame of baseFrames.filter((frame) => requiredAnchorFrameIndexes.includes(frame.frameIndex))) {
        activeFrameIndex = frame.frameIndex;
        const prompt = buildThreeDProductionFramePrompt(nextScene, frame.frameIndex);
        console.log("[wiggly:3d-breakdown] production-frame:start", {
          frameIndex: frame.frameIndex,
          promptLength: prompt.length,
        });
        const image = await generateReplicateNanoBanana2Image({
          replicateApiToken,
          prompt,
          imageInput,
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
        image: storedBoardImage || { status: "ready" },
        frames: baseFrames.map((frame) => storedFrames.find((stored) => stored.frameIndex === frame.frameIndex) || {
          ...frame,
          image: requiredAnchorFrameIndexes.includes(frame.frameIndex)
            ? { status: "idle" as const }
            : { status: "idle" as const },
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
        image: {
          status: "failed",
          error: error instanceof Error ? error.message : "3D production frame generation failed.",
        },
        ...(storedBoardImage ? { image: storedBoardImage } : {}),
        frames: baseFrames.map((frame) => {
          const storedFrame = storedFrames.find((stored) => stored.frameIndex === frame.frameIndex);
          if (storedFrame) return storedFrame;
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
    if (clipIndex !== 1 && clipIndex !== 2 && clipIndex !== 3 && clipIndex !== 4) throw new Error("3D Breakdown clip index must be 1, 2, 3, or 4.");
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
