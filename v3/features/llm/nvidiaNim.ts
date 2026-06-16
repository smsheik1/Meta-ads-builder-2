import { withTimeout } from "./timeout";

export const DEFAULT_NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_NVIDIA_NIM_MODEL = "moonshotai/kimi-k2.6";

export type NvidiaNimChatCompletion = (input: {
  model: string;
  prompt: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}) => Promise<string>;

export const callNvidiaNimChat = async ({
  apiKey,
  baseUrl,
  label,
  model,
  nvidiaNimChatCompletion,
  prompt,
  temperature = 0.7,
  timeoutMs,
}: {
  apiKey: string;
  baseUrl: string;
  label: string;
  model: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  prompt: string;
  temperature?: number;
  timeoutMs: number;
}) => {
  if (nvidiaNimChatCompletion) {
    return withTimeout(
      nvidiaNimChatCompletion({ model, prompt, apiKey, baseUrl, timeoutMs }),
      timeoutMs,
      label,
    );
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
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const errorText = error instanceof Error
      ? `${error.name} ${error.message}`
      : `${(error as { name?: unknown } | null)?.name || ""} ${(error as { message?: unknown } | null)?.message || ""}`.trim() || String(error || "");
    if (/\b(aborterror|aborted)\b/i.test(errorText)) {
      throw new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${label} failed with ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content || "{}";
};
