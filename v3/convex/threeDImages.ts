"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { generateReplicateNanoBanana2Image } from "../features/formats/jingle/storyboard";
import { generateReplicateSeedanceVideo } from "../features/formats/jingle/storyboard";
import { createThreeDStoryboardFrames } from "../features/formats/three-d-breakdown/storyboardContracts";
import type {
  AdScene,
  ThreeDBreakdownAdScene,
  ThreeDBreakdownClipIndex,
  ThreeDBreakdownClipPlan,
  ThreeDBreakdownStoryboardFrameIndex,
} from "../features/scene/types";

const THREE_D_BREAKDOWN_STYLE_REFERENCE_PATH = "/three-d-breakdown/references/ecommerce-teardown-style-reference-v1.jpg";
const THREE_D_SEEDANCE_MAX_PROMPT_CHARS = 3900;
const THREE_D_SEEDANCE_PROMPT_SUFFIX = [
  "Use the provided storyboard frame as the first frame reference.",
  "Preserve the bright blue/cyan clinical-grid procedural 3D explainer world, product identity, recurring demo character/body proxy, and composition.",
  "Keep lighting bright, readable, and flat like a product-science classroom; avoid dark cinematic rooms, black voids, moody spotlights, smoke-only sci-fi labs, and luxury product-card lighting.",
  "Capsules stay capsules, bottles stay bottles, packaging stays packaging; do not morph products into cups, buckets, bowls, or unrelated lab vessels.",
  "Use direct cuts, pushes, reveals, and mechanical transformations; no blank color wipes, fog-only transitions, empty gradients, or slow lingering setup.",
  "Make the motion feel embodied: keep a stylized human demo character, body proxy, or scale figure returning throughout the clip as the continuity spine, with frame 1 and final-payoff moments showing the character body or torso beside the product.",
  "Change visual state about every second; use body/pathway travel, macro cutaways, mechanism machines, particle motion, or product payoff resets instead of holding a static capsule render.",
  "Every frame must contain a visible demo character/body proxy, product, mechanism, character hand, particles, or physical obstacle; never cut to a plain dark screen, empty blue grid, empty gradient, or caption-only moment.",
  "If you need a transition, use an object wipe, camera push, particle burst, component reveal, or foreground product pass so the frame remains visually active.",
  "No readable text, captions, labels, numbers, logos, UI copy, subtitles, icons, arrows, checkmarks, or X marks.",
  "If a reference image contains captions, shirt text, labels, or logos, treat them as style artifacts only and do not reproduce them.",
  "Show proof concepts as blank physical tokens, unmarked objects, light, steam, crumbs, ribbon, or motion only.",
].join(" ");

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

