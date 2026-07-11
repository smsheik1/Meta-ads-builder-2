# Maker `/builder` MVP Execution Plan

- Status: Ready to implement
- Date: 2026-07-11
- Scope: One internal Maker turns one static reference ad into one reusable, published Format

Related contracts:

- [Static Format architecture contract](./static-format-package-architecture-contract.md)
- [Maker acceptance plan](./static-format-package-acceptance-plan.md)
- [Open-source research ledger](./static-format-package-open-source-ledger.md)
- [Minimal analysis schema](./research-intake/schemas/maker-analysis-mvp.schema.json)

## Outcome

Wiggly's assistant can open `/builder`, upload one saved ad, receive an editable draft, correct the machine's interpretation, and publish an immutable Format Version without writing code.

This phase proves the Maker workflow. It does not build the Player campaign experience.

## Locked MVP Scope

- Static images only, one reference at a time, desktop only.
- One generic `static-package` format module; published Formats are data, never new React components or registry keys.
- Preview, builder canvas, publish verification, and later export/share all use `AdRenderSurface`.
- Native editable primitives are Text, Image, Shape, and Group. Complex decoration stays a locked raster by default.
- Gemma 4 31B through NVIDIA NIM performs semantic analysis only after an explicit click.
- PaddleOCR provides text evidence. SAM 3 is deferred until the basic Maker correction loop works.
- Invalid model output stops visibly. There is no repair model, retry, or fallback.
- A partial but structurally valid draft proceeds to Maker correction.
- The Maker can edit the underlying Format skill as plain text.
- Publishing creates an immutable version; later changes create a new draft.

The analysis prompt keeps two explicit integrity rules:

1. Every `asset_id` must reference a declared asset; otherwise it is empty.
2. A highlighted member of a repeated set remains in its List and becomes `active_item_id`; it is not split into a Field.

## Minimal Runtime Shape

```text
explicit Analyze click
  -> normalized reference + PaddleOCR evidence
  -> Gemma 31B six-key analysis
  -> local schema and reference validation
  -> mutable FormatDraft
  -> Maker corrections in /builder
  -> publish validation
  -> immutable FormatVersion
  -> complete StaticAdScene
  -> AdRenderSurface
```

Only three new product concepts are required:

- `FormatDraft`: reference, analysis, editable layers, Lists, Reroll Groups, skill text, and validation issues.
- `FormatVersion`: an immutable snapshot of an approved draft plus creator/source attribution.
- `StaticAdScene`: the complete data-only scene painted by the generic static renderer.

Reference assets remain owned by the draft/version instead of becoming a separate product entity. Campaign projects, batches, plays, and Player overrides are deferred.

## Implementation Slices

### 1. Generic static renderer seam

Add one isolated `static-package` scene variant in `v3/features/scene/types.ts` and one module under `v3/features/formats/static-package/`. Register that module once in `v3/features/formats/registry.ts`.

The module renders the four primitives from scene data and contains no fetching, generation, persistence, or interaction state. Add registry, validation, and `AdRenderSurface` parity tests before building editor controls.

Why first: Graphify reports `scene_types` as a high-blast-radius node with 301 connections. This is the only central union change and must remain small and independently reversible.

### 2. Draft analysis and persistence

Add Maker-specific Convex functions and schema records for `FormatDraft` and `FormatVersion`; do not extend the per-format branching in `v3/convex/adScenes.ts`.

The analysis action:

1. Stores and normalizes the reference.
2. runs PaddleOCR;
3. sends the compact evidence and six-key schema to Gemma 31B;
4. rejects unknown evidence, asset, Field, List, or Reroll Group references;
5. normalizes valid output into a draft;
6. exposes truthful stage, stopped, and validation states.

Keep the internal Maker gate server-enforced. Do not add general authentication, teams, jobs infrastructure, or a second analysis contract.

### 3. Thin `/builder` Maker shell

Create `v3/app/builder/page.tsx` as a thin route and keep implementation in `v3/features/builder/`.

Use shadcn for normal controls and one dedicated Zustand interaction store for selection, tool mode, locks, and drag/resize state. Use Moveable and Selecto as overlays on the existing DOM-rendered layers; they never own the document or render pixels.

The Maker can:

- select, drag, resize, rotate, reorder, group, lock, hide, duplicate, and delete layers;
- edit text, font, size, color, background, and image assets;
- correct semantic role and fixed/brand/campaign/proof/locked binding;
- create or edit a List, choose its active item, and keep item text/assets together;
- create or edit Reroll Groups;
- edit and copy/paste the raw Format skill;
- see and resolve validation issues before publishing.

Every edit is a typed draft command that produces a complete updated scene. Do not place draft data in local component state and do not add precision editing to `/create`.

### 4. Publish one real Format

Publishing validates the draft, snapshots it atomically as a `FormatVersion`, and verifies that reopening the version produces the same scene. The first success case is one ad from the assistant's saved references.

Stop after this vertical slice. Player generation, eight campaign plays, content/visual rerolls, marketplace discovery, and public publishing begin only after the assistant can create a useful Format without engineering help.

## Acceptance Gate

The phase is complete when the assistant can, through `/builder`:

1. Upload one static reference and explicitly start analysis.
2. See progress or a clear stopped error rather than a frozen screen.
3. Receive a structurally valid draft or a fail-visible validation error.
4. Correct text, asset, List membership/active state, grouping, layout, colors, and locks.
5. Edit the Format skill and resolve all publish blockers.
6. Publish an immutable version and reopen it with the same visible result.

Required verification:

- Unit tests for scene validation, cross-reference integrity, typed draft commands, and immutable publication.
- Registry and `AdRenderSurface` parity tests for the generic static scene.
- Playwright through the real `/builder` route for upload, analyze, correction, and publish.
- No Replicate generation or SAM calls during QA unless separately authorized and announced.

## Explicit Non-Goals

- No Player `/create` work.
- No video, animation, audio, multi-reference input, batch import, or multiple aspect ratios.
- No marketplace, payments, ratings, general team administration, or public Maker onboarding.
- No generative UI, autonomous structural edits, silent repair, fallback models, or speculative workflow engine.
- No Fabric.js, Konva, or other second renderer.
- No migration of the existing bespoke formats in this phase.
