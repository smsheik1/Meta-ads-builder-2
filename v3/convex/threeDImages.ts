"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { generateReplicateNanoBanana2Image, generateReplicateSeedanceVideo } from "../features/formats/jingle/storyboard";
import { createThreeDClipPlans } from "../features/formats/three-d-breakdown/storyboardContracts";
import { buildThreeDProductionFramePrompt, buildThreeDSeedancePrompt, buildThreeDStoryboardBoardPrompt } from "../features/formats/three-d-breakdown/mediaPrompts";
import { cropThreeDStoryboardPanel } from "../features/formats/three-d-breakdown/storyboardImageCrop";
import type {
  AdScene,
  ThreeDBreakdownAdScene,
  ThreeDBreakdownClipIndex,
  ThreeDBreakdownClipPlan,
  ThreeDBreakdownStoryboardFrameIndex,
} from "../features/scene/types";

const THREE_D_BREAKDOWN_STYLE_REFERENCE_PATH = "/three-d-breakdown/references/ecommerce-teardown-style-reference-clean-v7.jpg";
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

const getThreeDAnchorImageInput = (scene: ThreeDBreakdownAdScene) => {
  const storyboardImageUrl = scene.layout.storyboardBoard?.image?.status === "ready"
    ? scene.layout.storyboardBoard.image.url
    : "";
  return Array.from(new Set([
    storyboardImageUrl,
    scene.layout.productAnchor?.imageUrl || "",
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

const getOrCreateThreeDEndFrameImage = async (
  ctx: Parameters<typeof storeThreeDBytes>[0],
  scene: ThreeDBreakdownAdScene,
  clipPlan: ThreeDBreakdownClipPlan,
) => {
  if (clipPlan.endFrameImage?.status === "ready" && clipPlan.endFrameImage.url) {
    return clipPlan.endFrameImage;
  }
  const boardImage = scene.layout.storyboardBoard?.image;
  if (boardImage?.status !== "ready" || !boardImage.url) {
    throw new Error(`3D Breakdown clip ${clipPlan.clipIndex} needs the approved storyboard board for its end frame.`);
  }
  const endFrameIndex = clipPlan.frameIndexes.at(-1);
  if (!endFrameIndex) throw new Error(`3D Breakdown clip ${clipPlan.clipIndex} has no ending storyboard frame.`);

  const response = await fetch(boardImage.url);
  if (!response.ok) throw new Error(`3D Breakdown clip ${clipPlan.clipIndex} could not download its storyboard end frame.`);
  const contentType = response.headers.get("content-type") || boardImage.mimeType || "";
  if (!/jpe?g/i.test(contentType)) {
    throw new Error(`3D Breakdown storyboard end-frame crop requires JPEG input, received ${contentType || "unknown image type"}.`);
  }
  const cropped = cropThreeDStoryboardPanel(new Uint8Array(await response.arrayBuffer()), endFrameIndex);
  return {
    status: "ready" as const,
    ...(await storeThreeDBytes(ctx, cropped, "image/jpeg")),
  };
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
    mode: v.optional(v.union(v.literal("storyboard"), v.literal("anchors"), v.literal("regenerate-anchors"), v.literal("all"))),
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
    const regenerateAnchors = imageMode === "regenerate-anchors";
    const generateBoard = isPresenterStyle && (imageMode === "storyboard" || imageMode === "all");
    const generateAnchors = !isPresenterStyle || imageMode === "anchors" || regenerateAnchors || imageMode === "all";
    if (isPresenterStyle && generateAnchors && !generateBoard && storyboardBoard.image?.status !== "ready") {
      throw new Error("Generate the 3D Breakdown storyboard board before production anchors.");
    }
    const anchorFramesToGenerate = baseFrames.filter((frame) => (
      requiredAnchorFrameIndexes.includes(frame.frameIndex) && (regenerateAnchors || frame.image?.status !== "ready")
    ));
    nextScene = withUpdatedThreeDStoryboardBoard(nextScene, (board) => ({
      ...board,
      image: generateBoard ? { status: "generating" as const } : board.image,
      frames: baseFrames.map((frame) => ({
        ...frame,
        image: generateBoard && !generateAnchors
          ? { status: "idle" as const }
          : generateAnchors && anchorFramesToGenerate.some((anchorFrame) => anchorFrame.frameIndex === frame.frameIndex)
          ? { status: "generating" as const }
          : frame.image?.status === "ready" ? frame.image : { status: "idle" as const },
      })),
    }));
    if (nextScene.layout.clipPlans?.length) {
      nextScene = withUpdatedThreeDClipPlans(nextScene, (plans) => plans.map((plan) => ({
        ...plan,
        ...(generateBoard ? { endFrameImage: undefined } : {}),
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
            image: { status: "idle" as const },
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
        const anchorImageInput = getThreeDAnchorImageInput(nextScene);
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
    const existingClipPlans = nextScene.layout.clipPlans || [];
    const refreshedClipPlans = createThreeDClipPlans(nextScene.layout) || [];
    const clipPlans = refreshedClipPlans.map((plan) => ({
      ...plan,
      endFrameImage: existingClipPlans.find((existing) => existing.clipIndex === plan.clipIndex)?.endFrameImage || plan.endFrameImage,
      video: existingClipPlans.find((existing) => existing.clipIndex === plan.clipIndex)?.video || plan.video,
    })) as NonNullable<ThreeDBreakdownAdScene["layout"]["clipPlans"]>;
    nextScene = {
      ...nextScene,
      layout: {
        ...nextScene.layout,
        clipPlans,
      },
    };
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
      const endFrameImage = await getOrCreateThreeDEndFrameImage(ctx, nextScene, clipPlan);
      nextScene = withUpdatedThreeDClipPlans(nextScene, (plans) => plans.map((plan) => (
        plan.clipIndex === typedClipIndex
          ? { ...plan, endFrameImage }
          : plan
      )) as NonNullable<ThreeDBreakdownAdScene["layout"]["clipPlans"]>);
      await patchThreeDScene(ctx, sceneId, nextScene);
      console.log("[wiggly:3d-breakdown] seedance:clip:start", {
        clipIndex: typedClipIndex,
        durationSeconds: clipPlan.durationSeconds,
        frameIndexes: clipPlan.frameIndexes,
        promptLength: clipPlan.prompt.length,
        seedancePromptLength: seedancePrompt.length,
        hasLastFrameImage: true,
      });
      const result = await generateReplicateSeedanceVideo({
        replicateApiToken,
        imageUrl: startFrame.image.url,
        lastFrameImageUrl: endFrameImage.url,
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
