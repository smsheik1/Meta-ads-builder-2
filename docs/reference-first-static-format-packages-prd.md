# Wiggly Reference-First Static Format Packages MVP PRD

- Status: Draft for product approval
- Date: 2026-07-10
- Scope: Static image ads only
- Implementation status: Not started
- Audit baseline: `origin/main` at `021715a9`

Approval of this PRD authorizes technical research and implementation planning. It does not authorize product-code changes.

## 1. Executive Summary

Wiggly should let a nontechnical creative operator turn a saved reference ad into a reusable ad Format without writing code. A Player should then choose that Format, provide a brand website and any essential missing information, and receive eight campaign-ready static ads adapted to the brand.

The Format must preserve the recognizable formula of the reference while allowing brand-specific content, products, assets, colors, typography treatments, and campaign strategy. The Player can cycle through the eight ads instantly, reroll the current ad's visuals instantly, edit any ad in `/builder`, and download or share exactly what they previewed.

The MVP is not a universal media workflow system. It introduces one declarative engine for reference-first static image ads. Existing code-defined video, audio, 3D, and asset workflows remain separate and are not migration targets.

The product promise is:

> Give Wiggly an ad you wish your brand had made. Wiggly understands the formula, understands the brand, and produces eight ads the creative team could actually run.

Every batch must contain eight coherent, visually sound, strategically distinct ads. A broken or filler seventh or eighth ad is not an acceptable trade for one impressive hero result.

## 2. Why This Product Exists

The current Wiggly app contains individually implemented formats with separate scene shapes, prompts, renderers, generation branches, and workflow state. This was useful for proving ideas, but it makes each new format expensive to add and difficult to maintain.

Static ads do not need this level of format-specific code. Most are compositions of four renderer primitives:

- Text
- Images
- Shapes
- Groups

Logo, emoji, background, and locked decorative raster are semantic roles or policies expressed through those primitives, not reasons to create new renderers.

The differentiation is not a new React component for every ad. It is the combination of:

1. A visual template reconstructed from a reference.
2. A semantic formula explaining what every component means.
3. A Format skill explaining how to adapt that formula intelligently.
4. A brand brief and product selection grounded in the Player's website.
5. Eight deliberate campaign plays instead of shallow copy variations.

## 3. Users

### 3.1 First MVP user: Wiggly's assistant

The first operating user is Wiggly's internal assistant. She is fresh out of college, nontechnical, and already scouts visually interesting ads from her Instagram feed. She has saved references and will continue finding new ones.

Her workflow should feel like collecting and remixing good ads, not configuring enterprise software:

> Find a cool ad -> save it -> upload it -> watch Wiggly understand it -> make small corrections -> test it on a brand -> publish it -> repeat.

She adds one reference at a time. Bulk ingestion is not part of the MVP.

### 3.2 External Player

The future paying customer is a creative team at a Shopify brand doing roughly $50,000 or more in monthly revenue and experiencing continuous Meta creative demand. The economic buyer may be the founder, head of growth, or marketing lead. The daily Player may be a junior creative strategist, performance marketer, content marketer, or designer.

The default experience must not assume that the Player is an expert designer, prompt engineer, or senior media buyer.

### 3.3 Future Maker

Long term, any person should be able to create Formats for themselves, their team, or a public marketplace. Public copies should retain attribution to the original creator. The data model must preserve creator and lineage metadata now, but public Maker onboarding, teams, accounts, marketplace discovery, and payouts are deferred.

## 4. Product Thesis and Success Moment

The Maker system is infrastructure. It does not create the customer-facing wow moment by itself.

The Player's wow moment is:

> Wiggly understood my store and product, used a visual formula I already liked, and gave me next week's creative testing ideas as eight editable ads.

The copied reference is the hook. Human-level brand adaptation and campaign usefulness are the value.

The MVP fails if the result feels like a logo swap, generic fill-in-the-blank copy, or eight near-duplicate headlines.

## 5. Goals

1. Let the assistant create and publish a reusable static Format from one reference image without engineering help.
2. Produce a complete AI-generated draft before asking the Maker to configure anything.
3. Reconstruct 85-95% of suitable references into editable native layers, with remaining complex decoration preserved as locked raster layers.
4. Keep typical Maker cleanup under five minutes after analysis completes.
5. Generate exactly eight strategically different ads per Player batch.
6. Make content cycling and visual rerolls instant after the batch exists.
7. Let Players fully edit their own ad instances in `/builder`.
8. Preserve preview, download, and share parity through `AdRenderSurface`.
9. Add future static Formats as data, not application code.
10. Keep the internal architecture boring, deterministic, and inspectable.

## 6. Non-Goals

- Video Format Packages
- Jingle, 3D Breakdown, Motion Story, visualizer, or Product Photoshoot migration
- A universal workflow engine for every media type
- Public Maker onboarding or a marketplace UI
- Player accounts, team-management UI, billing, or subscriptions
- Meta OAuth, Ads Manager publishing, or campaign creation
- External market research from Reddit, competitors, or public reviews
- Mobile or touch-first editing
- Bulk reference upload
- Multiple reference images for one Format
- Saving a Player-edited ad back as a reusable Format
- Unconstrained generative UI or AI-generated application components
- Executable Format code or unrestricted tool access from Format skills
- Legal clearance, rights-management, or copied-ad review workflows
- Background music
- Automatic, speculative, batched, or prefetched AI image generation

## 7. Product Principles

### 7.1 Formula over pixels

Wiggly must understand why the reference works, not merely locate boxes. For the Codex reference, the formula is not "several gray words around two black words." It is a relationship between a brand, an emphasized counterpart or benefit, a symbolic emoji, surrounding category context, and a brand CTA.

