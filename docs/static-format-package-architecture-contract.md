# Wiggly Static Format Package Architecture Contract

- Status: Draft companion to the MVP PRD
- Date: 2026-07-10
- Scope: Contract-level architecture for reference-first static image ads
- Implementation status: Not started

Related documents:

- [Product requirements](./reference-first-static-format-packages-prd.md)
- [Acceptance plan](./static-format-package-acceptance-plan.md)
- [Wiggly engineering rules](./wiggly-engineering-rules.md)

This document preserves the technical constraints that should not burden the founder-facing PRD. It defines boundaries and invariants, not final framework, library, database-table, or provider implementation. Technical research may refine names and storage layout, but it may not violate these contracts without explicit approval.

## 1. Non-Negotiable Architecture

1. The application registers one static-engine discriminator: `static-package`.
2. Published Formats are data identified by `formatId` and `formatVersionId`; they never become renderer registry keys.
3. A new static Format requires no changes to `/create`, `/builder`, `/share`, core generation dispatch, or React render components.
4. The new `StaticAdScene` is additive. Existing scene variants remain unchanged.
5. `AdRenderSurface` is the only pixel-render entry for preview, builder canvas, PNG/ZIP export, and share.
6. `AdRenderSurface` is passive: it paints a complete scene and never fetches, generates, or mutates product state.
7. A pure resolver outside the renderer produces complete scenes from immutable Format and campaign data plus project-owned resolutions and overrides.
8. Canvas interaction state lives in one dedicated interaction store. It does not duplicate Format, scene, batch, job, brand, or asset state.
9. Maker-draft mutations and Player-instance mutations are separate typed commands with different authorization.
10. Existing media workflows are not migration targets.

## 2. System Boundary

```text
Reference image
  -> stable Format + mutable Format Draft
  -> analysis + Maker review + Format tests
  -> immutable Format Version + frozen assets

Website + visible product + essential answers
  -> Brand Brief snapshot
  -> Ad Project + durable candidate-asset registry
  -> Format skill + structured contracts
  -> immutable GLM 5.2 Creative Batch of eight
  -> Ad Instances + asset resolutions + visual policies + overrides
  -> complete StaticAdScene
  -> AdRenderSurface
  -> /create preview / /builder / PNG / ZIP / frozen /share
```

Existing media workflows remain separate:

```text
Static Format Package -> one generic static layer renderer
3D / jingle / visualizer / other video workflows -> existing orchestration
```

## 3. Core Contracts

### 3.1 Format

The stable logical identity of a reusable creative formula. It owns creator and source lineage plus two version pointers:

- `latestVersionId`: newest internal published version
- `currentPublicVersionId`: version used for public discovery and new public projects

Internal Maker views resolve `latestVersionId`. Public cards and new project creation resolve `currentPublicVersionId`. Existing Ad Projects stay pinned to the version they began with.

### 3.2 Format Draft

A mutable Maker workspace created from one reference or an existing Format Version. It owns reconstruction output and Maker edits until publication. It is not an immutable version and is never consumed by existing Player projects.

### 3.3 Format Version

An immutable numbered snapshot. Its publication visibility is:

- `team`: visible only through the internal Maker gate in the MVP
- `public`: eligible for the homepage and future marketplace

The Maker-facing lifecycle labels may remain `draft`, `team`, and `public`, but `draft` is a mutable object while `team` and `public` are visibility values on immutable versions.

Publishing is atomic:

1. Validate the draft and its test results.
2. Freeze required reference assets and fonts.
3. Write the immutable Format Version.
4. Update `latestVersionId`.
5. If public, also update `currentPublicVersionId`.

A failure changes none of these.

### 3.4 Layer Template

One component tree defining the static canvas. An MVP Format Version contains exactly one Layer Template; alternate layouts are separate Format cards.

Renderer primitives are deliberately small:

- Text
- Image
- Shape
- Group

