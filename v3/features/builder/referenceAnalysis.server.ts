import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assetsNeedingRefinement,
  buildMakerAnalysisPrompt,
  createMakerDraftFromAnalysis,
  editableTextEvidenceIds,
  fixedFrameAssets,
  paddleOcrResultSchema,
  validateMakerAnalysisEvidence,
  type PaddleOcrResult,
  type RefinedAsset,
} from "./referenceAnalysis";
import type { MakerAnalysis } from "./model";
import type { MakerAnalysisActivity } from "./analysisProgress";

const GEMMA_MODEL = "google/gemma-4-31b-it";
const GEMMA_MODELS = [`${GEMMA_MODEL}:free`, GEMMA_MODEL];
const GEMMA_PROVIDERS = ["Google AI Studio", "DeepInfra", "ModelRun", "WandB"];
const SAM3_VERSION = "1bf97763d5dfd3a1584adca913a8ef4b43c684fca97e04e39e4c50a3a5e09650";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const REPLICATE_PREDICTIONS_URL = "https://api.replicate.com/v1/predictions";
const REVEALLAYER_ROLES = new Set(["story_setting", "news_subject", "supporting_visual"]);

type OcrFile = PaddleOcrResult & {
  timing?: { initializationSeconds?: number; predictionSeconds?: number };
};

type SamResult = {
  boxes?: number[][];
  scores?: number[];
  masks?: number[][][];
  masks_offset?: number[][];
};

