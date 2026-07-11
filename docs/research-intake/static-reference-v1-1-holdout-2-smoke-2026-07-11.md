# Static Reference Field + List v1.1 Fresh Holdout

- Date: 2026-07-11
- Scope: Two fresh founder-supplied references after the v1.1 offline revision
- Model: Gemma 4 31B IT through NVIDIA NIM
- Transport: `response_format.json_schema`
- Requests: Exactly two; no retry, repair model, fallback, SAM, Replicate, or image generation
- Contract v1.1 gate: **Pass**
- Overall semantic-quality gate: **Fail — two partials**

## Verdict

The v1.1 contract fixed the structural failure class it was designed to fix.

Both fresh responses:

- returned strict JSON;
- passed the complete Draft-07 schema;
- accounted for every OCR evidence ID exactly once;
- passed all local semantic invariants;
- recovered a coherent reusable formula.

Neither response was ready to activate without Maker review. The Notification Center merged two overlapping cards, while the cartoon missed contextual visual elements and overestimated how much of a complex illustration should be campaign-variable.

Keep v1.1. Do not add another List representation or repair layer.

## Frozen Expectations and Adjudication

Hashes, dimensions, suitability expectations, formula, Field/List counts, assets, groups, and failure conditions were saved before OCR or model output at:

`/Users/shaz/.graphify/benchmarks/static-reference-v11-holdout-2-2026-07-11/holdout-manifest.json`

The frozen rubric marked the iPhone Notification Center unsupported because the source is entirely system UI. That expectation is ambiguous: the founder supplied it in direct response to a request for fresh ad references, and Gemma found a plausible native-notification advertising formula.

Preserve the frozen rubric for auditability, but do not count Gemma's `supported` classification as a reasoning failure. This case confirms the existing product requirement: when UI may be either capture chrome or the intended formula, the Maker must confirm the creative bounds and intent before reconstruction.

## Scorecard

| Gate | Result |
| --- | --- |
| Frozen hashes | 2/2 pass |
| Local PaddleOCR | 2/2 pass |
| Strict JSON | 2/2 pass |
| Draft-07 v1.1 | 2/2 pass |
| Local semantic invariants | 2/2 pass |
| Formula recovery | 2/2 pass |
| Final semantic quality | 0 pass, 2 partial |
| Automatic retries | 0 |
| Fallback models | 0 |
| SAM or Replicate calls | 0 |

## Notification-Center Result

Gemma's formula was strong: mimic a native notification stack, make one notification the brand's active offer, and retain supporting alerts to make the creative feel authentic.

### What passed

- Returned a typed notification List with an active promotional item.
- Coordinated the offer icon, title, and body.
- Excluded carrier, battery, date, time, calendar, Notification Center header, close control, and bottom controls.
- Accounted for all 44 OCR regions.
- Correctly surfaced uncertainty about the AirPods/Uber composite.

### Why it remained partial

- Three visible notification cards became two logical items.
- AirPods and Uber content were merged into one title/body pair.
- The AirPods and Uber icon regions became one asset.
- Personal supporting-notification content was marked `fixed_reference`.
- No Maker question asked whether phone UI itself was the intended formula.
- Confidence remained high despite the card-boundary ambiguity.

This is an occluded repeated-item completeness failure, not a v1.1 binding failure.

## Rainy-Cartoon Result

Gemma correctly identified a reusable illustrated checklist-plus-quote format.

### What passed

- Returned exactly one five-item task List.
- Kept the wrapped newspaper quote as one Field rather than a List.
- Kept quote attribution separate.
- Excluded low-confidence phone and reflection OCR fragments rather than hallucinating content.
- Coordinated the task List and quote in one narrative Reroll Group.
- Accounted for all 20 OCR regions.

### Why it remained partial

- The phone/date context was omitted instead of surfaced as uncertain Maker input.
- The phone-holding character and umbrella were omitted from asset candidates.
- Complex illustration pieces were marked `campaign_variable` with high confidence instead of defaulting to a locked raster.
- The quote retained OCR's incorrect `23 years` instead of flagging the visible `2-3 years` ambiguity.
- The Reroll Group omitted the checklist header and quote attribution.
- Every task Field used display role `active` even though the List has no active item.

The core List passed. The remaining problems concern source isolation, hybrid reconstruction, confidence, and presentation semantics.

## Decision

1. Keep Field + List contract v1.1 unchanged.
2. Keep Gemma 4 as provisional semantic leader; the pipeline is still not selected.
3. Use the existing Maker crop/intent confirmation for ambiguous UI-as-formula references instead of creating platform-specific classifiers.
4. Extend the repeated-example rule to overlapping cards: occlusion never merges distinct visual containers.
5. Default complex illustrated scenes to one locked raster unless the Maker explicitly marks parts replaceable.
6. Calibrate reconstruction and asset confidence from downstream evidence rather than Gemma self-scores.
7. Do not rerun or relabel these references as untouched holdouts.
8. Do not run SAM from partial semantic outputs.

## Evidence

All frozen inputs, OCR outputs, raw and validated responses, sentinels, assessment, and visual board are stored at:

`/Users/shaz/.graphify/benchmarks/static-reference-v11-holdout-2-2026-07-11`

Key files:

- `holdout-manifest.json`
- `ocr-output/*`
- `gemma-output/*/REQUEST_SENTINEL.json`
- `gemma-output/*/raw-response.json`
- `gemma-output/*/semantic-analysis.json`
- `holdout-assessment.json`
- `holdout-result-board.png`

## Follow-Up

The subsequent [offline semantic-policy refinement](./semantic-policy-refinements-offline-2026-07-11.md) kept v1.1 unchanged, added explicit occluded-card, UI-intent, and locked-raster policies, and passed nine regression fixtures without another provider request.
