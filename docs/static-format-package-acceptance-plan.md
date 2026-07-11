# Wiggly Static Format Package MVP Acceptance Plan

- Status: Draft companion to the MVP PRD
- Date: 2026-07-10
- Scope: Functional, quality, capability, and demand gates
- Implementation status: Not started

Related documents:

- [Product requirements](./reference-first-static-format-packages-prd.md)
- [Architecture contract](./static-format-package-architecture-contract.md)
- [Open-source research ledger](./static-format-package-open-source-ledger.md)
- [Wiggly engineering rules](./wiggly-engineering-rules.md)

This document makes the PRD executable without turning it into a test specification. Passing one gate does not imply the others passed:

- **Functional acceptance** proves the complete workflow exists.
- **Quality acceptance** proves reconstruction and output quality generalize beyond one demo.
- **Capability acceptance** proves locked edge behavior.
- **Demand acceptance** proves target customers value the result.

## 1. Functional Acceptance: Codex to David's Cookies

The defining end-to-end test uses the supplied 1:1 OpenAI reference: Codex and Slack emphasized around a handshake emoji, surrounding tool names in gray, and a `Work with Codex` CTA.

### Maker path

1. The internal assistant opens the Maker context in `/builder`.
2. She uploads the reference with no code, database edit, or required written explanation.
3. Wiggly identifies the logo, handshake emoji, CTA, hierarchy, semantic premise, the seven-item integration list, and `Slack` as the currently active item rather than a permanently separate category.
4. Wiggly returns a complete draft containing native and locked-raster layers, roles, Fields, Lists, active/supporting presentation bindings, Reroll Groups, skill, business compatibility, required inputs, and policies.
5. The assistant makes corrections visually.
6. Cleanup takes no more than five minutes after analysis for this reference when reconstruction and asset confidence are high.
7. She reviews the skill and structured policies.
8. She runs the required eight-ad test brand.
9. All eight test ads pass automatic checks and human review.
10. She publishes an immutable public Format Version.

### Player path

1. A Player selects the copied-reference Format card.
2. The Player enters `davidscookies.com`.
3. Wiggly displays a compact brand summary.
4. Wiggly visibly shows the selected product and extracted alternatives.
5. The Player may change the product.
6. Wiggly asks only essential questions the website could not answer reliably.
7. The Player clicks `Create my ads`.
8. GLM 5.2 through NVIDIA NIM returns exactly eight valid Campaign Plays.
9. The eight remain recognizably based on the reference while varying motivations, list content, active selection, emoji, CTA, strategy, and appropriate visual treatment.
10. Guidance for each ad appears under `How to run this ad`.

### Interaction and output path

1. Spacebar cycles all eight instantly and loops after the eighth.
2. Spacebar performs no model call, network generation, or paid action.
3. Visual reroll changes only the currently viewed ad.
4. Visual reroll preserves content, geometry, structure, and explicit Player overrides.
5. `/builder` can move, resize, restyle, edit, hide, delete, duplicate, and reorder native layers.
6. `Download current` matches the preview.
7. The eight-ad ZIP matches all eight previews.
8. The campaign plan matches the eight displayed Campaign Plays.
9. `/share` matches the same frozen project.
10. `Edit this ad` creates an independent anonymous fork.
11. The assistant can repeat the Maker path with another reference without engineering changes.

Functional acceptance fails if the scenario depends on reference-specific code, manual database edits, a second renderer, or a hidden fallback.

## 2. Quality Acceptance

The Codex scenario proves the workflow, not general reconstruction quality.

Before editability and cleanup become launch claims:

1. Assemble 8 to 10 structurally different references from the internal assistant's saved ads.
2. Treat the first five Field + List references as the tuning set and add at least three untouched holdouts not used to tune prompts, thresholds, or normalization.
3. Record every reference's support expectation plus separate formula, reconstruction, crop/chrome, and asset-confidence expectations before seeing results so failures cannot be quietly removed.
4. Run every reference through the same `static-package` engine and the same finalized list-aware semantic contract.
5. Use no reference-specific code or manual database correction.
6. Review every meaningful variable visual element.
7. Score ordinary multi-evidence Fields, logical List item count, List membership, current active item, supporting presentation order, display-role binding, and reroll behavior separately.
8. Measure whether intended properties can be changed independently without redrawing the reference.
9. Require at least 85% editability coverage for every supported holdout with high reconstruction and asset confidence.
10. Treat 95% as the stretch target.
11. Require zero invalid active-item references, duplicate active/supporting assignments, or silent list item loss in a publishable draft.
12. Require median assistant cleanup time of five minutes or less after analysis.
13. Require all eight ads in every published test batch to be coherent, visually sound, and strategically distinct.

The system must explicitly distinguish supported from unsupported and report formula, reconstruction, crop/chrome, and asset confidence separately.

Unsupported inputs stop visibly and do not receive a fake near-finished claim.

## 3. Capability Acceptance Matrix