Logo, emoji, background, and locked raster decoration are semantic roles or policies applied to primitives, not separate renderer implementations.

Every layer has:

- Stable ID
- Geometry
- Z-order
- Visibility and lock state
- Style
- Optional semantic role

### 3.5 Semantic Slot

A variable bound to one or more layer properties. It declares:

- Meaning
- Value type
- Required or optional status
- Constraints
- Fitting policy
- Optional Reroll Group membership

Examples include `brand_name`, `highlighted_benefit`, `supporting_item_1`, `relationship_emoji`, `product_image`, and `cta`.

### 3.6 Reroll Group

A set of slots that must change coherently. A headline, supporting list, emoji, and CTA may belong to one group so generation and later Player overrides preserve their shared idea.

### 3.7 Format Skill

One copy/pasteable instruction document per Format. Its required sections are:

1. Premise and persuasion mechanism
2. Component meanings
3. Adaptation across supported business types
4. Rules for genuinely different campaign plays
5. Reroll Group coherence
6. Language and quality rules
7. Unsupported uses and failure conditions

The skill is size-limited, delimited, untrusted instruction data. It cannot:

- Execute code or call tools
- Define response fields
- Override Wiggly system policy
- Change billing or cost behavior
- Mutate the renderer
- Refer to unknown slots or policies

The structured Format contract and Wiggly system policy are authoritative.

Natural-language `Propose changes` uses GLM 5.2 through NVIDIA NIM only after an explicit Maker action. Wiggly stores the proposal and displays the skill and policy diff. The draft changes only after `Apply`; rejection or provider failure leaves it unchanged.

Each Creative Batch records the skill hash, system-prompt version, exact model ID, and schema version used.

### 3.8 Campaign Strategy Policy

Structured Maker-approved bounds for:

- Funnel or audience stages
- Campaign objectives
- Audience types
- Psychological triggers
- Purchase motivations and objections
- Exclusions and unsupported uses

GLM chooses the strongest evidence-grounded mix of eight inside this policy. The same structured strategy object powers internal generation and the plain-language `How to run this ad` view; the system must not maintain competing campaign taxonomies.

### 3.9 Visual Policy

A bounded deterministic policy containing:

- Mutable and fixed properties by stable layer ID
- Palette tokens such as brand primary, secondary, neutral, reference, and occasion accent
- A small set of typography, background, border, and shadow modes
- Contrast and readability constraints
- Simple exclusions between modes

The resolver selects valid combinations from the policy, a stored seed, and the Campaign Play's semantic visual intent. Saved ads store resolved visual values so algorithm changes cannot alter existing pixels.

### 3.10 Validation Policy

A small publication contract containing:

- Canvas safe area
- Per-layer permission for clipping or off-canvas placement
- Allowlisted intentional collisions or overlaps
- Minimum text size, fitting, and contrast rules
- Required-slot and placeholder rules

A claimed business type is mechanically invalid if it lacks a strategy-policy mapping, lacks required-input coverage, or has not passed its required eight-ad test brand. Semantic quality still requires Maker review.

### 3.11 Asset Slot Policy

Every image-like slot declares allowed sources and priority:

- Selected product image
- Brand logo or website asset
- Player upload
- Fixed reference decoration
- Manually requested AI image

A missing required asset causes a visible Player question or action. The system never silently substitutes an unapproved source or starts image generation.

### 3.12 Brand Brief

An immutable project snapshot of website-derived brand identity, products, offer, audience, buyer moments, proof, visual assets, voice, and grounded language.

The MVP uses website evidence only. Audience ideas, motivations, objections, and occasions may be inferred only as labeled hypotheses with evidence and confidence.

### 3.13 Required Question

The four MVP answer types are:

- Short text
- Single choice
- Product selection
- Asset upload

The Maker defines what a Format requires. Wiggly asks only when the Brand Brief cannot supply a reliable answer.

### 3.14 Campaign Play

The exact GLM output unit for one of eight stable variant positions:

