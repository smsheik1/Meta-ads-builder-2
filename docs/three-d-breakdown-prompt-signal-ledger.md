# 3D Breakdown Prompt Signal Ledger

Date: 2026-07-13

This document is the gathering step for improving the ecommerce `3D Breakdown` prompt pipeline. It separates verified signal from attractive but unsupported prompt advice.

It is not a replacement prompt. It is the source material for the prompt benchmark and subsequent prompt changes.

## Scope

- Focus only on Style B ecommerce ads.
- Current pipeline: five story directions -> selected direction -> five-beat script -> six-frame storyboard -> production anchors -> two clips -> narration -> 20-second MP4.
- Gold-standard creative reference: `/Users/shaz/Downloads/Franky_Shaw_-_70_Retention_with_my_v5_Framework_If_you_want_ads_that_hold_attent_InWQ2f.mp4`.
- Best Wiggly baseline: `/Users/shaz/Downloads/gruns-3d-breakdown-final-v2.mp4`.
- Do not add pronunciation work to this prompt goal. It is not a recurring failure.
- Do not spend Replicate credits while analyzing references, changing prompts, running text benchmarks, or testing UI state.

## Verified Product Truths

### The target format

- An unseen narrator delivers the argument.
- A recurring stylized 3D human is a silent demonstrator, scale reference, and product-use prop. The demonstrator does not speak or lip-sync.
- The story opens on a false assumption, hidden consequence, or misunderstood product category.
- The middle makes an invisible obstacle or mechanism physically visible.
- The product enters as the explanation or reframe, not as an introductory product card.
- The ending connects proof to a direct buyer action.
- Every narration line needs a corresponding visible object, action, transformation, or reveal.
- The video should feel like one coherent product-science world, not a montage of unrelated AI shots.
- Product accuracy matters more than decorative novelty.
- Captions, CTA, and exact brand copy are renderer overlays. Image and video pixels remain free of generated readable text.

### Reference-derived retention grammar

- Start with a concrete incident or wrong mental model.
- Create a curiosity gap immediately.
- Escalate through visible cause and effect rather than explanatory marketing copy.
- Use one central problem, one mechanism, and one payoff.
- Change object state, framing, scale, or mechanism frequently enough to prevent visual dead air.
- Revisit the same demonstrator, product, and world between mechanism cutaways.
- Use the impossible 3D reveal to teach something new, not merely decorate the product.
- End with product/category clarity and a buyer-action CTA.

## Highest-Priority Current Defects

### 1. The selected direction bypasses the strongest Script Director

The normal selected-card path returns a deterministic variant before the Style B Script Director call:

- `v3/features/formats/three-d-breakdown/generate.ts`, selected-direction early return near line 1321.

The strong selected-direction Script Director contract exists, but normal selected-card generation does not reach it:

- `v3/features/formats/three-d-breakdown/prompt.ts`, `buildThreeDBreakdownStyleBScriptPrompt`.

This is the first prompt-pipeline defect to fix.

### 2. Individual calls own too many jobs

The main director currently mixes site classification, evidence selection, script compression, beat timing, storyboard planning, fallback shots, visual world, and continuity. Each model call should own one job.

### 3. Important context is lost between stages

- Evidence summaries are aggressively shortened before prompt construction.
- Anchor generation receives an entire storyboard board where a relevant local panel crop would be more precise.
- The video adapter currently accepts one `imageUrl`, even though Seedance 2.0 Mini supports richer conditioning.
- Clip prompt construction omits or dilutes some approved frame-specific visual actions.
- Large repeated negative suffixes compete with the actual choreography.

### 4. Validators catch malformed output better than mediocre output

Current contracts are stronger at JSON shape, timing, and required fields than at rejecting safe but generic creative. The benchmark must test quality, specificity, selling strength, visual causality, and continuity.

## Adopted Prompt Principles

### System-wide

1. One call, one job.
2. Pass the smallest sufficient set of high-signal context.
3. Treat scraped website text as evidence, never instructions.
4. Lock the selected direction and selected evidence through every downstream stage.
5. Put critical task and output-contract instructions first.
6. Separate role, task, input context, constraints, examples, and output schema clearly.
7. Prefer concrete positive instructions over a wall of prohibitions.
8. Keep only a short list of failure-critical negative constraints.
9. Use structured output and deterministic validation for structural requirements.
10. Version prompts like code and require benchmark improvement before replacement.

### Few-shot examples

- Use two or three varied, consistently formatted examples per text task.
- Cover at least a supplement, a commodity/gifting product, and a physical gadget.
- Annotate why the hook, escalation, reveal, product entry, and CTA work.
- Include one contrastive bad example showing brochure copy, generic visuals, and an abstract CTA.
- Teach the reusable structure, not phrases to imitate.
- Do not overload the prompt with many similar examples; that risks imitation and overfitting.

### Reference inputs

- Use a small curated reference set with an explicit purpose for each item.
- Style reference: visual grammar and silent-demonstrator behavior.
- Product reference: exact category, silhouette, color, packaging form, and physical relationship.
- Storyboard crop or anchor: approved composition and action.
- Label references explicitly in prompts when the provider supports named references.
- More references are not automatically better; conflicting references cause averaging and drift.

