import assert from "node:assert/strict";
import { decode, encode } from "jpeg-js";
import {
  generateReplicateSeedanceVideo,
  ReplicatePredictionStillRunningError,
} from "../features/formats/jingle/storyboard";
import { THREE_D_BREAKDOWN_VIDEO_RESOLUTION } from "../features/formats/three-d-breakdown/mediaPrompts";
import { cropThreeDStoryboardPanel } from "../features/formats/three-d-breakdown/storyboardImageCrop";
import { prepareThreeDBrandReferenceImageInputs } from "../features/formats/three-d-breakdown/productReference";

assert.equal(THREE_D_BREAKDOWN_VIDEO_RESOLUTION, "480p");

const width = 576;
const height = 1024;
const pixels = new Uint8Array(width * height * 4);
const colors = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
  [255, 0, 255],
  [0, 255, 255],
] as const;

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const column = Math.min(1, Math.floor((x * 2) / width));
    const row = Math.min(2, Math.floor((y * 3) / height));
    const color = colors[row * 2 + column]!;
    const offset = (y * width + x) * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = 255;
  }
}

const boardJpeg = new Uint8Array(encode({ width, height, data: pixels }, 100).data);
const frameThree = decode(cropThreeDStoryboardPanel(boardJpeg, 3), { useTArray: true, formatAsRGBA: true });
assert.equal(frameThree.width, width);
assert.equal(frameThree.height, 1024);
const centerOffset = (Math.floor(frameThree.height / 2) * frameThree.width + Math.floor(frameThree.width / 2)) * 4;
assert.ok(frameThree.data[centerOffset + 2]! > 220, "Frame 3 crop should preserve its blue storyboard panel.");
assert.ok(frameThree.data[centerOffset]! < 35);
assert.ok(frameThree.data[centerOffset + 1]! < 35);

const extraRowWidth = 600;
const extraRowHeight = 1200;
const gutterSize = 4;
const columnWidth = (extraRowWidth - gutterSize) / 2;
const rowHeight = (extraRowHeight - (gutterSize * 3)) / 4;
const extraRowPixels = new Uint8Array(extraRowWidth * extraRowHeight * 4);
const extraRowColors = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
  [255, 0, 255],
  [0, 255, 255],
  [0, 0, 0],
  [0, 0, 0],
] as const;

for (let y = 0; y < extraRowHeight; y += 1) {
  for (let x = 0; x < extraRowWidth; x += 1) {
    const inVerticalGutter = x >= columnWidth && x < columnWidth + gutterSize;
    const rowWithGutters = Math.floor(y / (rowHeight + gutterSize));
    const rowStart = rowWithGutters * (rowHeight + gutterSize);
    const inHorizontalGutter = y >= rowStart + rowHeight && rowWithGutters < 3;
    const color = inVerticalGutter || inHorizontalGutter
      ? [255, 255, 255]
      : extraRowColors[(Math.min(3, rowWithGutters) * 2) + (x > columnWidth ? 1 : 0)]!;
    const offset = (y * extraRowWidth + x) * 4;
    extraRowPixels[offset] = color[0];
    extraRowPixels[offset + 1] = color[1];
    extraRowPixels[offset + 2] = color[2];
    extraRowPixels[offset + 3] = 255;
  }
}

const extraRowBoard = new Uint8Array(encode({
  width: extraRowWidth,
  height: extraRowHeight,
  data: extraRowPixels,
}, 100).data);
const frameSix = decode(cropThreeDStoryboardPanel(extraRowBoard, 6), { useTArray: true, formatAsRGBA: true });
const frameSixCenter = (Math.floor(frameSix.height / 2) * frameSix.width + Math.floor(frameSix.width / 2)) * 4;
assert.ok(frameSix.data[frameSixCenter + 1]! > 220, "Frame 6 should use the sixth panel, not a duplicated fourth row.");
assert.ok(frameSix.data[frameSixCenter + 2]! > 220);

const validPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const preparedBrandInputs = await prepareThreeDBrandReferenceImageInputs([
  "https://brand.example/hero.png",
  "https://brand.example/logo.svg",
  "https://brand.example/not-an-image.jpg",
  "https://brand.example/missing.jpg",
], async (input) => {
  const url = String(input);
  if (url.endsWith("hero.png")) {
    return new Response(validPngBytes, { status: 200, headers: { "content-type": "image/png" } });
  }
  if (url.endsWith("logo.svg")) {
    return new Response("<svg/>", { status: 200, headers: { "content-type": "image/svg+xml" } });
  }
  if (url.endsWith("not-an-image.jpg")) {
    return new Response("not really a jpeg", { status: 200, headers: { "content-type": "image/jpeg" } });
  }
  return new Response("missing", { status: 404 });
});
assert.deepEqual(preparedBrandInputs, [
  `data:image/png;base64,${Buffer.from(validPngBytes).toString("base64")}`,
]);

const originalFetch = globalThis.fetch;
const capturedRequest: { input?: Record<string, unknown> } = {};
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.includes("/predictions")) {
    capturedRequest.input = JSON.parse(String(init?.body)).input as Record<string, unknown>;
    return new Response(JSON.stringify({
      id: "mock-seedance",
      status: "succeeded",
      output: "https://media.example/clip.mp4",
    }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }
  if (url === "https://media.example/clip.mp4") {
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "video/mp4" },
    });
  }
  throw new Error(`Unexpected mocked fetch: ${url}`);
};

try {
  const result = await generateReplicateSeedanceVideo({
    replicateApiToken: "test-token",
    imageUrl: "https://media.example/start.jpg",
    lastFrameImageUrl: "https://media.example/end.jpg",
    prompt: "Animate the approved product demonstration without text.",
    durationSeconds: 10,
    resolution: "720p",
  });
  assert.equal(result.mimeType, "video/mp4");
  assert.equal(capturedRequest.input?.image, "https://media.example/start.jpg");
  assert.equal(capturedRequest.input?.last_frame_image, "https://media.example/end.jpg");
  assert.equal(capturedRequest.input?.resolution, "720p");
  assert.equal(capturedRequest.input?.generate_audio, false);
} finally {
  globalThis.fetch = originalFetch;
}

let postCount = 0;
let resumeCount = 0;
let savedPredictionId = "";
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.includes("/models/") && url.endsWith("/predictions")) {
    postCount += 1;
    return new Response(JSON.stringify({
      id: "slow-seedance",
      status: "processing",
      urls: { get: "https://api.replicate.com/v1/predictions/slow-seedance" },
    }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }
  if (url === "https://api.replicate.com/v1/predictions/slow-seedance") {
    assert.equal(init?.method, undefined, "Resuming must GET the saved prediction instead of creating another one.");
    resumeCount += 1;
    return new Response(JSON.stringify({
      id: "slow-seedance",
      status: "succeeded",
      output: "https://media.example/resumed-clip.mp4",
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  if (url === "https://media.example/resumed-clip.mp4") {
    return new Response(new Uint8Array([4, 5, 6]), {
      status: 200,
      headers: { "content-type": "video/mp4" },
    });
  }
  throw new Error(`Unexpected resumable mocked fetch: ${url}`);
};

try {
  await assert.rejects(
    generateReplicateSeedanceVideo({
      replicateApiToken: "test-token",
      imageUrl: "https://media.example/start.jpg",
      prompt: "Animate the approved product demonstration without text.",
      durationSeconds: 10,
      pollAttempts: 0,
      onPredictionCreated: (predictionId) => {
        savedPredictionId = predictionId;
      },
    }),
    (error) => error instanceof ReplicatePredictionStillRunningError
      && error.predictionId === "slow-seedance",
  );
  assert.equal(savedPredictionId, "slow-seedance", "The paid prediction ID must be persisted before local polling ends.");

  const resumed = await generateReplicateSeedanceVideo({
    replicateApiToken: "test-token",
    imageUrl: "https://media.example/start.jpg",
    prompt: "Animate the approved product demonstration without text.",
    durationSeconds: 10,
    predictionId: savedPredictionId,
    pollAttempts: 0,
  });
  assert.equal(resumed.mimeType, "video/mp4");
  assert.equal(postCount, 1, "Resuming the same prediction must not create a duplicate paid generation.");
  assert.equal(resumeCount, 1);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("3D Breakdown media handoff tests passed.");
