# Final Fresh Semantic Holdout: Provider 504

- Date: 2026-07-11
- Reference: Codecademy flash-sale Story
- Model: Gemma 4 31B IT through NVIDIA NIM
- Contract: Field + List v1.1 with semantic-policy refinements
- Requests: One initial request plus one explicitly authorized retry
- Result: **Blocked — NVIDIA HTTP 504 twice before model output**

## Verdict

The final fresh semantic holdout did not produce semantic evidence across two identical attempts.

NVIDIA returned HTTP 504 after the guarded initial request. The founder explicitly authorized one `Try again`; the identical frozen retry also returned HTTP 504. No model response, partial output, or JSON content exists. Wiggly did not retry automatically, repair, switch models, run SAM, call Replicate, or generate an image.

Do not score Gemma, the prompt, or Field + List v1.1 from this provider incident.

## Frozen Expectation

The reference hash, dimensions, creative boundary, expected formula, Fields, one three-benefit List, locked product-interface collage, Reroll Groups, platform exclusions, and failure conditions were frozen before OCR or the provider request at:

`/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11/holdout-manifest.json`

The expected reusable formula is:

> A branded flash-sale creative pairs one oversized discount with a three-benefit checklist and a locked product-experience collage.

The explicit retry was valid because:

- no semantic output was observed;
- the schema and prompt remain unchanged after the failure;
- no expectation was edited from model evidence;
- a new attempt directory preserved the original failed sentinel.

The source is no longer eligible for another unchanged raw retry. Two consecutive provider failures are enough evidence to stop resubmitting the same workload.

## OCR

Local PaddleOCR passed:

- 49 regions;
- 7.974 seconds;
- flash-sale label recovered;
- `50% OFF` recovered as two evidence regions;
- all three benefit lines recovered;
- complex embedded product-interface text recovered as nested evidence;
- native `LEARN MORE` and Story footer text recovered for boundary classification.

OCR output does not answer the semantic holdout by itself.

## Failure Behavior

The request sentinel records:

- `state: failed_provider_504`;
- failure before model output;
- automatic retry `false`;
- fallback model `false`.

The retry sentinel separately records the founder's explicit authorization and its second provider 504. This matches the architecture and acceptance plan: provider failure remains visible, prior evidence remains intact, and automatic retries never run.

## Offline Density Finding

The request files were not unusually large:

- prepared JPEG: 85,133 bytes;
- OCR summary: 5,109 bytes;
- v1.1 schema: 8,010 bytes.

The semantic workload was dense. PaddleOCR returned 49 evidence regions, and 37 were tiny regions 14 pixels high or less, mostly nested inside the product-interface collage. Exact evidence accounting would require the model to classify or bind every region in a long constrained response.

The leading hypothesis is structured-output workload behind the public NIM gateway, not upload size. Do not change Gemma's semantic quality score from this inference; no output exists.

## Decision

1. Mark semantic quality inconclusive and the provider path blocked for this raw dense workload.
2. Do not change the schema or prompt from a provider 504.
3. Preserve the frozen reference and expectations.
4. Do not submit a third unchanged retry.
5. Before another provider validation, deterministically compact dense nested OCR that belongs inside a locked raster, while retaining the original child evidence mapping for audit.
6. Alternatively, test the same model on a deployment without the public gateway timeout; do not introduce a fallback model.
7. Do not run SAM until a valid semantic response passes the gate.

## Evidence

All frozen inputs, OCR results, request sentinel, assessment, and visual board are stored at:

`/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11`

Key files:

- `holdout-manifest.json`
- `ocr-output/*`
- `gemma-output/codecademy_flash_sale_story/REQUEST_SENTINEL.json`
- `gemma-output/codecademy_flash_sale_story-retry-1/REQUEST_SENTINEL.json`
- `holdout-assessment.json`
- `holdout-result-board.png`

There is intentionally no `raw-response.json` or `semantic-analysis.json` for either attempt.