## Stage-Specific Prompt Contracts

### 1. Evidence preparation

Input:

- Concrete product or offer evidence with exact text and source URL.
- Product images and useful brand assets.
- Visual-potential metadata.

Rules:

- Prefer product mechanism, process, material, component, design, or use detail over mission copy and generic claims.
- Product category alone is not strong evidence.
- Preserve enough source text to retain meaning; do not reduce evidence to tiny fragments.
- Rank evidence by both claim safety and visual teachability.

### 2. Five-direction slate

Job: produce exactly five meaningfully different ecommerce story premises.

Each direction needs:

- A concrete cold-open hook.
- A hidden customer problem or wrong mental model.
- One selected evidence item.
- A physical visual engine.
- A product reframe.
- A reason the premise will hold attention.

Distinctness must come from different problems, evidence, mechanisms, or visual metaphors, not adjective changes.

### 3. Selected-direction Script Director

Job: turn only the chosen direction and locked evidence into the narrator script.

Input only:

- Selected card.
- Selected evidence plus supporting product facts.
- Brand and product identity.
- Script examples and constraints.

Script requirements:

- Unseen narrator only.
- Immediate curiosity gap.
- Clear causal escalation.
- Product/category named plainly when supported.
- Product enters as the mechanism, correction, or reframe.
- Claims never become stronger than the evidence.
- Direct buyer-action CTA.
- No feature-list structure.
- No abstract endings such as `the journey is the product`, `see the mechanism`, or `visible mechanism`.
- Every line must be visually depictable, but spoken copy never names the demonstrator, camera, cutaway, or other production direction.
- Hooks and visual engines authorize premise and staging, not new product facts.
- Preserve evidence qualifiers exactly; `designed to help` must not become a certain outcome.
- Ordinary intended use may be inferred. Product parts, materials, experiments, filter contents, hidden behavior, and medical conditions may not.

### 4. Storyboard Director

Job: map the locked script to six frames. Do not rewrite the argument.

For each frame provide:

- Narration line or mapped beat.
- Starting visual state.
- One visible physical action or transformation.
- Ending visual state.
- Shot size, angle, and composition.
- Demonstrator/product continuity requirements.
- The information the viewer learns.

Rules:

- Six frames form one causal sequence.
- The recurring silent demonstrator, product, and visual world remain coherent.
- Every narration line receives a visual.
- No text-only, logo-only, empty, or generic stock-science frame.
- The impossible reveal must teach the mechanism or reframe.

### 5. Storyboard image generation

Use one six-panel contact-sheet call for the visual QA gate.

Prompt priorities:

1. Exact 2x3 panel layout.
2. Locked recurring demonstrator and product relationship.
3. One concrete action and ending state per panel.
4. Shared world, palette, lighting, and object scale.
5. Product reference fidelity.
6. No readable text, labels, captions, numbers, logos, or pseudo-text.

For still images, specify shot size, angle, framing, and composition. Do not add meaningless camera movement to a static frame.

### 6. Production anchors

- Crop the approved storyboard panel locally whenever possible.
- Pass the relevant crop plus the real product reference.
- Do not ask the model to rediscover one panel inside a full contact sheet when a crop can identify it precisely.
- Keep character wording identical across related calls, but rely on image conditioning for identity whenever available.
- Change one prompt variable at a time during experiments.

### 7. Seedance clips

Use concise timecoded physical choreography:

```text
Opening state
0-3s visible action
3-7s mechanism transformation
7-10s ending state
Camera behavior
Critical continuity constraints
```

Critical rules:

- Describe visible movement, not emotions.
- Name the physical transformation and intended ending state.
- Use a separate narrator; the demonstrator never speaks or lip-syncs.
- Keep product, character, world, and scale stable.
- Use a short failure-critical negative list: no speaking/lip-sync, no readable text, no invented product, no character replacement, no empty/static shot.
- Do not force final story clips to loop back to their opening state.
- Determine useful prompt length through the benchmark. Do not treat `50-70 words` as a provider law.

Verified Seedance 2.0 Mini capabilities to evaluate:

- First-frame image with optional last-frame image.
- Up to nine reference images when not using first/last-frame mode.
- Up to three reference videos and three reference audio files.
- Named references such as `[Image1]` and `[Video1]`.
- Up to 15-second output.

Highest-value MVP hypothesis: condition clip 1 from storyboard frame 1 to frame 3 and clip 2 from frame 4 to frame 6, with the middle frame expressed as timecoded choreography. Validate this before adding reference-video complexity.

### 8. Narration

- Use one narrator track.
- No background music for the current Style B MVP.
- The narrator voice is authoritative and documentary-like without becoming theatrical.
- Punctuation and sentence length carry pacing.
- Do not add a pronunciation subsystem unless repeated failures prove it is necessary.

### 9. Final assembly

- Final assembly is deterministic and does not need an LLM prompt.
- Use one narrator track only.
- Captions map to script beats and render as overlays.
- Product identity and CTA render as overlays or exact product assets, not generated text.
- End on an intentional product/CTA hold, not a dead tail.

