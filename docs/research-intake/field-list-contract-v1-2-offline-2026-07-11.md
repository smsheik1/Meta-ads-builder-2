# Field + List Contract v1.2 Offline Revision

- Date: 2026-07-11
- Scope: Research schema, parser boundary, validator, architecture contract, acceptance plan, and offline fixtures
- Product-code impact: None
- Provider requests: None
- Result: **11/11 v1.2 tests and 9/9 v1.1 regression tests pass**

## Decision

Gemma 4 26B A4B remains the provisional semantic candidate for the Maker-analysis stage. Contract v1.2 removes the repeated backing-Field failure class before any fresh paid holdout.

This does not select the model for production. Three genuinely fresh v1.2 holdouts remain the final model gate.

## Why v1.1 Was Too Indirect

In v1.1, every scalar value inside a List had to be declared twice:

1. as a top-level Field containing source value and evidence;
2. as a List value pointing back to that Field ID.

```json
{
  "id": "benefit_1_text",
  "source_value": "700+ courses in AI, cloud, & more",
  "evidence_ids": ["text_10"]
}
```

```json
{
  "key": "text",
  "ref_type": "field",
  "ref_id": "benefit_1_text"
}
```

Mistral Large 3 and Gemma 4 26B A4B independently understood the three-benefit List but invented or omitted its backing Fields. This is cross-model evidence that the representation—not only the models—was creating avoidable failure.

## Direct Item Ownership

Version 1.2 keeps singleton content as ordinary top-level Fields and lets scalar List values own their content and evidence directly:

```json
{
  "key": "text",
  "value": "700+ courses in AI, cloud, & more",
  "evidence_ids": ["text_10"]
}
```

Every List value has the same three keys:

```text
key + value + evidence_ids
```

- The Maker-declared item field owns the `text`, `number`, `url`, or `asset` type; values do not repeat it.
- For scalar fields, `value` is literal source content and `evidence_ids` is nonempty.
- `asset` values use `value` as an existing asset ID and keep `evidence_ids` empty because the asset owns its evidence.
- Nullable alternatives, hidden backing Fields, and `oneOf` branches are absent.

## Asset Evidence and Dense OCR

Assets now declare `evidence_ids`.

A synthetic dense-text cluster such as `text_cluster_01` may be owned only by:

- one `locked_raster` asset; or
- one explicit exclusion.

It cannot become an ordinary Field or scalar List value. This preserves all child OCR evidence for audit while keeping tiny text inside a screenshot collage from pretending to be independently editable.

The Codecademy regression fixture now has:

- two singleton Fields: sale badge and discount;
- one three-item benefit List with three direct scalar values;
- one brand-bound logo asset;
- one locked product-interface collage owning `text_cluster_01`;
- the native `LEARN MORE` sticker in capture-chrome exclusions;
- all 16 compact evidence IDs owned exactly once.

## Structured-Output Boundary

The pinned Replicate endpoint does not expose provider-native JSON Schema enforcement and returned one otherwise parseable object inside a standard Markdown fence.

v1.2 permits only:

1. one bare JSON object; or
2. one exact `json` Markdown fence containing that object and nothing else.

Prose, generic or nested fences, malformed JSON, missing keys, undeclared keys, and semantic-contract failures still stop visibly. This is deterministic transport-envelope normalization; it does not invent, delete, or rewrite semantic content.

## Offline Tests

Eleven v1.2 fixtures cover:

1. Codecademy direct benefits plus locked cluster ownership.
2. Bare JSON and one exact fence equivalence.
3. Rejection of prose or non-exact fences.
4. Rejection of the old v1.1 backing-Field reference shape.
5. Locked-raster enforcement for dense clusters.
6. Rejection of clusters as scalar List content.
7. Evidence requirements for scalar List values.
8. Asset List references without duplicate evidence.
9. Unknown-asset rejection.
10. Duplicate and missing evidence rejection.
11. Codex active-item membership plus wrapped singleton grouping.

All nine existing v1.1 contract tests still pass against the immutable v1.1 runner and schema.

## Complexity Ruling

The readable schema grows only to support asset evidence and synthetic cluster IDs. The model's required output becomes simpler: repeated scalar content no longer requires top-level backing Fields, cross-object Field references, or a repeated type tag on every value.

This revision does not add:

- another semantic concept;
- a repair model;
- an automatic retry;
- a fallback model;
- platform-specific screenshot classifiers;
- another renderer or scene contract;
- product code.

Field, List, asset, exclusion, and Reroll Group remain the semantic vocabulary.

## Updated Architecture and Acceptance

The architecture contract now makes direct List ownership and asset evidence authoritative. The acceptance plan now requires exact ownership across Fields, List values, assets, and exclusions and distinguishes deterministic JSON-envelope normalization from semantic repair.

Gemma 4 26B A4B is recorded as provisional only. Its cold boot/queue remains separate from inference time, and it must pass three fresh v1.2 holdouts before selection.

## Evidence

Checked-in schema:

- [`field-list-analysis-v1.2.schema.json`](./schemas/field-list-analysis-v1.2.schema.json)

External offline validator and fixtures:

`/Users/shaz/.graphify/benchmarks/static-reference-semantic-final-holdout-2026-07-11`

Key files:

- `contract_v1_2.py`
- `test_contract_v1_2.py`

No provider, Replicate, SAM, or media-generation request ran in this phase.
