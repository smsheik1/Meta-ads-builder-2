# Wiggly Static Format Package Open-Source Ledger

- Status: Living research document
- Last updated: 2026-07-10
- Scope: Reference-first static Format Packages and the Maker-first MVP
- Product-code status: Not started

Related documents:

- [Product requirements](./reference-first-static-format-packages-prd.md)
- [Architecture contract](./static-format-package-architecture-contract.md)
- [Acceptance plan](./static-format-package-acceptance-plan.md)
- [Graphify guide](./graphify.md)
- [Engineering rules](./wiggly-engineering-rules.md)

Assessed external research:

- [GLM open-source research, organized into review packets](./research-intake/glm-open-source-2026-07-10/README.md)
- [Ruthless comparison and rulings](./research-intake/glm-open-source-2026-07-10/05-assessment.md)
- [Qwen Image Layered Codex-reference smoke](./research-intake/qwen-image-layered-smoke-2026-07-10.md)
- [PaddleOCR Codex-reference smoke](./research-intake/paddleocr-codex-smoke-2026-07-10.md)
- [Vision + SAM 3 Codex-reference smoke](./research-intake/vision-sam3-codex-smoke-2026-07-10.md)

Only the candidates explicitly promoted below change the stack. The remainder stay rejected or deferred.

## 1. Purpose

This ledger keeps the build-versus-borrow research out of chat history. Update it as benchmarks, new projects, and implementation evidence change the recommendation.

The target is to keep new Wiggly-specific implementation below 50% of the total functional system. The current estimate is:

- 25% existing Wiggly infrastructure
- 40% borrowed open-source models and libraries
- 35% new Wiggly contracts, normalization, resolver logic, and product UX

Licensing is not a current MVP ranking criterion. Record it when useful, but do not let it replace product fit, output quality, integration cost, or runtime evidence in the current decision.

## 2. Selection Rules

A candidate moves into the recommended stack only when it:

1. Reduces meaningful development time.
2. Preserves `AdRenderSurface` as the only pixel renderer.
3. Does not create a competing scene model or product-state store.
4. Fits the `/create`, `/builder`, and `/share` boundaries.
5. Produces deterministic, persistable data that can become a complete `StaticAdScene`.
6. Can fail visibly without a silent runtime fallback.
7. Beats a simpler alternative on Wiggly's own saved-reference benchmark.

## 3. Graphify Constraints

Graphify is part of every architecture decision for this project.

- `CreateResearchClient.tsx` is a high-degree orchestration hotspot. Maker functionality stays in `/builder`; it must not be added to `/create` orchestration.
- `scene/types.ts` has a broad downstream blast radius. Add one isolated `StaticAdScene` variant without rewriting legacy variants.
- `formats/registry.ts` already connects directly to `AdRenderSurface` and reaches create, Remotion, share, and guardrail tests. Register one `static-package` engine.
- Published Formats remain data keyed by `formatId` and `formatVersionId`; they do not become new registry entries or React render components.
- Run `graphify affected`, `graphify path`, and `graphify explain` before changing a central scene, registry, renderer, or create-orchestration node.
- Do not run LLM-consuming Graphify commands without explicit founder approval.

## 4. Current Recommended Assembly

