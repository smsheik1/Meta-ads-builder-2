# OCR Evidence Compaction: Offline Spike

- Date: 2026-07-11
- Input: frozen Codecademy flash-sale Story holdout
- Scope: deterministic preprocessing only
- Provider requests: zero
- SAM, Replicate, or image-generation requests: zero
- Result: **Pass offline; public NIM validation still returned HTTP 504**

## Why This Exists

The unchanged Field + List v1.1 request failed twice at NVIDIA's public NIM gateway with HTTP 504 before model output. The image and schema were small, but PaddleOCR exposed 49 evidence regions. Thirty-four of those regions were tiny text nested inside one product-interface collage that the frozen expectation already treats as a locked raster.

The semantic model does not need to reason about every button label inside that collage independently. It does need to know that dense nested text exists, keep the prominent ad copy separate, and preserve every original OCR box for audit and later Maker correction.

## Narrow Rule

The spike adds one deterministic preprocessing function:

1. Keep raw PaddleOCR output authoritative and unchanged.
2. Find connected components made only from tiny OCR boxes.
3. Require at least eight boxes before a component is eligible.
4. Compact at most one component.
5. Replace that component in the semantic summary with one synthetic evidence ID.
6. Preserve every child ID, string, confidence, polygon, and bounding box in a companion audit map.
7. Leave all prominent copy and isolated small text untouched.

This does not change Field + List v1.1. The semantic runner already accepts evidence IDs as strings, so the synthetic cluster uses the existing `texts[]` contract.

## Codecademy Result

| Check | Result |
| --- | --- |
| Raw OCR regions | 49 |
| Semantic evidence regions | 16 |
| Compacted clusters | 1 |
| Cluster children | `text_13` through `text_46` — 34 regions |
| Headline and offer retained | `text_06` through `text_09` |
| Three benefits retained | `text_10` through `text_12` |
| Story/status/header retained | `text_01` through `text_05` |
| Native `LEARN MORE` retained | `text_47` |
| Story footer retained | `text_48` and `text_49` |
| Original evidence accounted | 49 of 49, exactly once |

The cluster bounding box is `[34, 703, 556, 1009]`, matching the dense product-interface collage rather than the main offer or platform chrome.

## Offline Tests

Five tests pass:

1. The Codecademy collage becomes exactly one 34-child cluster and 16 semantic evidence items.
2. The map is exact and reversible; every original ID appears once.
3. Prominent creative copy and platform evidence remain independent.
4. Seven sparse tiny regions are a no-op.
5. When two eligible clusters exist, only the largest is compacted.

External benchmark files:

- `/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11/compact_ocr_evidence.py`
- `/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11/test_compact_ocr_evidence.py`
- `/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11/ocr-output/codecademy_flash_sale_story/compacted/semantic-ocr-summary.json`
- `/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11/ocr-output/codecademy_flash_sale_story/compacted/evidence-compaction-map.json`

## Complexity Boundary

This is intentionally not:

- a general document-layout engine;
- another model call;
- a new database entity;
- a new semantic schema;
- a platform-specific chrome detector;
- a multi-cluster optimizer;
- deletion of OCR evidence.

If a reference does not contain one clear dense component, compaction does nothing. Maker correction continues to operate against the raw evidence.

## Authorized Provider Validation

After the offline gate passed, the founder explicitly authorized one compacted Gemma 4 request through NVIDIA NIM.

The request used:

- the same image;
- the same Gemma 4 31B IT model;
- the same Field + List v1.1 schema;
- the same structured-output transport;
- the same prompt policies, temperature, seed, and token ceiling;
- 16 semantic evidence regions instead of 49.

NVIDIA returned HTTP 504 after approximately 225 seconds, before any model output. No `raw-response.json` or `semantic-analysis.json` exists. No automatic retry, fallback model, repair, SAM, Replicate, or image-generation request ran.

This separates two conclusions:

1. The compactor itself passes its offline contract and is still useful for removing irrelevant nested OCR burden.
2. The compactor did not solve this public NIM gateway failure, so the 504 should no longer be attributed primarily to the count of OCR evidence regions.

The public Gemma endpoint is now blocked for this validation path. Do not keep tuning the prompt, schema, or compaction thresholds from a failure that produced no model output.

Provider evidence:

- `/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11/gemma-output/codecademy_flash_sale_story-compacted-1/REQUEST_SENTINEL.json`

## Next Gate

Test the same Gemma 4 model on a deployment that is not behind this public gateway timeout. Preserve Field + List v1.1 and the compacted evidence exactly so the deployment path is the only changed variable. A successful path check still requires a genuinely fresh reference for the final semantic-quality gate.

No fallback model should be added, and SAM remains blocked until valid semantics pass.
