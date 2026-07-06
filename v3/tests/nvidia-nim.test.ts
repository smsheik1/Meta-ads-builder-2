import assert from "node:assert/strict";
import { callNvidiaNimChat, DEFAULT_NVIDIA_NIM_MODEL } from "../features/llm/nvidiaNim";
import {
  DEFAULT_NVIDIA_NIM_AD_IDEA_MODEL,
  DEFAULT_NVIDIA_NIM_BRAND_CURATOR_MODEL,
  DEFAULT_NVIDIA_NIM_MEME_MODEL,
  DEFAULT_NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL,
  NIM_MODEL_OPTIONS,
} from "../features/llm/nvidiaNimModels";

assert.equal(DEFAULT_NVIDIA_NIM_MODEL, "z-ai/glm-5.2");
assert.equal(DEFAULT_NVIDIA_NIM_AD_IDEA_MODEL, "z-ai/glm-5.2");
assert.equal(DEFAULT_NVIDIA_NIM_BRAND_CURATOR_MODEL, "z-ai/glm-5.2");
assert.equal(DEFAULT_NVIDIA_NIM_MEME_MODEL, "z-ai/glm-5.2");
assert.equal(DEFAULT_NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL, "z-ai/glm-5.2");
assert.equal(NIM_MODEL_OPTIONS[0]?.id, "z-ai/glm-5.2");
assert.equal(NIM_MODEL_OPTIONS[0]?.label, "GLM-5.2");

const originalFetch = globalThis.fetch;

globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
  init?.signal?.addEventListener("abort", () => {
    const error = new Error("This operation was aborted");
    error.name = "AbortError";
    reject(error);
  });
})) as typeof fetch;

await assert.rejects(
  () => callNvidiaNimChat({
    apiKey: "test-key",
    baseUrl: "https://nim.test/v1",
    label: "NVIDIA NIM test generation",
    model: "test-model",
    prompt: "{}",
    timeoutMs: 1,
  }),
  /NVIDIA NIM test generation timed out after/,
);

globalThis.fetch = (() => Promise.reject({ name: "AbortError", message: "This operation was aborted" })) as typeof fetch;

await assert.rejects(
  () => callNvidiaNimChat({
    apiKey: "test-key",
    baseUrl: "https://nim.test/v1",
    label: "NVIDIA NIM plain abort",
    model: "test-model",
    prompt: "{}",
    timeoutMs: 1,
  }),
  /NVIDIA NIM plain abort timed out after/,
);

let capturedBody: Record<string, unknown> = {};
globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
  capturedBody = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
  return Promise.resolve(new Response(JSON.stringify({
    choices: [{ message: { content: "{\"ok\":true}" } }],
  }), { status: 200 }));
}) as typeof fetch;

const content = await callNvidiaNimChat({
  apiKey: "test-key",
  baseUrl: "https://nim.test/v1",
  label: "NVIDIA NIM max token test",
  model: "test-model",
  prompt: "{}",
  maxTokens: 1800,
  timeoutMs: 1000,
});
assert.equal(content, "{\"ok\":true}");
assert.equal(capturedBody?.max_tokens, 1800);

globalThis.fetch = originalFetch;

console.log("nvidia-nim tests passed");
