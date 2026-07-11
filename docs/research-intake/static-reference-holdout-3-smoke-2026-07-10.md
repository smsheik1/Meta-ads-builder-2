# Static Reference Three-Image Holdout Smoke

- Date: 2026-07-10
- Scope: Untouched holdout test of the Field + List + Reroll Group contract
- Model: Gemma 4 31B IT through NVIDIA NIM
- Requests: Exactly three, one per frozen reference; no retry, repair model, fallback, SAM, Replicate, or image generation
- Gate: **Fail**

## Verdict

The corrected semantic concepts remain promising, but the pipeline did not pass untouched holdouts.

PaddleOCR passed all three references locally in 5.34 to 8.31 seconds and recovered 19 to 40 text regions. Only one of three Gemma calls produced a structurally valid response. That valid response was semantically partial. One call returned malformed JSON and one ended with NVIDIA HTTP 504.

Do not claim that the semantic contract generalizes yet. Do not run SAM from these outputs.

## Frozen Expectations

The file hashes, dimensions, expected formula, expected Field/List counts, expected Reroll Groups, chrome boundaries, and asset expectations were saved before OCR or model output at:

`/Users/shaz/.graphify/benchmarks/static-reference-holdout-3-2026-07-10/holdout-manifest.json`

The frozen expectations were:

| Reference | Expected Lists | Expected structure |
| --- | ---: | --- |
| Dumb Ads vs Smart Ads | 2 | Three old channels; three new benefits; coherent comparison Fields and assets |
| LinkedIn Effect meme | 1 | Four persona rows containing name, real-life description, alter-ego description, and character assets |
| Meta breaking-news Story | 0 | Breaking-news label, one multi-line headline, one teaser, Story chrome excluded |

## Results

| Reference | OCR | Semantic result | Verdict |
| --- | --- | --- | --- |
| Dumb Ads vs Smart Ads | 21/21 regions available | NVIDIA returned HTTP 504; no model output | Fail visible |
| LinkedIn Effect meme | 40/40 regions available | `finish_reason: stop`, but content began with malformed `{ {`; parser rejected it | Fail visible |
| Meta breaking-news Story | 19/19 evidence IDs accounted | 4 Fields, 0 Lists, 1 Reroll Group | Partial |

The malformed LinkedIn response was 11,002 characters and used 3,141 completion tokens. Its prose appeared semantically promising, but it is not a pass: invalid contract output must never enter the authoritative draft.

The valid Story response correctly grouped the seven OCR fragments of the primary headline into one Field, grouped the two teaser fragments into one Field, returned zero Lists, and excluded the status bar, account header, message input, and `Ad` label. It still disagreed with the frozen target:

- It treated the Instagram link sticker as reusable creative content.
- It excluded the Meta wordmark inside the intended background as incidental.
- It omitted the red portrait circle and headline panels from proposed assets.
- It reported high reconstruction and asset confidence despite those misses.

## Root Cause

The benchmark runner used a JSON-shaped prompt plus local validation, not an actual provider-enforced JSON Schema. That is insufficient. NVIDIA's official structured-generation documentation recommends `guided_json` for reliability and downstream schema conformance:

- [NVIDIA NIM structured generation](https://docs.nvidia.com/nim/large-language-models/1.15.0/structured-generation.html)

The malformed response is therefore partly a benchmark-integration defect, not proof that Field and List are wrong. The HTTP 504 is a real provider failure and must remain visible under the no-fallback policy.

## Decision

1. Keep Field, List, and Reroll Group as the semantic concepts.
2. Do not promote the Gemma semantic pipeline to production selection.
3. Replace prompt-only JSON with a versioned provider-native `guided_json` schema, followed by local runtime validation.
4. Reject invalid output without a repair model or silent parser heuristic.
5. Keep provider 504 visible; any retry must be an explicit new user action, never an automatic fallback.
6. Exclude platform-supplied Story link stickers by default; the Maker may intentionally recreate a native CTA Field and shape.
7. Calibrate reconstruction and asset confidence from actual OCR, crop, SAM, and normalization evidence rather than the model's self-score.
8. Do not retry these three references or relabel them as untouched holdouts after the pipeline changes.
9. Run a small synthetic `guided_json` capability probe, then use three new untouched references for the next holdout gate.
10. Do not spend SAM requests until the semantic gate passes.

## Evidence

All frozen inputs, OCR overlays, request sentinels, raw responses, valid normalized output, assessment JSON, and visual board are stored at:

`/Users/shaz/.graphify/benchmarks/static-reference-holdout-3-2026-07-10`

Key files:

- `holdout-manifest.json`
- `ocr-output/*`
- `gemma-output/*/REQUEST_SENTINEL.json`
- `gemma-output/linkedin_effect_social_meme/raw-response.json`
- `gemma-output/meta_breaking_news_story/semantic-analysis.json`
- `holdout-assessment.json`
- `holdout-result-board.png`
