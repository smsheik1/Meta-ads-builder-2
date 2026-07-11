# NIM Timeout Isolation: Mistral Control

- Date: 2026-07-11
- Reference: frozen Codecademy flash-sale Story
- Endpoint: NVIDIA public NIM chat-completions gateway
- Control model: Mistral Large 3 675B Instruct 2512
- Result: **Provider path completed in about 60 seconds; semantic validation failed locally**

## Question

Did Gemma time out because the Codecademy image, compacted OCR evidence, Field + List v1.1 schema, or NVIDIA's public gateway makes this workload universally too slow?

## Controlled Change

The control imported the frozen Gemma semantic runner and changed only the model ID to:

`mistralai/mistral-large-3-675b-instruct-2512`

The image, 16-region compacted OCR summary, prompt, Field + List v1.1 JSON Schema, `response_format.json_schema`, temperature, seed, 8,192-token ceiling, and local validators remained the same.

One Gemma-specific transport option could not remain identical: NVIDIA rejected the first Mistral submission before inference because Mistral tokenizers do not support `chat_template_kwargs.enable_thinking`. The founder explicitly authorized one corrected submission with only that unsupported transport flag omitted. This is model-specific request normalization, not a prompt or semantic-contract change.

## Result

The corrected Mistral request:

- completed through the same public NVIDIA gateway in approximately 60 seconds;
- returned one complete response with `finish_reason: stop`;
- used 2,866 prompt tokens and 2,395 completion tokens;
- returned strict JSON;
- passed the full Draft-07 Field + List v1.1 schema;
- failed the local exact-evidence invariant because `text_cluster_01` was omitted;
- accounted for the other 15 of 16 compact semantic evidence IDs with no duplicates.

No second corrected request, output repair, fallback, SAM, Replicate, or image generation ran.

## Root-Cause Conclusion

The Codecademy image, v1.1 schema, compacted evidence, and public gateway are not universally incapable of completing this workload before the gateway timeout. Mistral completed the same semantic workload far below Gemma's roughly 225-second failure point.

The timeout is therefore isolated to the **Gemma 4 path on NVIDIA NIM**: either Gemma inference/constrained decoding is too slow for this workload, or Gemma's shared backend is materially more congested or underprovisioned. This control cannot distinguish model architecture from backend capacity, but it rules out a universal request-size or gateway failure.

This is not evidence to adopt Mistral as a product fallback. Its response failed a required semantic invariant, and the locked no-fallback policy remains unchanged.

## Quality Note

Mistral recovered the main flash-sale formula, eight Fields, one List, and five assets, but it ignored the synthetic dense-text cluster rather than assigning it to a Field or exclusion. That is a real quality failure even though the structured response completed.

## Decision

1. Stop retrying Gemma 4 on the public endpoint for this workload.
2. Keep Gemma's semantic quality unscored from the output-free 504s.
3. Keep Mistral as a latency control, not a selected model or fallback.
4. If Gemma remains required, test the exact frozen request on a dedicated or self-hosted Gemma deployment.
5. Do not change Field + List v1.1 or compaction thresholds because of Gemma's output-free timeout.
6. Keep SAM blocked until the selected semantic path returns a fully valid result.

## Evidence

External benchmark directory:

`/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11/mistral-output/codecademy_flash_sale_story-compacted-corrected-1`

Key files:

- `REQUEST_SENTINEL.json`
- `raw-response.json`
- `vision-input.jpg`

There is intentionally no accepted `semantic-analysis.json` because local semantic validation failed.
