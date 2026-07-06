import { withTimeout } from "./timeout";

export const DEFAULT_NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_NVIDIA_NIM_MODEL = "z-ai/glm-5.2";

export type NvidiaNimChatCompletion = (input: {
  model: string;
  prompt: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxTokens?: number;
}) => Promise<string>;

export const callNvidiaNimChat = async ({
  apiKey,
  baseUrl,
  label,
  model,
  nvidiaNimChatCompletion,
  prompt,
  maxTokens,
  temperature = 0.7,
  timeoutMs,
}: {
  apiKey: string;
  baseUrl: string;
  label: string;
  model: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs: number;
}) => {
  const startedAt = Date.now();
  console.log("[wiggly:nim] start", {
    label,
    maxTokens,
    model,
    timeoutMs,
  });
  if (nvidiaNimChatCompletion) {
    try {
      const result = await withTimeout(
        nvidiaNimChatCompletion({ model, prompt, apiKey, baseUrl, timeoutMs, maxTokens }),
        timeoutMs,
        label,
      );
      console.log("[wiggly:nim] ready", {
        elapsedMs: Date.now() - startedAt,
        label,
        responseChars: result.length,
      });
      return result;
    } catch (error) {
      console.error("[wiggly:nim] error", {
        elapsedMs: Date.now() - startedAt,
        label,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const errorText = error instanceof Error
      ? `${error.name} ${error.message}`
      : `${(error as { name?: unknown } | null)?.name || ""} ${(error as { message?: unknown } | null)?.message || ""}`.trim() || String(error || "");
    if (/\b(aborterror|aborted)\b/i.test(errorText)) {
      console.error("[wiggly:nim] timeout", {
        elapsedMs: Date.now() - startedAt,
        label,
        timeoutMs,
      });
      throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    console.error("[wiggly:nim] error", {
      elapsedMs: Date.now() - startedAt,
      label,
      message: errorText,
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[wiggly:nim] http:error", {
      elapsedMs: Date.now() - startedAt,
      label,
      status: response.status,
    });
    throw new Error(`${label} failed with ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content || "{}";
  console.log("[wiggly:nim] ready", {
    elapsedMs: Date.now() - startedAt,
    label,
    responseChars: content.length,
    status: response.status,
  });
  return content;
};
