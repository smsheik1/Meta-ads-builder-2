# Field + List Contract v1.1 Offline Revision

- Date: 2026-07-11
- Scope: Research schema, prompt policy, validator, and offline regression fixtures only
- Product-code impact: None
- Provider requests: None
- Result: **7/7 offline tests pass**

## Why This Revision Exists

The first schema-enforced untouched holdout recovered both ad formulas but failed safe activation:

- Onepage reused one OCR region across two Fields and treated native Story UI as creative content.
- Marpipe omitted required List binding keys and collapsed four distinct SKU-to-video examples into one gallery pair.

The fix deliberately removes representation choices instead of adding a repair layer.

## Smaller List Binding

Version 1 represented one List value with two nullable IDs and a schema branch:

```json
{
  "field_key": "source_image",
  "field_id": null,
  "asset_id": "cardigan"
}
```

Version 1.1 has one legal shape:

```json
{
  "key": "source_image",
  "ref_type": "asset",
  "ref_id": "cardigan"
}
```

Consequences:

- no nullable alternative IDs;
- no `oneOf` branch;
- no possibility of setting both IDs or neither ID;
- one generic representation for Field and asset references;
- local validation still confirms that `ref_type` matches the Maker-declared item field and that `ref_id` exists.

The minified schema shrank from 5,392 to 5,245 bytes. The readable checked-in schema shrank from 255 to 241 lines.

## Three Explicit Prompt Policies

### Platform boundary

Status bars, account headers, progress indicators, native CTA stickers or buttons, captions, footers, reactions, and controls are `capture_chrome`. They remain excluded even when they contain the advertiser's name, logo, or CTA text.

This is one cross-platform rule, not separate Instagram, Facebook, TikTok, or YouTube parsers.

### Repeated examples

Repeated rows, cards, thumbnails, and input-output pairs produce one List `source_item` per visually distinct logical example. A repeated set may not be collapsed into one gallery asset. A large active presentation and its matching thumbnail remain one semantic item.

### Evidence ownership

Each OCR evidence ID has one owner. When splitting a phrase would require sharing one OCR region, the MVP keeps the entire phrase as one compound Field. For Onepage, `50 Beta Testers` is one focal Field rather than introducing character spans or overlapping evidence bindings.

## Offline Regression Fixtures

Seven tests now cover:

1. Wrapped text becomes one multi-evidence Field.
2. Typed listicle rows bind Fields and assets through the v1.1 reference shape.
3. Duplicate OCR evidence is rejected.
4. The old nullable v1 List value is rejected.
5. Onepage excludes the account header and native link sticker while keeping one compound focal offer.
6. Marpipe preserves four separate SKU-to-video items and one active item.
7. Prompt policy constants explicitly name the platform-chrome, gallery-collapse, and shared-evidence failure classes.

The runner performs Draft-07 validation before semantic invariants. Invalid output fails visibly; no parser heuristic, repair, retry, or fallback runs.

## Complexity Ruling

This revision reduces contract complexity. It does not add:

- OCR character spans;
- overlapping Field ownership;
- platform-specific screenshot engines;
- automatic repair agents;
- retry or fallback models;
- another renderer, scene model, state store, or product surface.

Field, List, asset, and Reroll Group remain the only reusable semantic concepts.

## Decision

1. Keep v1 immutable as historical benchmark evidence.
2. Use v1.1 for the next semantic holdout.
3. Do not rerun the Onepage or Marpipe references as untouched holdouts.
4. Do not make another provider request until new references are frozen.
5. Do not run SAM until a new semantic holdout passes.
6. Do not port the research contract into product code until the holdout gate passes and the founder approves the implementation phase.

## Evidence

Checked-in schema:

- [`field-list-analysis-v1.1.schema.json`](./schemas/field-list-analysis-v1.1.schema.json)

External benchmark runner and offline fixtures:

`/Users/shaz/.graphify/benchmarks/static-reference-corpus-5-2026-07-10`

Key files:

- `field-list-analysis-v1.1.schema.json`
- `run_gemma_corpus_item.py`
- `test_contract_v2.py`
