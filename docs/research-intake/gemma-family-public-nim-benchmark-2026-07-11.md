# Gemma-Family Public NIM Benchmark

- Date: 2026-07-11
- Reference: frozen Codecademy flash-sale Story
- Contract: Field + List v1.1
- Input: 16-region compacted OCR evidence
- Provider: NVIDIA public NIM endpoint
- Result: **No publicly callable Gemma-family candidate beat the quality/latency gate**

## Availability Check

NVIDIA's authenticated `/v1/models` catalog did not expose regular `google/gemma-4-26b-a4b-it`. It exposed:

- `google/gemma-4-31b-it`;
- `google/diffusiongemma-26b-a4b-it`;
- `google/gemma-3-12b-it`;
- `google/gemma-3n-e4b-it`;
- smaller Gemma variants that were not credible quality candidates for this semantic reconstruction task.

DiffusionGemma is based on Gemma 4 26B A4B, but it is a distinct diffusion-output model and was scored separately rather than represented as regular Gemma 4.

## Results

| Candidate | Provider result | Time | Semantic result |
| --- | --- | ---: | --- |
| Gemma 4 31B IT | HTTP 504 before output | ~225s | Unscored |
| DiffusionGemma 26B A4B IT | Completed | 2.922s | Failed strict JSON, v1.1 shape, creative boundary, and locked-raster policy |
| Gemma 3 12B IT | HTTP 404 before inference | immediate | Catalog function unavailable to this account |
| Gemma 3n E4B IT | HTTP 504 before output | ~214s | Unscored |

For comparison, Mistral Large 3 completed the same workload through the same gateway in about 60 seconds, but failed local semantic validation and several frozen semantic expectations.

## DiffusionGemma Detail

DiffusionGemma was exceptionally fast, but it did not honor `response_format.json_schema`. It returned fenced JSON with the wrong contract shape. Its draft also:

- treated the creative Codecademy logo as capture chrome;
- treated `FLASH SALE` as platform chrome;
- kept the native `LEARN MORE` sticker as creative CTA content;
- made the product-interface collage campaign-variable instead of one locked raster;
- omitted required contract properties and evidence ownership.

No repair or retry ran.

## Conclusion

The public NIM endpoint does not provide the intended regular Gemma 4 26B A4B comparison. The standard Gemma serving paths tested here timed out, while the fast diffusion variant lost too much contract and semantic quality.

This does not reject regular Gemma 4 26B A4B. It remains the best untested quality/speed hypothesis because it is a roughly 3.8B-active-parameter MoE with vision performance reported near Gemma 4 31B. It requires another provider or a dedicated deployment.

Replicate currently hosts an optimized regular Gemma 4 26B A4B endpoint:

- `prunaai/gemma-4-26b-a4b-fast`
- model page: <https://replicate.com/prunaai/gemma-4-26b-a4b-fast>
- pinned version observed during research: `007dac3717afbfb1ddade995c5fbff003a5a365660b8f8155b6bbb053eada6e4`

No Replicate request was made during this NIM phase.

## Decision

1. Stop testing smaller Gemma models on public NIM.
2. Do not adopt DiffusionGemma for semantic reconstruction.
3. Keep Mistral as a latency control, not a fallback.
4. If explicitly authorized, test the pinned Replicate Gemma 4 26B A4B deployment on a fresh provider branch.
5. Announce the single potentially billable Replicate request before submission.
6. Keep SAM blocked until one semantic candidate fully passes.

## Evidence

External benchmark root:

`/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11/gemma-family-output`

Each candidate directory preserves its request sentinel, prepared image, and raw response when one existed. No output was repaired or accepted after local validation failure.
