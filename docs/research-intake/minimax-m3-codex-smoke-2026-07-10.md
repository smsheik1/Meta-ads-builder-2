# MiniMax M3 Codex-Reference Semantic Smoke

- Status: One-image semantic and MiniMax-to-SAM handoff smoke passed; geometry failed
- Date: 2026-07-10
- Model: [MiniMax M3](https://build.nvidia.com/minimaxai/minimax-m3) through NVIDIA NIM
- Segmentation handoff: Pinned `vufinder/sam3` Replicate deployment
- Product-code impact: None

Related Wiggly documents:

- [Vision + SAM 3 smoke](./vision-sam3-codex-smoke-2026-07-10.md)
- [PaddleOCR smoke](./paddleocr-codex-smoke-2026-07-10.md)
- [Open-source ledger](../static-format-package-open-source-ledger.md)
- [Architecture contract](../static-format-package-architecture-contract.md)

## 1. Verdict

MiniMax M3 **passes the first semantic reconstruction smoke** and is the current lead for understanding a reference's meaning, roles, replacement policies, and segmentation concepts.

It correctly identified both requested non-text elements, explained their jobs in the ad, proposed useful replacement behavior, and generated SAM prompts that found the correct handshake and OpenAI logo. The MiniMax-prompted SAM masks overlapped the previously successful masks by 99.42% and 99.14% respectively.

MiniMax **fails as a geometry source**. It reported the 768 by 768 input as 680 by 680, placed the handshake box 144 pixels away from the SAM mask center at 1080 scale, and gave the handshake box zero overlap with the actual asset. The logo box reached only 0.279 IoU with SAM.

**Decision:** use MiniMax M3 as the current semantic-model benchmark leader, not as a source of authoritative coordinates. MiniMax may propose the formula, roles, slot behavior, reroll grouping, and segmentation concepts. SAM owns non-text geometry and masks; PaddleOCR owns text geometry. Production selection still requires the saved-reference corpus.

Kimi K2.6 cannot be quality-compared from current evidence because its hosted request failed before inference. MiniMax is the current lead because it worked and produced useful evidence, not because the benchmark proved it superior to a completed Kimi run.

## 2. Test Configuration

Input:

```text
/Users/shaz/Downloads/OAI_Knowledge-Worker_Static_AllPlugins_Emoji-bnw_US_1x1png.jpeg
```

MiniMax request:

| Setting | Value |
| --- | --- |
| Model | `minimaxai/minimax-m3` |
| Provider | NVIDIA NIM |
| Vision input | Same reference resized to 768 by 768 JPEG |
| Structured output | Forced function call with a fixed two-element schema |
| Reasoning | `thinking_mode: disabled` |
| Temperature | 0 |
| Seed | 777 |
| Predictions submitted | Exactly one |

The schema required:

- reusable formula summary;
- structural relationship;
- exactly two elements: `brand_logo` and `relationship_symbol`;
- identity, kind, semantic role, and confidence;
- normalized box and center;
- a SAM concept prompt;
- replacement policy and reroll group.

## 3. Semantic Result

| Measurement | Result |
| --- | --- |
| NIM elapsed time | 8.52 seconds |
| Prompt tokens | 1,408 |
| Completion tokens | 612 |
| Total tokens | 2,020 |
| Requested elements returned | 2 of 2 |
| Correct identities | 2 of 2 |
| Correct semantic roles | 2 of 2 |
| Structured function call | Passed |

What MiniMax understood correctly:

- The handshake is the semantic hinge expressing integration, partnership, or compatibility.
- The footer logo provides brand attribution and belongs with the footer tagline.
- A new advertiser should replace the source logo with its own brand asset.
- The relationship symbol can change coherently with the claim.
- The design uses a minimal white canvas, dominant focal names, a supporting tool list, and a small footer brand block.

What needs correction or stronger schema guidance:

- The formula description treated the right side primarily as a peer-tool column rather than distinguishing `Slack` as the second focal name from the gray list surrounding it.
- It suggested that the brand name, emoji, list, and footer could be swapped independently, while Wiggly's agreed policy requires coherent reroll groups when the meaning depends on them together.
- The generated group names were useful hints, not a complete binding of the handshake to the focal text pair because the smoke schema contained only non-text elements.

The semantic quality is promising, but the full benchmark schema must include OCR-backed text roles so MiniMax can bind the focal pair, supporting list, relationship symbol, and footer into coherent groups.

## 4. Geometry Failure

SAM's successful masks are the comparison reference.

| Element | MiniMax-to-SAM box IoU | Center error at 1080 | Ruling |
| --- | --- | --- | --- |
| Handshake | 0.000 | 144.19 pixels | Unusable |
| Footer logo | 0.279 | 41.45 pixels | Too inaccurate for editing |

MiniMax placed the proposed handshake box over the end of the word `Codex`, not over the emoji. It also claimed the canvas was 680 by 680 although the submitted vision image was 768 by 768.

Wiggly must therefore ignore VLM coordinates as authoritative geometry. At most, they are debugging evidence. SAM and PaddleOCR must supply geometry directly against the original-resolution asset.

## 5. MiniMax-to-SAM Handoff

MiniMax generated these concept descriptions:

- `yellow handshake emoji, two hands clasping, centered between two bold black words on a white background`
- `small black interlocking hexagonal flower-shaped knot logo, OpenAI Codex brand mark, monochrome line-art emblem in the bottom-left corner`

One SAM 3 request using exactly those descriptions returned one correct candidate for each concept.

| Element | Simple-prompt SAM score | MiniMax-prompt SAM score | Simple candidates | MiniMax candidates | Selected-mask IoU |
| --- | --- | --- | --- | --- | --- |
| Handshake | 0.9570 | 0.2695 | 1 | 1 | 0.9942 |
| Footer logo | 0.7383 | 0.2363 | 2 | 1 | 0.9914 |

The detailed prompts removed the tiny false logo candidate but reduced SAM's numeric confidence dramatically. This means SAM confidence values cannot be interpreted without prompt-style context.

The MVP should not keep inventing increasingly complex prompt logic. A simple contract is enough:

- MiniMax proposes a short identity plus optional visual qualifiers.
- Wiggly sends a bounded concept phrase to SAM.
- SAM returns the top candidates, masks, boxes, and scores.
- Deterministic validation checks candidate count, area, location relative to OCR regions, and overlap conflicts.
- Low-confidence or ambiguous candidates remain visibly unconfirmed for the Maker.
- The Maker can select, reject, or refine a candidate.

## 6. Architecture Contract Proven by the Smoke

```text
MiniMax M3
  -> formula, semantic roles, slot proposals, reroll relationships, SAM concepts

PaddleOCR
  -> text content, confidence, rotated polygons

SAM 3
  -> non-text boxes, masks, candidate confidence

LayerD / LaMa or deterministic flat-background cleanup
  -> source-asset removal and background reconstruction

Wiggly normalizer + Maker
  -> authoritative Text/Image/Shape/Group draft and policy
```

The VLM, OCR model, and segmentation model produce evidence. None directly owns `StaticAdScene`, rendering, or publication.

## 7. Local Evidence

Benchmark scripts:

```text
/Users/shaz/.graphify/benchmarks/minimax-m3-codex-2026-07-10/run_minimax_vision.py
/Users/shaz/.graphify/benchmarks/minimax-m3-codex-2026-07-10/run_minimax_prompted_sam3.py
/Users/shaz/.graphify/benchmarks/minimax-m3-codex-2026-07-10/analyze_minimax_geometry.py
```

Outputs:

```text
/Users/shaz/.graphify/benchmarks/minimax-m3-codex-2026-07-10/output/
```

Key evidence:

- `semantic-analysis.json`: validated MiniMax output
- `minimax-response.json`: complete NIM response
- `geometry-comparison.json`: MiniMax-versus-SAM geometry and mask metrics
- `minimax-vs-sam-boxes.png`: visual box comparison
- `minimax-results-00.json`, `minimax-results-01.json`: SAM results from MiniMax prompts
- `minimax-visualizations-00.png`, `minimax-visualizations-01.png`: prompt handoff visualizations
- `MINIMAX_REQUEST_SENTINEL.json`, `MINIMAX_SAM3_REQUEST_SENTINEL.json`: one-shot guards

## 8. Next Test

Do not run another model on this same reference yet. Add OCR evidence and the full Format schema to the MiniMax prompt, then test the combined evidence contract on structurally different assistant-saved ads.

MiniMax becomes the production semantic model only if it consistently:

- recovers the correct formula rather than a plausible nearby formula;
- binds text and non-text elements into coherent reroll groups;
- proposes useful fixed/variable policies;
- identifies when it lacks enough evidence;
- keeps Maker cleanup within the existing five-minute target.
