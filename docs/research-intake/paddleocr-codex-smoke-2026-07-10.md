# PaddleOCR Codex-Reference Smoke

- Status: One-image local smoke passed; saved-reference corpus and structural Graphify review remain
- Date: 2026-07-10
- Candidate: [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
- Product-code impact: None

Related Wiggly documents:

- [Open-source ledger](../static-format-package-open-source-ledger.md)
- [LayerD assessment](./layerd-graphify-compatibility-2026-07-10.md)
- [Qwen Image Layered smoke](./qwen-image-layered-smoke-2026-07-10.md)
- [Architecture contract](../static-format-package-architecture-contract.md)

## 1. Verdict

PaddleOCR **passes the first text-recovery smoke** and should remain the primary OCR candidate for the combined reconstruction pipeline.

On the Codex reference it found all nine intended text regions as coherent words or lines, preserved their rotated quadrilateral geometry, and read eight regions exactly. The only error was `GitHub` becoming `GitHuo` at 0.866 confidence. That word is partially clipped at the top edge of the source. Overall character accuracy was 98.25%.

This result solves a specific failure from the LayerD smoke: words no longer need to be inferred from 38 letter and partial-word pixel fragments. It does not solve the full Maker problem. PaddleOCR supplies text and polygons, while font matching, semantic roles, slots, reroll groups, native-text reconstruction, raster-text removal, and Maker confirmation remain separate stages.

**Decision:** retain PaddleOCR as the primary OCR stage and proceed to the combined LayerD + PaddleOCR + semantic-vision test. Do not place PaddleOCR output directly into `StaticAdScene`; normalize and validate it first.

## 2. Test Configuration

Input:

```text
/Users/shaz/Downloads/OAI_Knowledge-Worker_Static_AllPlugins_Emoji-bnw_US_1x1png.jpeg
```

Runtime:

| Component | Value |
| --- | --- |
| Python | 3.12.13 |
| PaddleOCR | 3.5.0 |
| Engine | Transformers on CPU |
| Detector | `PP-OCRv5_server_det_safetensors` |
| Recognizer | `en_PP-OCRv5_mobile_rec_safetensors` |
| Transformers | 5.13.0 |
| PyTorch | 2.13.0 |
| Document orientation | Disabled |
| Document unwarping | Disabled |
| Text-line orientation model | Disabled |

The detector itself returned rotated polygons, so the diagonal list did not require document rotation or unwarping.

## 3. Result

| Measurement | Result |
| --- | --- |
| Expected text regions | 9 |
| Detected text regions | 9 |
| Region recall | 100% |
| Exact region recognition | 8 of 9, or 88.89% |
| Character accuracy | 98.25% |
| Average confidence | 0.9772 |
| Cached initialization | 1.27 seconds |
| OCR prediction | 7.44 seconds |
| Cached total | 8.71 seconds |
| Peak resident memory | Approximately 6.0 GB in the recorded run; approximately 7.1 GB observed during setup |

| Expected | Recognized | Confidence | Result |
| --- | --- | --- | --- |
| GitHub | GitHuo | 0.8661 | One-character error |
| Sheets | Sheets | 0.9904 | Exact |
| Asana | Asana | 0.9999 | Exact |
| Docs | Docs | 0.9986 | Exact |
| Codex | Codex | 0.9998 | Exact |
| Slack | Slack | 0.9983 | Exact |
| Gmail | Gmail | 0.9976 | Exact |
| Slides | Slides | 0.9536 | Exact despite low contrast and rotation |
| Work with Codex | Work with Codex | 0.9903 | Exact line |

The handshake emoji and OpenAI logo were not misclassified as text. That is desirable; they remain image or logo candidates for the other reconstruction stages.

## 4. Geometry Findings

The returned geometry is materially better than axis-aligned OCR rectangles for this reference:

- `GitHub`, `Sheets`, `Asana`, and `Docs` have distinct rotated quadrilaterals.
- `Gmail` and `Slides` retain their smaller opposite-direction rotations.
- `Codex`, `Slack`, and `Work with Codex` have tight horizontal polygons.
- Regions are whole words or lines rather than per-letter fragments.

Wiggly can derive position, dimensions, and approximate rotation from these polygons. It must still estimate baselines, font size, line height, tracking, and the closest available font, then compare the native render against the reference.

## 5. Runtime and Packaging Findings

Two upstream integration defects appeared before the successful run:

1. PaddleOCR's current documentation describes ONNX Runtime as a supported unified inference engine, but the released `paddleocr==3.5.0` pipeline argument validator rejects `onnxruntime`. The benchmark used the officially accepted Transformers engine instead.
2. The Transformers engine logs that it does not support `return_word_box`. Supplying that option still reaches PaddleX word-box post-processing and crashes with an unpacking error. The successful run explicitly disabled it.

Line polygons are adequate for this reference because eight regions are single words and the ninth is one intentional line. A Format containing several independently styled words inside one detected line may require a different engine, a second recognizer, or Maker splitting.

The local Transformers path is also memory-heavy for a simple 1080-pixel ad. This supports the existing decision to run reconstruction in an isolated worker rather than inside Next.js or ordinary Convex execution. Production hosting and engine selection remain benchmark decisions, not product contracts.

## 6. Wiggly Integration Boundary

```text
PaddleOCR evidence
  -> text, confidence, rotated polygon, reading order proposal
  -> font-classify and geometry normalization
  -> semantic vision role and slot binding
  -> native Text candidate plus raster comparison evidence
  -> Maker confirmation or correction
  -> validated StaticAdScene
  -> AdRenderSurface
```

Required policies:

- Low-confidence or brand-sensitive text must be confirmed or corrected before publication.
- Vision may propose that `GitHuo` refers to GitHub, but Wiggly must preserve the OCR evidence and confidence rather than silently pretending OCR was exact.
- A native Text layer is publishable only after its content, polygon-derived geometry, font substitute, fitting, and visual comparison pass.
- OCR failure is visible. It must not silently degrade to raster-only editability while claiming the Format is fully editable.
- PaddleOCR never becomes a renderer, scene store, or runtime fallback.

## 7. Local Evidence

Benchmark runner:

```text
/Users/shaz/.graphify/benchmarks/paddleocr-codex-2026-07-10/run_benchmark.py
```

Outputs:

```text
/Users/shaz/.graphify/benchmarks/paddleocr-codex-2026-07-10/output-transformers-cpu/
```

Key files:

- `result.json`: raw PaddleOCR result
- `summary.json`: accuracy, confidence, timing, runtime, and polygons
- `ocr-overlay.png`: detected quadrilaterals over the source
- `ocr-crops.png`: the nine recognized regions

## 8. Next Test

Run semantic vision against the original reference plus the LayerD and PaddleOCR evidence. Require structured output for:

- visual premise and formula;
- roles such as integration list, primary pair, relationship emoji, and CTA/footer;
- fixed versus variable proposals;
- coherent reroll groups;
- which OCR text should be corrected from brand or visual context;
- logo and emoji identification;
- supported, low-confidence, or unsupported classification.

Then render one normalized native-text reconstruction and compare it with the reference. The saved-reference corpus is still required before production selection.