### 7.2 AI freedom inside a fixed structural grammar

The published component tree is fixed during generation. GLM may fill declared slots, choose allowed semantic modes, and make every reroll group coherent. It may not silently add, delete, rearrange, or repurpose components.

Makers can modify structure in a draft. Players can modify their own instance in `/builder`. Those are explicit edits, not generation behavior.

### 7.3 One reference, one complete draft

The Maker uploads one image. Wiggly returns a complete editable draft containing the reconstructed layers, semantic formula, skill, required inputs, reroll groups, visual policy, and tests. The Maker should not complete a wizard before seeing what Wiggly understood.

### 7.4 No code per static Format

Published static Formats are immutable data packages consumed by one generic static renderer. The application registers one `static-package` engine discriminator. Individual published Formats are identified by data-level `formatId` and `formatVersionId`; they never become new renderer registry keys.

A new reference must not require changes to `/create`, `/builder`, `/share`, Convex generation dispatch, or React render components. The new static scene variant is additive. Existing scene variants and their contracts remain untouched unless a separate future plan explicitly changes them.

### 7.5 Quality before throughput

Reference analysis may take three to five minutes. The MVP prioritizes a near-finished draft over faster low-quality decomposition. Speed can improve after quality is dependable.

### 7.6 Explicit cost

Every paid media-generation action requires a visible user click. AI images generate one at a time. No paid operation begins because a card entered the viewport, a batch was prefetched, or the user pressed spacebar.

## 8. Core Product Objects

### 8.1 Format

The stable logical identity of a reusable ad formula. It owns creator and lineage metadata, a source-reference record, `latestVersionId`, and `currentPublicVersionId`. The identity survives across later revisions. Internal Maker views resolve `latestVersionId`; public cards and new project creation resolve `currentPublicVersionId`, so a newer internal-only version never silently replaces the public one. Existing Ad Projects remain pinned to their original version.

### 8.2 Format Draft

A mutable Maker workspace created from one reference image or from an existing published version. It contains analysis output and can be freely edited until publication. A draft is not an immutable version.

### 8.3 Format Version

An immutable, numbered published snapshot. Existing ads always retain the exact version used to generate them. Editing a published Format creates a new private draft and later a new version.

The Maker-facing lifecycle labels remain `draft`, `team`, and `public`, but the underlying contract is precise:

- `draft` means a mutable Format Draft.
- `team` is a visibility value on an immutable published Format Version and means visible only through the internal Maker gate in the MVP.
- `public` is a visibility value on an immutable published Format Version and makes it eligible for the Wiggly homepage or future marketplace.

MVP publishing is restricted by a minimal server-enforced internal Maker gate. General Player authentication, team administration, and public Maker onboarding remain deferred. The MVP UI supports internal draft access and public homepage publication; `team` visibility is preserved in the contract for controlled internal use without building a team product.

Publishing atomically validates the draft, freezes required assets, writes the immutable version, and updates the appropriate Format pointers. A `team` publication updates `latestVersionId`; a `public` publication updates both `latestVersionId` and `currentPublicVersionId`. A failed publication changes nothing.

### 8.4 Layer Template

The native or raster component tree that defines the canvas. An MVP Format Version contains exactly one Layer Template. Alternate layouts are separate Format cards.

Renderer-level native primitives are:

- Text
- Image
- Shape
- Group

Logo, emoji, background, and locked raster decoration are semantic roles or policies applied to those primitives rather than separate renderer implementations.

Each layer has a stable ID, geometry, z-order, visibility, lock state, style, and optional semantic role.

### 8.5 Semantic Slot

A variable bound to one or more layer properties. A slot declares what the content means, its requirements, constraints, and fitting policy. Examples include `brand_name`, `highlighted_benefit`, `supporting_item_1`, `relationship_emoji`, `product_image`, and `cta`.

### 8.6 Reroll Group

A set of slots that must change coherently. For example, the highlighted benefit, surrounding list items, emoji, and CTA can form one group so the ad continues to make sense as a unit.

### 8.7 Format Skill

One copy/pasteable instruction document per Format. It explains:

- The premise and persuasion mechanism
- Component meanings
- How to adapt across supported business types
- How to create genuinely different campaign plays
- How reroll groups stay coherent
- Language and quality rules
- Unsupported uses and failure conditions

The default editor accepts natural-language direction such as "make every reroll use a genuinely different purchase motivation." Wiggly proposes corresponding skill and structured-policy changes for Maker review; it does not silently publish them. Technical Makers may edit the raw skill directly and refine it in an external model before pasting it back.

`Propose changes` is an explicit Maker action using GLM 5.2 through NVIDIA NIM. Wiggly stores the proposal and shows the skill and policy diff. The draft changes only after the Maker clicks `Apply`; rejection or provider failure leaves the draft unchanged, and no fallback model runs.

The structured Format contract and Wiggly system policy are authoritative. Skill text is size-limited, clearly delimited untrusted instruction data. It is inert: it cannot execute code, call tools, define output fields, override system rules, change billing behavior, or mutate the renderer. References to unknown slots, policies, or fields are rejected. Each batch records the skill hash, system-prompt version, exact model ID, and schema version used.

Geometry, layers, asset policies, visual policies, and validation remain structured data rather than prose.

### 8.8 Campaign Strategy Policy

Structured Maker-approved bounds for the eight campaign plays. It declares allowed and excluded funnel stages, campaign objectives, audience types, psychological triggers, purchase motivations, and unsupported uses. GLM chooses the strongest evidence-grounded mix of eight inside this policy; Wiggly does not enforce a fixed funnel quota.

The same structured strategy object powers generation and the plain-language `How to run this ad` projection. Wiggly must not maintain two competing campaign taxonomies.

