# Maker live-analysis route smoke

Date: 2026-07-11

## Working evidence

- The product route now runs local PaddleOCR, the six-key Gemma 4 31B NIM contract, conditional SAM 3 refinement, deterministic composition, and the existing `static-package` normalizer.
- PaddleOCR completed on five founder references with 7–40 detected regions. Total initialization plus prediction time was 4.27–9.60 seconds per image.
- Previously saved, valid Gemma outputs for Codex and LinkedIn normalized into publishable drafts with 10 and 16 layers. Serialized drafts were 222 KB and 554 KB.
- Playwright used the saved Codex provider output to verify upload, reconstruction, List-to-layer edits, text/color/geometry edits, skill edits, immutable publish, reload parity, and fail-visible invalid output.
- Browser inspection exposed axis-aligned inflation of rotated OCR polygons. The normalizer now preserves oriented width, height, and angle, with a regression assertion.
- No `/create` files, scene union, renderer, or fallback model changed.

## Live provider evidence

Three explicitly announced, one-shot Gemma requests stopped before model output:

1. Justin Welsh reference with the initial 1600px OCR image: client timeout at 300 seconds.
2. Justin Welsh reference after restoring the proven 1024px vision input: client timeout at 300 seconds.
3. Known Codex reference with the 1024px vision input and the approved Draft-07 schema imported verbatim: client timeout at 300 seconds.

Each attempt used `google/gemma-4-31b-it`, `response_format.json_schema`, temperature 0, seed 777, 4096 maximum tokens, no retry, no repair, and no fallback. SAM made zero calls because Gemma never returned asset candidates.

The first attempt did expose one application defect—the semantic request reused the larger OCR image—and that defect is fixed. The final known-reference request still timed out after the image size and schema matched the product contract, while the same reference had previously completed in 25.100 seconds. Current live acceptance is therefore blocked by the public Gemma NIM path, not by the local OCR, normalizer, editor, or fixture-backed browser flow.

A continuation probe isolated the hosted model from Wiggly's multimodal request. NVIDIA's `/v1/models` catalog returned HTTP 200 and still listed `google/gemma-4-31b-it`, but a same-model text-only request containing only “Reply with OK,” with no image, schema, or structured-output transport and only eight output tokens, returned zero bytes before a 45-second client timeout. This rules out Wiggly's image size, OCR evidence, Draft-07 schema, and SAM handoff as the active timeout cause.

## Decision

Keep the working route and fail-visible behavior. Do not add retries, a backup model, more schema versions, or speculative jobs infrastructure. The next live check should use the same model on a non-public-gateway deployment or wait for the NVIDIA endpoint to recover. Until then, use the saved successful provider output for repeatable Playwright QA.
