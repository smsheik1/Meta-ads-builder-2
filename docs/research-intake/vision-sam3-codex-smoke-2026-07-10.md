# Vision + SAM 3 Codex-Reference Smoke

- Status: SAM 3 asset-selection smoke passed; semantic-VLM stage blocked before inference
- Date: 2026-07-10
- Segmentation model: [SAM 3](https://github.com/facebookresearch/sam3) through pinned Replicate deployment `vufinder/sam3`
- Semantic model attempted: [Kimi K2.6](https://build.nvidia.com/moonshotai/kimi-k2.6)
- Product-code impact: None

Related Wiggly documents:

- [Open-source ledger](../static-format-package-open-source-ledger.md)
- [PaddleOCR smoke](./paddleocr-codex-smoke-2026-07-10.md)
- [LayerD assessment](./layerd-graphify-compatibility-2026-07-10.md)
- [Architecture contract](../static-format-package-architecture-contract.md)

## 1. Split Verdict

SAM 3 **passes the first logo-and-emoji selection smoke** on the Codex reference.

Using only the text concepts `handshake emoji` and `OpenAI logo`, it found:

- the handshake as one candidate at 0.957 confidence;
- the correct footer logo at 0.738 confidence;
- one tiny false logo candidate at the clipped top edge at 0.350 confidence.

The highest-confidence candidate for each required concept was correct. After deterministic cleanup for the known flat white background, both selected assets became clean movable transparent cutouts and their original locations could be erased without the opaque blocks seen in the LayerD and Qwen outputs.

The complete vision-plus-segmentation pipeline did **not** pass because Kimi K2.6 never reached inference. NVIDIA returned `404 Function not found` for the configured account even though the current catalog documents the multimodal endpoint. The runner did not retry and did not substitute another VLM.

**Decision:** promote SAM 3 to the primary asset-localization and mask-refinement benchmark candidate. Keep it as reconstruction evidence rather than a scene or renderer. Semantic role and formula recovery remain blocked until a separately approved VLM benchmark succeeds.

## 2. Test Configuration

Input:

```text
/Users/shaz/Downloads/OAI_Knowledge-Worker_Static_AllPlugins_Emoji-bnw_US_1x1png.jpeg
```

SAM 3:

| Setting | Value |
| --- | --- |
| Hosted model | `vufinder/sam3` |
| Pinned version | `1bf97763d5dfd3a1584adca913a8ef4b43c684fca97e04e39e4c50a3a5e09650` |
| Prompts | `handshake emoji`, `OpenAI logo` |
| Prompt type | Text-concept only; no manual points or boxes |
| Confidence threshold | 0.2 |
| Output | Per-prompt boxes, scores, offset binary masks, and visualizations |
| Predictions submitted | Exactly one |

The Replicate deployment links Meta's official repository, paper, license, and `facebook/sam3` weights, but its serving wrapper is third-party rather than Meta-owned. Production adoption still requires source/runner verification or an approved official-weight deployment.

## 3. SAM 3 Result

| Measurement | Handshake | OpenAI logo |
| --- | --- | --- |
| Correct candidate found | Yes | Yes |
| Correct-candidate confidence | 0.9570 | 0.7383 |
| Candidate count | 1 | 2 |
| Mask bounds | `(503, 515)` to `(621, 593)` | `(117, 883)` to `(200, 967)` |
| Selected mask pixels | 6,023 | 5,213 |
| False positives | 0 | 1 at 0.3496 confidence |

Runtime:

| Measurement | Result |
| --- | --- |
| Actual model prediction | 1.35 seconds |
| Total request time including cold start | 123.95 seconds |
| Typical published hosted cost | Approximately $0.00098 per prediction, input-dependent |

This latency split matters. Warm segmentation is fast enough for analysis, but a cold third-party deployment can make the Maker wait about two minutes. The product must expose analysis-stage progress rather than appear frozen.

## 4. Raw-Mask Versus Clean-Asset Result

The raw SAM masks were semantically correct but not yet final assets:

- The handshake cutout was recognizable and mostly clean.
- The line-art logo mask selected the whole logo silhouette, including white enclosed regions. Moving that raw crop to a colored background would expose white fill.
- Directly erasing the raw binary masks left a thin antialiased outline at both original locations.

For this reference's known flat white background, two deterministic operations fixed those defects without another model call:

1. Derive antialiased alpha from each selected crop's color distance from white. This makes the logo's white interior transparent and preserves soft object edges.
2. Dilate the removal mask by three pixels before filling it with the known white background color. This removes the leftover outline.

After cleanup:

- the handshake moves as a transparent asset;
- the line-art OpenAI logo moves with transparent interior regions;
- both old locations are visually clean on the white background.

This cleanup is valid only when the background beneath the asset is known to be flat. Complex photographic, gradient, textured, or overlapping backgrounds still require LayerD/LaMa inpainting, alpha matting, or Maker correction.

## 5. What This Means for Wiggly

The reference logo usually does not need to survive as the Player asset. Wiggly needs its semantic role and geometry so it can erase the source logo and bind the slot to the brand logo extracted from the Player's website.

The handshake may be retained as a cropped image or replaced with a deterministic emoji asset. Its slot can be part of the same Reroll Group as `Codex`, `Slack`, and the relationship premise.

The resulting proposal is:

```text
Semantic role proposal
  -> known concept prompt or Maker click/box
  -> SAM 3 candidates with mask, box, and confidence
  -> confidence and geometry validation
  -> flat-background cleanup or inpainting
  -> replaceable Wiggly Image candidate
  -> Maker confirmation
  -> StaticAdScene
  -> AdRenderSurface
```

SAM 3 must not decide on its own which candidate becomes authoritative. The low-confidence top-edge false positive demonstrates why Wiggly needs role expectations, confidence thresholds, geometry evidence, and Maker review.

## 6. Semantic-Vision Failure

The Kimi request used:

- the same reference resized to 768 by 768 for NIM's inline payload limit;
- a fixed schema for exactly two elements;
- normalized boxes, semantic roles, identity, confidence, and replacement policy;
- one forced structured function call;
- model `moonshotai/kimi-k2.6`, seed 777, temperature 0.

The API returned:

```text
404 Not Found: Function ... not found for account ...
```

No output tokens or visual analysis were produced. This is provider availability failure, not a quality judgment about Kimi's vision capability.

The failed request has a one-shot sentinel. Testing MiniMax M3 or another VLM would be a separate benchmark decision, not a silent fallback.

## 7. Local Evidence

Benchmark scripts:

```text
/Users/shaz/.graphify/benchmarks/vision-sam-codex-2026-07-10/run_kimi_vision.py
/Users/shaz/.graphify/benchmarks/vision-sam-codex-2026-07-10/run_replicate_sam3.py
/Users/shaz/.graphify/benchmarks/vision-sam-codex-2026-07-10/analyze_sam3_masks.py
```

Outputs:

```text
/Users/shaz/.graphify/benchmarks/vision-sam-codex-2026-07-10/output/
```

Key evidence:

- `sam3-prediction.json`: complete Replicate response
- `results-00.json`, `results-01.json`: boxes, scores, and masks
- `selected-mask-overlay.png`: selected candidates over the reference
- `cutouts-on-checkerboard.png`: raw-mask cutouts
- `cutouts-on-checkerboard-refined.png`: flat-white refined assets
- `objects-removed-white-background.png`: dilated removal result
- `moved-layer-test-white.png`: assets moved away from their source positions
- `mask-analysis.json`: numeric candidate and mask summary
- `KIMI_REQUEST_SENTINEL.json`, `SAM3_REQUEST_SENTINEL.json`: external-call guards

## 8. Next Decision

Do not run more segmentation on this reference. The next unresolved question is semantic vision: whether a model can infer the reference's formula, request the correct asset concepts, bind OCR text and images into roles, and propose coherent fixed/variable policies.

Test MiniMax M3 separately only after confirming its current multimodal endpoint and obtaining founder approval for that distinct benchmark. Then repeat the complete combined pipeline on structurally different saved ads before selecting a production worker stack.