### 8.9 Visual Policy

The Maker-defined boundary for instant visual rerolls. The MVP policy is intentionally bounded to:

- Mutable and fixed properties by stable layer ID
- Palette tokens such as brand primary, secondary, neutral, reference, and occasion accent
- A small set of typography, background, border, and shadow modes
- Contrast and readability constraints
- Simple Maker-defined exclusions between modes

The MVP does not require Makers to author a finite list of visual presets. A pure resolver produces valid combinations deterministically from this policy, a stored seed, and the campaign play's semantic visual intent. Saved ads also store their resolved visual values so a later resolver change cannot alter existing pixels.

### 8.10 Validation Policy

A small structured publication contract containing:

- Canvas safe area
- Per-layer permission for intentional clipping or off-canvas placement
- An allowlist of intentional layer collisions or overlaps
- Minimum text-size, fitting, and contrast rules
- Required-slot and placeholder rules

The required Format Skill sections are the seven headings listed in Section 8.7. A claimed business type is mechanically invalid if it lacks a strategy-policy mapping, lacks required-input coverage, or has not passed its required eight-ad test brand. Semantic quality still requires Maker review.

### 8.11 Asset Slot Policy

Every image-like slot declares allowed sources and their priority:

- Selected product image
- Brand logo or website asset
- Player upload
- Fixed reference decoration
- Manually requested AI image

If a required asset is missing, Wiggly asks the Player. It never silently substitutes an unapproved source or starts image generation.

Fixed reference layers and required fonts are copied into durable Wiggly-managed storage when a Format Version is published. Project assets selected from a website, upload, or image-generation result are snapshotted with durable asset IDs and hashes before a project or share is frozen. Mutable or expiring remote URLs are never the source of truth for an immutable version or share.

Every text layer must bind to a Wiggly-bundled font, a durably stored Maker upload, or a Maker-approved substitute. If analysis identifies a font Wiggly does not have available, Wiggly proposes a substitute and publication remains blocked until the Maker approves one.

### 8.12 Brand Brief

The structured website-derived understanding of the brand. It includes brand identity, products, offer, audience, buyer moments, proof, visual assets, voice, and grounded language.

The MVP uses website evidence only. It may infer audience ideas, motivations, objections, and occasions as labeled hypotheses with evidence and confidence. External market research is deferred until a later benchmark proves it materially improves the eight ads.

### 8.13 Required Question Contract

A Maker can declare a required input with one of four MVP answer types: short text, single choice, product selection, or asset upload. Wiggly asks it only when the Brand Brief cannot supply a reliable answer.

### 8.14 Campaign Play

The exact unit returned by GLM for each of the eight variant positions:

- `slotValues`: values keyed only to declared Semantic Slot IDs. Each value is text, an allowed enum, `{ kind: "asset", assetId }`, or `{ kind: "pendingAiImage", requestSpec }`. Arbitrary URLs and undeclared assets are rejected.
- `placementCopy`: channel copy kept separate from canvas slots, including primary text, headline, optional description, and CTA
- `strategy`: the single structured campaign object used to derive `How to run this ad`
- `semanticVisualIntent`: a structured description of the treatment that best fits the play, constrained by the Visual Policy

An `assetId` must already exist in the Ad Project's durable candidate-asset registry. A `pendingAiImage` value is an inert request specification and never invokes a provider by itself. Campaign Plays remain immutable after validation. The GLM response never contains a rendered image or arbitrary layer tree. The pure resolver later combines a Campaign Play with the Format Version, Ad Project asset resolutions, and Ad Instance to produce `StaticAdScene`.

### 8.15 Creative Batch

An immutable atomic set of exactly eight Campaign Plays returned by GLM 5.2. The eight positions have stable variant IDs within an Ad Project. A new batch is appended and passes content, schema, evidence, and render-placeholder validation before the project's active-batch pointer changes. The UI exposes only the active batch in the MVP; user-facing batch history is deferred. While a new batch is being generated, the prior batch remains fully usable. A failed GLM batch never becomes active or destroys the prior batch.

### 8.16 Ad Project

The anonymous-session-owned Player aggregate created after product selection and essential answers but before GLM batch generation. It pins a Format Version and Brand Brief snapshot, and owns the visible product selection, essential answers, durable candidate-asset registry, active Creative Batch pointer, eight stable variant positions, asset resolutions, and Ad Instances. GLM receives approved asset IDs and metadata from this registry rather than mutable URLs.

The Ad Project owns a mutable readiness envelope around each immutable batch:

- `contentGenerating`: the GLM batch is not yet valid.
- `contentReady`: all eight Campaign Plays are valid and asset readiness is being resolved.
- `assetPending`: Campaign Plays are valid, but at least one required manual AI image is unresolved.
- `ready`: all required assets and final render checks pass.
- `failed`: generation or a requested required asset failed visibly; valid content and completed assets remain usable, but export/share remain blocked until the required failure is resolved.

An `assetPending` batch may become active so the Player can use everything else and see explicit actions. When a requested AI image completes, the Ad Project stores the durable result and an asset-resolution binding keyed by variant and slot. It never mutates the Campaign Play. This stable aggregate also lets instance overrides survive content cycling and approved new-batch changes without relying on array position or mutable website data.

### 8.17 Ad Instance

One variant position inside an Ad Project, with its active content, visual seed, resolved visual values, durable assets, and explicit overrides keyed by stable layer or slot ID. Player edits belong to the instance and do not alter the published Format.

### 8.18 StaticAdScene and AdScene

`StaticAdScene` is the new, separately versioned, complete JSON-safe snapshot for the one `static-package` engine entry. It carries `formatId`, `formatVersionId`, resolved layers, durable assets, and render metadata. It does not inherit irrelevant legacy brand, audio, or layout fields.