- `slotValues`: values keyed only to declared slot IDs
- `placementCopy`: primary text, headline, optional description, and CTA
- `strategy`: the structured campaign object
- `semanticVisualIntent`: treatment intent constrained by the Visual Policy

A slot value may be:

- Text
- An allowed enum
- `{ kind: "asset", assetId }`
- `{ kind: "pendingAiImage", requestSpec }`

Arbitrary URLs and undeclared assets are rejected. `assetId` must already exist in the Ad Project's durable candidate registry. `pendingAiImage` is inert and cannot invoke a provider.

Campaign Plays become immutable after validation. GLM never returns rendered pixels or an arbitrary layer tree.

### 3.15 Creative Batch

An immutable atomic set of exactly eight Campaign Plays. Variant positions have stable IDs within the Ad Project.

A new batch passes schema, slot, evidence, and render-placeholder validation before becoming active. The previous batch remains usable while a new batch is requested. A failed GLM batch never becomes active or destroys the previous one.

The MVP exposes only the active batch. Prior batches may be retained internally for integrity and rollback, but visible history is deferred.

### 3.16 Ad Project

The anonymous-session-owned Player aggregate. It is created after product selection and essential answers but before GLM generation.

It owns:

- Pinned Format Version
- Brand Brief snapshot
- Visible product selection
- Essential answers
- Durable candidate-asset registry
- Active Creative Batch pointer
- Eight stable variant positions
- Asset resolutions
- Ad Instances
- Batch readiness envelopes

GLM receives approved asset IDs and metadata rather than mutable source URLs.

Readiness states belong to the project's envelope around an immutable batch:

- `contentGenerating`: no valid batch yet
- `contentReady`: eight Campaign Plays are valid and asset readiness is resolving
- `assetPending`: required manual AI imagery remains unresolved
- `ready`: required assets and final render checks pass
- `failed`: generation or a required asset failed visibly

An `assetPending` batch may be active so the Player can use completed parts. Export and share remain blocked for affected outputs until required failures are resolved.

### 3.17 Ad Instance

One stable variant position inside an Ad Project. It owns:

- Active Campaign Play content
- Visual seed and resolved visual values
- Durable asset bindings
- Property overrides
- Group-level content locks
- Structural instance overrides

Player changes never alter the Format Version or the other seven instances.

### 3.18 StaticAdScene

The separately versioned, complete, JSON-safe scene for `static-package`. It carries:

- `formatId`
- `formatVersionId`
- Resolved layers
- Durable assets
- Render metadata

It does not inherit irrelevant legacy audio, brand, or layout fields.

The existing `AdScene` union adds this scene variant without changing legacy variants. A pure resolver produces it from:

```text
Format Version
  + active Campaign Play
  + Ad Project asset resolutions
  + Ad Instance overrides
  -> StaticAdScene
```

## 4. Reconstruction and Publication

Analysis returns one explicit outcome:

- **Supported, high confidence:** near-finished complete draft
- **Supported, low confidence:** best-effort complete draft with visible uncertainty
- **Unsupported:** visible stop with an explanation and no editability claim

Hybrid reconstruction rules:

- Text, images, logos, emoji, simple shapes, and groups become native layers when confidence is sufficient.
- Complex decoration may remain locked raster.
- Makers can replace, unlock, redraw, relabel, regroup, or change fixed/variable behavior.
- Every text layer binds to a Wiggly-bundled font, durably stored Maker upload, or approved substitute.
- Publication fails visibly until unavailable fonts have approved substitutes.

Publication blockers include:

- Missing required slots or placeholders
- Invalid asset bindings
- Empty required text
- Text overflow or unapproved clipping
- Off-canvas placement or collisions outside declared policy
- Contrast or readability failure
- Invalid schema or skill sections
- Unsupported business-type claims

Intentional overlap, approved safe-area exceptions, weak motivations, and low-confidence interpretations are visible warnings requiring Maker acknowledgement or correction. Automatic checks do not replace the Maker's review of all eight test ads.

