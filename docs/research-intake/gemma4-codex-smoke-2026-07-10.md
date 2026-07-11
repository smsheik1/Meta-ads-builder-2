# Gemma 4 Codex-Reference Semantic Smoke

- Status: One-image semantic and Gemma-to-SAM handoff smoke passed
- Date: 2026-07-10
- Model: [Gemma 4 31B IT](https://build.nvidia.com/google/gemma-4-31b-it) through NVIDIA NIM
- Segmentation handoff: Pinned `vufinder/sam3` Replicate deployment
- Product-code impact: None

Related Wiggly documents:

- [MiniMax M3 smoke](./minimax-m3-codex-smoke-2026-07-10.md)
- [Vision + SAM 3 smoke](./vision-sam3-codex-smoke-2026-07-10.md)
- [PaddleOCR smoke](./paddleocr-codex-smoke-2026-07-10.md)
- [Open-source ledger](../static-format-package-open-source-ledger.md)

## 1. Verdict

Gemma 4 31B produced the best semantic reconstruction obtained for the Codex reference so far. It correctly recognized the current `Codex + handshake + Slack` focal state, the six faded items, and the footer logo/CTA. It bound every OCR string and both non-text assets into exactly the three groups required by the original benchmark.

Later contract review found that the original benchmark was incomplete: `Slack` is also a member of the seven-item integration collection and merely happens to be active in this frame. Gemma captured the current display state but was never asked to represent collection membership and active selection separately. The result remains useful, but the saved-reference corpus must use the revised Semantic Collection contract.

Its short concept prompts also handed off cleanly to SAM 3. The handshake mask was identical to the earlier simple-prompt result. The selected logo mask overlapped the earlier result by 99.73%, while its confidence improved from 0.738 to 0.910.

Gemma is now the **provisional semantic benchmark leader** for the Maker analysis pipeline. It is not production-selected from one reference. The semantic call took 69.13 seconds, and this was not a controlled model shootout: Gemma received the fuller Wiggly evidence contract and OCR strings, while the older MiniMax smoke used a narrower non-text schema. Gemma leads because it completed the more representative Wiggly task, not because the evidence proves intrinsic superiority under identical prompts.

## 2. Test Configuration

Input:

```text
/Users/shaz/Downloads/OAI_Knowledge-Worker_Static_AllPlugins_Emoji-bnw_US_1x1png.jpeg
```

| Setting | Value |
| --- | --- |
| Model | `google/gemma-4-31b-it` |
| Provider | NVIDIA NIM |
| Vision input | Same reference resized to 768 by 768 JPEG |
| OCR evidence | Nine exact strings supplied from the prior PaddleOCR smoke |
| Output | Strict JSON prompt, locally parsed and validated |
| Thinking | Disabled |
| Temperature | 0 |
| Seed | 777 |
| Semantic requests submitted | Exactly one; no repair, retry, or fallback |

The contract deliberately banned coordinates, dimensions, masks, and font guesses. Gemma owned semantic interpretation only; PaddleOCR and SAM retained geometry ownership.

## 3. Semantic Result

| Measurement | Result |
| --- | --- |
| NIM elapsed time | 69.13 seconds |
| Prompt tokens | 863 |
| Completion tokens | 985 |
| Total tokens | 1,848 |
| OCR strings bound | 9 of 9 |
| Original-rubric Reroll Groups | 3 of 3 |
| Correct non-text identities and roles | 2 of 2 |
| Valid JSON on first response | Yes |

Gemma recovered the intended formula:

- a hero product is paired with a primary partner through a relationship symbol;
- a faded secondary list communicates ecosystem breadth;
- the footer binds the advertiser's logo to the CTA;
- adaptation replaces the hero/partner, supporting ecosystem, symbol, CTA, and brand identity coherently rather than swapping isolated nouns.

It returned these exact groups under the original mutually exclusive rubric:

| Group | Members | Ruling |
| --- | --- | --- |
| `core_claim` | `Codex`, `Slack`, `relationship_symbol` | Exact |
| `supporting_list` | `GitHub`, `Sheets`, `Asana`, `Docs`, `Gmail`, `Slides` | Exact |
| `footer_brand` | `Work with Codex`, `brand_logo` | Exact |

The only semantic cleanup item was one unnecessary Maker question asking whether the supporting list should be randomized or industry-curated. That is a Format policy choice, not missing reference evidence. The validator should distinguish policy suggestions from genuinely blocking Maker questions.

## 4. Gemma-to-SAM Handoff

One explicitly authorized SAM prediction used exactly Gemma's two short prompts.

| Element | Gemma prompt | Gemma-prompt score | Prior simple score | MiniMax-prompt score | Gemma-to-simple mask IoU |
| --- | --- | ---: | ---: | ---: | ---: |
| Handshake | `handshake emoji` | 0.957 | 0.957 | 0.270 | 1.0000 |
| Footer logo | `circular geometric brand logo` | 0.910 | 0.738 | 0.236 | 0.9973 |

The handshake returned one correct candidate. The logo returned the correct footer logo plus one tiny false candidate at the top edge with 0.385 confidence. Wiggly still needs deterministic candidate filtering and visible Maker confirmation; a good concept prompt does not eliminate ambiguity.

The hosted SAM prediction itself ran for 1.44 seconds, but the end-to-end Replicate request took 122.34 seconds because of queue/startup time. That supports an asynchronous Maker-analysis UI with visible stages rather than a blocking blank screen.

## 5. Comparison With MiniMax

Gemma improved the parts that matter most for the Format system:

- It recognized `Slack` as the currently active focal partner, although the old schema did not also record its collection membership.
- It bound the handshake to both focal names in one coherent group.
- It separated all six gray integrations into the supporting group.
- It kept the footer logo and CTA together.
- Its concise SAM prompts preserved high confidence instead of over-describing the object.

MiniMax remains a useful secondary baseline because its semantic request completed in 8.52 seconds and it correctly identified both non-text assets. Its detailed SAM prompts still produced the correct selected masks, but with much lower confidence. Its coordinates remain rejected.

This is not an equal-prompt leaderboard. Before a production model lock, run the revised collection-aware evidence contract and validator across the saved-reference corpus.

## 6. Architecture Consequence

The smoke strengthens this evidence boundary:

```text
Gemma 4 31B
  -> proposed formula, item membership, active state, roles, Reroll Groups, replacement policies, short SAM concepts

PaddleOCR
  -> text content, confidence, rotated polygons

SAM 3
  -> non-text candidates, boxes, masks, confidence

Wiggly normalizer + Maker
  -> filtering, confirmation, questions, authoritative Format Draft
```

Gemma does not own geometry, `StaticAdScene`, rendering, publication, or runtime fallback behavior.

## 7. Local Evidence

```text
/Users/shaz/.graphify/benchmarks/gemma4-codex-2026-07-10/
```

Key files:

- `run_gemma4_semantic.py`: guarded one-shot NIM request
- `run_gemma_prompted_sam3.py`: guarded one-shot SAM handoff
- `analyze_gemma4.py`: deterministic scoring and comparison-board generator
- `output/semantic-analysis.json`: validated semantic output
- `output/benchmark-summary.json`: semantic and handoff checks
- `output/gemma4-semantic-groups.png`: legacy mutually exclusive Reroll Group overlay
- `output/gemma4-vs-minimax-comparison.png`: legacy reference/MiniMax/Gemma board; not a collection-recovery score
- request sentinels proving no retry or fallback

## 8. Next Test

Do not lock Gemma from this reference. Run the revised collection-aware semantic contract against structurally different assistant-saved ads. The next corpus should test photography, dense copy, offer badges, product imagery, decorative raster, ambiguous logos, and active-item designs.

Gemma becomes the production semantic candidate only if it consistently:

- recovers the true reusable formula rather than a plausible nearby story;
- separates collection membership from current active/supporting display state;
- proposes coherent Reroll Groups and fixed/variable policies;
- produces bounded SAM concepts without excessive false candidates;
- asks only questions that block a useful draft;
- keeps median assistant cleanup within five minutes;
- fails visibly on unsupported references.