The existing `AdScene` union adds this scene variant without changing legacy variants. A pure resolver outside the renderer produces the complete scene from Format Version + active Creative Batch + Ad Project asset resolutions + Ad Instance overrides. `AdRenderSurface` only paints the resolved scene; the scene is not the reusable Format definition or scattered editor state.

## 9. System Boundary

```text
Reference image
  -> stable Format + mutable Format Draft
  -> Maker review and tests
  -> immutable Format Version + frozen assets

Website
  -> Brand Brief snapshot + visible product selection + essential answers
  -> Ad Project + durable candidate-asset registry
  -> Format skill + structured slot and campaign-policy contracts
  -> immutable GLM 5.2 Creative Batch of eight
  -> Ad Instances + asset resolutions + visual policies + Player overrides
  -> resolved StaticAdScene
  -> AdRenderSurface
  -> preview / PNG / ZIP / campaign plan / frozen share
```

Static Format Packages and existing media workflows remain separate:

```text
Static Format Package -> generic static layer renderer
3D / jingle / video workflows -> existing code-defined orchestration
```

No new code-defined static format should be added after this engine exists.

## 10. Maker Experience

### 10.1 Reference intake

1. The Maker opens the Maker workspace in `/builder`.
2. The Maker uploads one static reference image.
3. Optional notes allow the Maker to explain a specific interpretation, but image-only input must work.
4. Wiggly begins analysis and shows meaningful progress.
5. No paid image generation runs during analysis.

### 10.2 Complete-draft output

Wiggly proposes all of the following before asking for configuration:

- Canvas dimensions and aspect ratio
- Native and locked raster layers
- Layer names and semantic roles
- Fixed versus variable properties
- Semantic slots and text-fitting rules
- Coherent reroll groups
- Formula explanation in plain language
- One editable Format skill
- Campaign Strategy Policy
- Supported business types
- Required inputs and conditional questions
- Asset source policies
- Visual reroll policy
- Automatic quality checks
- Reconstruction coverage and confidence

Analysis has three explicit outcomes:

- Supported, high confidence: return the near-finished complete draft.
- Supported, low confidence: return a best-effort complete draft with visible uncertainty and no five-minute cleanup claim.
- Unsupported: stop visibly, explain what could not be reconstructed, and make no complete-draft or editability claim.

### 10.3 Reconstruction behavior

Wiggly uses hybrid reconstruction:

- Text, images, logos, emoji, basic shapes, and groups become native editable layers whenever confidence is sufficient.
- Complex decoration may remain a locked raster layer.
- The Maker can replace, unlock, redraw, relabel, regroup, mark fixed or variable, and edit any reconstructed layer.
- Wiggly accepts any static reference upload, but it may return the explicit unsupported outcome. The near-finished quality promise applies only when analysis confidence clears the product threshold.

### 10.4 Maker controls

The Maker can:

- Select, drag, resize, rotate, reorder, group, ungroup, lock, unlock, hide, show, duplicate, and delete layers
- Edit text, fonts, sizes, line height, alignment, colors, fills, strokes, borders, shadows, and images
- Rename semantic roles and slots
- Bind layer properties to slots
- Define fixed versus variable properties
- Create and edit reroll groups
- Define text-fitting behavior and limits
- Define asset sources and priority
- Define supported business types
- Define allowed campaign stages, objectives, audiences, triggers, motivations, exclusions, and unsupported uses
- Write conditional required questions
- Give natural-language instruction changes, review Wiggly's proposed structured changes, and edit the raw skill text directly
- Preview visual-policy combinations
- Undo and redo

Maker flexibility does not imply runtime structural freedom for GLM.

### 10.5 Supported business types

The product recognizes four top-level business types:

1. Ecommerce
2. Information or info-product business
3. Service business
4. SaaS

The Maker decides which types a Format supports. Wiggly must not silently decide that every Format supports every business type.

If the detected Player business type is incompatible, `/create` hard-stops and recommends compatible Formats. If detection confidence is low, the Player confirms the type. There is no mismatch override in the MVP.

### 10.6 Questions and required inputs

The Maker defines what the Format needs. Wiggly determines whether the website brief already provides it.

- Questions are asked only when required information is absent or unreliable.
- Questions appear before generation.
- The default UI shows a compact brand summary.
- Full extracted evidence and the complete creative brief remain behind an optional details action.
- A Format can require a product, offer, audience, occasion, proof point, or custom answer through the four supported answer types.

### 10.7 Testing and publication

Before publishing, Wiggly separates hard blockers from creative warnings.

Hard blockers are:

- Missing required slots
- Invalid asset bindings
- Empty required text
- Text overflow or clipping
- Unapproved clipping, off-canvas placement, or collision outside Maker-declared safe-area rules
- Contrast and readability failures
- Missing placeholders
- Invalid schema or skill sections
- Unsupported business-type claims

Warnings that require Maker review include intentional overlap, approved safe-area exceptions, duplicate or weak campaign motivations, and low-confidence semantic interpretation. Warnings do not silently pass; the Maker must acknowledge or correct them. A visually broken or strategically filler variant remains unacceptable even if it passes schema checks.

The Maker must run one successful test brand for every claimed business type. Every test produces eight ads. The Maker reviews all eight; automatic checks do not replace creative judgment. Any unacceptable variant fails the test.

Publishing creates an immutable Format Version. Later changes create a new draft. Published versions retain creator, source-reference, and lineage metadata.

The engine-quality benchmark in Section 17.2 governs the editability and cleanup claims. Until that gate passes, 85-95% editability and five-minute cleanup are product targets, not established facts.

## 11. Player `/create` Experience