| Capability | Required test | Pass condition |
| --- | --- | --- |
| Complete draft | Upload a suitable reference without notes | Wiggly returns layers, formula, skill, Fields, Lists, display bindings, groups, policies, compatibility, questions, and confidence before requiring configuration |
| Semantic list | Use a reference where one item is visually emphasized inside a larger list | Wiggly records one list, the complete item set, the current active item, and fixed active/supporting presentation slots without treating membership and display role as mutually exclusive |
| List boundary | Analyze wrapped copy, a name plus handle, repeated package text, and a fixed three-line claim | Each logical value becomes one multi-evidence Field or coherent Reroll Group; none becomes a List merely because OCR returned several regions |
| Typed list items | Analyze a five-row listicle where every row contains a number, multi-line label, and image | Wiggly returns exactly five logical item records whose declared fields link to all relevant evidence; it does not flatten the rows into number/title fragments |
| Visual List completeness | Analyze the David's collage with six result scenes | Wiggly returns all six scene assets as six logical items or visibly lowers asset confidence and asks for Maker correction; it never silently claims five is complete |
| Active-item reassignment | Select a different list item in Maker preview | The selected value moves into the fixed active presentation slot, the previous active value returns to support, no item duplicates or disappears, and geometry remains unchanged |
| List policy scopes | Analyze the Codex reference, adapt it to another brand, then visual-reroll it | Reference membership and active state remain truthful; Maker-approved item content and active selection may change across Campaign Plays; visual reroll changes neither |
| List validation | Supply an unknown active ID, two active items, or conflicting derived slot values | Validation rejects the draft or Campaign Play visibly; no repair model or fallback runs |
| Hybrid reconstruction | Use a reference with editable text and complex decoration | Text and simple elements are native; complex decoration may remain a clearly locked raster layer |
| Source isolation | Upload a photo of an ad and a screenshot containing app chrome | Oversized input is normalized deterministically; the proposed creative bounds are visible and Maker-confirmable before expensive reconstruction; app or camera context is not published as accidental creative content |
| Confidence calibration | Analyze a reference with an obvious formula but difficult crop, masks, or decoration | Formula confidence may be high while reconstruction, crop/chrome, or asset confidence remains lower; no overall score hides the weaker axis |
| Evidence-bound proof | Analyze a social-proof reference containing engagement counts | Counts remain source-backed proof, fixed reference decoration, or an explicitly optional verified field; generation cannot invent them as ordinary campaign-variable copy |
| Maker drag-and-drop | Move, resize, rotate, group, reorder, lock, hide, duplicate, and delete layers | Saved draft reopens with the exact intended structure |
| Natural-language skill edit | Ask for a new purchase-motivation rule | A GLM proposal and diff appear; nothing changes until `Apply` |
| Raw skill edit | Copy, change, and paste the underlying skill | Valid changes save; unknown slots or schema changes are rejected |
| Skill failure | Fail or reject the proposal request | Draft remains unchanged and no fallback runs |
| Business compatibility | Publish a Format supporting only selected business types | Compatible Players continue; incompatible Players hard-stop; low-confidence type detection asks for confirmation |
| Conditional questions | Exercise short text, single choice, product, and asset inputs | Reliable website data skips the question; missing or unreliable data asks before generation |
| Product selection | Test a site with multiple products | The preselected product and alternatives are visible, editable, and confirmed by `Create my ads` |
| Brand-brief details | Open and close the optional full brief | Compact summary remains the default and full evidence is available on demand |
| Eight-play strategy | Generate a valid batch | Exactly eight distinct Campaign Plays conform to the Maker's policy and contain matching guidance |
| Reading level | Generate long or jargon-heavy copy | Validation reports reading level and flags violations |
| Content cycling | Press spacebar more than eight times | Selection advances instantly, loops, and triggers no generation |
| New batch atomicity | Request a new batch, then test success and failure | Old batch remains usable until complete success; failure never destroys it |
| Visual reroll | Reroll the current ad repeatedly | Only allowed style properties change; the other seven ads do not |
| Campaign-appropriate style | Compare holiday, proof, and retargeting plays | Treatments fit intent and remain within the Maker policy |
| Property overrides | Change position, size, font, and color, then reroll | Explicit overrides persist until individually reset |
| Coherent content overrides | Edit one member of a Reroll Group, then generate a new batch | The whole group snapshot persists until group reset |
| List content override | Edit the active or a supporting list item, then generate a new batch | Ordered items, active selection, and the containing Reroll Group snapshot persist until reset |
| Structural delete | Delete a bound layer, then reroll and reopen | Tombstone persists and the layer does not reappear |
| Structural duplicate | Duplicate a bound layer, then reroll | Duplicate remains an instance-only detached snapshot |
| Manual AI image | Use a Format with a required AI slot | Slot remains inert until a visible explicit click |
| AI concurrency | Request images on multiple ads | Only one image generates at a time |
| AI readiness | Observe pending, success, and failure | Clear `assetPending`, `ready`, and visible failure states; blocked affected export/share |
| AI provider policy | Cause a provider failure | No automatic retry, prefetch, batch, or fallback |
| Format immutability | Publish, edit, and republish | Existing projects keep the original version; changes create a new version |
| Team/public resolution | Publish public v1, then internal v2 | Public discovery uses `currentPublicVersionId`; Maker view uses `latestVersionId` |
| Font durability | Analyze an unavailable font | Publication blocks until a bundled, uploaded, or approved substitute exists |
| Frozen assets | Remove or change an original website asset after project creation | Existing resolved project remains unchanged |
| Current PNG | Export the viewed ad | Native-dimension pixels match preview |
| Eight-ad ZIP | Export all after readiness | ZIP contains exactly eight matching ads with deterministic filenames |
| Campaign plan | Export plan | Guidance, copy, strategy, evidence, confidence, and metrics match all eight ads |
| Frozen share | Change source assets or publish a newer Format after sharing | Shared pixels, guidance, and assets remain unchanged |
| Anonymous fork | Open `Edit this ad` from share | New project is independently editable and retains creator/source lineage |

