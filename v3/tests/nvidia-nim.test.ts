import assert from "node:assert/strict";
import { callNvidiaNimChat } from "../features/llm/nvidiaNim";

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