### 11.1 Format-first discovery

The homepage and `/create` lead with recognizable copied-reference Format cards created from the assistant's saved brand ads. Attribution metadata is preserved even though rights-management workflows are outside this MVP. The primary launch action is equivalent to:

> Make this for my brand.

Website-first Format recommendation is deferred. The Player selects the visual formula first, then enters the website.

### 11.2 Website research

1. The Player submits a public website URL.
2. Wiggly extracts the compact brand brief, product catalog, visual assets, proof, and grounded language.
3. Wiggly detects the business type and checks Format compatibility.
4. Wiggly displays the compact brand summary.
5. If the Format is product-scoped, Wiggly visibly shows the preselected product and extracted alternatives.
6. The Player may change the product.
7. Wiggly asks only essential missing questions.
8. Clicking `Create my ads` confirms the visible product and answers, creates the Ad Project, and snapshots approved product, website, and uploaded candidates into its durable asset registry before GLM receives their IDs and metadata.

The product choice is never silent. A separate redundant confirmation step is unnecessary because the generation action confirms the visible selection.

### 11.3 Batch generation

GLM 5.2 through NVIDIA NIM produces exactly eight campaign plays in a strict structured response defined by Wiggly, not by skill prose. There are no model fallbacks. If GLM or NIM fails, Wiggly fails visibly and preserves the existing batch.

The MVP does not add a speculative AI repair agent. Wiggly performs deterministic schema, slot, evidence, and rendering checks. Text fitting follows Maker-defined policies. A truly invalid batch is rejected visibly.

### 11.4 Eight campaign plays

The eight outputs are not random wording variations. Each is a deliberate Campaign Play selected from the Format's allowed strategy envelope and the brand evidence.

`slotValues` supplies the canvas copy and assets. `placementCopy` separately supplies primary text, headline, optional description, and CTA for the ad channel. The `strategy` object drives the simpler Player-facing guidance, so the professional and plain-language views cannot disagree. It includes:

- Creative direction
- Funnel or audience stage
- Audience hypothesis
- Campaign objective
- Main psychological trigger
- Purchase motivation or objection addressed
- Recommended success metric
- Supporting evidence and confidence
- Reading-level result

`semanticVisualIntent` adds a treatment direction such as holiday warmth, premium proof, or urgent retargeting, always constrained by the Maker's Visual Policy. The resolved ad is derived afterward; GLM never returns rendered pixels or a new component tree.

User-facing guidance appears under the plain-language heading `How to run this ad`:

- Best for
- Show it to
- Why it works
- Campaign goal
- Main trigger
- Use this text
- Watch this number

Professional labels may appear secondarily:

- New customers / top of funnel
- Interested shoppers / middle of funnel
- Ready to buy / bottom of funnel or retargeting
- Existing customers / retention

Ad copy targets approximately a fifth-grade reading level. Automatic checks emit a reading-level result and flag jargon, long sentences, unsupported claims, repeated motivations, and copy that cannot fit the declared slots.

Wiggly does not enforce a fixed funnel quota across the eight. The Maker declares allowed stages, objectives, audience types, and triggers. The strategist chooses the strongest mix for the brand and product.

For the Codex-to-David's-Cookies demo, valid directions could include holiday gifting, matching a shopper to a top seller, common gifting occasions, corporate gifts, a proof-led best-seller pitch, or last-minute-gift retargeting. These are examples, not a hard-coded David's Cookies recipe: the same Format must intelligently choose different service, information-product, or SaaS directions when those business types are Maker-approved.

### 11.5 Content reroll

- Spacebar selects the next precomputed ad.
- The sequence loops after the final ad.
- Spacebar never invokes an AI model, paid provider, network generation, or new batch.
- There are no thumbnails, favorites, or history panels in the MVP.
- `Generate new batch` is a separate explicit action.
- A content-valid new batch atomically becomes the active set of all eight ads after schema, evidence, and render-placeholder validation. It may be visibly `assetPending` when the Format requires manually generated images.
- The old batch remains usable while the new one generates.
- The system may retain prior immutable batches for integrity and rollback, but the MVP does not expose batch history.

### 11.6 Visual reroll

- Visual reroll affects only the currently viewed ad.
- It changes only properties allowed by the Maker's visual policy.
- It can change colors, typography treatment, background treatment, borders, shadows, and similar style properties.
- It does not change content, semantic formula, component geometry, or layer structure.
- It is instant, deterministic, and requires no model call.
- Every initial ad receives a policy-valid treatment appropriate to its occasion, trigger, and intent. Distinctness alone is insufficient; when the policy permits, the eight should also be visually distinct.
- The current ad advances through deterministic policy-derived combinations without affecting the other seven.

An alternate layout is a separate Format card, not a visual reroll. An MVP Format Version has exactly one Layer Template.

### 11.7 Player overrides

When a Player changes a property in `/builder`, it becomes an instance override keyed by a stable layer or slot ID. Overrides survive:

- Content cycling
- New content batches where the slot remains compatible
- Visual rerolls
- Download
- Share and share forks

Visual reroll changes only properties the Player has not overridden. The Player can explicitly reset an override to return control to the Format policy.

Geometry and style overrides remain property-level. Content stays coherent at the Reroll Group level: when a Player edits any content member, Wiggly visibly locks a snapshot of the entire group's current `slotValues` across new batches until the Player resets that group. Unlocked groups receive the active batch's complete new content. An ungrouped content slot locks independently.

If an edited slot no longer exists or becomes structurally incompatible in a future Format Version, the existing Ad Project remains pinned to its original version rather than guessing a migration.