## 4. Renderer and Route Acceptance

### Route ownership

- `/create` owns selection, website intake, product confirmation, essential questions, generation, cycling, visual reroll, guidance, download/share, and opening in builder.
- `/builder` owns Maker authoring and Player precision editing.
- `/share` owns frozen viewing, spread, and the independent-edit fork.

Fail if precision movement, resizing, or detailed layer controls appear on `/create`.

### Single-renderer parity

For the same resolved scene, compare:

1. `/create` preview
2. `/builder` canvas
3. Current PNG
4. Eight-ad ZIP entry
5. `/share`

Pass only if every surface uses `AdRenderSurface` and produces matching ad pixels. Builder interaction handles must be visible sibling overlays, not a second painter.

### State and interaction

- No invisible or transparent click target.
- Complete scenes, not scattered local properties, drive rendering.
- Canvas interaction uses the dedicated interaction store.
- Format, brand, scene, batch, asset, and job data are not duplicated into that store.
- User mutations use semantic events.

## 5. Provider, Cost, and Failure Acceptance

### Text and strategy

- Confirm exact model identity: GLM 5.2.
- Confirm provider: NVIDIA NIM.
- Confirm the Player cannot select another model.
- Fail requests visibly.
- Preserve the last usable batch.
- Confirm no model fallback.

### Vision and reconstruction

- Record the provisional stage owners in test evidence: PaddleOCR for text, Gemma 4 31B IT through NVIDIA NIM for semantics, SAM 3 for non-text masks, and LayerD only when pixel separation is needed.
- Confirm stage outputs normalize through Wiggly rather than writing scenes directly.
- Report confidence.
- Confirm unsupported inputs stop visibly.
- Confirm no silent provider switch or stage substitution.

### AI images

- Use Nano Banana 2 Lite for implementation test images.
- Require an explicit click for every paid image.
- Generate one at a time.
- Confirm no automatic retry or fallback.
- Do not invoke Replicate during QA unless explicitly required and announced before the run.

### Anonymous spend controls

- Exercise per-session and per-IP caps.
- Exercise the global spend ceiling and kill switch.
- Confirm visible errors at each limit.
- Confirm no paid action begins from viewport entry, prefetch, spacebar, or visual reroll.

## 6. Browser QA and Delivery

Every user-facing implementation phase is tested through `/create` with Playwright. A typecheck or build alone is insufficient.

Required evidence is proportional to the phase:

- Screenshots or dimensions for layout work
- Actual control interaction for editing and reroll work
- Preview/export/share comparison for render changes
- Parser and schema tests for model-output changes
- Regression test for every fixed bug class

Delivery rules:

1. Start from a fresh scoped branch.
2. Keep the tree clean before risky work.
3. Establish a green checkpoint before provider, renderer, state-machine, or major UI changes.
4. Split product-pipeline and visual-experiment work into separate commits or branches.
5. Commit each completed phase.
6. Push clean checkpoints.
7. Keep rollback to a clear `git revert` whenever possible.

## 7. Demand Acceptance

Demand validation happens after the first working slice and is separate from technical acceptance.

Test with the target daily user: creative-team operators at ecommerce brands with ongoing Meta creative demand. Do not coach them through the result.

Observe whether they independently:

- Choose a copied-reference Format
- Accept or change the selected product
- Cycle and compare the eight ads
- Open an ad in `/builder`
- Make an edit
- Download an ad or campaign plan
- Share or attempt to run an output

Compliments do not pass the gate. Before public launch, the founder records:

- Target participant profile
- Sample size
- Minimum behavioral pass threshold
- Which actions count as real intent

## 8. Exit Criteria

The static engine is ready for public-launch consideration only when:

1. The Codex-to-David's-Cookies functional path passes.
2. The holdout quality benchmark passes.
3. Every locked capability test relevant to the shipped phase passes.
4. Renderer parity passes.
5. Provider, cost, and failure rules pass.
6. The founder-approved demand threshold passes.

These gates do not authorize implementation. Product-code work still requires the benchmark-backed architecture and phased plan described in the PRD.
