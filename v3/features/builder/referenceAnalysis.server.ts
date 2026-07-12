import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assetsNeedingRefinement,
  buildMakerAnalysisPrompt,
  createMakerDraftFromAnalysis,
  editableTextEvidenceIds,
  makerAnalysisJsonSchema,
  paddleOcrResultSchema,
  validateMakerAnalysisEvidence,
  type PaddleOcrResult,
  type RefinedAsset,
} from "./referenceAnalysis";
import type { MakerAnalysis } from "./model";

const GEMMA_MODEL = "google/gemma-4-31b-it";
const GEMMA_PROVIDER = "DeepInfra";
const SAM3_VERSION = "1bf97763d5dfd3a1584adca913a8ef4b43c684fca97e04e39e4c50a3a5e09650";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const REPLICATE_PREDICTIONS_URL = "https://api.replicate.com/v1/predictions";

// OpenRouter's Gemma backends do not implement the `uniqueItems` grammar keyword.
// The canonical schema remains unchanged and makerAnalysisSchema enforces the same
// uniqueness rules after decoding, so acceptance is not relaxed here.
const openRouterMakerAnalysisSchema = JSON.parse(
  JSON.stringify(makerAnalysisJsonSchema()),
  (key, value) => key === "uniqueItems" ? undefined : value,
) as ReturnType<typeof makerAnalysisJsonSchema>;

type OcrFile = PaddleOcrResult & {
  timing?: { initializationSeconds?: number; predictionSeconds?: number };
};

type SamResult = {
  boxes?: number[][];
  scores?: number[];
  masks?: number[][][];
  masks_offset?: number[][];
};

const dataUrl = async (filePath: string, mimeType: string) =>
  `data:${mimeType};base64,${(await readFile(filePath)).toString("base64")}`;

async function resolvePython(configured?: string) {
  const candidate = configured || process.env.MAKER_PADDLEOCR_PYTHON || path.join(/*turbopackIgnore: true*/ process.cwd(), ".maker-analysis-venv", "bin", "python");
  const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(/*turbopackIgnore: true*/ process.cwd(), candidate);
  try {
    await access(resolved);
  } catch {
    throw new Error("PaddleOCR is not installed. Run `npm run setup:maker-analysis` from v3, then try again.");
  }
  return resolved;
}

async function runPython(python: string, args: string[], timeoutMs: number) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(python, args, { env: { ...process.env, PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK: "True" } });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`PaddleOCR stopped after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`PaddleOCR failed${stderr.trim() ? `: ${stderr.trim().slice(-500)}` : "."}`));
    });
  });
}

async function fetchJson(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  label: string,
) {
  const response = await fetcher(url, init);
  const body = await response.text();
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  try {
    return { body: JSON.parse(body) as Record<string, unknown>, status: response.status };
  } catch {
    throw new Error(`${label} returned invalid JSON.`);
  }
}

export async function callGemmaReferenceAnalysis({
  apiKey,
  fetcher,
  imageUrl,
  ocr,
}: {
  apiKey: string;
  fetcher: typeof fetch;
  imageUrl: string;
  ocr: PaddleOcrResult;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300_000);
  const startedAt = Date.now();
  try {
    const response = await fetchJson(fetcher, `${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "user-agent": "wiggly-maker-analysis/1.0",
      },
      body: JSON.stringify({
        model: GEMMA_MODEL,
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: buildMakerAnalysisPrompt(ocr) },
        ] }],
        temperature: 0,
        seed: 777,
        max_tokens: 4096,
        stream: false,
        structured_outputs: true,
        provider: {
          order: [GEMMA_PROVIDER],
          allow_fallbacks: false,
          require_parameters: true,
        },
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "maker_analysis_mvp",
            strict: true,
            schema: openRouterMakerAnalysisSchema,
          },
        },
      }),
      signal: controller.signal,
    }, "OpenRouter Gemma 4 31B analysis");
    const providerError = response.body.error as { message?: unknown } | undefined;
    if (providerError) {
      throw new Error(`OpenRouter Gemma 4 31B analysis failed: ${String(providerError.message || "Unknown provider error.")}`);
    }
    const choices = response.body.choices as Array<{ message?: { content?: string } }> | undefined;
    const content = choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("Gemma 4 31B returned no analysis.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Gemma 4 31B did not return bare JSON. Nothing was repaired or retried.");
    }
    return {
      analysis: validateMakerAnalysisEvidence(parsed, ocr),
      elapsedSeconds: Math.round((Date.now() - startedAt) / 100) / 10,
    };
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Gemma 4 31B analysis timed out after 300 seconds.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callSam3AssetRefinement({
  assets,
  fetcher,
  imageUrl,
  token,
}: {
  assets: MakerAnalysis["assets"];
  fetcher: typeof fetch;
  imageUrl: string;
  token: string;
}) {
  if (assets.length === 0) return { results: [] as Array<{ assetId: string; result: SamResult }>, elapsedSeconds: 0 };
  const startedAt = Date.now();
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    prefer: "wait=60",
  };
  let prediction = (await fetchJson(fetcher, REPLICATE_PREDICTIONS_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      version: SAM3_VERSION,
      input: {
        image: imageUrl,
        prompts: assets.map((asset) => JSON.stringify({ text: asset.sam_prompt })),
        confidence_threshold: 0.2,
        visualize: false,
        offset_masks: true,
        concat_input: true,
        split_output: true,
        backbone_output: false,
      },
    }),
  }, "SAM 3 refinement")).body;
  const deadline = Date.now() + 240_000;
  while (!["succeeded", "failed", "canceled"].includes(String(prediction.status))) {
    if (Date.now() >= deadline) throw new Error("SAM 3 refinement timed out after 240 seconds.");
    const getUrl = String((prediction.urls as { get?: unknown } | undefined)?.get || "");
    if (!getUrl) throw new Error("SAM 3 did not return a polling URL.");
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    prediction = (await fetchJson(fetcher, getUrl, { headers: { authorization: `Bearer ${token}` } }, "SAM 3 status")).body;
  }
  if (prediction.status !== "succeeded") throw new Error(`SAM 3 refinement ${String(prediction.status)}${prediction.error ? `: ${String(prediction.error)}` : "."}`);
  const urls = ((prediction.output as { results?: unknown[] } | undefined)?.results || []).map(String);
  if (urls.length !== assets.length) throw new Error(`SAM 3 returned ${urls.length} result files for ${assets.length} asset prompts.`);
  const results = await Promise.all(urls.map(async (url, index) => ({
    assetId: assets[index]!.id,
    result: (await fetchJson(fetcher, url, {}, `SAM 3 result for ${assets[index]!.id}`)).body as SamResult,
  })));
  return { results, elapsedSeconds: Math.round((Date.now() - startedAt) / 100) / 10 };
}

