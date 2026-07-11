# Semantic Policy Refinements Offline

- Date: 2026-07-11
- Scope: Research prompt policy and offline regression fixtures only
- Product-code impact: None
- Schema change: None
- Provider requests: None
- Result: **9/9 offline tests pass**

## Purpose

The first fresh v1.1 holdout passed every structural gate but produced two partial semantic drafts:

- overlapping AirPods and Uber notification cards were merged;
- native phone UI could plausibly be either capture chrome or the intended formula;
- a complex illustrated scene was split into overconfident campaign-variable assets.

These are policy gaps, not reasons to add another schema or repair system.

## Refinement 1: Occluded Containers Stay Separate

Every visible row, card, thumbnail, or input-output pair remains one List item even when partially hidden behind another container. Text, icons, and bodies may not cross a visible container boundary.

The new fixture represents three overlapping notification cards:

- Do Not Disturb supporting alert;
- AirPods supporting alert;
- Uber active promotional alert.

It validates three distinct typed List items and keeps Uber active.

## Refinement 2: UI-as-Formula Uses Existing Maker Confirmation

Native platform UI outside the Maker-confirmed target creative remains `capture_chrome`.

When operating-system or application UI might itself be the reusable formula, analysis must not silently decide. It returns its best provisional draft, lowers crop/chrome confidence, and uses the existing `maker_questions` array to ask one question confirming whether the UI belongs in the Format.

This adds no UI classifier and no platform-specific parser. It relies on the already-approved Maker crop/intent confirmation.

## Refinement 3: Complex Illustration Defaults Locked

A complex illustration or photographic scene defaults to one `locked_raster` asset. Separate campaign-variable assets are proposed only when each part has a clear independent boundary and a Maker would plausibly replace it independently.

Characters and background pieces do not become campaign-variable merely because replacement is theoretically possible.

This preserves the hybrid-reconstruction MVP boundary: native editable text over a faithful locked visual scene, with later Maker control to unlock, replace, or redraw.

## Offline Coverage

The existing seven tests still pass. Two new regression fixtures add:

1. Three overlapping notification cards remain three List items with one active brand offer and one UI-intent Maker question.
2. A complex rainy cartoon scene remains one `locked_raster` asset while its text stays native.

Total: **9/9 tests pass**.

## Complexity Ruling

This revision adds no new semantic concept. It reuses:

- `List.source_items` for occluded cards;
- `maker_questions` for UI intent;
- `locked_raster` for complex art.

It does not add:

- a new schema version;
- OCR spans or overlap ownership;
- Instagram, iOS, Facebook, or platform-specific detectors;
- a repair agent;
- automatic retry or model fallback;
- SAM or image generation;
- another renderer, state store, or product surface.

## Decision

1. Keep Field + List v1.1 unchanged.
2. Use these three policies in the next fresh semantic holdout.
3. Do not rerun prior holdouts as untouched evidence.
4. Do not run SAM until semantic quality passes.
5. Do not port the research runner into product code until the semantic gate passes and the founder approves implementation.

## Evidence

External benchmark runner and regression fixtures:

`/Users/shaz/.graphify/benchmarks/static-reference-corpus-5-2026-07-10`

Key files:

- `run_gemma_corpus_item.py`
- `test_contract_v2.py`