const buildThreeDSeedancePrompt = (clipPlan: ThreeDBreakdownClipPlan) => {
  const fullPrompt = [clipPlan.prompt, THREE_D_SEEDANCE_PROMPT_SUFFIX].join(" ");
  if (fullPrompt.length <= THREE_D_SEEDANCE_MAX_PROMPT_CHARS) return fullPrompt;
  const availableClipChars = Math.max(800, THREE_D_SEEDANCE_MAX_PROMPT_CHARS - THREE_D_SEEDANCE_PROMPT_SUFFIX.length - 1);
  return [
    clipPlan.prompt.slice(0, availableClipChars).trim(),
    THREE_D_SEEDANCE_PROMPT_SUFFIX,
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
  const frameDirections: Record<ThreeDBreakdownStoryboardFrameIndex, string> = {
    1: `False assumption / common use. Narration: ${consequence}. Show a full-body or torso recurring human demo character on the blue clinical grid stage using or scaling the intact product before anything fails. The character is the body/customer/scale proxy and should be prominent, roughly one-third to one-half of frame height, with the product visible beside or in the character's hand; do not use a giant anonymous hand macro. Keep it clean and human-scale; no explosion, damage, debris, or acid yet. Use ${shot1.explainerDevice}; physical action: the ordinary use is shown and the risk is implied.`,
    2: `Hidden obstacle. Narration: ${context}. Move into the internal journey: transparent torso, gut tunnel, intestinal wall, acid bath, blockage, pile-up, compression, or tension. This is where an ordinary unprotected version visibly struggles while the main product identity stays clear. Continue ${shot1.sceneDescription}.`,
    3: `Mechanism setup. Narration: ${mechanism}. Reintroduce the intact product with the recurring demo character, body proxy, or same character hand/probe pointing to the mechanism before the reveal. Use ${shot2.explainerDevice}; physical action: ${shot2.physicalAction}.`,
    4: `Peak wow reveal. Narration: ${mechanism} ${revelation}. This is the strongest impossible-to-film frame using ${contract.wowMomentType}: ${contract.wowMoment}. Viewer learns: ${contract.viewerLearns}.`,
    5: `Evidence payoff. Narration: ${revelation}. Connect the selected evidence to the payoff inside the pathway or mechanism environment, with the engineered product central and any ordinary failed version only as a small unmarked remnant.`,
    6: `Final transformed state. Narration: ${punchline}. Return to the blue clinical grid stage with the full-body or torso human demo character clearly visible beside a clean final product-science payoff composition, recurring objects, and blank proof/component tokens for renderer captions later. Do not make the character tiny or hide the character behind a giant hand.`,
  };
  return frameDirections[frameIndex];
};

const getThreeDGuideInstruction = (frameIndex: ThreeDBreakdownStoryboardFrameIndex) => {
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
    getThreeDGuideInstruction(frameIndex),
    "Visual grammar: close camera, bright blue/cyan technical grid floor and wall, flat readable lab lighting, product-science demo, macro mechanism detail, strong subject/background separation.",
    "Reference target: fast ecommerce supplement teardown with a recurring stylized human demo character/body proxy, saturated blue clinical grid, crisp close macro product science, and a visible state change in every frame.",
    "The reference feel is embodied demonstration, not spokesperson presentation: intro and final frames need a visible toy-like character body/torso, while mechanism close-ups use the same character hand, pointer, probe, tiny scale figure, or body proxy.",
    "The demo character is the continuity anchor and body/customer/scale proxy, not decoration; it should make the teardown feel human and understandable across frames.",
    "Do not satisfy the character requirement with anonymous fingers only in the intro or final frame; show an actual stylized body/torso there.",
    "Intro/final human-scale frames should not be macro product pinches. Avoid giant disembodied hands, giant gloves, or product-only close-ups when the demo character should anchor the story.",
    "Do not create a faceless biology montage. Body/gut/cell-wall visuals should be framed as environments the recurring demo character enters, scales against, points into, or returns from.",
    "For supplement/digestive products, include internal-body journey imagery when relevant: transparent torso, gut tunnel, intestinal wall, acid bath, cell wall, particles traveling, or protected capsule passing through a pathway.",
    "Do not keep every frame on the same empty blue tabletop. The blue/cyan instructional palette should unify body cutaways, process tunnels, mechanism machines, and final stage shots.",
    "If a style reference contains captions, shirt text, labels, or logos, ignore those text details and preserve only the 3D texture, blue stage, scale, guide energy, and macro mechanism language.",
    "Do not use a dark green lab, moody spotlight cone, black void, smoky sci-fi room, luxury hero render, or shadow-heavy cinematic product-card look.",
    "Do not make quiet product-card stills. Do not leave empty negative space for captions. The physical mechanism must carry the frame.",
    "For capsules or supplement products, preserve exact capsule identity: capsule stays capsule-shaped, nested capsules stay nested, contents appear as contained beads/particles or controlled cutaway release, never as a generic jar, cylinder, cup, bucket, bowl, tube, or poster object.",
    "Do not generate posters, wall text, data panels, white paragraph blocks, UI cards, line charts, text boxes, or label-like rectangles. Use only blank geometric tokens and physical objects.",
    "Use warm amber/gold ingredient particles or clean glowing payload beads for active contents. Avoid black ash, dirty dust, or explosion debris unless it is a tiny obstacle remnant in frame 2.",
    "If product or brand references include labels or logos, preserve product shape, color, material, and packaging cues but make all labels blank and unreadable.",
    "No readable text, no brand wordmarks, no logos, no letters, no numbers, no UI copy, no captions, no subtitles, no arrows, no checkmarks, no X marks.",
    "Show proof or numeric ideas only as blank physical tokens, unmarked blocks, particles, light, or motion.",
  ].join(" ");
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
    if (storyboardBoard?.imagePrompt) {
      console.log("[wiggly:3d-breakdown] production-frames:start", {
        imageInputCount: imageInput.length,
        hasFrames: storyboardBoard.frames?.length || 0,
      });
      const fallbackFrames = createThreeDStoryboardFrames();
      const baseFrames = storyboardBoard.frames?.length === 6
        ? storyboardBoard.frames
        : fallbackFrames;
      nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
        ...board,
        image: { status: "generating" },
        frames: baseFrames.map((frame) => ({
          ...frame,
          image: { status: "generating" as const },
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
      const storedFrames: NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>["frames"] = [];
      try {
        for (const frame of baseFrames) {
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
          image: { status: "ready" },
          frames: storedFrames,
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
    }

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
      const seedancePrompt = buildThreeDSeedancePrompt(clipPlan);
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
