# Replicate Gemma 4 26B A4B — Field + List v1.2 regression

Date: 2026-07-11

## Decision

Do not approve Replicate Gemma 4 26B A4B as Wiggly's production Maker-analysis model yet.

The pinned model is fast after warm-up and recovered the central formula on all three previously inspected regression references. It did not produce one officially valid v1.2 response, however. All three outputs copied the prompt schema's `$schema` metadata into the result as an extra top-level key. Diagnostic inspection also found substantive failures on two references and incomplete asset decomposition on all three.

This is evidence about regression behavior, not a final holdout score. These ads were previously inspected and their expected formulas were frozen before the v1.2 calls, but they are not untouched references.

## Guardrails

- Model: `prunaai/gemma-4-26b-a4b-fast`
- Pinned version: `007dac3717afbfb1ddade995c5fbff003a5a365660b8f8155b6bbb053eada6e4`
- Exactly three explicitly authorized Replicate predictions
- Sequential requests; no automatic retries
- No fallback model
- No SAM or media-generation request
- Replicate `predict_time` is the inference score; cold boot and queue time are reported separately
- Model output was never repaired into an official pass
- v1.2 offline suite: 11/11
- Immutable earlier contract suite: 9/9

Frozen manifest and raw artifacts live outside the product repository at:

`/Users/shaz/.graphify/benchmarks/static-reference-v12-regression-3-2026-07-11`

## Results

| Reference | Provider | Inference | Wall time | Official v1.2 | Diagnostic result after removing only copied `$schema` | Formula and List result | Asset result |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| Dumb Ads vs Smart Ads | Succeeded | 19.351 s | 290.427 s | Fail | Fail: scalar `side` values had no evidence | Formula understood, but returned two 2-item Lists rather than the required old-channel 3-item List plus new-benefit 3-item List | Returned only the Vibe logo; missed legacy-channel logos and the thumbs-down and rocket emojis |
| LinkedIn Effect | Succeeded | 20.276 s | 20.678 s | Fail | Fail: six OCR regions unowned | Correct contrast formula and exactly one four-row persona List; correctly excluded timestamp/views | Found four persona characters, but missed the author avatar, red ellipse, and white card |
| Meta breaking-news Story | Succeeded | 11.955 s | 12.426 s | Fail | Pass: Draft 7 plus 19/19 evidence ownership | Correct breaking-news formula, zero Lists, and correct Story chrome exclusion | Combined building, portrait, and circle into one background asset; did not expose the expected independent portrait/circle/news-panel candidates |

The first request spent about 269 seconds in cold boot or queue before 19.351 seconds of inference. The two warm requests completed end to end in about 21 and 12 seconds.

## Structural finding

All three responses were valid fenced JSON, but each contained this extra top-level property:

```json
{"$schema": "http://json-schema.org/draft-07/schema#"}
```

The contract correctly rejected it because v1.2 has a closed top-level object. The likely prompt defect is that the full Draft 7 schema was rendered as example content, including schema metadata. The narrow fix is to omit `$schema`, `$id`, `title`, and other descriptive metadata from the schema shown to the model while preserving the authoritative local schema unchanged. That changes the input representation, not the returned output, and therefore is not semantic repair.

The same copied key on 3/3 requests is deterministic enough to fix offline before another paid call.

## Semantic findings

### Dumb Ads vs Smart Ads

The model understood the overall before-versus-after mechanic but modeled the repeated content incorrectly:

- It paired Facebook Ads with Streaming TV Advertising in one two-item List.
- It put only the remaining two benefits in a second two-item List.
- It excluded Google Ads and Social Media Ads instead of preserving the three legacy channels.
- It represented a synthetic `side` scalar with no evidence, which v1.2 correctly rejected.
- It saw only the Vibe logo as an asset candidate.

This is a real quality failure, not an envelope-only failure.

### LinkedIn Effect

The model recovered the most important semantic structure:

- one social hot take;
- one real-life-versus-alter-ego comparison;
- exactly four coherent persona rows;
- each row kept its avatar, name, real description, and alter-ego description together;
- timestamp and view-count metadata were excluded.

It nevertheless omitted the two column labels and the duplicate name evidence on the right side of each row. The values were semantically right, but exact evidence ownership was incomplete. Asset discovery was also partial.

### Meta breaking-news Story

This was the strongest response. With the copied schema metadata removed only for diagnosis, it passed the full v1.2 schema and evidence validator:

- 19/19 OCR regions had exactly one owner;
- the wrapped headline remained one Field rather than becoming a fake List;
- the native account header, link sticker, message control, and `Ad` label were excluded;
- the building, authority figure, headline, and teaser remained one coherent reroll group.

The remaining weakness is asset granularity. One combined campaign-variable background is not enough control for a Maker who may want to replace the company/location and authority figure independently.

## What v1.2 fixed—and what it did not

v1.2 removed the unnecessary backing-Field indirection that caused the Codecademy failure. The LinkedIn response demonstrates that the model can use direct scalar List values correctly for a four-row record set.

v1.2 did not solve:

- deciding which repeated visual groups form separate Lists;
- complete OCR ownership when source values appear twice;
- consistent asset discovery and useful asset granularity;
- provider-side constrained generation on this Replicate deployment.

These are the remaining Maker-quality problems. Adding another List abstraction would be unnecessary complexity.

## Next gate

1. Build a metadata-free prompt schema projection offline. Do not relax the authoritative v1.2 schema and do not strip extra keys from model output in production.
2. Add fixtures proving the projected prompt schema cannot contain `$schema`, `$id`, `title`, or examples while local Draft 7 validation remains unchanged.
3. Add explicit prompt examples for two hard distinctions already represented by v1.2:
   - two parallel repeated sets versus one mixed comparison List;
   - repeated visual evidence for the same logical List value.
4. Keep asset candidates visible for Maker correction; do not call SAM until semantic normalization passes.
5. Run a genuinely fresh three-reference gate only after explicit authorization for the exact request count.

Production selection requires all fresh outputs to pass the official envelope, Draft 7, exact evidence ownership, frozen formula/List expectations, and a minimum useful asset-candidate gate. Gemma 26B remains a candidate, not the winner.