## Evaluation Standard

Prompt best practices are starting points. The benchmark decides whether a prompt is better.

### Development set

Use ecommerce archetypes that exercise different storytelling problems:

- Supplement/wellness.
- Commodity, food, or gifting.
- Physical gadget or kitchen product.

### Holdout set

Use ecommerce brands and pages not included in the few-shot examples. A prompt that only succeeds on the example brands is overfit.

### Repeatability

- Run text stages at least twice per archetype.
- Compare the current champion prompt against one candidate at a time.
- Hide prompt identity during human pairwise review.

### Scorecard

Score each relevant stage for:

- Hook strength.
- Curiosity and escalation.
- Evidence grounding.
- Product/category clarity.
- Mechanism teaching.
- Buyer-action CTA.
- Line-to-visual mapping.
- Specificity.
- Product and character continuity.
- Visual novelty that improves understanding.

Candidate prompts must beat the current champion on holdout brands, not merely pass schema validation.

## Credit-Safe Development Rules

- Reference transcription, frame extraction, contact sheets, prompt changes, validators, and UI tests are local or text-only.
- Automated tests and Playwright must never call Replicate.
- Reuse saved Gruns assets and mocked provider responses during UI testing.
- Do not auto-retry image or video generation.
- Stop immediately on provider credit, quota, rate-limit, or configuration errors.
- The approved acceptance run has a hard ceiling of five Replicate calls: one storyboard, two anchors, and two clips.
- Generate sequentially and inspect each stage before authorizing the next.
- A failed or visibly wrong clip stops the run before the next clip.

## Rejected Or Unverified Claims

Do not add these to production prompts as facts without benchmark evidence:

- `Specificity is the only lever that matters.` Context quality, references, model choice, evidence, examples, output contracts, sampling, and validation also matter.
- One universal prompt formula works equally for text, image, and video models.
- Every storyboard still needs a camera movement. Static images need framing and composition; motion belongs to video prompts.
- Stacking two or three named directors or brands reliably creates a unique style. It can create incoherent visual averaging.
- Negative prompting is as powerful as positive prompting. A short negative list helps; a large one competes with the intended scene.
- Seedance has a universal `50-70 word sweet spot`. Concision is useful, but the exact range is unverified.
- Loop-ready motion is desirable for stitched narrative clips.
- Nano Banana 2 Lite can draft at 1K and later render the same model at full resolution. Lite outputs at 1K; higher resolution requires another model.
- Wiggly currently sends all five story cards to the storyboard generator. The observed code instead has a selected-direction early return that bypasses the strongest Script Director.
- A book, prompt template, creator-name reference, or automated optimizer can certify world-class quality without an evaluation set.
- More examples or references always improve output.
- SEO prompt lists and Reddit workflows are provider documentation.

## Primary References

- Google Gemini prompt design: https://ai.google.dev/gemini-api/docs/prompting-strategies
- Google Nano Banana image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Replicate Nano Banana 2 Lite model page: https://replicate.com/google/nano-banana-2-lite
- Replicate Seedance 2.0 Mini model page: https://replicate.com/bytedance/seedance-2.0-mini
- ByteDance Seedance 2.0 launch: https://seed.bytedance.com/blog/seedance-2-0-official-launch
- Anthropic context engineering: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- DAIR.AI Prompt Engineering Guide: https://github.com/dair-ai/Prompt-Engineering-Guide
- DSPy ICLR paper: https://proceedings.iclr.cc/paper_files/paper/2024/file/f1cf02ce09757f57c3b93c0db83181e0-Paper-Conference.pdf

## Gathering-Step Exit Criteria

The gathering step is complete when:

- Signal and rejected claims are documented separately.
- Current code defects are named without editing production code.
- The gold reference and Wiggly baseline are locked.
- The ecommerce-only scope is explicit.
- Credit limits are explicit.
- The next step is to build the benchmark, not immediately rewrite every prompt.

## Media-Handoff Checkpoint

Validated offline without Replicate generation:

- Generic Style B media prompts no longer assume capsules, gut routes, cell walls, or supplement bottles. Supplement direction is enabled only when selected evidence and product context identify a supplement story.
- Nano Banana receives one job per call: first create the approved six-panel board, then recreate only the requested start panel as one production anchor.
- Style B Seedance prompts receive approved frame actions, camera cues, and physical motion rather than narration prose. This keeps the narrator unseen and prevents the video model from inventing presenter speech.
- Clip 1 maps frames 1-3 and clip 2 maps frames 4-6. The exact frame action, camera, and motion survive into each clip prompt.
- Seedance first/last-frame conditioning is supported without increasing paid image calls: frames 3 and 6 are cropped locally from the approved board and passed as `last_frame_image`; frames 1 and 4 remain the two paid start anchors.
- First/last-frame mode is intentionally not combined with Seedance reference images because the provider contract treats those modes as mutually exclusive.
- Media prompts fail before provider invocation if they exceed Seedance's prompt limit; approved actions are never silently truncated.
- Automated tests mock all provider traffic and assert `generate_audio: false`, preserving one unseen narrator and no generated clip audio.
