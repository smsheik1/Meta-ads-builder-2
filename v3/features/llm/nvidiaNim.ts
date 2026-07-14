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
  stream?: boolean;
  structuredOutput?: boolean;
}) => Promise<string>;

const readNvidiaNimStream = async (response: Response) => {
  if (!response.body) throw new Error("NVIDIA NIM returned an empty response stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let streamDone = false;

  const consumeLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data) return;
    if (data === "[DONE]") {
      streamDone = true;
      return;
    }
    const payload = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    content += payload.choices?.[0]?.delta?.content || "";
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    lines.forEach(consumeLine);
    if (streamDone) {
      await reader.cancel().catch(() => undefined);
      break;
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) consumeLine(buffer);

  if (!content.trim()) throw new Error("NVIDIA NIM returned an empty streamed response.");
  return content;
};

export const callNvidiaNimChat = async ({
  apiKey,
  baseUrl,
  label,
  model,
  nvidiaNimChatCompletion,
  prompt,
  maxTokens,
  stream = false,
  structuredOutput = true,
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
  stream?: boolean;
  structuredOutput?: boolean;
  temperature?: number;
  timeoutMs: number;
}) => {
  const startedAt = Date.now();
  console.log("[wiggly:nim] start", {
    label,
    maxTokens,
    model,
    stream,
    structuredOutput,
    timeoutMs,
  });
  if (nvidiaNimChatCompletion) {
    try {
      const result = await withTimeout(
        nvidiaNimChatCompletion({
          model,
          prompt,
          apiKey,
          baseUrl,
          timeoutMs,
          maxTokens,
          stream,
          structuredOutput,
        }),
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
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
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
        ...(stream ? { stream: true } : {}),
        ...(structuredOutput ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[wiggly:nim] http:error", {
        elapsedMs: Date.now() - startedAt,
        label,
        status: response.status,
      });
      throw new Error(`${label} failed with ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
    }

    const content = stream
      ? await readNvidiaNimStream(response)
      : ((await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      }).choices?.[0]?.message?.content || "{}");
    console.log("[wiggly:nim] ready", {
      elapsedMs: Date.now() - startedAt,
      label,
      responseChars: content.length,
      status: response.status,
    });
    return content;
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
};
