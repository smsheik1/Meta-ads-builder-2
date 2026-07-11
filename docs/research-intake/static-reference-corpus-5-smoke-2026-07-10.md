# Static Reference Corpus: First Five-Image Smoke

- Date: 2026-07-10
- Scope: Read-only reconstruction research; no product code changed
- Inputs: Five founder-supplied saved references
- Paid segmentation: Not run
- Model policy: One Gemma request per image, no retry, no fallback

## Verdict

Gemma 4 31B IT understood the reusable ad formula in all five references. It is still the semantic-analysis leader.

The current evidence contract is not ready for Maker implementation. It overuses Semantic Collections whenever OCR returns repeated or multi-line text. That is a Wiggly schema failure, not a vision-model failure.

Do not run SAM across this corpus yet. Asset candidates first need to be normalized into logical slots, typed collection items, and confirmed creative bounds; segmenting the current noisy candidates would spend requests on the wrong objects.

## Frozen Inputs

Suitability was recorded before model outputs.

| Reference | Upfront expectation | Intended formula |
| --- | --- | --- |
| David's product collage | Supported, low confidence | Brand + product + style produces varied product scenes |
| Lucent billboard photo | Supported, low confidence; crop required | Intro + rhythmic three-step claim + explanation + CTA |
| Justin Welsh quote card | Supported, high confidence | Persona + contrarian claim + social proof |
| YouTube listicle capture | Supported, low confidence; crop/chrome required | Warning headline + five ranked mistakes |
| YouTube social-post capture | Supported, low confidence; crop/chrome required | Social-post narrative over matching media |

The frozen corpus manifest, file hashes, dimensions, and expectations are stored outside the repository at:

`/Users/shaz/.graphify/benchmarks/static-reference-corpus-5-2026-07-10/corpus-manifest.json`

## Results

| Measure | Result |
| --- | --- |
| Valid structured outputs | 5/5 |
| Formula recovery | 5/5 pass |
| Creative versus capture-chrome scope | 4 pass, 1 partial |
| Cross-brand adaptation | 4 pass, 1 partial |
| Clean collection modeling | 0 pass, 1 partial, 4 fail |
| Suitability calibration | 1/5 matched; Gemma marked all five high confidence |
| Blocking questions | 0 |
| Reported uncertainties | 0 |
| PaddleOCR latency | 17.25-second median; 313.13-second maximum |
| Gemma latency | 204.48-second median; 239.49-second maximum |

### Per-reference finding

- **David's collage:** formula, scope, and adaptation passed. Repeated package text and OCR fragments were incorrectly promoted into collections.
- **Lucent billboard:** formula, crop, scope, and adaptation passed. The three-step sentence sequence and two-line quote are slots or groups, not collections.
- **Justin Welsh quote:** formula passed. Name/handle, quote lines, and metrics were incorrectly modeled as collections; engagement counts were also treated as freely variable instead of evidence-bound proof.
- **YouTube listicle:** formula and chrome separation passed. Gemma found the five-item concept but flattened number and title fragments into 15 items instead of five typed records containing number, label, and image.
- **YouTube social post:** formula and chrome separation passed. Metadata, narrative lines, caption lines, and title lines are multi-evidence slots or groups, not interchangeable collections.

## Intake Performance Finding

The initial full-resolution Lucent street photo took PaddleOCR 313.13 seconds. A tall screenshot also failed to complete promptly. The corpus runner was then changed to preserve completed results and deterministically resize inputs whose longest edge exceeds 1,800 pixels to a 1,600-pixel maximum before OCR. The remaining two screenshots completed in 17.25 and 10.97 seconds.

This establishes a product requirement, not merely a benchmark optimization:

1. Normalize oversized input deterministically.
2. Show a proposed creative crop for photos and screenshots.
3. Let the Maker confirm or adjust it before expensive reconstruction.
4. Do not introduce another AI call only to crop the source.

## Contract Corrections

1. A Semantic Collection is only a finite set of interchangeable logical items.
2. One Semantic Slot may cite multiple OCR, mask, or asset evidence IDs.
3. Typed collection items may combine fields such as number, multi-line label, and image asset.
4. OCR region count never determines collection item count.
5. Social-proof values remain evidence-bound, optional, or fixed unless the Maker explicitly defines a verified variable source.
6. Replace one overall suitability confidence with separate formula, reconstruction, crop/chrome, and asset confidence axes.
7. Require visible uncertainties when any confidence axis is weak; a strong formula cannot imply easy reconstruction.

## Decision

- Keep Gemma 4 31B IT as the provisional semantic leader.
- Keep PaddleOCR as the text-evidence owner, with deterministic intake normalization.
- Keep SAM 3 as the asset-localization candidate, but defer this corpus run until the normalized semantic contract yields correct asset candidates.
- Revise the contract and acceptance suite before another five-reference semantic pass.
- Do not add a fallback model or weaken fail-visible behavior.

## Evidence

The reproducible corpus runner, OCR overlays, raw NIM responses, normalized outputs, assessment JSON, and visual comparison board are stored at:

`/Users/shaz/.graphify/benchmarks/static-reference-corpus-5-2026-07-10`

The aggregate assessment is `corpus-assessment.json`; the visual board is `corpus-summary-board.png`.