const assetsNeedingBackgroundRepair = (assets: MakerAnalysis["assets"]) =>
  assets.filter((asset) => REVEALLAYER_ROLES.has(asset.role));

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
        models: GEMMA_MODELS,
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: buildMakerAnalysisPrompt(ocr) },
        ] }],
        temperature: 0,
        seed: 777,
        max_tokens: 4096,
        stream: false,
        provider: {
          order: GEMMA_PROVIDERS,
          allow_fallbacks: true,
          require_parameters: true,
        },
        response_format: {
          type: "json_object",
        },
      }),
      signal: controller.signal,
    }, "OpenRouter Gemma 4 31B analysis");
    const providerError = response.body.error as { message?: unknown } | undefined;
    if (providerError) {
      throw new Error(`OpenRouter Gemma 4 31B analysis failed: ${String(providerError.message || "Unknown provider error.")}`);
    }
    const choices = response.body.choices as Array<{
      finish_reason?: unknown;
      native_finish_reason?: unknown;
      message?: { content?: unknown };
    }> | undefined;
    const choice = choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("Gemma 4 31B returned no analysis.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error(`[wiggly:maker-analysis] invalid Gemma JSON ${JSON.stringify({
        responseId: response.body.id ?? null,
        model: response.body.model ?? GEMMA_MODEL,
        provider: response.body.provider ?? null,
        finishReason: choice?.finish_reason ?? null,
        nativeFinishReason: choice?.native_finish_reason ?? null,
        usage: response.body.usage ?? null,
        contentChars: content.length,
        contentPrefix: content.slice(0, 160),
        contentSuffix: content.slice(-160),
      })}`);
      if (choice?.finish_reason === "length") {
        throw new Error("Gemma 4 31B reached its 4,096-token output limit and returned incomplete JSON.");
      }
      throw new Error("Gemma 4 31B did not return bare JSON.");
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
  onStatus,
  token,
}: {
  assets: MakerAnalysis["assets"];
  fetcher: typeof fetch;
  imageUrl: string;
  onStatus?: (status: string) => void;
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
  let lastStatus = String(prediction.status || "queued");
  onStatus?.(lastStatus);
  const deadline = Date.now() + 240_000;
  while (!["succeeded", "failed", "canceled"].includes(String(prediction.status))) {
    if (Date.now() >= deadline) throw new Error("SAM 3 refinement timed out after 240 seconds.");
    const getUrl = String((prediction.urls as { get?: unknown } | undefined)?.get || "");
    if (!getUrl) throw new Error("SAM 3 did not return a polling URL.");
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    prediction = (await fetchJson(fetcher, getUrl, { headers: { authorization: `Bearer ${token}` } }, "SAM 3 status")).body;
    const nextStatus = String(prediction.status || "processing");
    if (nextStatus !== lastStatus) {
      lastStatus = nextStatus;
      onStatus?.(nextStatus);
    }
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

export async function callRevealLayerBackgroundRepair({
  assets,
  endpoint,
  fetcher,
  imageUrl,
  samResults,
}: {
  assets: MakerAnalysis["assets"];
  endpoint: string;
  fetcher: typeof fetch;
  imageUrl: string;
  samResults: Array<{ assetId: string; result: SamResult }>;
}) {
  const targets = assetsNeedingBackgroundRepair(assets);
  if (targets.length === 0) {
    return { background: Buffer.alloc(0), repairedAssetIds: [] as string[], elapsedSeconds: 0 };
  }
  if (!endpoint.trim()) {
    throw new Error(`RevealLayer is required for ${targets.length} large editable visual asset${targets.length === 1 ? "" : "s"}, but it is not configured.`);
  }
  const samByAssetId = new Map(samResults.map((entry) => [entry.assetId, entry.result]));
  const detections = targets.map((asset) => {
    const result = samByAssetId.get(asset.id);
    const scores = result?.scores || [];
    const boxes = result?.boxes || [];
    const selected = scores.reduce((best, score, index) => score > (scores[best] ?? -1) ? index : best, 0);
    const bbox = boxes[selected];
    if (!bbox || bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value))) {
      throw new Error(`RevealLayer needs a valid SAM 3 box for ${asset.label}.`);
    }
    return { assetId: asset.id, bbox };
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600_000);
  const startedAt = Date.now();
  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: imageUrl, detections }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`RevealLayer failed with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
    }
    if (!response.headers.get("content-type")?.startsWith("image/")) {
      throw new Error("RevealLayer did not return a background image.");
    }
    const background = Buffer.from(await response.arrayBuffer());
    if (background.length === 0) throw new Error("RevealLayer returned an empty background image.");
    return {
      background,
      repairedAssetIds: targets.map((asset) => asset.id),
      elapsedSeconds: Math.round((Date.now() - startedAt) / 100) / 10,
    };
  } catch (error) {
    if (controller.signal.aborted) throw new Error("RevealLayer timed out after 600 seconds.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeMakerReference(
  file: File,
  onProgress: (activity: MakerAnalysisActivity) => void = () => {},
) {
  const fetcher = fetch;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) throw new Error("OpenRouter Maker analysis is not configured.");
  const startedAt = Date.now();
  const report = (
    id: string,
    label: string,
    status: MakerAnalysisActivity["status"],
    detail?: string,
  ) => onProgress({
    id,
    label,
    status,
    detail,
    elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
  });
  const workDir = await mkdtemp(path.join(tmpdir(), "wiggly-maker-analysis-"));
  try {
    report("prepare", "Preparing the reference", "active", "Creating an isolated workspace for this image.");
    const inputPath = path.join(workDir, `input${file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg"}`);
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    const python = await resolvePython();
    const script = path.join(/*turbopackIgnore: true*/ process.cwd(), "scripts", "maker-reference-ocr.py");
    report("prepare", "Preparing the reference", "complete", "Image copied and the OCR runtime is ready.");
    report("ocr", "Reading every text region", "active", "PaddleOCR is locating words and their exact positions.");
    await runPython(python, [script, "ocr", inputPath, workDir], 180_000);
    const rawOcr = JSON.parse(await readFile(path.join(workDir, "ocr.json"), "utf8")) as OcrFile;
    const ocr = paddleOcrResultSchema.parse({ width: rawOcr.width, height: rawOcr.height, texts: rawOcr.texts });
    if (ocr.texts.length === 0) throw new Error("PaddleOCR found no editable text in this reference.");
    const ocrSeconds = Math.round((((rawOcr.timing?.initializationSeconds || 0) + (rawOcr.timing?.predictionSeconds || 0)) * 10)) / 10;
    report("ocr", "Reading every text region", "complete", `${ocr.texts.length} text region${ocr.texts.length === 1 ? "" : "s"} found in ${ocrSeconds}s.`);
    const referenceImageUrl = await dataUrl(path.join(workDir, "reference.jpg"), "image/jpeg");
    const visionImageUrl = await dataUrl(path.join(workDir, "vision.jpg"), "image/jpeg");
    report("semantic", "Understanding how the ad works", "active", "Gemma 4 via OpenRouter is matching the visual structure to the OCR evidence.");
    const semantic = await callGemmaReferenceAnalysis({ apiKey: openRouterApiKey, fetcher, imageUrl: visionImageUrl, ocr });
    report(
      "semantic",
      "Understanding how the ad works",
      "complete",
      `${semantic.analysis.fields.length} field${semantic.analysis.fields.length === 1 ? "" : "s"}, ${semantic.analysis.lists.length} list${semantic.analysis.lists.length === 1 ? "" : "s"}, and ${semantic.analysis.assets.length} asset${semantic.analysis.assets.length === 1 ? "" : "s"} understood in ${semantic.elapsedSeconds}s.`,
    );
    const framedAssets = fixedFrameAssets(semantic.analysis);
    const refinableAssets = assetsNeedingRefinement(semantic.analysis);
    const repairAssets = assetsNeedingBackgroundRepair(refinableAssets);
    report(
      "asset-plan",
      "Planning editable assets",
      "complete",
      framedAssets.length || refinableAssets.length
        ? `${framedAssets.length} fixed frame${framedAssets.length === 1 ? "" : "s"} will be cropped locally and ${refinableAssets.length} freeform asset${refinableAssets.length === 1 ? "" : "s"} will be separated.`
        : "No visual assets need AI separation for this reference.",
    );
    const replicateApiToken = process.env.REPLICATE_API_TOKEN;
    const revealLayerUrl = process.env.MAKER_REVEALLAYER_URL || "";
    if (repairAssets.length > 0 && !revealLayerUrl) {
      throw new Error(`RevealLayer is required for ${repairAssets.length} large editable visual asset${repairAssets.length === 1 ? "" : "s"}, but it is not configured.`);
    }
    if (refinableAssets.length > 0 && !replicateApiToken) {
      throw new Error(`SAM 3 is required for ${refinableAssets.length} editable asset${refinableAssets.length === 1 ? "" : "s"}, but Replicate is not configured.`);
    }
    if (refinableAssets.length > 0) {
      report("sam", "Separating editable visual assets", "active", `SAM 3 is receiving ${refinableAssets.length} targeted prompt${refinableAssets.length === 1 ? "" : "s"}.`);
    }
    const sam = await callSam3AssetRefinement({
      assets: refinableAssets,
      fetcher,
      imageUrl: referenceImageUrl,
      onStatus: (samStatus) => report(
        "sam",
        "Separating editable visual assets",
        "active",
        samStatus === "starting" ? "Replicate is starting the SAM 3 worker."
          : samStatus === "processing" ? "SAM 3 is tracing the requested asset boundaries."
            : `SAM 3 job status: ${samStatus}.`,
      ),
      token: replicateApiToken || "",
    });
    if (refinableAssets.length > 0) {
      report("sam", "Separating editable visual assets", "complete", `${sam.results.length} asset${sam.results.length === 1 ? "" : "s"} separated in ${sam.elapsedSeconds}s.`);
    }
    if (repairAssets.length > 0) {
      report("reveal", "Rebuilding hidden background", "active", `RevealLayer is removing ${repairAssets.map((asset) => asset.label).join(" and ")} without smearing the scene.`);
    }
    const reveal = await callRevealLayerBackgroundRepair({
      assets: refinableAssets,
      endpoint: revealLayerUrl,
      fetcher,
      imageUrl: referenceImageUrl,
      samResults: sam.results,
    });
    const revealBackgroundPath = path.join(workDir, "reveallayer-background.png");
    if (reveal.background.length > 0) {
      await writeFile(revealBackgroundPath, reveal.background);
      report("reveal", "Rebuilding hidden background", "complete", `Clean background rebuilt in ${reveal.elapsedSeconds}s.`);
    }
    report("compose", "Rebuilding the editable artwork", "active", "Removing editable regions from the background and composing clean layers.");
    await writeFile(path.join(workDir, "claims.json"), JSON.stringify({
      editableTextEvidenceIds: editableTextEvidenceIds(semantic.analysis),
      fixedFrameAssets: framedAssets.map((asset) => ({ assetId: asset.id, ...asset.frame })),
      preRepairedAssetIds: reveal.repairedAssetIds,
    }));
    await writeFile(path.join(workDir, "sam.json"), JSON.stringify(sam.results));
    const composeArgs = [
      script,
      "compose",
      path.join(workDir, "reference.jpg"),
      path.join(workDir, "ocr.json"),
      path.join(workDir, "claims.json"),
      path.join(workDir, "sam.json"),
      workDir,
    ];
    if (reveal.background.length > 0) composeArgs.push("--background", revealBackgroundPath);
    await runPython(python, composeArgs, 30_000);
    const composition = JSON.parse(await readFile(path.join(workDir, "composition.json"), "utf8")) as {
      assets: Array<Omit<RefinedAsset, "imageUrl"> & { fileName: string }>;
      warnings: string[];
    };
    const refinedAssets = await Promise.all(composition.assets.map(async ({ fileName, ...asset }) => ({
      ...asset,
      imageUrl: await dataUrl(path.join(workDir, fileName), "image/png"),
    })));
    report(
      "compose",
      "Rebuilding the editable artwork",
      "complete",
      `${refinedAssets.length} transparent asset${refinedAssets.length === 1 ? "" : "s"} and a clean background created${composition.warnings.length ? ` with ${composition.warnings.length} item${composition.warnings.length === 1 ? "" : "s"} to review` : ""}.`,
    );
    report("draft", "Packaging the Maker draft", "active", "Creating editable layers, reroll groups, and the format skill.");
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
    report("draft", "Packaging the Maker draft", "complete", "The editable scene, formula, assets, and skill are ready.");
    return {
      draft,
      warnings: composition.warnings,
      timing: {
        ocrSeconds,
        semanticSeconds: semantic.elapsedSeconds,
        samSeconds: sam.elapsedSeconds,
      },
    };
  } finally {
    report("cleanup", "Cleaning up temporary files", "active", "Removing the temporary analysis workspace.");
    await rm(workDir, { recursive: true, force: true });
    report("cleanup", "Cleaning up temporary files", "complete", "Temporary files removed.");
  }
}
