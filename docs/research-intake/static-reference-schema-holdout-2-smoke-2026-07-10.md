# Static Reference Schema-Enforced Two-Image Holdout

- Date: 2026-07-10
- Scope: Untouched semantic holdout after adding provider-native JSON Schema transport
- Model: Gemma 4 31B IT through NVIDIA NIM
- Transport: `response_format.json_schema`
- Requests: Exactly two, one per founder-supplied reference; no retry, repair model, fallback, SAM, Replicate, or image generation
- Gate: **Fail**

## Verdict

Gemma understood both ad formulas well, but neither response was safe to activate as authoritative Maker data.

The Onepage response passed strict JSON parsing and the Draft-07 schema, then failed Wiggly's semantic evidence invariant. The Marpipe response was strict JSON but violated the nested schema. This proves that provider-constrained decoding materially improves output reliability but does not replace local schema and semantic validation.

Do not run SAM from these rejected outputs and do not select the semantic pipeline yet.

## Frozen Expectations

Expectations, hashes, dimensions, chrome boundaries, Field/List counts, asset roles, and reroll requirements were saved before OCR or model output at:

`/Users/shaz/.graphify/benchmarks/static-reference-schema-holdout-2-2026-07-10/holdout-manifest.json`

| Reference | Expected structure |
| --- | --- |
| Onepage beta-testers Story | 4–5 creative Fields; 0 Lists; platform header, native link sticker, and footer controls excluded; offer, emoji, support copy, and creative CTA coordinated |
| Marpipe SKU image-to-video ad | 3–4 Fields; 1 four-item SKU-to-video List with an active item; Facebook chrome excluded; selected SKU, media, examples, and proof coordinated |

## Scorecard

| Gate | Result |
| --- | --- |
| Frozen input hashes | 2/2 pass |
| Local PaddleOCR | 2/2 pass |
| Strict JSON syntax | 2/2 pass |
| Draft-07 schema | 1/2 pass |
| Semantic invariants | 0/2 pass |
| Formula recovery | 2/2 pass |
| Automatic retries | 0 |
| Fallback models | 0 |
| SAM or Replicate calls | 0 |

PaddleOCR recovered 13 regions from Onepage in 4.114 seconds and 10 from Marpipe in 2.482 seconds. It garbled part of Onepage's supporting sentence and prefixed Marpipe's metric label with an extra character, but those OCR defects did not cause either gate failure.

## Onepage Result

### What passed

- Correctly identified a scarce beta-recruitment formula.
- Correctly detected that the source was a captured Story requiring a crop.
- Correctly returned zero Lists.
- Recovered the hook, setup, focal offer, supporting benefit, creative CTA, and test-tube metaphor.
- Created a useful offer reroll group for count, role, and emoji.

### Why it failed

- `text_05` (`50 Beta`) was assigned to both `spot_count` and `offer_title`. The exact-once evidence invariant rejected the draft.
- The `onepage.io` Story account header was treated as creative brand content despite the response claiming the header should be excluded.
- The native `Learn more` link sticker was treated as a creative Field.
- The creative CTA button and background treatment were not proposed as assets.
- The reroll group omitted the hook, supporting benefit, and creative CTA.
- Reconstruction and asset confidence remained high despite those misses.

This was a semantic-binding failure, not a JSON Schema failure.

## Marpipe Result

### What passed

- Correctly identified the static-product-image-to-generated-video formula.
- Correctly recovered the catalog-wide scale statement and performance proof.
- Correctly excluded every OCR-visible Facebook header, caption, and CTA region.
- Correctly identified a transformation List with an active example.
- Correctly proposed source product, result video, product gallery, and video gallery asset roles.

### Why it failed

- All four List value objects omitted required `field_key`. Draft-07 validation rejected the response before semantic activation.
- The four visible catalog examples were collapsed into one gallery pair, yielding two logical examples instead of four.
- The only reroll group coordinated the metric value and label; it did not coordinate the active SKU, source image, output video, example set, and proof.
- Direction arrows, the equals sign, and the green metric highlight were not proposed as assets.
- Confidence remained high despite the List and coordination misses.

This response demonstrates why local validation remains mandatory even with `response_format.json_schema`: valid JSON is not necessarily schema-conformant JSON.

## Benchmark Fix

The external runner now performs full Draft-07 validation before its semantic invariants. A regression fixture verifies that a List value missing `field_key` fails with a clear schema error instead of reaching the older checker and raising a Python `KeyError`.

Four offline contract tests pass.

## Decision

1. Keep `response_format.json_schema` for Gemma 4; it eliminated the prior Markdown-fence and malformed-JSON failure mode.
2. Keep local runtime schema validation and semantic invariants authoritative.
3. Keep Field, List, Reroll Group, and platform-boundary concepts. Both failures were binding or boundary failures, not evidence that the concepts are unnecessary.
4. Do not silently repair, automatically retry, or fall back when either validation stage fails.
5. Do not rerun or relabel these two references as untouched holdouts.
6. Do not spend SAM requests from rejected semantic output.
7. Before another holdout, simplify or strengthen List value binding and the explicit platform-chrome policy; keep the exact-once evidence rule unless a real Maker requirement proves that shared OCR evidence is necessary.

## Evidence

All inputs, frozen expectations, OCR results and overlays, request sentinels, raw provider responses, validation assessment, and the visual board are stored at:

`/Users/shaz/.graphify/benchmarks/static-reference-schema-holdout-2-2026-07-10`

Key files:

- `holdout-manifest.json`
- `ocr-output/*`
- `gemma-output/*/REQUEST_SENTINEL.json`
- `gemma-output/*/raw-response.json`
- `holdout-assessment.json`
- `holdout-result-board.png`

## Follow-Up

The offline [Field + List contract v1.1 revision](./field-list-contract-v1-1-offline-2026-07-11.md) subsequently replaced nullable List bindings with `key + ref_type + ref_id`, added explicit platform and repeated-example policies, and passed seven regression fixtures without making another provider request.
