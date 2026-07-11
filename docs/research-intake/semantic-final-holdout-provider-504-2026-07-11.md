# Final Fresh Semantic Holdout: Provider 504

- Date: 2026-07-11
- Reference: Codecademy flash-sale Story
- Model: Gemma 4 31B IT through NVIDIA NIM
- Contract: Field + List v1.1 with semantic-policy refinements
- Requests: Exactly one
- Result: **Inconclusive — NVIDIA HTTP 504 before model output**

## Verdict

The final fresh semantic holdout did not produce semantic evidence.

NVIDIA returned HTTP 504 after the guarded request. No model response, partial output, or JSON content exists. Wiggly did not retry, repair, switch models, run SAM, call Replicate, or generate an image.

Do not score Gemma, the prompt, or Field + List v1.1 from this provider incident.

## Frozen Expectation

The reference hash, dimensions, creative boundary, expected formula, Fields, one three-benefit List, locked product-interface collage, Reroll Groups, platform exclusions, and failure conditions were frozen before OCR or the provider request at:

`/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11/holdout-manifest.json`

The expected reusable formula is:

> A branded flash-sale creative pairs one oversized discount with a three-benefit checklist and a locked product-experience collage.

The source remains eligible for one explicit retry because:

- no semantic output was observed;
- the schema and prompt remain unchanged after the failure;
- no expectation was edited from model evidence;
- the request sentinel prevents accidental duplicate submission.

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

This matches the architecture and acceptance plan: provider failure remains visible, prior evidence remains intact, and only an explicit user action may start another attempt.

## Decision

1. Mark the holdout inconclusive, not failed semantic quality.
2. Do not change the schema or prompt from a provider 504.
3. Preserve the frozen reference and expectations.
4. Require an explicit `Try again` before submitting the same request.
5. Do not run SAM until a valid semantic response passes the gate.

## Evidence

All frozen inputs, OCR results, request sentinel, assessment, and visual board are stored at:

`/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11`

Key files:

- `holdout-manifest.json`
- `ocr-output/*`
- `gemma-output/codecademy_flash_sale_story/REQUEST_SENTINEL.json`
- `holdout-assessment.json`
- `holdout-result-board.png`

There is intentionally no `raw-response.json` or `semantic-analysis.json`.
