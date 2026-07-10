# Qwen Image Layered Codex-Reference Smoke

- Status: One-image hosted smoke complete; not approved for product integration
- Date: 2026-07-10
- Hosted model: [`qwen/qwen-image-layered`](https://replicate.com/qwen/qwen-image-layered)
- Prediction: `aek0w4hyz9rmt0cz9rc8pd2nz4`
- Product-code impact: None

Related Wiggly documents:

- [Open-source ledger](../static-format-package-open-source-ledger.md)
- [LayerD assessment](./layerd-graphify-compatibility-2026-07-10.md)
- [Architecture contract](../static-format-package-architecture-contract.md)

## 1. Verdict

Qwen Image Layered recognized more of the Codex ad's apparent visual groups than LayerD alone, but its output is **not clean enough to become editable Maker layers**.

It proposed a white background, diagonal tool-list treatments, headline-word groups, handshake treatments, and footer groups. However, the returned layers duplicate content, retain faint full-canvas remnants, and include a large opaque white repair block. Moving or hiding several layers would visibly damage the design.

The run also exposed a hosted-runtime failure: Replicate's safety stage falsely rejected one layer from this benign ad. Eight layers were generated, but only seven were returned. Because the missing layer participates in the reconstruction, the final stack is incomplete.

**Decision:** keep Qwen Image Layered as a conditional comparison or recovery candidate for references where the primary LayerD + OCR + semantic-vision pipeline has a measured mask failure. Do not adopt it as the default reconstruction engine, native-layer source, or runtime fallback from this result.

## 2. Test Configuration

Input:

```text
/Users/shaz/Downloads/OAI_Knowledge-Worker_Static_AllPlugins_Emoji-bnw_US_1x1png.jpeg
```

Parameters:

| Input | Value |
| --- | --- |
| Requested layers | 8, the model maximum |
| Description | `auto` |
| Optimized path | `go_fast: true` |
| Seed | `777` |
| Output | Lossless PNG |
| Safety checker | Enabled, the hosted default |

Exactly one paid prediction was submitted. There was no paid retry and no model fallback.

## 3. Result

| Measurement | Result |
| --- | --- |
| Prediction status | Succeeded |
| Model generation time | 16.08 seconds from logs |
| Replicate prediction time | 17.46 seconds |
| Replicate total time | 17.51 seconds |
| Generated output count | 8 reported by metrics |
| Downloadable output count | 7 |
| Output dimensions | 640 by 640 RGBA per returned layer |
| Forward-stack similarity | MAE 0.045 on a 0–1 scale; PSNR 18.71 dB |
| LayerD comparison | LayerD's complete reconstruction reached PSNR 29.34 dB on its native smoke output |

The fidelity numbers are directional rather than a controlled model bake-off: Qwen downsampled to 640 by 640 and its safety filter removed one layer. They still confirm that the returned stack does not reconstruct the reference faithfully.

Replicate logs recorded:

```text
Error running safety checker: Unable to infer channel dimension format
NSFW content detected in image 3
Total safe images: 7 out of 8
```

The source is a normal OpenAI product ad. This is a false positive or safety-pipeline defect, not an unsafe input.

## 4. Editability Findings

What worked:

- The model identified several useful visual groupings without OCR or a separate segmentation prompt.
- It separated the white background.
- Some outputs isolate recognizable headline, footer, emoji, or list treatments.
- Hosted warm inference is much faster than the LayerD CPU smoke.

What failed:

- Content is duplicated across several layers rather than cleanly partitioned.
- Six of seven returned non-background layers have nonzero alpha across roughly 67% to 82% of the entire canvas. Most of that coverage is faint residue, which becomes visible when a layer is moved or recolored.
- One layer contains a large opaque white rectangle, similar to the destructive erase patch seen around LayerD's handshake output.
- Several layers mix unrelated elements, such as headline text, the diagonal list, emoji, or footer.
- The missing safety-filtered layer makes exact recomposition impossible.
- All text remains pixels. The result contains no text value, font, role, fitting rule, or semantic slot.
- The 1080-pixel reference is reduced to 640 pixels, losing useful reconstruction detail.

This is better described as generative visual decomposition than deterministic recovery of a design document.

## 5. Wiggly Architecture Ruling

If Qwen Image Layered is tested again, it must remain an offline Maker-analysis stage:

```text
Reference image
  -> Qwen RGBA proposals
  -> OCR and semantic vision
  -> Wiggly confidence and normalization
  -> Maker-reviewed Text, Image, Shape, and Group draft
  -> AdRenderSurface
```

Its RGBA files cannot become Wiggly's authoritative scene. They may serve as evidence or locked raster candidates only after mask cleanup and semantic normalization.

No automatic fallback should select Qwen when LayerD fails. A future comparison should be an explicit research run or a visible Maker action. Disabling the hosted safety checker may recover the missing eighth layer, but that requires another paid prediction and was deliberately not attempted in this one-call smoke.

## 6. Local Evidence

Benchmark runner and analysis:

```text
/Users/shaz/.graphify/benchmarks/qwen-image-layered-codex-2026-07-10/run_replicate_test.py
/Users/shaz/.graphify/benchmarks/qwen-image-layered-codex-2026-07-10/analyze_layers.py
```

Outputs:

```text
/Users/shaz/.graphify/benchmarks/qwen-image-layered-codex-2026-07-10/output-replicate-8-layers/
```

Key files:

- `prediction.json`: complete Replicate response
- `analysis.json`: alpha coverage and composite metrics
- `layers-on-checkerboard.png`: every returned layer on transparency
- `composite-comparison.png`: source, forward stack, and reverse stack
- `PAID_REQUEST_SENTINEL.json`: prevents an accidental second request

## 7. Next Decision

Do not spend another hosted call on this same reference yet. The highest-value next benchmark remains PaddleOCR plus semantic vision on the existing LayerD evidence. After the assistant supplies structurally different saved ads, compare Qwen only on references where the primary pipeline demonstrates a recurring mask or grouping failure.