Generation never changes layer structure. A Player may explicitly hide, delete, duplicate, or rearrange layers inside an Ad Instance. Deletion is stored as a tombstone for the original stable layer ID. Duplication creates a new instance-only ID and snapshots the resolved layer or subtree with no Semantic Slot or Visual Policy binding; later rerolls do not silently change the copy. These structural instance overrides do not alter the Format Version or the other seven ads.

### 11.8 AI image slots

Some Formats may declare an AI image source for a slot.

- Wiggly initially resolves every non-AI part of the ad.
- A `{ kind: "pendingAiImage", requestSpec }` slot remains inert and shows a clear visual state.
- Generation starts only after an explicit click on that slot or its visible action.
- Images generate one at a time.
- No prefetching, batching, speculative generation, or automatic retries occur.
- The requested image may load lazily while the rest of the ad remains usable.
- On success, Wiggly stores the image as a durable project asset and records the variant-slot resolution without changing the immutable Campaign Play.
- A required image must be ready before download.
- The project advances from `assetPending` to `ready` only after every required image and final render check passes.
- Provider failure remains visible; no fallback model runs.
- Nano Banana 2 Lite is the locked test-image provider for implementation QA.

## 12. `/builder` Experience

`/builder` owns precision editing. `/create` must not become a mini-builder.

The same editor shell and scene contract support two explicit contexts:

1. Maker draft editing: modifies an unpublished Format Draft.
2. Player instance editing: modifies one Ad Instance without changing the Format Version.

The context determines which controls, typed mutation commands, and publication actions are available. Maker-draft commands require internal Maker authorization. Player-instance commands can never write a Format or publish a version. The two contexts do not create separate renderers or layer systems.

`AdRenderSurface` remains the sole canvas-pixel renderer in both contexts. Visible selection boxes, guides, transform handles, and snap indicators are sibling interaction overlays; an editor library must not paint a second version of the ad underneath them.

Player controls include:

- Click-to-select
- Drag, resize, and rotate
- Text editing
- Font, size, line-height, alignment, and color changes
- Background, image, border, and shadow changes
- Duplicate, delete, grouping, locking, visibility, snapping, undo, and redo
- Layer ordering
- Resetting individual overrides
- Download and share

The MVP is desktop-only. Mobile may render, but touch editing and mobile QA are not supported.

## 13. Download and Share

### 13.1 Download

- `Download current` exports the current ad as a native-dimension PNG.
- `Download all` exports a ZIP containing all eight ads once all required assets are ready; until then, the visible action explains which ads are still waiting.
- `Download campaign plan` exports all eight strategy objects as one human-readable artifact, including each ad's `How to run this ad` guidance, campaign copy, objective, audience, trigger, evidence, confidence, and success metric. Technical planning may select the exact file format; the artifact is required.
- Filenames include Format, brand, and variant identifiers.
- Required manually requested assets must be ready before their ads can export.
- Preview and download consume the same resolved `AdScene` and `AdRenderSurface` path.

### 13.2 Share

- `/share` displays an immutable full-project snapshot through `AdRenderSurface`.
- The shared original does not mutate.
- `Edit this ad` creates an anonymous fork and opens it in `/builder`.
- Sharing requires every required asset in the eight-ad project to be ready; it never freezes a loading or broken placeholder as a completed ad.
- The snapshot contains the pinned Format Version, Brand Brief snapshot, product selection, essential answers, all eight Campaign Plays and resolved scenes, selected index, durable asset IDs and hashes, resolved visual values, and overrides. This keeps the displayed guidance and downloadable campaign plan matched to the exact ads. `/share` never re-resolves from a mutable Format, website, project, provider URL, or current resolver algorithm.
- The fork begins from that frozen snapshot, retains Format creator/source lineage metadata, and is owned by a new anonymous session.
- The recipient can edit, download, and reshare the fork.
- Share URLs are opaque.

## 14. Rendering and State Guardrails

1. `AdRenderSurface` remains the only pixel renderer for `/create`, builder canvas, PNG/ZIP export, and share.
2. `AdRenderSurface` is passive. It paints a complete resolved `AdScene` and owns no product mutation logic.
3. The generic static layer renderer is registered once under `static-package`, not once per published Format.
4. A pure resolver outside `AdRenderSurface` applies Format Version + active batch + project asset resolutions + instance state and emits a complete `StaticAdScene`. The renderer never fetches, generates, or mutates data.
5. Builder interaction chrome is a visible sibling overlay around the same `AdRenderSurface`; it is not a second pixel renderer.
6. Editor changes produce complete scene snapshots through semantic events.
7. Canvas interaction state lives in one dedicated store. Scene, Format, brand, batch, job, and asset data do not duplicate there.
8. No invisible or transparent interaction targets are permitted.
9. PNG and ZIP export mount the same render surface and never depend on format-specific DOM selectors or page-local editor state.
10. Download and share consume frozen, fully resolved scenes.
11. A published Format Version is immutable and fully version-addressable.
12. User-facing changes are tested through `/create` with Playwright.
13. Replicate generation is never triggered during QA unless explicitly required and announced first.
14. Product-code phases use fresh scoped branches, clean commits, and pushes after passing checks.

Suggested semantic events include:

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

## 15. Provider and Failure Policy

### 15.1 Text and strategy

- Model: GLM 5.2
- Provider: NVIDIA NIM
- Fallbacks: none
- Failure behavior: visible error with existing usable state preserved

The Player cannot select another model. This provider rule applies to the new static Format Package engine. Existing format providers remain unchanged unless separately approved.

### 15.2 Vision and layer reconstruction

The production vision/decomposition stack is intentionally not selected in this PRD. It must be benchmarked during technical planning. The chosen path must produce the structured draft contract, expose confidence, and fail visibly without silently switching providers. Low-confidence or unsupported references receive an explicit outcome rather than a fake near-finished result.

