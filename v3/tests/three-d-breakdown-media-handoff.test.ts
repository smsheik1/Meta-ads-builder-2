import assert from "node:assert/strict";
import { decode, encode } from "jpeg-js";
import { generateReplicateSeedanceVideo } from "../features/formats/jingle/storyboard";
import { cropThreeDStoryboardPanel } from "../features/formats/three-d-breakdown/storyboardImageCrop";

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
  });
  assert.equal(result.mimeType, "video/mp4");
  assert.equal(capturedRequest.input?.image, "https://media.example/start.jpg");
  assert.equal(capturedRequest.input?.last_frame_image, "https://media.example/end.jpg");
  assert.equal(capturedRequest.input?.generate_audio, false);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("3D Breakdown media handoff tests passed.");
