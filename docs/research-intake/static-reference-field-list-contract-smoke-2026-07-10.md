# Static Reference Field + List Contract Smoke

- Date: 2026-07-10
- Scope: Read-only semantic-contract research; no product code changed
- Model: Gemma 4 31B IT through NVIDIA NIM
- Requests: Exactly five, one per frozen reference; no retry, repair model, fallback, SAM, Replicate, or image generation
- Result: 3 pass, 2 partial, 0 fail

## Verdict

The minimal **Field + List + Reroll Group** contract fixed the collection-overuse failure.

All five responses were structurally valid, accounted for every OCR evidence ID exactly once, and preserved the reusable formula. No response created a List from wrapped lines, metadata, or repeated package text. The listicle became exactly five logical rows containing number, multi-line title, and thumbnail asset.

The contract is good enough to retain. Two semantic cleanup cases remain before production selection:

1. David's collage produced one legitimate image-results List but found five of the six result scenes and excluded the two plus signs even though they explain the formula.
2. Justin Welsh's quote became one correct multi-evidence Field, but the engagement metrics were excluded instead of retained as evidence-bound proof.

The second issue is now represented by an `evidence_bound` Field policy. It does not justify another same-corpus retry. The first is an asset-counting and reconstruction-confidence test for the later SAM handoff and Maker review.

## Contract Tested

### Field

One logical editable value with one or more OCR evidence IDs. Wrapped text and repeated appearances may belong to one Field.

### List

Two or more interchangeable logical records with the same declared fields. A List item references Fields and assets, never raw OCR fragments. One optional logical item may be active.

### Reroll Group

Fields, Lists, and assets that must change coherently. A three-step claim is three Fields in one Reroll Group, not a List.

Every OCR evidence ID must appear exactly once in either a Field or excluded evidence. Capture chrome and incidental environment remain excluded rather than becoming reusable Fields.

## Results

| Reference | Old fragment items | Corrected result | Verdict |
| --- | ---: | --- | --- |
| David's collage | 37 | 3 Fields; 1 image List with 5 detected scene items | Partial: one of six scenes missed; plus signs excluded |
| Lucent billboard | 5 | 7 Fields; 0 Lists; one three-claim Reroll Group | Pass |
| Justin Welsh quote | 7 | 3 Fields; 0 Lists; three quote lines merged into one Field | Partial: engagement proof excluded |
| YouTube listicle | 15 | 11 Fields; 1 List with exactly 5 typed rows | Pass |
| YouTube social post | 23 | 6 Fields; 0 Lists; platform chrome excluded | Pass |

The five NIM calls completed in 42.48, 150.14, 196.78, 215.02, and 221.89 seconds. Latency remains acceptable for the stated three-to-five-minute Maker analysis goal, but the UI needs visible stage progress.

## Confidence Finding

Gemma returned separate formula, reconstruction, crop/chrome, and asset-confidence axes as required. The separation is correct, but the absolute scores remain optimistic: David's asset confidence was `0.9` despite missing one result scene, and no SAM masks or native reconstruction existed yet. Production confidence must be calibrated from measured stage evidence rather than accepted directly from the model.

## Decision

- Replace the previous Semantic Slot and Semantic Collection vocabulary with Maker-facing **Field** and **List**.
- Keep one optional `activeItemId` on a List for formats such as the Codex integrations.
- Keep Reroll Groups for coordinated Fields, Lists, and assets.
- Add `evidence_bound` for proof that GLM may not invent.
- Retain Gemma 4 31B IT as provisional semantic lead.
- Do not rerun this tuned corpus again now.
- Add three to five untouched references as holdouts before production selection.
- Use the normalized asset candidates to define a small, explicit SAM test only after the founder sees the exact paid request count.

## Evidence

All guarded request sentinels, raw responses, normalized outputs, contract tests, assessment JSON, and visual comparison are stored at:

`/Users/shaz/.graphify/benchmarks/static-reference-corpus-5-2026-07-10`

Key files:

- `test_contract_v2.py`
- `gemma-v2-output/*/semantic-analysis.json`
- `corpus-v2-assessment.json`
- `corpus-schema-before-after-board.png`