### 15.3 Image generation

- Test provider: Nano Banana 2 Lite
- Invocation: explicit manual click
- Concurrency: one image at a time per Player flow
- Fallbacks: none

Nano Banana 2 Lite is locked for test images and QA, not selected here as the production image-generation provider. Production provider selection remains part of the post-approval benchmark.

### 15.4 Cost controls

Anonymous paid operations require:

- Per-session and per-IP caps
- Explicit user action
- A global spend ceiling and kill switch
- Visible limit errors
- Separate internal Maker-analysis budget controls

There is no billing UI in this MVP.

## 16. Quality Bar

### 16.1 Maker quality

- The draft must be understandable without reading raw JSON.
- Reconstruction coverage and uncertainty are visible.
- The Maker can correct every semantic and visual decision.
- A competent assistant can publish without engineering help.
- Typical correction time is under five minutes after analysis for references above the quality threshold.

### 16.2 Player quality

- The Format remains recognizably derived from the chosen reference.
- Every output is materially adapted to the selected brand and product.
- The eight ads use genuinely different motivations or campaign directions.
- All visible claims are grounded or clearly labeled hypotheses.
- Every required slot is filled and coherent with its reroll group.
- No text clips, overflows, or becomes unreadably small.
- Visual variation remains on-brand and passes contrast checks.
- All eight must be coherent, visually sound, strategically distinct, and usable as serious campaign candidates; none may be broken or filler.

Engine quality and product demand are separate gates. Engine acceptance proves the assistant can create eight strong ads without code. Product-demand acceptance requires observing target creative-team operators independently select, edit, download, or attempt to run outputs. Compliments alone do not count. The founder sets the minimum demand threshold before public launch.

## 17. Acceptance Gates

### 17.1 Engine functional acceptance

The defining end-to-end functional test uses the supplied 1:1 OpenAI reference: Codex and Slack emphasized around a handshake emoji, surrounding tool names in gray, and a `Work with Codex` CTA.

1. The assistant uploads the reference image with no code and no required written explanation.
2. Wiggly produces a complete draft that correctly identifies the logo, central relationship, emoji, surrounding list, CTA, visual hierarchy, and semantic formula.
3. The assistant completes cleanup in under five minutes after analysis.
4. She marks the supported business types, reviews the skill, defines or accepts the reroll group and visual policy, and publishes an immutable Format Version.
5. A Player selects that Format and enters `davidscookies.com`.
6. Wiggly shows its compact brand summary and visible selected product with alternatives.
7. The Player clicks `Create my ads`.
8. Wiggly returns eight coherent David's Cookies campaign plays that remain recognizably the Codex composition while varying motivations, surrounding items, emoji, CTA, and strategy.
9. Spacebar cycles all eight instantly and loops.
10. Visual reroll changes only the current ad and preserves Player overrides.
11. `/builder` can move and restyle every native layer.
12. Current PNG, all-ads ZIP, and `/share` match the builder preview.
13. `Download campaign plan` contains complete, matching guidance for all eight ads.
14. `Edit this ad` from share creates an independent anonymous fork.
15. The assistant can repeat the process with another saved Instagram reference without engineering changes.

The engine is not launch-ready if this scenario works only through reference-specific code or manual database edits.

### 17.2 Engine quality acceptance

The Codex scenario proves the workflow, not reconstruction quality by itself. Before the cleanup and editability targets become launch claims:

1. The assistant tests at least three structurally different holdout references that were not used to tune the system.
2. Reference suitability is recorded before viewing the result so unsupported inputs cannot be quietly removed from the denominator.
3. Editability coverage is the share of human-reviewed variable visual elements whose intended properties can be changed independently without redrawing the reference. Each supported high-confidence holdout must reach at least 85%; 95% remains the stretch target.
4. Median assistant cleanup time after analysis is five minutes or less.
5. Every published test batch contains eight coherent, visually sound, strategically distinct outputs with no broken or filler variant.
6. Every holdout uses the same data-defined `static-package` path with no reference-specific code or database edits.

### 17.3 Locked-capability acceptance matrix

| Capability | Required test |
| --- | --- |
| Conditional questions | Exercise short text, single choice, product selection, and asset upload; website-grounded answers skip the question and unreliable or missing answers show it before generation. |
| Manual AI images | Use Nano Banana 2 Lite test images only after explicit clicks; verify one-at-a-time generation, visible `assetPending` state, blocked export/share, `ready` transition, visible failure, and no fallback or unannounced Replicate call. |
| Coherent content overrides | Edit one member of a Reroll Group, generate a new batch, verify the full group snapshot persists, then reset the group and verify the new batch takes control. |
| Structural instance overrides | Delete a bound layer and verify its tombstone survives rerolls; duplicate a bound layer and verify the new instance-only snapshot stays detached and deterministic. |
| Version and visibility | Publish a public version, then a newer internal `team` version; verify public discovery still resolves `currentPublicVersionId` while the Maker resolves `latestVersionId`. |
| Frozen assets and shares | Change or remove an original website asset after sharing; verify all eight shared scenes, guidance, campaign plan, fonts, and pixels remain unchanged and a fork is independent. |
| Renderer parity | Compare `/create`, `/builder`, current PNG, eight-ad ZIP, and `/share`; every surface must consume the same resolved scene through `AdRenderSurface`. |

### 17.4 Public-launch demand acceptance

Demand validation is not an engine test. After the first working slice, target creative-team operators must independently select, edit, download, or attempt to run the outputs. Before public launch, the founder records the sample and minimum behavioral pass threshold in the launch plan. Compliments do not satisfy this gate.

## 18. Existing Wiggly Formats

Existing formats remain functional and are not a migration backlog.