| Area | Candidate | Status | What Wiggly takes | What Wiggly still owns |
| --- | --- | --- | --- | --- |
| Graphic-design decomposition | [LayerD](https://github.com/CyberAgentAILab/LayerD) | Conditional reconstruction substrate; [Graphify and first smoke complete](./research-intake/layerd-graphify-compatibility-2026-07-10.md) | Iterative BiRefNet matting plus LaMa background inpainting and raw RGBA depth-like layers; first Codex run recovered the background and a high-fidelity composite in about one CPU minute | Ignore its connected-component layers and coarse type labels as product semantics; PaddleOCR, vision, normalization, confidence, durable assets, and mask repair remain required |
| Asset localization and mask refinement | [SAM 3](https://github.com/facebookresearch/sam3) | Primary benchmark candidate; [first Codex smoke passed](./research-intake/vision-sam3-codex-smoke-2026-07-10.md) | Text, box, or point prompted masks, boxes, and confidence; found the handshake and footer logo, and deterministic flat-white cleanup produced movable transparent assets | Verify the hosted runner or deploy official weights; semantic prompt proposal, false-positive filtering, arbitrary-background alpha/inpainting, Maker confirmation, and saved-reference corpus |
| OCR and text boxes | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Primary benchmark candidate; [first smoke passed](./research-intake/paddleocr-codex-smoke-2026-07-10.md) | Recovered all 9 Codex-reference text regions as coherent rotated polygons, with 8 exact strings and 98.25% character accuracy | Saved-reference corpus, font matching, slot binding, semantic reading order, low-confidence correction, text fitting, engine/runtime decision |
| Font matching | [Storia font-classify](https://github.com/Storia-AI/font-classify) | Primary benchmark candidate | Closest match across roughly 3,000 Google Fonts, ONNX checkpoint | Font availability checks, Maker confirmation, substitution, durable storage |
| Semantic reference analysis | [Kimi K2.6](https://build.nvidia.com/moonshotai/kimi-k2.6/modelcard) | Hosted benchmark blocked on 2026-07-10 | Intended image understanding and structured design reasoning; no quality evidence because NVIDIA returned a provider-level 404 before inference | Confirm a callable endpoint or self-hosting path before another benchmark; never silently substitute a VLM |
| Semantic reference analysis | [MiniMax M3](https://build.nvidia.com/minimaxai/minimax-m3/modelcard) | Benchmark | Image understanding and design-oriented reasoning | Same as Kimi; select one winner, never a runtime fallback |
| Editor mechanics reference | [Avnac](https://github.com/xt42io/avnac) scene primitives | Secondary code-mining and comparison source; [Graphify assessment complete](./research-intake/avnac-graphify-compatibility-2026-07-10.md) | Pure snapping and geometry; selected overlay, reorder, resize, crop, grouping, keyboard, and AI-command patterns | Wiggly types and semantic commands; do not import Avnac's scene model, document store, canvas renderer, export path, or editor shell |
| Transform handles | [Moveable](https://github.com/daybrush/moveable) | Recommended primary spike candidate; [Graphify assessment complete](./research-intake/moveable-selecto-graphify-compatibility-2026-07-10.md) | Event-driven drag, resize, rotate, group targets, snap, bounds, and visible DOM control chrome | Transient adapter, normalized geometry, semantic pointer-up commands, complete scene snapshots, bundle measurement |
| Multi-selection | [Selecto](https://github.com/daybrush/selecto) | Recommended Moveable companion; [Graphify assessment complete](./research-intake/moveable-selecto-graphify-compatibility-2026-07-10.md) | Click and marquee selection over existing DOM elements | Stable layer-ID mapping, authoritative interaction-store selection, Maker/Player permissions |
| Layer ordering | [dnd-kit](https://github.com/clauderic/dnd-kit) | Recommended | Accessible sortable layer list | Z-order command and persisted component tree |
| Undo and redo | [Zundo](https://github.com/charkour/zundo) | Recommended | Zustand temporal history | Transaction boundaries and dedicated editor-draft state |
| Image crop UI | [react-easy-crop](https://github.com/ValentinH/react-easy-crop) | Later if Moveable clipping is insufficient | Crop interaction | Persisted crop geometry and renderer behavior |
| Format instruction transport | [Agent Skills specification](https://github.com/agentskills/agentskills) | Recommended envelope | Copy/pasteable `SKILL.md` frontmatter and Markdown convention | Required Wiggly sections, slot validation, trust boundary, version hash |
| Schema validation | Existing Zod | Keep | Runtime schemas and TypeScript inference | Static Format Package schemas and validation policy |
| Persistence and immutable versions | Existing Convex | Keep | Storage, mutations, actions, jobs, anonymous project ownership | Format Draft/Version tables and atomic publication commands |
| Brand and product extraction | Existing Wiggly research pipeline | Keep as architectural incumbent; benchmark quality | Implemented Firecrawl evidence, research persistence, Shopify/WooCommerce products, brand assets, fonts, and colors | Real-world success corpus, Format-required question resolver, selected-product confirmation, and browser-use comparison on measured failures |
| Rendering | Existing `AdRenderSurface` | Keep | One preview/export/share pixel path | One generic static-layer renderer behind `static-package` |
| Export and share | Existing Remotion, image export, Convex jobs, share records | Keep | Existing delivery pipeline | Static-scene parity and frozen project snapshots |
| Player generation | Existing NVIDIA NIM integration plus GLM 5.2 | Keep and extend | Provider plumbing and failure behavior | Exactly-eight schema, policies, validation, atomic batches, reroll groups |

## 5. Reconstruction Benchmark Before Product Code

Use the supplied Codex reference plus 8 to 10 structurally different ads saved by the internal assistant.

### Candidate pipeline

```text
Reference image
  -> LayerD
  -> PaddleOCR
  -> font-classify
  -> Kimi K2.6 or MiniMax M3
  -> Wiggly-normalized draft JSON
  -> side-by-side reference and reconstructed render
```

### Record for every reference

- Suitable, low-confidence, or unsupported classification
- Native text recovery rate
- Meaningful variable-element recovery rate
- Locked-raster coverage
- Layer geometry accuracy
- OCR and font accuracy
- Semantic-role accuracy
- Correctness of proposed slots and Reroll Groups
- Quality of the generated Format skill and policies
- Total analysis latency
- Peak memory or hosted cost where observable
- Internal-assistant cleanup time
- Editability coverage after cleanup
- Failure reason

### Pass gates

- At least 85% editability coverage for every supported high-confidence holdout
- Median assistant cleanup time of five minutes or less after analysis
- Explicit unsupported outcomes instead of fake complete drafts
- No reference-specific code or database correction
- The Codex reference can become a coherent David's Cookies Format without changing its recognizable formula

### Model decision rule

Benchmark Kimi K2.6 and MiniMax M3 on the same inputs and schema. Select one production vision model from the evidence. Do not ship both as silent fallbacks.

## 6. Secondary and Watchlist Candidates

| Candidate | Possible role | Why it is not primary today |
| --- | --- | --- |
| [Qwen-Image-Layered](https://github.com/QwenLM/Qwen-Image-Layered) | Conditional comparison or recovery candidate for measured LayerD mask failures; [one Replicate smoke complete](./research-intake/qwen-image-layered-smoke-2026-07-10.md) | The Codex run found useful visual groups in 17.5 seconds, but duplicated content, left full-canvas alpha residue and a white repair block, downsampled to 640 pixels, and returned only 7 of 8 layers after a false safety rejection; not suitable as the default or a runtime fallback |
| [OmniPSD](https://github.com/showlab/OmniPSD) | Poster-to-PSD research and extract/erase ideas | Requires multiple Flux-based expert models and substantial runtime setup |
| [LIVE](https://github.com/Picsart-AI-Research/LIVE-Layerwise-Image-Vectorization) | Vectorizing simple raster decorations | Older and operationally heavy; not needed when locked raster is acceptable |
| Qwen Image Edit | Explicit, manually requested layer or AI-image edit | Not needed for initial reconstruction; all paid/generative actions must remain visible and manual |
| NVIDIA Nemotron OCR v2 | Hosted OCR challenger | Benchmark only if PaddleOCR quality or hosting becomes a measured blocker |
| `@scena/react-guides` | Rulers and persistent guides | Moveable snapping may already be enough for Maker v0 |
| [Polotno SDK](https://polotno.com/docs/overview) | Complete static editor as a separate buy-versus-build architecture | It owns a MobX-backed scene, Konva canvas, schema, editor, and export. Spike it separately; never combine it with LayerHub or treat it as a passive component inside `AdRenderSurface` |
| [BackgroundR](https://github.com/google-marketing-solutions/backgroundr) | Prompt-composition and image-quality-scoring idea source | Google Sheets, Apps Script, Drive, bulk generation, and auto-regeneration do not fit Wiggly; it does not deterministically enforce native-layer Visual Policy |
| [Step1X-Edit](https://github.com/stepfun-ai/Step1X-Edit) | Later explicit product or scene image-editing benchmark | The self-hosted v1 runtime is heavy; wait until a real Format proves the need and compare against Nano Banana one image at a time |
| Convex + Better Auth Anonymous plugin | Future anonymous-project claim flow | Current Maker-first scope does not require general accounts; Wiggly must still implement ownership transfer and idempotency |
| `browser-use` | Fallback benchmark for pages the current research pipeline cannot extract | Do not add a Python browser agent until a measured failure corpus exists |

## 7. Evaluated and Rejected for the Current Architecture

| Candidate | Decision | Reason |
| --- | --- | --- |
| [OpenPolotno](https://github.com/therutvikp/OpenPolotno) | Do not integrate wholesale | Brings a Konva pixel renderer, MobX-State-Tree, its own JSON scene, and its own export path; use as UX reference only |
| Fabric.js | Do not use as the Maker canvas | Would create a second canvas renderer and require continuous scene conversion |
| Konva/react-konva | Do not use as the Maker canvas | Same duplicate-renderer and preview/export parity problem |
| tldraw/Excalidraw-style editors | Do not use as the product canvas | Their document and renderer models would compete with `StaticAdScene` and `AdRenderSurface` |
| Full Scena Studio | Do not adopt | Far more timeline/editor architecture than the static MVP needs; borrow focused Daybrush components instead |
| SAM 3.1 as the default static pipeline | Do not use | Its main improvement is multi-object video tracking; no demonstrated static-MVP benefit over the simpler pipeline |
| `qwen-image-edit-nvpcb-ovsl2sl` | Irrelevant | Specialized for synthetic-to-photographic PCB inspection imagery |
| DiffusionGemma 26B | Irrelevant | Diffusion-based text LLM, not an image reconstruction or editing model |
| Workflow engines or agent graphs | Do not add | Convex actions, explicit statuses, semantic commands, and pure resolvers cover the MVP |
| General authentication product | Do not add | The MVP needs only a minimal server-enforced internal Maker gate |
| Runtime model router or fallback framework | Do not add | Conflicts with the locked fail-visible, no-fallback policy |
| `get-convex/convex-saas` as Wiggly's base | Do not transplant | A useful greenfield TanStack/Vite SaaS starter, but Wiggly already has the relevant Next.js/Convex runtime; mine isolated billing or email examples only when needed |
| `get-convex/ents-saas-starter` as Wiggly's base | Do not transplant | Clerk-based and materially behind Wiggly's dependency line; relations do not provide Wiggly's immutable publication semantics for free |
| LayerHub `react-design-editor` | Do not use | The named repository is unavailable, historically used Fabric.js, and cannot be a zero-day React 19 editor dependency |
| LayerHub + Polotno + Konva | Do not assemble | Competing document models, stores, and renderers with no coherent owner |
| `browser-use` / `ad-use` as the main research pipeline | Do not use | `ad-use` is a final-raster ad-generation example, not product catalog and evidence extraction |
| Instructor around NVIDIA NIM | Do not add | NIM already supports guided JSON; existing Zod supplies runtime validation |
| AI E-Commerce Media Studio runtime | Do not adopt | Small reference app with Replicate/local fallbacks, retries, video, Celery/Redis, and a separate storage/job stack |
| IOPaint | Do not add | Archived in 2025 and based on an older independent Python/WebUI image stack |
| Inpaint Anything | Do not add | 2023 research implementation around original SAM and older inpainting models; retain only the click-mask-edit interaction idea |

## 8. Wiggly-Owned Strategic Code

The custom portion should stay limited to the product-specific contracts that define Wiggly:

1. `StaticFormatPackage`, `FormatDraft`, `FormatVersion`, and `StaticAdScene` schemas.
2. Normalization from decomposition/OCR/VLM results into Text, Image, Shape, and Group primitives.
3. One pure resolver for slot values, visual policy, Reroll Groups, assets, and overrides.
4. One generic DOM-based static renderer used only through `AdRenderSurface`.
5. Maker versus Player typed commands and authorization.
6. Publication, render, readability, contrast, fitting, and placeholder validation.
7. The Maker and Player UX that assembles the borrowed components into the Wiggly workflow.

Do not custom-build segmentation, OCR, font classification, transform handles, marquee selection, sortable lists, undo/redo, generic persistence, or another export renderer unless the selected dependency fails a recorded Wiggly benchmark.

## 9. Proposed Evidence-Driven Sequence

1. Run the isolated reconstruction benchmark without modifying product routes or scene contracts.
2. Update this ledger with results and select the production reconstruction stack.
3. Revise the architecture contract only where benchmark evidence requires it.
4. Produce the phased implementation plan and rollback points.
5. Obtain founder approval.
6. Build the Maker-first vertical slice on a fresh scoped branch.
7. Have the internal assistant publish the first real Format without engineering changes.
8. Add the Player slice that consumes the published Format.
9. Add Qwen-layered, SAM, advanced crop, or other machinery only for measured failures.

## 10. Update Protocol

When research changes, update the relevant row rather than creating another competing document.

For each change, record:

- Date
- Candidate or subsystem
- Previous status
- New status
- Evidence or benchmark link
- Reason
- Architecture impact
- Follow-up action

### Decision log

| Date | Decision | Evidence | Follow-up |
| --- | --- | --- | --- |
| 2026-07-10 | Use the existing Wiggly runtime and borrow the Maker mechanics and reconstruction pipeline | Repo inventory, Graphify blast-radius queries, primary-source project review | Run the saved-reference benchmark |
| 2026-07-10 | Make LayerD plus PaddleOCR the initial reconstruction baseline | LayerD produces structured graphic-design layers but does not yet include complete OCR | Measure against Codex plus 8 to 10 assistant-saved references |
| 2026-07-10 | Prefer DOM-native editing over a second canvas renderer unless a full-editor spike proves decisively better | `AdRenderSurface` parity contract and Graphify dependencies | Compare Avnac primitives with Moveable + Selecto on one normalized static layer scene |
| 2026-07-10 | Keep one copy/pasteable skill per Format, separate from structured geometry and policy | Agent Skills convention plus Wiggly trust boundary | Validate headings and slot references with the Format schema |
| 2026-07-10 | Reject GLM's starter transplant and LayerHub/Polotno/Konva combined stack | Existing Wiggly runtime, current repository verification, and one-renderer contract | Keep the current additive static-package architecture |
| 2026-07-10 | Promote Avnac scene primitives to the main editor-mechanics benchmark | Current React 19/Zustand implementation includes geometry, snapping, transforms, grouping, export patterns, and tests | Compare against Moveable + Selecto + dnd-kit + Zundo in one bounded spike |
| 2026-07-10 | Keep Polotno as a separate alternate-architecture spike | Complete current SDK and canonical schema, but it owns its scene, store, canvas, and export path | Reject unless one authoritative Polotno-backed static scene can preserve preview/builder/share/download parity |
| 2026-07-10 | Defer BackgroundR, Step1X-Edit, Better Auth, and browser-use until their triggering needs exist | Primary-source review and locked MVP boundaries | Benchmark only against a real image-edit slot, account-claim flow, or extraction-failure corpus |
| 2026-07-10 | Separate GLM's scouting value from its proposed architecture score and narrow the research-pipeline claim | GLM correction plus repository inspection showing implemented extraction with thin automated coverage | Retire the blended 3.2 score; rate scouting 7/10, architecture 2.4/10, and benchmark browser-use only on an incumbent failure corpus |
| 2026-07-10 | Graph Avnac before an editor spike and narrow the reusable boundary | AST-only Graphify at Avnac `dc9cc8b6`; 1,387 nodes, 3,172 edges, targeted path and affected queries; 15 focused tests pass after a non-lockfile install, while clean `npm ci` fails because the upstream lock file is out of sync | Adapt pure math and interaction patterns only; reject Avnac scene/store/renderer/export ownership and compare against Moveable + Selecto |
| 2026-07-10 | Select Moveable + Selecto as the primary editor-mechanics spike and retain Avnac as a reference | AST-only Graphify at Moveable `75069102` and Selecto `7c75ef57`; source builds pass; published packages mount on React 19.2; both operate on existing DOM and emit events without owning an app scene or renderer | Build one bounded adapter spike after `StaticAdScene` geometry exists; compare Avnac only for simpler snapping behavior |
| 2026-07-10 | Keep LayerD as the primary decomposition benchmark, but narrow it to an offline reconstruction worker | AST-only Graphify at LayerD `21aef937`; 1,541 nodes and 3,266 links; source trace proves every `Element` is a cropped RGBA raster with a box and coarse label, while SVG and PSD exports remain pixel layers | Benchmark the Codex reference plus 8 to 10 saved ads with PaddleOCR and semantic vision; normalize only successful evidence into Wiggly Text, Image, Shape, and Group drafts |
| 2026-07-10 | Retain LayerD conditionally as a pixel-separation substrate after the first real smoke | On the Codex ad it produced a strong composite and clean white background, but only two foreground depth layers; its organizer returned 38 letter/partial-word fragments plus a handshake with an opaque white patch; Python and Transformers also required exact pins | Graphify and run PaddleOCR on the same reference before testing semantic vision; compare a different decomposer or explicit SAM repair only if mask failures recur |
| 2026-07-10 | Keep Qwen Image Layered as a conditional comparison, not the primary decomposer | One authorized Replicate run requested 8 PNG layers and completed in 17.5 seconds; 7 were returned after a false safety rejection, while the survivors contained duplicated elements, broad alpha residue, and a white repair block | Do not retry this reference now; test PaddleOCR plus semantic vision on LayerD first, then use Qwen only against measured failures on the saved-reference corpus |
| 2026-07-10 | Retain PaddleOCR as the primary text-recovery candidate after its first real smoke | Local PP-OCRv5 recovered 9 of 9 Codex-reference text regions with rotated polygons, 8 exact strings, 98.25% character accuracy, and no logo/emoji false positives; the Transformers engine exposed ONNX-documentation and word-box defects | Graphify the integration surface before product adoption, then combine its evidence with LayerD and one selected semantic-vision model |
| 2026-07-10 | Promote SAM 3 to the primary asset-localization and mask-refinement benchmark candidate | One pinned Replicate prediction found the handshake at 0.957 and correct footer logo at 0.738; one 0.350 false logo candidate was rejected by score; flat-white deterministic cleanup produced clean movable assets and removals | Verify the runner or official-weight deployment, keep Maker confirmation, and test arbitrary backgrounds on the saved-reference corpus |
| 2026-07-10 | Mark the Kimi K2.6 hosted semantic benchmark blocked rather than judging its quality | The single structured multimodal request failed before inference with NVIDIA `404 Function not found`; no retry or fallback ran | Confirm a callable Kimi endpoint or separately approve MiniMax M3 as the next semantic-vision benchmark |
