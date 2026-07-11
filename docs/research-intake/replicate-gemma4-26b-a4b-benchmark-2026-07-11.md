# Replicate Gemma 4 26B A4B Benchmark

- Date: 2026-07-11
- Model: `prunaai/gemma-4-26b-a4b-fast`
- Pinned version: `007dac3717afbfb1ddade995c5fbff003a5a365660b8f8155b6bbb053eada6e4`
- Provider: Replicate
- Reference: frozen Codecademy flash-sale Story
- Requests: one explicitly authorized, potentially billable prediction
- Result: **Fast inference; failed strict output and semantic contract**

## Timing

Replicate exposed separate lifecycle metrics:

| Metric | Time |
| --- | ---: |
| Cold boot and queue | ~230.66s |
| Model `predict_time` | **20.664s** |
| Total first-call time | 251.321s |

Per founder direction, the cold boot and queue time is not counted against inference speed. The scored model latency is **20.664 seconds**.

The model is substantially faster than:

- Mistral Large 3 on the same workload: about 60 seconds;
- Gemma 4 31B through public NIM: 504 around 225 seconds;
- Gemma 3n E4B through public NIM: 504 around 214 seconds.

No warm rerun was made. Replicate's own `predict_time` provides the inference-only number without purchasing a second request.

## Request Controls

The prediction used:

- the exact frozen Codecademy image prepared by the semantic runner;
- the 16-region compacted OCR evidence;
- the same Field + List v1.1 expected shape and semantic policies;
- `max_tokens: 8192`;
- `temperature: 0`;
- `enable_thinking: false`;
- `max_visual_tokens: 1120` for maximum visual detail;
- the pinned Replicate version above.

Replicate's model schema does not expose NVIDIA-style `response_format.json_schema`. Strict JSON therefore remained a prompt requirement plus local validation, not provider-constrained decoding.

## Strict Output Result

The provider completed successfully, but the model wrapped its object in a Markdown `json` fence. The production parser correctly rejected it. No fence stripping, repair, retry, or fallback ran.

For diagnostic scoring only, removing the fence revealed one JSON object that passed the static Draft-07 schema. That diagnostic object was not accepted as output.

## Semantic Result

### Correct or promising

- recognized the intended creative and required crop;
- recovered the flash-sale plus oversized-discount formula;
- created one three-item benefit List;
- recognized the Codecademy brand logo as a brand-bound asset;
- produced a coherent high-level promotional Reroll Group.

### Failed

- omitted evidence ownership for `text_10`, `text_11`, `text_12`, and `text_cluster_01`;
- referenced nonexistent `feature_1_text`, `feature_2_text`, and `feature_3_text` Fields from the benefit List;
- treated the native `LEARN MORE` sticker as creative CTA content instead of capture chrome;
- split the complex product-interface collage into three campaign-variable UI assets instead of one locked raster;
- created an additional product-showcase List that the frozen expectation rejects;
- excluded creative logo evidence `text_06` as chrome while separately proposing a creative brand-logo asset.

The failure is deeper than Markdown fencing. A permissive parser would still produce the wrong reusable Format.

## Verdict

Gemma 4 26B A4B is the current latency leader among serious semantic candidates, but it is not selected for production from this result.

Its useful signal is that strong Gemma-family vision can run in about 21 seconds on an optimized deployment. Its blocking signal is that the current model-plus-contract combination still behaves like a plausible design describer rather than a trustworthy Wiggly Format compiler.

Do not add fence repair or a second model. First decide whether repeated model failures around List backing Fields indicate a prompt defect or an unnecessarily indirect contract. That decision should be made from the cross-model evidence, not by tuning again on Codecademy.

## Guardrails

- automatic retry: no;
- warm rerun: no;
- output repair: no;
- fallback model: no;
- SAM requests: zero;
- media-generation requests: zero.

## Evidence

External benchmark directory:

`/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11/replicate-output/gemma-4-26b-a4b-fast-1`

Key files:

- `PAID_REQUEST_SENTINEL.json`
- `prediction.json`
- `model-output.txt`
- `validation-failure.json`

Replicate model and schema:

- <https://replicate.com/prunaai/gemma-4-26b-a4b-fast>
- <https://replicate.com/prunaai/gemma-4-26b-a4b-fast/api/schema>