- New implementation lives in the v3 app. Legacy `/create`, `/create-v2`, and `/builder` code is reference material only; legacy state or rendering patterns are not copied into v3.
- Do not rewrite 3D Breakdown, jingle, visualizer, Motion Story, brainrot, video meme, or Product Photoshoot into the static Format Package engine.
- Do not delete working reference code as part of this MVP.
- Do not add another bespoke static format while the generic engine is underway.
- Style B remains the current 3D Breakdown priority, but it is independent of this PRD.
- GLM 5.2 through NVIDIA NIM is locked for the new static engine; it does not silently replace providers in existing formats.
- Existing format behavior may later be retired or re-expressed only when there is a specific product reason and a separate approved plan.

## 19. MVP Scope Table

| Capability | MVP | Deferred |
| --- | --- | --- |
| Reference input | One static image | Multi-reference synthesis, bulk import |
| Maker access | Server-gated internal assistant | Player accounts, team UI, open public Maker onboarding |
| Reconstruction | Hybrid native + locked raster | Full automatic vector recreation |
| Format logic | One editable skill + slot, campaign, visual, and asset contracts | Executable plugins or arbitrary tools |
| Business support | Maker-declared subset of four types | Automatic universal compatibility |
| Player batch | Exactly eight campaign plays | Variable batch size and history |
| Content reroll | Instant cycle and explicit new batch | Infinite automatic generation |
| Visual reroll | Current ad, deterministic visual policy | AI layout redesign |
| Editing | Desktop `/builder` | Mobile/touch editor |
| Images | Website/upload/fixed/manual AI slot | Automatic AI image batches |
| Export | Current PNG, eight-ad ZIP when ready, campaign plan | PSD, SVG, editable Canva export |
| Share | Anonymous view, fork, edit, reshare | Accounts, comments, approvals |
| Research | Website-derived brief | Reddit, competitor, and external market research |
| Campaign action | Guidance and downloadable plan | Meta connection or publishing |
| Marketplace | Creator/version metadata only | Discovery, payments, ratings, cloning UI |

## 20. Risks and Mitigations

### Poor layer decomposition

Mitigation: hybrid native/raster output, confidence reporting, quality threshold, and complete Maker correction controls.

### Generic AI copy

Mitigation: one precise Format skill, grounded brand evidence, coherent reroll groups, eight explicit campaign directions, duplicate-motivation checks, and mandatory Maker tests.

### Universal-engine overreach

Mitigation: static images only; media workflows remain code-defined and separate.

### Runtime layout instability

Mitigation: fixed generation-time component tree, slot constraints, deterministic fit policies, bounded visual policies, persisted resolved styles, and one resolved `AdScene` renderer.

### Published output changes later

Mitigation: immutable numbered Format Versions, frozen reference assets and fonts, snapshotted project assets, durable IDs and hashes, persisted resolved scenes, and share snapshots that never re-resolve mutable sources.

### Skill prompt injection or contract drift

Mitigation: treat skill text as size-limited untrusted data; keep system policy and structured schemas authoritative; reject unknown fields; record skill, prompt, model, and schema versions on every batch.

### Maker workflow becomes enterprise software

Mitigation: complete draft first, visual canvas as primary interface, advanced raw skill as an escape hatch, no setup wizard, and one reference at a time.

### Players mistake hypotheses for targeting facts

Mitigation: label inferred audiences and motivations as hypotheses with supporting website evidence and confidence.

### Cost surprises

Mitigation: explicit clicks, one-at-a-time image generation, no provider fallbacks, spend ceilings, and visible failure.

### Clean architecture without product demand

Mitigation: after the first working slice, observe real creative-team members use it without coaching. Measure whether they choose, edit, download, and attempt to run ads rather than whether they say the demo looks cool.

## 21. Required Technical Research After PRD Approval

The implementation plan must not be written from memory alone. It must benchmark current open-source and hosted options against this PRD for:

1. Layer decomposition and editability reconstruction
2. OCR, typography detection, and text-box recovery
3. Segmentation and locked-raster extraction
4. Canvas editing, transforms, groups, snapping, and undo/redo
5. Structured vision analysis and semantic-role extraction
6. Deterministic browser rendering and native PNG export
7. Format-package schema validation and versioning
8. Model quality, latency, memory, licensing, and commercial-use constraints
9. Minimal server-enforced internal Maker authorization without introducing a general account product

Previously identified candidates such as LayerD, Qwen Image Layered, Qwen Layered Control, and related projects are research candidates, not approved dependencies. SAM-family and NVIDIA vision models should be evaluated only for the specific subsystem they solve. The plan should reuse proven components where they materially reduce development time without compromising commercial use or the single-renderer contract.

## 22. Definition of PRD Approval

This PRD is approved when the founder agrees that it accurately defines:

- The assistant-first Maker wedge
- The external creative-team value proposition
- Static-only MVP scope
- Maker and Player control boundaries
- Declarative Format Package objects
- Stable Format identity, mutable drafts, immutable published versions, and frozen assets
- Fixed runtime structure
- Exact Campaign Play, batch readiness, and Ad Project ownership contracts
- Exactly eight campaign plays
- Maker-approved Campaign Strategy Policy and plain-language campaign guidance
- Separate content and visual rerolls
- Persistent Player overrides and frozen share semantics
- `/create`, `/builder`, and `/share` ownership
- Provider, cost, and failure rules
- Existing-format coexistence
- Functional, quality, locked-capability, and demand acceptance gates

After approval, the next artifacts are:

1. Open-source and model benchmark report
2. Revised target architecture based on benchmark evidence
3. Phased implementation plan with tests, rollback points, and branch boundaries
4. Founder approval to begin product-code implementation