export async function analyzeMakerReference(file: File) {
  const fetcher = fetch;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) throw new Error("OpenRouter Maker analysis is not configured.");
  const workDir = await mkdtemp(path.join(tmpdir(), "wiggly-maker-analysis-"));
  try {
    const inputPath = path.join(workDir, `input${file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg"}`);
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    const python = await resolvePython();
    const script = path.join(/*turbopackIgnore: true*/ process.cwd(), "scripts", "maker-reference-ocr.py");
    await runPython(python, [script, "ocr", inputPath, workDir], 180_000);
    const rawOcr = JSON.parse(await readFile(path.join(workDir, "ocr.json"), "utf8")) as OcrFile;
    const ocr = paddleOcrResultSchema.parse({ width: rawOcr.width, height: rawOcr.height, texts: rawOcr.texts });
    if (ocr.texts.length === 0) throw new Error("PaddleOCR found no editable text in this reference.");
    const referenceImageUrl = await dataUrl(path.join(workDir, "reference.jpg"), "image/jpeg");
    const visionImageUrl = await dataUrl(path.join(workDir, "vision.jpg"), "image/jpeg");
    const semantic = await callGemmaReferenceAnalysis({ apiKey: openRouterApiKey, fetcher, imageUrl: visionImageUrl, ocr });
    const refinableAssets = assetsNeedingRefinement(semantic.analysis);
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    if (refinableAssets.length > 0 && !replicateApiToken) {
      throw new Error(`SAM 3 is required for ${refinableAssets.length} editable asset${refinableAssets.length === 1 ? "" : "s"}, but Replicate is not configured.`);
    }
    const sam = await callSam3AssetRefinement({ assets: refinableAssets, fetcher, imageUrl: referenceImageUrl, token: replicateApiToken || "" });
    await writeFile(path.join(workDir, "claims.json"), JSON.stringify({ editableTextEvidenceIds: editableTextEvidenceIds(semantic.analysis) }));
    await writeFile(path.join(workDir, "sam.json"), JSON.stringify(sam.results));
    await runPython(python, [
      script,
      "compose",
      path.join(workDir, "reference.jpg"),
      path.join(workDir, "ocr.json"),
      path.join(workDir, "claims.json"),
      path.join(workDir, "sam.json"),
      workDir,
    ], 30_000);
    const composition = JSON.parse(await readFile(path.join(workDir, "composition.json"), "utf8")) as {
      assets: Array<Omit<RefinedAsset, "imageUrl"> & { fileName: string }>;
      warnings: string[];
    };
    const refinedAssets = await Promise.all(composition.assets.map(async ({ fileName, ...asset }) => ({
      ...asset,
      imageUrl: await dataUrl(path.join(workDir, fileName), "image/png"),
    })));
    const draft = createMakerDraftFromAnalysis({
      id: crypto.randomUUID(),
      fileName: file.name,
      analysis: semantic.analysis,
      artifacts: {
        referenceImageUrl,
        backgroundImageUrl: await dataUrl(path.join(workDir, "background.jpg"), "image/jpeg"),
        ocr,
        refinedAssets,
      },
    });
    return {
      draft,
      warnings: composition.warnings,
      timing: {
        ocrSeconds: Math.round((((rawOcr.timing?.initializationSeconds || 0) + (rawOcr.timing?.predictionSeconds || 0)) * 10)) / 10,
        semanticSeconds: semantic.elapsedSeconds,
        samSeconds: sam.elapsedSeconds,
      },
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
