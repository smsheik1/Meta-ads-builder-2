# Minimal Maker Analysis — Gemma 31B NIM

Date: 2026-07-11

## Result

The minimal contract completed on the same compacted Codecademy reference in **59.979 seconds**. The previous v1.1 contract returned NVIDIA HTTP 504 around 225 seconds.

| Measure | Previous contract | Minimal MVP contract |
| --- | ---: | ---: |
| Prompt characters | 9,487 | 1,563 |
| Schema characters | 5,705 | 3,027 |
| Maximum output tokens | 8,192 | 4,096 |
| Observed prompt tokens | unavailable after 504 | 709 |
| Observed completion tokens | unavailable after 504 | 625 |
| Result | 504 before output | valid JSON in 59.979s |

The active MVP output contains only:

- formula;
- Fields;
- Lists;
- assets;
- Reroll Groups;
- up to three Maker questions.

No retry, fallback, SAM, media generation, output repair, confidence matrix, exclusion essay, or duplicated prompt schema ran.

## Semantic score

Passed:

- correct flash-sale formula;
- one three-item benefit List;
- `50% OFF` preserved as one Field;
- dense product-interface collage kept as one locked asset;
- most native Story metadata left unassigned for Maker review.

Still partial:

- native `LEARN MORE` sticker became a creative Field;
- Codecademy wordmark became a brand Field rather than a logo asset;
- first checklist item was marked active without visual evidence;
- three unnecessary Maker questions repeated information visible in the reference;
- reroll coherence omitted the benefits and collage.

## Decision

The public Gemma 31B NIM path works with a small contract. The previous request was overbuilt enough to cross the hosted timeout on this reference.

Keep the minimal contract. Do not restore removed confidence, exclusion, ordering, or uncertainty machinery. Before another fresh request, refine only the observed boundary, logo, active-item, question, and coherence rules. Gemma 31B returns to provisional semantic lead, not production-selected status.
