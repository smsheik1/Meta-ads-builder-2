import { withTimeout } from "../../llm/timeout";

export type ProductCutoutResult = {
  bytes: ArrayBuffer;
  mimeType: string;
};

export const MOTION_STORY_CUTOUT_IDENTIFIER = "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";

type ReplicatePredictionPayload = {
  id?: string;
  status?: string;
  urls?: { get?: string };
  output?: string | string[];
  error?: string;
  detail?: string;
  logs?: string;
};

const DEFAULT_TIMEOUT_MS = 90_000;
const sleep = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

const firstOutputUrl = (output: ReplicatePredictionPayload["output"]) => {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  return "";
};

export async function removeProductBackground({
  replicateApiToken,
  imageUrl,
  fetcher = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  replicateApiToken?: string;
  imageUrl: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}): Promise<ProductCutoutResult> {
  if (!replicateApiToken) throw new Error("Replicate background removal is not configured for Motion Story product cutouts.");
  if (!imageUrl.trim()) throw new Error("Motion Story product image URL is missing.");

  const prediction = await withTimeout(fetcher("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateApiToken}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      version: MOTION_STORY_CUTOUT_IDENTIFIER,
      input: {
        image: imageUrl,
        background_type: "rgba",
        format: "png",
      },
    }),
  }), timeoutMs, "Replicate background removal");
  let payload = await prediction.json().catch(() => null) as ReplicatePredictionPayload | null;
  if (!prediction.ok) throw new Error(payload?.error || payload?.detail || "Replicate background removal failed.");

  for (let attempt = 0; payload?.urls?.get && !firstOutputUrl(payload.output) && !["succeeded", "failed", "canceled"].includes(payload.status || "") && attempt < 18; attempt += 1) {
    await sleep(2_000);
    const nextResponse = await withTimeout(fetcher(payload.urls.get, {
      headers: { Authorization: `Bearer ${replicateApiToken}` },
    }), timeoutMs, "Replicate background removal polling");
    payload = await nextResponse.json().catch(() => payload);
  }

  if (payload?.status === "failed" || payload?.status === "canceled") {
    throw new Error(`Replicate background removal ${payload.status}: ${payload.error || payload.logs || "no provider error returned"}`);
  }

  const outputUrl = firstOutputUrl(payload?.output);
  if (!outputUrl) throw new Error("Replicate background removal returned no image.");

  const response = await withTimeout(fetcher(outputUrl), timeoutMs, "Replicate background removal image download");
  if (!response.ok) throw new Error("Replicate background removal image download failed.");

  return {
    bytes: await response.arrayBuffer(),
    mimeType: response.headers.get("content-type") || "image/png",
  };
}