MVP Maker publishing is protected by a minimal server-enforced internal gate. General Player authentication and team-management UI remain deferred.

## 5. Generation and Trust Boundary

GLM 5.2 through NVIDIA NIM produces exactly eight Campaign Plays in a Wiggly-defined structured response. Skill prose cannot redefine the schema.

Before generation:

1. The Player sees and confirms the selected product.
2. Essential missing questions are answered.
3. Wiggly creates the Ad Project.
4. Approved product, website, and uploaded candidates receive durable project asset IDs.
5. GLM receives the Brand Brief, selected product, answer data, structured policies, skill, and asset metadata.

After generation:

1. Validate the eight Campaign Plays atomically.
2. Reject unknown slots, asset IDs, and unsupported claims.
3. Resolve deterministic fitting and placeholder scenes.
4. Make the new batch active only if the entire content batch is valid.
5. Keep required manual AI slots visibly `assetPending`.

There is no speculative repair agent in the MVP. Deterministic validation rejects invalid output visibly. Provider or validation failure preserves the last usable batch.

## 6. Rerolls and Overrides

### 6.1 Content cycling

Spacebar advances the selected stable variant and loops after eight. It performs no model call, network generation, paid operation, or batch mutation.

`Generate new batch` is a separate semantic event. A successful batch atomically becomes active; the previous one remains usable until that point.

### 6.2 Visual reroll

Visual reroll:

- Affects only the currently viewed instance
- Changes only policy-approved style properties
- Preserves content, geometry, and component structure
- Is deterministic and model-free
- Uses campaign intent so the treatment is appropriate, not merely different

Resolved values are persisted for pixel stability.

### 6.3 Property overrides

Geometry and style overrides are keyed by stable layer and property ID. They survive cycling, compatible new batches, visual rerolls, export, share, and forks until reset.

Visual reroll skips explicitly overridden properties.

### 6.4 Content locks

Content coherence operates at Reroll Group level:

- Editing any content member locks a snapshot of the whole group's current `slotValues`.
- Compatible new batches update only unlocked groups.
- Resetting the group returns control to the active Campaign Play.
- An ungrouped content slot locks independently.

Ad Projects stay pinned to their original Format Version; no migration is guessed if a later version changes slots.

### 6.5 Structural instance overrides

Generation never changes layer structure. Explicit Player actions may:

- Hide or rearrange layers
- Delete a layer, stored as a tombstone for its stable ID
- Duplicate a layer or subtree, creating new instance-only IDs

A duplicate snapshots resolved content and style and has no Semantic Slot or Visual Policy binding. Later rerolls do not silently change it.

## 7. Assets, Fonts, and AI Images

Immutable versions and shares never depend on mutable or expiring URLs.

- Fixed reference layers and required fonts are copied into durable Wiggly-managed storage at publication.
- Project-selected website, product, upload, and generated assets receive durable IDs and hashes.
- Saved scenes store resolved styles as well as seeds.
- Shares freeze exact asset references and resolved scenes.

A pending AI slot contains an inert request specification. Only an explicit visible Player action may invoke image generation.

Rules:

- One image at a time per Player flow
- No prefetching or batching
- No speculative generation
- No automatic retry
- No provider fallback
- A paid action never begins because a card entered the viewport or the Player pressed spacebar

On success, the Ad Project stores the durable image and a resolution binding keyed by variant and slot. The immutable Campaign Play is not changed.

## 8. Editor, Renderer, and State

`/builder` supports two contexts through one editor shell:

1. Maker draft editing
2. Player instance editing

Maker commands require internal authorization. Player commands can never write a Format or publish a version.

`AdRenderSurface` remains the sole canvas-pixel renderer. Selection boxes, guides, transform handles, and snap indicators are visible sibling interaction overlays. An editor library must not paint a second copy of the ad beneath them.

State rules:

- Scene changes produce complete scene snapshots.
- Interaction state has one dedicated store.
- Product data does not duplicate inside interaction state.
- No invisible or transparent interaction targets.
- State changes use semantic events, not generic setters.

Expected events include:

- `referenceUploaded`
- `formatDraftAnalyzed`
- `layerRoleChanged`
- `rerollGroupChanged`
- `formatTestStarted`
- `formatPublished`
- `websiteSubmitted`
- `productSelected`
- `requiredAnswerProvided`
- `creativeBatchRequested`
- `creativeBatchReady`
- `sceneSelected`
- `visualRerollRequested`
- `instanceOverrideChanged`
- `imageGenerationRequested`
- `shareForked`
- `downloadRequested`

## 9. Export and Share

### 9.1 Export

- `Download current` exports the current native-dimension PNG.
- `Download all` exports all eight ads only when their required assets are ready.
- `Download campaign plan` exports the matching guidance, copy, objectives, audiences, triggers, evidence, confidence, and metrics.
- Filenames include Format, brand, and variant identifiers.
- PNG and ZIP export mount the same `AdRenderSurface`; they never use format-specific DOM selectors or page-local reconstruction.

### 9.2 Share

`/share` reads an immutable full-project snapshot containing:

- Pinned Format Version
- Brand Brief and product selection
- Essential answers
- All eight Campaign Plays
- All eight resolved scenes
- Selected index
- Durable asset IDs and hashes
- Resolved visual values
- Overrides
- Creator and source lineage

Sharing requires every required asset to be ready. The share never re-resolves a mutable Format, website, project, provider URL, or newer algorithm.

`Edit this ad` creates an independently owned anonymous fork. The original snapshot never mutates.

Share URLs are opaque.

## 10. Provider, Failure, and Cost Policy

### Text and strategy

- Model: GLM 5.2
- Provider: NVIDIA NIM
- Fallbacks: none
- Failure: visible error with usable existing state preserved

This policy applies to the new static engine only. Existing format providers remain unchanged.

### Vision and decomposition

The production stack is intentionally unselected until benchmarking. The chosen path must emit the structured draft, expose confidence, and fail visibly without silent provider switching.

### Image generation

- Test images: Nano Banana 2 Lite
- Production provider: pending benchmark
- Invocation: explicit manual click
- Concurrency: one at a time
- Fallbacks: none

### Anonymous cost controls

- Per-session and per-IP caps
- Explicit user actions
- Global spend ceiling and kill switch
- Visible limit errors
- Separate internal Maker-analysis budget controls

There is no billing UI in this MVP.

## 11. Existing Wiggly Coexistence

- New work lives in v3.
- Legacy `/create`, `/create-v2`, and `/builder` code is reference material only.
- Existing 3D, jingle, visualizer, Motion Story, brainrot, video meme, and Product Photoshoot workflows remain functional.
- Existing scene contracts and provider choices remain unchanged.
- Working reference code is not deleted.
- No new bespoke static Format should be added while this engine is being built.
- Style B remains the independent current 3D Breakdown priority.

## 12. Research Required Before Implementation Planning

The architecture plan must benchmark current open-source and hosted options for:

1. Layer decomposition and editable reconstruction
2. OCR, typography detection, and text-box recovery
3. Segmentation and locked-raster extraction
4. Canvas transforms, groups, snapping, and undo/redo
5. Structured vision analysis and semantic-role extraction
6. Deterministic browser rendering and native PNG export
7. Schema validation and versioning
8. Model quality, latency, memory, licensing, and commercial-use constraints
9. Minimal internal Maker authorization without a general account product

LayerD, Qwen Image Layered, Qwen Layered Control, SAM-family projects, and NVIDIA vision models are candidates, not approved dependencies. Reuse proven components only when they reduce development time without violating the single-renderer contract.

Implementation must proceed through fresh scoped branches, reversible phases, clean commits, required tests, and pushes. No product-code work begins until the benchmark, revised architecture, and phased plan receive founder approval.
