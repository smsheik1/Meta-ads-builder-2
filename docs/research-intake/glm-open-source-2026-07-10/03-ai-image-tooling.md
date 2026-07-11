# Packet 3: AI Image and Inpainting Tooling

- Review status: Unverified
- Decision status: No candidate approved
- MVP boundary: Static image Formats; every generative image action remains explicit and one-at-a-time

## Candidate map from the intake

| Candidate | Proposed role | Capability claimed by GLM |
| --- | --- | --- |
| `ronchen0927/GenAI-E-Commerce-Asset-Generator` | Product photo editing and scene generation | Turn a product photo into an ad-ready image or cinematic product video |
| `google-marketing-solutions/backgroundr` | Brand-aware visual editing | Align image assets with corporate brand guidelines, including backgrounds and broader visual changes |
| `stepfun-ai/Step1X-Edit` | General image editing | Add products to scenes and edit individual visual slots |
| `Yuan-ManX/ComfyUI-Step1X-Edit` | Step1X-Edit workflow integration | Run Step1X-Edit through ComfyUI |
| `Sanster/IOPaint` | Inpainting | Remove or replace visual content |
| `geekyutao/Inpaint-Anything` | Segmentation plus inpainting | Select with SAM and perform text-guided replacement |

## PRD capabilities GLM maps to these projects

- Product photo to ad-ready scene
- Background replacement
- Brand-guideline-aware image changes
- Manual AI image slot fulfillment
- Object removal and replacement
- Product insertion into a reference-derived ad
- Optional product-video generation

Product-video generation is recorded because it appeared in the source, but it is outside the current static-only MVP.

## Proposed image path from the intake

```text
Product photo
  -> ecommerce asset generator or backgroundr
  -> optional Step1X-Edit / IOPaint refinement
  -> resolved ad image slot
```

The intake does not specify which candidate is primary, how many model calls occur, or how durable assets and failures flow back into the Ad Project.

## Highlighted claim

GLM calls `backgroundr` the “sleeper hit” because it may map directly to Maker-approved brand colors, typography, backgrounds, and other Visual Policy constraints.

## Claims reserved for later assessment

- These projects “solve” the complete Wiggly image workflow.
- `backgroundr` enforces the same type of deterministic Visual Policy described by the PRD.
- Step1X-Edit quality matches specific proprietary image editors.
- Combining several tools remains simpler than one selected image-editing provider.
- The projects support the required manual-click, one-at-a-time, no-fallback behavior without significant custom orchestration.

## Information to collect during review

- Exact current repository and model requirements for every candidate
- Hosted versus self-hosted runtime and hardware
- Input/output contracts and whether transparent assets are preserved
- Product/logo/text fidelity
- Number of provider calls per requested image
- Latency, cost, and failure semantics
- Fit with Nano Banana 2 Lite implementation tests
- Whether any tool is needed before a Format requiring an AI image slot is actually tested
